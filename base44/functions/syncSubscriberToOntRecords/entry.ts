/**
 * syncSubscriberToOntRecords
 *
 * Background function that enriches all existing ONTPerformanceRecords with
 * subscriber fields (account_name, address, model) from the current active
 * SubscriberRecord dataset.
 *
 * Matching strategy (same as frontend SubscriberUpload):
 *   PRIMARY:   normalized OLT name + shelf/slot/port + ONT ID  → composite key
 *   SECONDARY: normalized serial number (FSAN)
 *              Vendor prefixes (CXNK = Calix, ZNTS = DZS) are stripped from
 *              subscriber serials before matching so both datasets share a
 *              consistent raw-hex serial format.
 *
 * Designed to be called:
 *   A) Via entity automation when a new SubscriberUploadMeta record is created
 *   B) Manually from the admin UI
 *
 * Pagination: processes ONTPerformanceRecords in pages of 2000 to avoid
 * memory pressure. Updates are batched (parallel chunks of 50) for throughput.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Known vendor prefixes that appear in subscriber export serial numbers but NOT
// in the PONPM report serial numbers. Strip these before building lookup keys.
const VENDOR_PREFIXES = ['CXNK', 'ZNTS'];

// ─── Key normalization (must mirror SubscriberUpload.buildSubscriberLookup) ──
function normalizeOltPort(oltName, linkedPon) {
  if (!oltName) return null;
  const base = oltName.trim().toUpperCase();
  if (!linkedPon) return base;
  // Strip "xp" prefix from port segment for uniform matching
  const normalized = linkedPon.trim().toUpperCase().replace(/\/XP(\d)/g, '/$1');
  return `${base}|${normalized}`;
}

function normalizeSerial(serial) {
  if (!serial || typeof serial !== 'string') return null;
  let n = serial.trim().toUpperCase();

  // Strip known vendor prefixes so subscriber serials (e.g. "CXNK1A2B3C4D")
  // align with PONPM serials (e.g. "1A2B3C4D") which never carry a prefix.
  for (const prefix of VENDOR_PREFIXES) {
    if (n.startsWith(prefix)) {
      n = n.substring(prefix.length);
      break; // only one prefix can match
    }
  }

  n = n.replace(/[^A-Z0-9]/g, '');
  return n.length > 0 ? n : null;
}

function normalizeOntId(ontId) {
  if (ontId === null || ontId === undefined) return null;
  return String(ontId).trim();
}

/**
 * Build two lookup maps from SubscriberRecord rows:
 *   compositeMap: "OLTNAME|SHELF/SLOT/PORT|ONTID" → subscriber fields
 *   serialMap:    "SERIALNUMBER" → subscriber fields
 */
function buildLookups(subscriberRecords) {
  const compositeMap = new Map();
  const serialMap = new Map();

  for (const rec of subscriberRecords) {
    const fields = {
      subscriber_account_name: rec.AccountName || '',
      subscriber_address:      rec.Address      || '',
      subscriber_model:        rec.ONTModel      || '',
    };

    // Composite key: OLT + PON port + ONT ID
    const portKey = normalizeOltPort(rec.DeviceName, rec.LinkedPon);
    const ontId   = normalizeOntId(rec.OntID);
    if (portKey && ontId !== null) {
      compositeMap.set(`${portKey}|${ontId}`, fields);
    }

    // Serial number fallback — vendor prefix stripped by normalizeSerial
    const serial = normalizeSerial(rec.ONTSerialNo);
    if (serial && !serialMap.has(serial)) {
      serialMap.set(serial, fields);
    }
  }

  console.log(`[syncSubscriber] Lookup built: ${compositeMap.size} composite keys, ${serialMap.size} serial keys`);
  return { compositeMap, serialMap };
}

/**
 * Resolve subscriber fields for a single ONTPerformanceRecord.
 * Returns null if no match found.
 */
