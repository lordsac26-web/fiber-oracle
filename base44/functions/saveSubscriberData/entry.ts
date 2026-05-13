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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
          'created_date',
          pageSize,
          offset
        );
        if (!batch || batch.length === 0) break;
        allSubscriberRecords = allSubscriberRecords.concat(batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
      }

      // Fire-and-forget background tasks
      base44.functions.invoke('enrichPonPmFromSubscriber', {
        subscriberRecords: allSubscriberRecords,
      }).catch((err) => {
        console.error('[saveSubscriberData] Enrichment failed to start:', err.message);
      });
      base44.functions.invoke('syncSubscriberToOntRecords', {}).catch((err) => {
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

    base44.functions.invoke('enrichPonPmFromSubscriber', {
      subscriberRecords: allSubscriberRecords,
    }).catch((err) => {
      console.error('[saveSubscriberData] Enrichment failed to start:', err.message);
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