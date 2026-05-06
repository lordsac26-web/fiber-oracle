/**
 * saveSubscriberData
 *
 * Lightweight metadata-management function for subscriber uploads.
 * Records are bulk-created DIRECTLY by the frontend via the SDK (to avoid
 * the HTTP payload size limit that was causing 500 errors on large CSVs).
 *
 * This function only handles:
 *   1. Archive the current active SubscriberUploadMeta → SubscriberUploadHistory
 *   2. Mark the old active meta as 'replaced'
 *   3. Create the new active SubscriberUploadMeta record
 *   4. Fire-and-forget background sync to enrich ONTPerformanceRecords
 *
 * Payload: { file_name, record_count, upload_date }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_name, record_count, upload_date } = await req.json();

    if (!record_count || record_count < 1) {
      return Response.json({ error: 'record_count is required and must be > 0' }, { status: 400 });
    }

    // 1) Find ALL currently active metas (system-wide — subscriber data is shared
    //    reference data, only one record should ever be 'active' at a time).
    //    Previous version filtered by created_by, which left stale 'active'
    //    rows from other admins/users in place and caused the UI to surface
    //    the wrong "latest" meta on subsequent loads.
    const activeMetas = await base44.asServiceRole.entities.SubscriberUploadMeta.filter(
      { status: 'active' }
    );

    // 2) Archive each active meta into SubscriberUploadHistory and flip status
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

    // 3) Create the new active meta record
    const uploadDateStr = upload_date || new Date().toISOString();
    const meta = await base44.asServiceRole.entities.SubscriberUploadMeta.create({
      file_name:    file_name    || 'subscriber_data.csv',
      record_count: record_count,
      upload_date:  uploadDateStr,
      status:       'active',
    });

    // 4) Kick off background sync (fire-and-forget)
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