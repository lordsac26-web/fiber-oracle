import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Orphaned ONT Record Cleanup — Chunked, Timeout-Safe Version
 * 
 * This function works in small time-boxed chunks to avoid gateway timeouts.
 * 
 * Modes:
 *   1. "scan" (default) — Fetches all valid report IDs, then scans a chunk
 *      of ONT records to discover orphaned report_ids. Returns partial
 *      results with a cursor so the frontend can call again to continue.
 *   2. "delete" — Deletes a batch of orphans for a specific report_id.
 *
 * The frontend orchestrates by calling scan repeatedly until done,
 * then calling delete for each orphaned report_id.
 */

const FETCH_SIZE = 50;
const DELETE_BATCH = 5;
const THROTTLE_MS = 600;
const DELETE_THROTTLE_MS = 500;
const MAX_SCAN_TIME_MS = 20000; // Stop scanning after 20s to stay under gateway timeout
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label = '') {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('Rate limit');
      if (is429 && attempt < MAX_RETRIES) {
        const backoff = attempt * 3000;
        console.log(`[retry] ${label} rate-limited, waiting ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function getAllValidReportIds(base44) {
  const ids = new Set();
  let offset = 0;
  while (true) {
    const page = await withRetry(
      () => base44.asServiceRole.entities.PONPMReport.filter({}, 'created_date', FETCH_SIZE, offset),
      'reports'
    );
    const arr = Array.isArray(page) ? page : [];
    if (arr.length === 0) break;
    for (const r of arr) ids.add(r.id);
    offset += arr.length;
    if (arr.length < FETCH_SIZE) break;
    await sleep(THROTTLE_MS);
  }
  return ids;
}

async function handleScan(base44, cursor) {
  const startTime = Date.now();
  const validReportIds = await getAllValidReportIds(base44);
  
  const orphanedReportIds = new Set();
  let scanOffset = cursor || 0;
  let totalScanned = scanOffset; // cumulative from previous calls
  let pagesThisRun = 0;

  while (true) {
    // Time-box check
    if (Date.now() - startTime > MAX_SCAN_TIME_MS) {
      console.log(`Time limit reached at offset ${scanOffset}, returning partial results`);
      return {
        status: 'in_progress',
        cursor: scanOffset,
        total_scanned: totalScanned,
        valid_reports: validReportIds.size,
        orphaned_report_ids: Array.from(orphanedReportIds),
        message: `Scanned ${totalScanned} records so far, continuing...`
      };
    }

    const page = await withRetry(
      () => base44.asServiceRole.entities.ONTPerformanceRecord.filter({}, 'created_date', FETCH_SIZE, scanOffset),
      'ont-scan'
    );
    const arr = Array.isArray(page) ? page : [];
    if (arr.length === 0) break;

    for (const rec of arr) {
      if (rec.report_id && !validReportIds.has(rec.report_id)) {
        orphanedReportIds.add(rec.report_id);
      }
    }

    totalScanned += arr.length;
    scanOffset += arr.length;
    pagesThisRun++;

    if (arr.length < FETCH_SIZE) break;
    await sleep(THROTTLE_MS);
  }

  return {
    status: 'complete',
    cursor: null,
    total_scanned: totalScanned,
    valid_reports: validReportIds.size,
    orphaned_report_ids: Array.from(orphanedReportIds),
    message: orphanedReportIds.size === 0
      ? `Scanned ${totalScanned} records. No orphaned records found — database is clean.`
      : `Scanned ${totalScanned} records. Found orphans in ${orphanedReportIds.size} missing report(s).`
  };
}

async function handleDelete(base44, reportId) {
  const startTime = Date.now();
  let deleted = 0;
  let remaining = true;

  while (remaining && (Date.now() - startTime < MAX_SCAN_TIME_MS)) {
    const page = await withRetry(
      () => base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id: reportId }, 'created_date', FETCH_SIZE
      ),
      `fetch-${reportId}`
    );
    const arr = Array.isArray(page) ? page : [];
    if (arr.length === 0) {
      remaining = false;
      break;
    }

    for (let i = 0; i < arr.length; i += DELETE_BATCH) {
      const batch = arr.slice(i, i + DELETE_BATCH);
      const results = await Promise.allSettled(
        batch.map((rec) => withRetry(
          () => base44.asServiceRole.entities.ONTPerformanceRecord.delete(rec.id),
          `del-${rec.id}`
        ))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') deleted++;
      }
      await sleep(DELETE_THROTTLE_MS);
    }

    await sleep(THROTTLE_MS);
  }

  return {
    report_id: reportId,
    deleted,
    remaining,
    message: remaining
      ? `Deleted ${deleted} records for report ${reportId}, more remain — call again.`
      : `Deleted ${deleted} records for report ${reportId}. Complete.`
  };
}

async function handleCount(base44, reportId) {
  let count = 0;
  let offset = 0;
  while (true) {
    const page = await withRetry(
      () => base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id: reportId }, 'created_date', FETCH_SIZE, offset
      ),
      `count-${reportId}`
    );
    const arr = Array.isArray(page) ? page : [];
    count += arr.length;
    if (arr.length < FETCH_SIZE) break;
    offset += arr.length;
    await sleep(THROTTLE_MS);

    // Time safety — if counting takes too long, return estimate
    if (offset > 2000) {
      return { report_id: reportId, count, estimated: true };
    }
  }
  return { report_id: reportId, count, estimated: false };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'scan';

    if (mode === 'scan') {
      const result = await handleScan(base44, body.cursor || 0);
      return Response.json({ success: true, ...result });
    }

    if (mode === 'count') {
      if (!body.report_id) return Response.json({ error: 'report_id required' }, { status: 400 });
      const result = await handleCount(base44, body.report_id);
      return Response.json({ success: true, ...result });
    }

    if (mode === 'delete') {
      if (!body.report_id) return Response.json({ error: 'report_id required' }, { status: 400 });
      const result = await handleDelete(base44, body.report_id);
      return Response.json({ success: true, ...result });
    }

    return Response.json({ error: `Unknown mode: ${mode}` }, { status: 400 });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});