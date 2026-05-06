/**
 * purgeOrphanEeroRecords
 *
 * Deletes EeroRecord rows whose upload_id does NOT match the currently
 * active EeroUploadMeta. Mirrors purgeOrphanSubscriberRecords — slow
 * throttled cleanup, safe to fire-and-forget after activation.
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

    const activeMetas = await base44.asServiceRole.entities.EeroUploadMeta.filter({ status: 'active' });
    if (!activeMetas.length) {
      return Response.json({ success: true, deleted: 0, note: 'no active meta — nothing to do' });
    }
    const activeId = activeMetas[0].id;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const withRetry = async (fn, attempts = 4) => {
      for (let i = 1; i <= attempts; i++) {
        try { return await fn(); }
        catch (err) {
          const isRateLimit = err?.status === 429 || /rate limit/i.test(err?.message || '');
          if (!isRateLimit || i === attempts) throw err;
          await sleep(1000 * Math.pow(2, i - 1));
        }
      }
    };

    const PAGE = 500;
    const PARALLEL = 5;
    const BATCH_DELAY_MS = 200;
    let totalDeleted = 0;
    let safety = 0;
    const MAX_ITERATIONS = 400;

    while (safety++ < MAX_ITERATIONS) {
      const page = await withRetry(() =>
        base44.asServiceRole.entities.EeroRecord.list(null, PAGE, 0)
      );
      if (!page.length) break;

      const orphans = page.filter((r) => r.upload_id !== activeId);
      if (orphans.length === 0) break;

      for (let i = 0; i < orphans.length; i += PARALLEL) {
        const chunk = orphans.slice(i, i + PARALLEL);
        await withRetry(() =>
          Promise.all(chunk.map((r) => base44.asServiceRole.entities.EeroRecord.delete(r.id)))
        );
        await sleep(BATCH_DELAY_MS);
      }
      totalDeleted += orphans.length;
    }

    return Response.json({ success: true, deleted: totalDeleted, active_meta_id: activeId });
  } catch (error) {
    console.error('[purgeOrphanEeroRecords] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});