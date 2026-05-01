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

    // ── 1. Load all active SubscriberRecords (paginated up to 50k) ─────────
    const PAGE = 10000;
    const page1 = await base44.asServiceRole.entities.SubscriberRecord.list('-created_date', PAGE, 0);
    let allSubscribers = [...page1];

    if (page1.length === PAGE) {
      const [p2, p3, p4, p5] = await Promise.all([
        base44.asServiceRole.entities.SubscriberRecord.list('-created_date', PAGE, PAGE),
        base44.asServiceRole.entities.SubscriberRecord.list('-created_date', PAGE, PAGE * 2),
        base44.asServiceRole.entities.SubscriberRecord.list('-created_date', PAGE, PAGE * 3),
        base44.asServiceRole.entities.SubscriberRecord.list('-created_date', PAGE, PAGE * 4),
      ]);
      allSubscribers = [...allSubscribers, ...p2, ...p3, ...p4, ...p5];
    }

    if (allSubscribers.length === 0) {
      return Response.json({ success: true, message: 'No subscriber records found — nothing to sync', updated: 0 });
    }

    console.log(`[syncSubscriber] Loaded ${allSubscribers.length} subscriber records`);

    // ── 2. Build lookup maps ───────────────────────────────────────────────
    const { compositeMap, serialMap } = buildLookups(allSubscribers);

    // ── 3. Iterate all ONTPerformanceRecords in pages & update matches ─────
    const ONT_PAGE = 2000;
    let offset = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalNoMatch = 0;

    while (true) {
      const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.list(
        '-report_date', ONT_PAGE, offset
      );

      if (!batch || batch.length === 0) break;

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

      // Parallel update in chunks of 50 for throughput without overwhelming the API
      const CHUNK = 50;
      for (let i = 0; i < toUpdate.length; i += CHUNK) {
        const chunk = toUpdate.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(({ id, fields }) =>
            base44.asServiceRole.entities.ONTPerformanceRecord.update(id, fields)
          )
        );
      }

      totalUpdated += toUpdate.length;
      offset += batch.length;

      console.log(`[syncSubscriber] Processed ${offset} records so far — updated: ${totalUpdated}, skipped: ${totalSkipped}, no-match: ${totalNoMatch}`);

      if (batch.length < ONT_PAGE) break;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[syncSubscriber] Complete in ${elapsed}s — updated: ${totalUpdated}, skipped (unchanged): ${totalSkipped}, no-match: ${totalNoMatch}`);

    return Response.json({
      success: true,
      updated: totalUpdated,
      skipped_unchanged: totalSkipped,
      no_match: totalNoMatch,
      elapsed_seconds: parseFloat(elapsed),
    });

  } catch (error) {
    console.error('[syncSubscriber] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});