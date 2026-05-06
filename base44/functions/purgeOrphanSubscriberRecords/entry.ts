/**
 * purgeOrphanSubscriberRecords
 *
 * Deletes SubscriberRecord rows whose upload_id does NOT match the currently
 * active SubscriberUploadMeta. Runs slowly with throttling so it never trips
 * the platform rate limit, and is safe to invoke fire-and-forget after a
 * fresh subscriber upload activates.
 *
 * Idempotent and resumable — if it times out partway, the next invocation
 * picks up where it left off (orphans are still orphans).
 *
 * Deletion is intentionally conservative (5-wide parallel, 200ms breath)
 * because a slow background cleanup is much better than a failed upload.
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

    // Find the current active meta — its id is the only one we keep.
    const activeMetas = await base44.asServiceRole.entities.SubscriberUploadMeta.filter({ status: 'active' });
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
      // Fetch a page of records that are NOT the active generation.
      // Orphans include both records with no upload_id (legacy rows from
      // before this refactor) and records with a stale upload_id.
      // We page from offset 0 each loop because we're DELETING records.
      const page = await withRetry(() =>
        base44.asServiceRole.entities.SubscriberRecord.list(null, PAGE, 0)
      );
      if (!page.length) break;

      const orphans = page.filter((r) => r.upload_id !== activeId);
      // If the entire page is the active generation, there's nothing left to clean.
      if (orphans.length === 0) break;

      for (let i = 0; i < orphans.length; i += PARALLEL) {
        const chunk = orphans.slice(i, i + PARALLEL);
        await withRetry(() =>
          Promise.all(chunk.map((r) => base44.asServiceRole.entities.SubscriberRecord.delete(r.id)))
        );
        await sleep(BATCH_DELAY_MS);
      }
      totalDeleted += orphans.length;
    }

    return Response.json({ success: true, deleted: totalDeleted, active_meta_id: activeId });
  } catch (error) {
    console.error('[purgeOrphanSubscriberRecords] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});