/**
 * saveEeroData
 *
 * Two-phase metadata management for eero uploads — mirrors saveSubscriberData
 * exactly. Records are bulk-created DIRECTLY by the frontend via the SDK to
 * avoid the HTTP payload size limit on large CSVs.
 *
 * PHASE 1 (mode='reserve'): Create a NEW EeroUploadMeta with status='pending'.
 *   The frontend then bulk-creates EeroRecord rows stamped with that meta's id
 *   (upload_id). Records are identifiable but invisible to readers (which
 *   filter for the active meta's id).
 *
 * PHASE 2 (mode='activate'): Archive the previous active meta to history,
 *   flip it to 'replaced', and flip the new meta from 'pending' → 'active'.
 *   Old EeroRecords are orphaned and cleaned up asynchronously by
 *   purgeOrphanEeroRecords.
 *
 * Payload (reserve):  { mode: 'reserve',  file_name, record_count, upload_date }
 * Payload (activate): { mode: 'activate', meta_id }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { mode, file_name, record_count, upload_date, meta_id } = body;

    // ---- PHASE 1: reserve a new pending meta ----
    if (mode === 'reserve') {
      if (!record_count || record_count < 1) {
        return Response.json({ error: 'record_count is required and must be > 0' }, { status: 400 });
      }
      const meta = await base44.asServiceRole.entities.EeroUploadMeta.create({
        file_name:    file_name    || 'eero_data.csv',
        record_count: record_count,
        upload_date:  upload_date  || new Date().toISOString(),
        status:       'pending',
      });
      return Response.json({ success: true, meta_id: meta.id, upload_date: meta.upload_date });
    }

    // ---- PHASE 2: atomically activate the new meta and archive previous ----
    if (mode === 'activate') {
      if (!meta_id) {
        return Response.json({ error: 'meta_id is required for activate' }, { status: 400 });
      }

      const activeMetas = await base44.asServiceRole.entities.EeroUploadMeta.filter({ status: 'active' });
      const archivedAt = new Date().toISOString();
      for (const old of activeMetas) {
        await base44.asServiceRole.entities.EeroUploadHistory.create({
          file_name:     old.file_name    || 'unknown',
          record_count:  old.record_count || 0,
          upload_date:   old.upload_date  || old.created_date,
          archived_date: archivedAt,
          uploaded_by:   old.created_by   || user.email,
        });
        await base44.asServiceRole.entities.EeroUploadMeta.update(old.id, { status: 'replaced' });
      }

      const activated = await base44.asServiceRole.entities.EeroUploadMeta.update(meta_id, { status: 'active' });

      // Fire-and-forget orphan cleanup
      base44.functions.invoke('purgeOrphanEeroRecords', {}).catch((err) => {
        console.error('[saveEeroData] Orphan purge failed to start:', err.message);
      });

      return Response.json({
        success:      true,
        meta_id:      meta_id,
        upload_date:  activated.upload_date,
        record_count: activated.record_count,
        archived:     activeMetas.length,
      });
    }

    return Response.json({ error: 'mode must be "reserve" or "activate"' }, { status: 400 });
  } catch (error) {
    console.error('[saveEeroData] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});