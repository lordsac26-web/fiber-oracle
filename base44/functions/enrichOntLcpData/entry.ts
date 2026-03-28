/**
 * enrichOntLcpData
 *
 * Resolves LCP# and Splitter# for ONTPerformanceRecords by joining on
 * olt_name + shelf/slot/port against the LCPEntry table.
 *
 * Optimized batching strategy:
 *   - Collects updates into small batches (BATCH_SIZE)
 *   - Fires each batch in parallel via Promise.allSettled
 *   - Waits BATCH_DELAY_MS between batches to avoid rate limits
 *   - If an entire batch hits rate limits, backs off exponentially and retries
 *
 * Callable three ways:
 *   1. Entity automation payload:  { event: { entity_id }, data: { ... } }
 *   2. Direct call with report_id: { report_id: "<id>" }
 *   3. Backfill mode:              { backfill: true }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Tuning knobs ──────────────────────────────────────────────────────────────
const BATCH_SIZE        = 5;     // parallel updates per batch (conservative for Base44 rate limits)
const BATCH_DELAY_MS    = 1200;  // pause between successful batches
const PAGE_SIZE         = 2000;  // records fetched per page from the DB
const MAX_RUNTIME_MS    = 50000; // graceful timeout before Deno's 60s hard limit
const MAX_BATCH_RETRIES = 3;     // retries for a rate-limited batch
const INITIAL_BACKOFF   = 3000;  // first backoff delay on rate limit (doubles each retry)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLcpLookup(lcpEntries) {
  const map = new Map();

  for (const lcp of lcpEntries) {
    if (!lcp.olt_name || lcp.olt_shelf === undefined || lcp.olt_slot === undefined || !lcp.olt_port) {
      continue;
    }

    const oltBase = lcp.olt_name.toLowerCase().trim();
    const shelf   = String(lcp.olt_shelf).trim();
    const slot    = String(lcp.olt_slot).trim();
    const rawPort = String(lcp.olt_port).trim();
    const numericPort = rawPort.replace(/^xp/i, '');

    const payload = {
      lcp_number:      lcp.lcp_number      || '',
      splitter_number: lcp.splitter_number || '',
    };

    // Handle port ranges like "1-4"
    const rng = numericPort.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rng) {
      const lo = parseInt(rng[1], 10);
      const hi = parseInt(rng[2], 10);
      for (let p = lo; p <= hi; p++) {
        const keyNumeric = `${oltBase}|${shelf}/${slot}/${p}`;
        const keyXp      = `${oltBase}|${shelf}/${slot}/xp${p}`;
        if (!map.has(keyNumeric)) map.set(keyNumeric, payload);
        if (!map.has(keyXp))      map.set(keyXp, payload);
      }
    } else {
      const keyNumeric = `${oltBase}|${shelf}/${slot}/${numericPort}`;
      const keyXp      = `${oltBase}|${shelf}/${slot}/xp${numericPort}`;
      if (!map.has(keyNumeric)) map.set(keyNumeric, payload);
      if (!map.has(keyXp))      map.set(keyXp, payload);
    }

    const literalKey = `${oltBase}|${shelf}/${slot}/${rawPort.toLowerCase()}`;
    if (!map.has(literalKey)) map.set(literalKey, payload);
  }

  return map;
}

function buildOntKey(oltName, shelfSlotPort) {
  if (!oltName || !shelfSlotPort) return null;
  const base = oltName.toLowerCase().trim();
  const match = shelfSlotPort.match(/^(\d+)\/(\d+)\/(?:xp)?(\d+)(?:-\d+)?$/i);
  if (!match) return null;
  return `${base}|${match[1]}/${match[2]}/${match[3]}`;
}

/**
 * Execute a batch of updates with retry on rate limits.
 * Returns { succeeded: number, failed: number, rateLimited: boolean }
 */
