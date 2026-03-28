/**
 * enrichOntLcpData
 *
 * Resolves LCP# and Splitter# for ONTPerformanceRecords by joining on
 * olt_name + shelf/slot/port against the LCPEntry table.
 *
 * Callable three ways:
 *   1. Entity automation payload:  { event: { entity_id }, data: { ... } }
 *   2. Direct call with report_id: { report_id: "<id>" }
 *   3. Backfill mode:              { backfill: true }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CONCURRENT_UPDATES = 1;
const BATCH_DELAY_MS = 800;
const PAGE_SIZE = 2000;
const MAX_RUNTIME_MS = 50000; // Stop gracefully before Deno 60s timeout

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function updateWithRetry(base44, id, data, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await base44.asServiceRole.entities.ONTPerformanceRecord.update(id, data);
      return true;
    } catch (err) {
      const isRateLimit = err.message?.includes('429') || err.message?.includes('Rate limit');
      if (attempt < retries - 1 && isRateLimit) {
        const backoff = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
        console.log(`Rate limited on update ${id}, backing off ${backoff}ms (attempt ${attempt + 1})`);
        await sleep(backoff);
        continue;
      }
      if (isRateLimit) {
        console.log(`Rate limited on update ${id} after ${retries} attempts, skipping`);
        return false;
      }
      throw err;
    }
  }
  return false;
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

    // ── 2. Fetch ONT records, match, and update in streaming fashion ───────
    // Instead of loading ALL records then updating, we page through and
    // update as we go. This keeps memory low and lets us respect the timeout.
    let totalScanned = 0;
    let updated = 0;
    let unmatched = 0;
    let skipped = 0;
    let timedOut = false;
    let skip = 0;

    while (true) {
      // Check timeout before fetching next page
      if (Date.now() - startTime > MAX_RUNTIME_MS) {
        timedOut = true;
        break;
      }

      let batch;
      if (report_id) {
        batch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { report_id },
          '-created_date',
          PAGE_SIZE,
          skip
        );
      } else {
        batch = await base44.asServiceRole.entities.ONTPerformanceRecord.list(
          '-created_date',
          PAGE_SIZE,
          skip
        );
        // Backfill: only keep records missing lcp_number
        batch = (batch || []).filter(r => !r.lcp_number);
      }

      if (!batch || batch.length === 0) break;

      // Collect updates needed from this page
      const pageUpdates = [];
      for (const record of batch) {
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

        pageUpdates.push({
          id: record.id,
          lcp_number: match.lcp_number,
          splitter_number: match.splitter_number,
        });
      }

      // Process this page's updates in small concurrent batches
      for (let i = 0; i < pageUpdates.length; i += CONCURRENT_UPDATES) {
        if (Date.now() - startTime > MAX_RUNTIME_MS) {
          timedOut = true;
          break;
        }

        const slice = pageUpdates.slice(i, i + CONCURRENT_UPDATES);
        await Promise.all(
          slice.map(rec =>
            updateWithRetry(base44, rec.id, {
              lcp_number: rec.lcp_number,
              splitter_number: rec.splitter_number,
            })
          )
        );
        updated += slice.length;

        if (i + CONCURRENT_UPDATES < pageUpdates.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      if (timedOut) break;

      // Move to next page (for report_id mode we need all records; for backfill same)
      if (report_id) {
        // For report mode, records we just updated still have report_id,
        // so we need to skip past them
        skip += PAGE_SIZE;
      } else {
        // For backfill, updated records now have lcp_number, so re-querying
        // with skip=0 would miss them. But we filter by !lcp_number, so
        // updated records drop out. Still use skip for untouched records.
        skip += PAGE_SIZE;
      }

      if (batch.length < PAGE_SIZE) break;
      await sleep(300);
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`Enrichment ${timedOut ? 'PARTIAL (timeout)' : 'complete'} in ${elapsed}s — scanned: ${totalScanned}, updated: ${updated}, unmatched: ${unmatched}, skipped: ${skipped}`);

    return Response.json({
      success: true,
      partial: timedOut,
      total: totalScanned,
      updated,
      unmatched,
      skipped,
      elapsed_seconds: elapsed,
      message: timedOut
        ? `Partial enrichment: updated ${updated} of ${totalScanned} scanned records in ${elapsed}s (hit timeout). Run again to continue.`
        : `Enriched ${updated} records. ${unmatched} unmatched. ${skipped} already correct.`,
    });

  } catch (error) {
    console.error('enrichOntLcpData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});