function matchSubscriber(record, compositeMap, serialMap) {
  // Primary: composite key
  const oltNorm = record.olt_name ? record.olt_name.trim().toUpperCase() : null;
  const ssp     = record.shelf_slot_port
    ? record.shelf_slot_port.trim().toUpperCase().replace(/\/XP(\d)/g, '/$1')
    : null;
  const ontId   = normalizeOntId(record.ont_id);

  if (oltNorm && ssp && ontId !== null) {
    const key = `${oltNorm}|${ssp}|${ontId}`;
    if (compositeMap.has(key)) return compositeMap.get(key);
  }

  // Secondary: serial number — PONPM serials have no prefix so normalizeSerial
  // passes them through unchanged; subscriber serials get their prefix stripped.
  const serial = normalizeSerial(record.serial_number);
  if (serial && serialMap.has(serial)) return serialMap.get(serial);

  return null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Accept both: direct admin call and entity automation payload
    const body = await req.json().catch(() => ({}));
    const isAutomation = !!body.event;

    if (!isAutomation) {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    console.log('[syncSubscriber] Starting subscriber → ONT sync...');
    const startTime = Date.now();

    // Optional resumable-job parameters (called repeatedly from admin UI):
    //   start_offset — where to begin in the ONT records list (default 0)
    //   max_batches  — how many ONT pages to process this invocation (default unlimited)
    //   time_budget_ms — soft budget; stop after this many ms even if more work remains
    // Returns: next_offset (or null when complete) so the caller can resume.
    const startOffset  = Number.isFinite(body.start_offset) ? body.start_offset : 0;
    const maxBatches   = Number.isFinite(body.max_batches)  ? body.max_batches  : Infinity;
    const timeBudgetMs = Number.isFinite(body.time_budget_ms) ? body.time_budget_ms : 22000;

    // ── 1. Load all active SubscriberRecords (paginated, no implicit cap) ──
    // The platform caps list() at 5000 per call regardless of the requested
    // page size, so we MUST loop until a short page is returned. The previous
    // code requested 10000 and assumed only one extra page was needed if the
    // first came back full — that silently truncated datasets > 5000 rows.
    const PAGE = 5000;
    let allSubscribers = [];
    let subOffset = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.SubscriberRecord.list(
        '-created_date', PAGE, subOffset
      );
      if (!batch || batch.length === 0) break;
      allSubscribers = allSubscribers.concat(batch);
      if (batch.length < PAGE) break;
      subOffset += batch.length;
      // Brief pause to avoid the platform's per-second read rate limit.
      await new Promise(r => setTimeout(r, 500));
    }

    if (allSubscribers.length === 0) {
      return Response.json({ success: true, message: 'No subscriber records found — nothing to sync', updated: 0 });
    }

    console.log(`[syncSubscriber] Loaded ${allSubscribers.length} subscriber records`);

    // ── 2. Build lookup maps ───────────────────────────────────────────────
    const { compositeMap, serialMap } = buildLookups(allSubscribers);

    // ── 3. Iterate ONTPerformanceRecords in pages & update matches ─────────
    // Stable sort by id so resumable offsets are deterministic across calls.
    const ONT_PAGE = 1000;
    let offset = startOffset;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalNoMatch = 0;
    let batchesProcessed = 0;
    let exhausted = false;

    while (true) {
      // Stop conditions before fetching the next page
      if (batchesProcessed >= maxBatches) break;
      if ((Date.now() - startTime) > timeBudgetMs) break;

      const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.list(
        'id', ONT_PAGE, offset
      );

      if (!batch || batch.length === 0) { exhausted = true; break; }

      // Find records that need updating
      const toUpdate = [];
      for (const record of batch) {
        const match = matchSubscriber(record, compositeMap, serialMap);
        if (!match) {
          totalNoMatch++;
          continue;
        }

        // Only update if any field has actually changed (avoid unnecessary writes)
        const changed =
          (record.subscriber_account_name || '') !== match.subscriber_account_name ||
          (record.subscriber_address      || '') !== match.subscriber_address      ||
          (record.subscriber_model        || '') !== match.subscriber_model;

        if (changed) {
          toUpdate.push({ id: record.id, fields: match });
        } else {
          totalSkipped++;
        }
      }

      // Sequential updates with a small delay — keeps us under the platform's
      // strict per-second write rate limit. Slower than batched parallelism
      // but reliable. Use the resumable start_offset/max_batches parameters
      // to chunk the work across multiple invocations for very large datasets.
      for (const { id, fields } of toUpdate) {
        let attempt = 0;
        while (true) {
          try {
            await base44.asServiceRole.entities.ONTPerformanceRecord.update(id, fields);
            break;
          } catch (err) {
            attempt++;
            const isRateLimit = err?.status === 429 || /rate limit/i.test(err?.message || '');
            if (!isRateLimit || attempt >= 3) throw err;
            await new Promise(r => setTimeout(r, attempt * 500 + 500));
          }
        }
        await new Promise(r => setTimeout(r, 60)); // ~16 writes/sec
      }

      totalUpdated += toUpdate.length;
      offset += batch.length;
      batchesProcessed++;

      console.log(`[syncSubscriber] Processed up to offset ${offset} — updated: ${totalUpdated}, skipped: ${totalSkipped}, no-match: ${totalNoMatch}`);

      if (batch.length < ONT_PAGE) { exhausted = true; break; }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const nextOffset = exhausted ? null : offset;
    console.log(`[syncSubscriber] Slice done in ${elapsed}s — updated: ${totalUpdated}, skipped: ${totalSkipped}, no-match: ${totalNoMatch}, next_offset: ${nextOffset}`);

    return Response.json({
      success: true,
      updated: totalUpdated,
      skipped_unchanged: totalSkipped,
      no_match: totalNoMatch,
      elapsed_seconds: parseFloat(elapsed),
      start_offset: startOffset,
      next_offset: nextOffset,
      complete: exhausted,
    });

  } catch (error) {
    console.error('[syncSubscriber] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});