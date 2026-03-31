import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Orphaned ONT Record Cleanup — Ultra Memory-Efficient
 * 
 * Processes only a small number of pages per invocation.
 * Frontend calls repeatedly with cursor until complete.
 * Each call stays well under memory and timeout limits.
 */

const PAGE_SIZE = 30;
const MAX_PAGES_PER_CALL = 8; // ~240 records max per invocation
const THROTTLE_MS = 700;
const DELETE_BATCH = 3;
const DELETE_THROTTLE_MS = 600;
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if ((err?.status === 429 || err?.message?.includes('Rate limit')) && attempt < MAX_RETRIES) {
        await sleep(attempt * 3000);
        continue;
      }
      throw err;
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'scan';

    // ── MODE: get_reports — just return all valid report IDs ──
    if (mode === 'get_reports') {
      const ids = [];
      let offset = 0;
      while (true) {
        const page = await withRetry(() =>
          base44.asServiceRole.entities.PONPMReport.filter({}, 'created_date', PAGE_SIZE, offset)
        );
        const arr = Array.isArray(page) ? page : [];
        for (const r of arr) ids.push(r.id);
        if (arr.length < PAGE_SIZE) break;
        offset += arr.length;
        await sleep(THROTTLE_MS);
      }
      return Response.json({ success: true, report_ids: ids });
    }

    // ── MODE: scan — scan a chunk of ONT records for orphaned report_ids ──
    if (mode === 'scan') {
      const validSet = new Set(body.valid_report_ids || []);
      const cursor = body.cursor || 0;
      const orphanedIds = new Set();
      let offset = cursor;
      let scanned = 0;

      for (let p = 0; p < MAX_PAGES_PER_CALL; p++) {
        const page = await withRetry(() =>
          base44.asServiceRole.entities.ONTPerformanceRecord.filter({}, 'created_date', PAGE_SIZE, offset)
        );
        const arr = Array.isArray(page) ? page : [];
        if (arr.length === 0) {
          return Response.json({
            success: true, status: 'complete',
            cursor: null, scanned_this_call: scanned,
            cumulative_offset: offset,
            orphaned_report_ids: Array.from(orphanedIds)
          });
        }

        for (let i = 0; i < arr.length; i++) {
          const rid = arr[i].report_id;
          if (rid && !validSet.has(rid)) orphanedIds.add(rid);
          arr[i] = null; // free memory immediately
        }

        scanned += arr.length;
        offset += arr.length;
        if (arr.length < PAGE_SIZE) {
          return Response.json({
            success: true, status: 'complete',
            cursor: null, scanned_this_call: scanned,
            cumulative_offset: offset,
            orphaned_report_ids: Array.from(orphanedIds)
          });
        }
        await sleep(THROTTLE_MS);
      }

      return Response.json({
        success: true, status: 'in_progress',
        cursor: offset, scanned_this_call: scanned,
        cumulative_offset: offset,
        orphaned_report_ids: Array.from(orphanedIds)
      });
    }

    // ── MODE: count — count records for one report_id ──
    if (mode === 'count') {
      const reportId = body.report_id;
      if (!reportId) return Response.json({ error: 'report_id required' }, { status: 400 });

      let count = 0;
      let offset = 0;
      for (let p = 0; p < MAX_PAGES_PER_CALL; p++) {
        const page = await withRetry(() =>
          base44.asServiceRole.entities.ONTPerformanceRecord.filter(
            { report_id: reportId }, 'created_date', PAGE_SIZE, offset
          )
        );
        const arr = Array.isArray(page) ? page : [];
        count += arr.length;
        if (arr.length < PAGE_SIZE) break;
        offset += arr.length;
        await sleep(THROTTLE_MS);
      }
      return Response.json({ success: true, report_id: reportId, count });
    }

    // ── MODE: delete — delete one small batch for a report_id ──
    if (mode === 'delete') {
      const reportId = body.report_id;
      if (!reportId) return Response.json({ error: 'report_id required' }, { status: 400 });

      const page = await withRetry(() =>
        base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { report_id: reportId }, 'created_date', PAGE_SIZE
        )
      );
      const arr = Array.isArray(page) ? page : [];
      if (arr.length === 0) {
        return Response.json({ success: true, deleted: 0, remaining: false });
      }

      let deleted = 0;
      for (let i = 0; i < arr.length; i += DELETE_BATCH) {
        const batch = arr.slice(i, i + DELETE_BATCH);
        const results = await Promise.allSettled(
          batch.map((rec) => withRetry(() =>
            base44.asServiceRole.entities.ONTPerformanceRecord.delete(rec.id)
          ))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') deleted++;
        }
        await sleep(DELETE_THROTTLE_MS);
      }

      return Response.json({ success: true, deleted, remaining: arr.length === PAGE_SIZE });
    }

    return Response.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});