async function executeBatchWithRetry(base44, updates) {
  let currentUpdates = updates;

  for (let attempt = 0; attempt <= MAX_BATCH_RETRIES; attempt++) {
    const results = await Promise.allSettled(
      currentUpdates.map((u) =>
        base44.asServiceRole.entities.ONTPerformanceRecord.update(u.id, u.data)
      )
    );

    let succeeded = 0;
    let rateLimitedItems = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        succeeded++;
      } else {
        const msg = result.reason?.message || '';
        const isRateLimit = msg.includes('429') || msg.includes('Rate limit');
        if (isRateLimit) {
          rateLimitedItems.push(currentUpdates[idx]);
        }
        // Non-rate-limit errors are logged but not retried
      }
    });

    // If no rate-limited items, we're done with this batch
    if (rateLimitedItems.length === 0) {
      return { succeeded, failed: results.length - succeeded, rateLimited: false };
    }

    // If this was our last attempt, return partial results
    if (attempt === MAX_BATCH_RETRIES) {
      console.log(`Batch: ${rateLimitedItems.length} items still rate-limited after ${MAX_BATCH_RETRIES + 1} attempts, skipping`);
      return { succeeded, failed: rateLimitedItems.length, rateLimited: true };
    }

    // Back off exponentially and retry only the rate-limited items
    const backoff = INITIAL_BACKOFF * Math.pow(2, attempt);
    console.log(`Batch: ${rateLimitedItems.length}/${currentUpdates.length} rate-limited, backing off ${backoff}ms (attempt ${attempt + 1})`);
    await sleep(backoff);
    currentUpdates = rateLimitedItems;
  }

  return { succeeded: 0, failed: updates.length, rateLimited: true };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const isAutomation = !!body.event;
    const report_id = body.report_id || body.data?.report_id || body.event?.entity_id || null;
    const backfill  = body.backfill || false;

    if (!isAutomation) {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }
    }

    if (!report_id && !backfill) {
      return Response.json(
        { error: 'Provide either { report_id: "<id>" } or { backfill: true }' },
        { status: 400 }
      );
    }

    // When triggered by automation on processing_status=completed,
    // all ONT records should already be saved. Brief pause for consistency.
    if (isAutomation && report_id) {
      console.log(`Automation triggered for report ${report_id}, brief pause before enrichment...`);
      await sleep(2000);
    }

    // ── 1. Load LCPEntry records and build lookup ──────────────────────────
    const lcpEntries = await base44.asServiceRole.entities.LCPEntry.list('-created_date', 5000);
    if (!lcpEntries || lcpEntries.length === 0) {
      return Response.json({ warning: 'No LCPEntry records found — nothing to enrich.' });
    }

    const lcpLookup = buildLcpLookup(lcpEntries);
    console.log(`LCP lookup built: ${lcpLookup.size} keys from ${lcpEntries.length} LCP entries`);

    // ── 2. Scan ONT records, collect updates, execute in batches ───────────
    let totalScanned = 0;
    let updated = 0;
    let failed = 0;
    let unmatched = 0;
    let skipped = 0;
    let timedOut = false;
    let skip = 0;

    while (true) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) { timedOut = true; break; }

      // Fetch a page of ONT records
      let page;
      if (report_id) {
        page = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { report_id },
          '-created_date',
          PAGE_SIZE,
          skip
        );
      } else {
        page = await base44.asServiceRole.entities.ONTPerformanceRecord.list(
          '-created_date',
          PAGE_SIZE,
          skip
        );
        // Backfill: only process records missing lcp_number
        page = (page || []).filter((r) => !r.lcp_number);
      }

      if (!page || page.length === 0) break;

      // ── Scan page and collect all needed updates ───────────────────────
      const pendingUpdates = [];

      for (const record of page) {
        totalScanned++;
        const baseKey = buildOntKey(record.olt_name, record.shelf_slot_port);
        if (!baseKey) { unmatched++; continue; }

        const match =
          lcpLookup.get(baseKey) ||
          lcpLookup.get(baseKey.replace(/\/(\d+)$/, '/xp$1'));

        if (!match) { unmatched++; continue; }

        if (record.lcp_number === match.lcp_number && record.splitter_number === match.splitter_number) {
          skipped++;
          continue;
        }

        pendingUpdates.push({
          id: record.id,
          data: { lcp_number: match.lcp_number, splitter_number: match.splitter_number },
        });
      }

      // ── Execute updates in small parallel batches ──────────────────────
      for (let i = 0; i < pendingUpdates.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) { timedOut = true; break; }

        const batch = pendingUpdates.slice(i, i + BATCH_SIZE);
        const result = await executeBatchWithRetry(base44, batch);

        updated += result.succeeded;
        failed  += result.failed;

        // If we hit persistent rate limits, increase delay for remaining batches
        if (result.rateLimited) {
          console.log(`Rate limit pressure detected, adding extra delay`);
          await sleep(BATCH_DELAY_MS * 3);
        } else if (i + BATCH_SIZE < pendingUpdates.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      if (timedOut) break;

      skip += PAGE_SIZE;
      if (page.length < PAGE_SIZE) break;
      await sleep(200); // brief pause between page fetches
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const status = timedOut ? 'PARTIAL (timeout)' : 'complete';
    console.log(`Enrichment ${status} in ${elapsed}s — scanned: ${totalScanned}, updated: ${updated}, failed: ${failed}, unmatched: ${unmatched}, skipped: ${skipped}`);

    return Response.json({
      success: true,
      partial: timedOut,
      total: totalScanned,
      updated,
      failed,
      unmatched,
      skipped,
      elapsed_seconds: elapsed,
      message: timedOut
        ? `Partial enrichment: updated ${updated} of ${totalScanned} scanned in ${elapsed}s (timeout). Run again to continue.`
        : `Enriched ${updated} records. ${unmatched} unmatched. ${skipped} already correct. ${failed} failed.`,
    });

  } catch (error) {
    console.error('enrichOntLcpData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});