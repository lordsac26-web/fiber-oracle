/**
 * saveSubscriberData
 *
 * Two-phase metadata management for subscriber uploads. Records are
 * bulk-created DIRECTLY by the frontend via the SDK (to avoid the HTTP
 * payload size limit that was causing 500 errors on large CSVs).
 *
 * PHASE 1 (mode='reserve'): Create a NEW SubscriberUploadMeta with
 *   status='pending'. The frontend then bulk-creates SubscriberRecord rows
 *   stamped with that meta's id (upload_id). This makes the new generation
 *   identifiable but invisible to readers (which filter for status='active').
 *
 * PHASE 2 (mode='activate'): Archive the previous active meta to history,
 *   flip it to 'replaced', and flip the new meta from 'pending' → 'active'.
 *   The swap is atomic from the reader's POV: at any moment exactly one
 *   meta is active. Old SubscriberRecords (different upload_id) are
 *   orphaned and cleaned up asynchronously by purgeOrphanSubscriberRecords.
 *
 * This design eliminates the up-front bulk-delete that was tripping the
 * platform rate limit on 7k+ record uploads.
 *
 * Payload (reserve):  { mode: 'reserve',  file_name, record_count, upload_date }
 * Payload (activate): { mode: 'activate', meta_id }
 *
 * Backwards-compat: if `mode` is omitted, the old combined behaviour runs
 * (archive previous + create active in one call). New frontend calls supply
 * `mode` explicitly.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// ─── Tech classification (mirrors generateExecutiveReport / syncSubscriberToOntRecords) ───
const XGS_MODELS = ['GP1101X', 'GP4201X', 'GP4201XH', '5222XG', '5228XG'];
const GPON_MODELS = ['711GE', '717GE', '725G', '725GE', '725', '812G-1', '844G-1', '844GE-1', '803G'];
function detectTechType(model) {
  if (!model) return null;
  const m = String(model).toUpperCase().trim().replace(/\s/g, '');
  if (m.includes('DZS')) return 'XGS-PON';
  for (const x of XGS_MODELS) if (m.includes(x)) return 'XGS-PON';
  for (const g of GPON_MODELS) if (m.includes(g)) return 'GPON';
  return null;
}

// Precompute the RANGED GPON/XGS-PON inventory counts once per upload so
// downstream consumers (generateExecutiveReport) can read them off the meta
// instead of re-scanning the entire subscriber table at report time.
function computeRangedTechCounts(records) {
  let gpon = 0, xgs = 0;
  for (const sub of records) {
    const rangedRaw = String(sub.ONTRanged ?? '').trim().toLowerCase();
    const isRanged = rangedRaw === 'true' || rangedRaw === 'yes' || rangedRaw === '1';
    if (!isRanged) continue;
    const t = detectTechType(sub.ONTModel);
    if (t === 'XGS-PON') xgs++;
    else if (t === 'GPON') gpon++;
  }
  return { gpon, xgs };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const { mode, file_name, record_count, upload_date, meta_id } = body;

    // ---- PHASE 1: reserve a new pending meta ----
    if (mode === 'reserve') {
      if (!record_count || record_count < 1) {
        return Response.json({ error: 'record_count is required and must be > 0' }, { status: 400 });
      }
      const meta = await base44.asServiceRole.entities.SubscriberUploadMeta.create({
        file_name:    file_name    || 'subscriber_data.csv',
        record_count: record_count,
        upload_date:  upload_date  || new Date().toISOString(),
        status:       'pending', // not visible to readers yet
      });
      return Response.json({ success: true, meta_id: meta.id, upload_date: meta.upload_date });
    }

    // ---- PHASE 2: atomically activate the new meta and archive previous ----
    if (mode === 'activate') {
      if (!meta_id) {
        return Response.json({ error: 'meta_id is required for activate' }, { status: 400 });
      }

      // Archive the currently-active meta(s) — system-wide, since subscriber
      // data is shared reference data.
      const activeMetas = await base44.asServiceRole.entities.SubscriberUploadMeta.filter({ status: 'active' });
      const archivedAt = new Date().toISOString();
      for (const old of activeMetas) {
        await base44.asServiceRole.entities.SubscriberUploadHistory.create({
          file_name:     old.file_name    || 'unknown',
          record_count:  old.record_count || 0,
          upload_date:   old.upload_date  || old.created_date,
          archived_date: archivedAt,
          uploaded_by:   old.created_by   || user.email,
        });
        await base44.asServiceRole.entities.SubscriberUploadMeta.update(old.id, { status: 'replaced' });
      }

      // Flip the pending meta to active
      const activated = await base44.asServiceRole.entities.SubscriberUploadMeta.update(meta_id, { status: 'active' });

      // Fetch all subscriber records from the newly-active upload and enrich PON PM database
      const pageSize = 5000;
      let allSubscriberRecords = [];
      let offset = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities.SubscriberRecord.filter(
          { upload_id: meta_id },
          'id',
          pageSize,
          offset
        );
        if (!batch || batch.length === 0) break;
        allSubscriberRecords = allSubscriberRecords.concat(batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
      }

      // Stamp precomputed tech counts onto the newly-active meta (Step 2:
      // pre-ingest enrichment — report generation reads these directly).
      const techCounts = computeRangedTechCounts(allSubscriberRecords);
      await base44.asServiceRole.entities.SubscriberUploadMeta.update(meta_id, {
        gpon_count: techCounts.gpon,
        xgs_count: techCounts.xgs,
      });
      console.log(`[saveSubscriberData] Precomputed tech counts — GPON=${techCounts.gpon}, XGS-PON=${techCounts.xgs}`);

      // Fire-and-forget canonical subscriber → ONT sync.
      // This replaces the older competing enrichPonPmFromSubscriber path so all
      // persisted ONT model/technology counts use one normalization strategy.
      base44.functions.invoke('syncSubscriberToOntRecords', { auto_continue: true }).catch((err) => {
        console.error('[saveSubscriberData] Background sync failed to start:', err.message);
      });
      base44.functions.invoke('purgeOrphanSubscriberRecords', {}).catch((err) => {
        console.error('[saveSubscriberData] Orphan purge failed to start:', err.message);
      });

      return Response.json({
        success:      true,
        meta_id:      meta_id,
        upload_date:  activated.upload_date,
        record_count: activated.record_count,
        archived:     activeMetas.length,
      });
    }

    // ---- LEGACY: combined behaviour (kept for backwards compat) ----
    if (!record_count || record_count < 1) {
      return Response.json({ error: 'record_count is required and must be > 0' }, { status: 400 });
    }

    const activeMetas = await base44.asServiceRole.entities.SubscriberUploadMeta.filter({ status: 'active' });
    const archivedAt = new Date().toISOString();
    for (const old of activeMetas) {
      await base44.asServiceRole.entities.SubscriberUploadHistory.create({
        file_name:     old.file_name    || 'unknown',
        record_count:  old.record_count || 0,
        upload_date:   old.upload_date  || old.created_date,
        archived_date: archivedAt,
        uploaded_by:   old.created_by   || user.email,
      });
      await base44.asServiceRole.entities.SubscriberUploadMeta.update(old.id, { status: 'replaced' });
    }

    const uploadDateStr = upload_date || new Date().toISOString();
    const meta = await base44.asServiceRole.entities.SubscriberUploadMeta.create({
      file_name:    file_name    || 'subscriber_data.csv',
      record_count: record_count,
      upload_date:  uploadDateStr,
      status:       'active',
    });

    // Fetch all subscriber records from the newly-active upload and enrich PON PM database
    const pageSize = 5000;
    let allSubscriberRecords = [];
    let offset = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.SubscriberRecord.filter(
        { upload_id: meta.id },
        'created_date',
        pageSize,
        offset
      );
      if (!batch || batch.length === 0) break;
      allSubscriberRecords = allSubscriberRecords.concat(batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    // Stamp precomputed tech counts (legacy path parity with activate mode).
    const legacyTechCounts = computeRangedTechCounts(allSubscriberRecords);
    await base44.asServiceRole.entities.SubscriberUploadMeta.update(meta.id, {
      gpon_count: legacyTechCounts.gpon,
      xgs_count: legacyTechCounts.xgs,
    });

    base44.functions.invoke('syncSubscriberToOntRecords', {}).catch((err) => {
      console.error('[saveSubscriberData] Background sync failed to start:', err.message);
    });

    return Response.json({
      success:      true,
      meta_id:      meta.id,
      upload_date:  meta.upload_date,
      record_count: meta.record_count,
      archived:     activeMetas.length,
    });
  } catch (error) {
    console.error('[saveSubscriberData] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});