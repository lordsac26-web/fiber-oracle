/**
 * getEnrichmentDatasets
 * ---------------------
 * Read-only. Returns ONLY the currently-active subscriber + eero *metadata*
 * records (not the full row data).
 *
 * Why metadata only:
 *   The metadata rows are created by the service role during admin upload, so
 *   a creator-gated RLS read blocks every real (non-admin) user — the records-
 *   loading hooks gate on the meta existing, so non-admins saw nothing.
 *   Returning just the meta here (2 SDK fetches, tiny payload) sidesteps that
 *   without tripping Deno Deploy's concurrent in-flight response drain limit
 *   that a large multi-page records payload would hit.
 *
 *   The actual subscriber/eero *records* are read client-side via user-scoped
 *   SDK calls (SubscriberRecord & EeroRecord are read-open to all authenticated
 *   users), which run in the browser — outside the Worker fetch drain limit.
 *
 * Returns: { subscriberMeta, eeroMeta }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subMetas = await base44.asServiceRole.entities.SubscriberUploadMeta
      .filter({ status: 'active' }, '-created_date', 1);
    const eeroMetas = await base44.asServiceRole.entities.EeroUploadMeta
      .filter({ status: 'active' }, '-created_date', 1);

    return Response.json({
      subscriberMeta: subMetas?.[0] || null,
      eeroMeta: eeroMetas?.[0] || null,
    });
  } catch (error) {
    console.error('[getEnrichmentDatasets] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});