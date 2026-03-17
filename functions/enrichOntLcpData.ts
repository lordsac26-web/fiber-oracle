/**
 * enrichOntLcpData
 *
 * Resolves LCP# and Splitter# for ONTPerformanceRecords by joining on
 * olt_name + shelf/slot/port against the LCPEntry table.
 *
 * Callable two ways:
 *   1. POST { report_id: "<id>" }  — enriches all records for a specific report
 *   2. POST { backfill: true }     — enriches ALL records where lcp_number is blank
 *
 * The matching key built from LCPEntry is:
 *   `<olt_name_lower>|<olt_shelf>/<olt_slot>/<olt_port_normalized>`
 *
 * ONTPerformanceRecord.shelf_slot_port is expected in formats like:
 *   "1/2/xp5"  →  shelf=1, slot=2, port=xp5
 *   "1/2/5"    →  shelf=1, slot=2, port=5  (xp prefix optional)
 *
 * Matching is case-insensitive and handles xp-prefix variants on both sides.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a normalised lookup map from all LCPEntry records.
 * Each entry may generate several keys to tolerate format differences:
 *   olt|shelf/slot/port
 *   olt|shelf/slot/xpPORT
 * Returns Map<string, { lcp_number, splitter_number }>
 */
function buildLcpLookup(lcpEntries) {
  const map = new Map();

  for (const lcp of lcpEntries) {
    if (!lcp.olt_name || lcp.olt_shelf === undefined || lcp.olt_slot === undefined || !lcp.olt_port) {
      continue;
    }

    const oltBase = lcp.olt_name.toLowerCase().trim();
    const shelf   = String(lcp.olt_shelf).trim();
    const slot    = String(lcp.olt_slot).trim();
    // olt_port may already contain "xp5" or just "5"
    const rawPort = String(lcp.olt_port).trim();

    // Strip any leading "xp" to get the numeric part
    const numericPort = rawPort.replace(/^xp/i, '');

    const payload = {
      lcp_number:      lcp.lcp_number      || '',
      splitter_number: lcp.splitter_number || '',
    };

    // Generate both variants
    const variants = [
      `${oltBase}|${shelf}/${slot}/${numericPort}`,
      `${oltBase}|${shelf}/${slot}/xp${numericPort}`,
    ];

    for (const key of variants) {
      if (!map.has(key)) {
        map.set(key, payload);
      }
    }
  }

  return map;
}

/**
 * Parse shelf_slot_port string into a normalised lookup key.
 * Accepts: "1/2/xp5", "1/2/5", "1/2/xp5-6" (combo — use first port number).
 * Returns the canonical key or null if unparseable.
 */
function buildOntKey(oltName, shelfSlotPort) {
  if (!oltName || !shelfSlotPort) return null;

  const base = oltName.toLowerCase().trim();

  // Capture shelf, slot, then port (with optional xp prefix, optional -N suffix for combos)
  const match = shelfSlotPort.match(/^(\d+)\/(\d+)\/(?:xp)?(\d+)(?:-\d+)?$/i);
  if (!match) return null;

  const shelf       = match[1];
  const slot        = match[2];
  const numericPort = match[3];

  // We'll try both variants in the caller; just return the base numeric form
  return `${base}|${shelf}/${slot}/${numericPort}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));

    // Support three calling conventions:
    //   1. Entity automation payload:  { event: { entity_id }, data: { ... } }
    //   2. Direct call with report_id: { report_id: "<id>" }
    //   3. Backfill mode:              { backfill: true }
    const report_id = body.report_id || body.event?.entity_id || null;
    const backfill  = body.backfill || false;

    // For direct (non-automation) calls, require an authenticated admin user
    const isAutomation = !!body.event;
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

    // ── 1. Load all LCPEntry records and build lookup ──────────────────────
    const lcpEntries = await base44.asServiceRole.entities.LCPEntry.list();
    if (!lcpEntries || lcpEntries.length === 0) {
      return Response.json({ warning: 'No LCPEntry records found — nothing to enrich.' });
    }

    const lcpLookup = buildLcpLookup(lcpEntries);
    console.log(`LCP lookup built: ${lcpLookup.size} keys from ${lcpEntries.length} LCP entries`);

    // ── 2. Fetch the ONT records to enrich ─────────────────────────────────
    let ontRecords = [];

    if (report_id) {
      // Single-report mode: fetch all records for this report
      ontRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id },
        null,
        5000
      );
    } else {
      // Backfill mode: fetch all records missing lcp_number in batches
      const batchSize = 5000;
      let skip = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.list(
          null,
          batchSize,
          skip
        );
        if (!batch || batch.length === 0) break;
        // Keep only records where lcp_number is blank/missing
        const unresolved = batch.filter(r => !r.lcp_number);
        ontRecords.push(...unresolved);
        skip += batchSize;
        if (batch.length < batchSize) break;
      }
    }

    console.log(`Found ${ontRecords.length} ONT records to enrich`);

    if (ontRecords.length === 0) {
      return Response.json({ success: true, updated: 0, unmatched: 0, message: 'No records required enrichment.' });
    }

    // ── 3. Match and update ────────────────────────────────────────────────
    let updated   = 0;
    let unmatched = 0;

    // Batch updates to avoid hammering the DB
    const UPDATE_BATCH = 100;
    const updatePromises = [];

    for (const record of ontRecords) {
      const baseKey = buildOntKey(record.olt_name, record.shelf_slot_port);
      if (!baseKey) {
        unmatched++;
        continue;
      }

      // Try numeric variant first, then xp-prefixed variant
      const match =
        lcpLookup.get(baseKey) ||
        lcpLookup.get(baseKey.replace(/\/(\d+)$/, '/xp$1'));

      if (!match) {
        unmatched++;
        continue;
      }

      // Only update if values differ (avoids unnecessary writes)
      if (record.lcp_number === match.lcp_number && record.splitter_number === match.splitter_number) {
        continue;
      }

      updatePromises.push(
        base44.asServiceRole.entities.ONTPerformanceRecord.update(record.id, {
          lcp_number:      match.lcp_number,
          splitter_number: match.splitter_number,
        })
      );
      updated++;

      // Flush in batches to avoid request overload
      if (updatePromises.length >= UPDATE_BATCH) {
        await Promise.all(updatePromises.splice(0, UPDATE_BATCH));
      }
    }

    // Flush any remaining updates
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    console.log(`Enrichment complete — updated: ${updated}, unmatched: ${unmatched}`);

    return Response.json({
      success:   true,
      total:     ontRecords.length,
      updated,
      unmatched,
      message:   `Enriched ${updated} records. ${unmatched} could not be matched to an LCP entry.`,
    });

  } catch (error) {
    console.error('enrichOntLcpData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});