import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Orphaned ONT Record Cleanup — Memory-Efficient Version
 * 
 * Strategy:
 * 1. Get all valid PONPMReport IDs (small set, typically <100)
 * 2. Get a sample of ONT records to discover unique report_id values
 *    WITHOUT loading everything into memory at once
 * 3. Compare discovered report_ids against valid set
 * 4. For each orphaned report_id, delete its records in small batches
 */

const FETCH_SIZE = 50;
const DELETE_BATCH = 5;
const THROTTLE_MS = 600;
const DELETE_THROTTLE_MS = 500;
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label = '') {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('Rate limit');
      if (is429 && attempt < MAX_RETRIES) {
        const backoff = attempt * 3000;
        console.log(`[retry] ${label} rate-limited, waiting ${backoff}ms (attempt ${attempt})`);
        await sleep(backoff);
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
    const dryRun = body.dry_run !== false;

    // ── Step 1: Get all valid report IDs ──
    console.log('Step 1: Fetching valid report IDs...');
    const validReportIds = new Set();
    let offset = 0;

    while (true) {
      const page = await withRetry(
        () => base44.asServiceRole.entities.PONPMReport.filter({}, 'created_date', FETCH_SIZE, offset),
        'reports'
      );
      const arr = Array.isArray(page) ? page : [];
      if (arr.length === 0) break;

      for (const r of arr) validReportIds.add(r.id);
      offset += arr.length;
      if (arr.length < FETCH_SIZE) break;
      await sleep(THROTTLE_MS);
    }
    console.log(`Found ${validReportIds.size} valid reports`);

    // ── Step 2: Discover distinct report_ids from ONT records ──
    // We only need to find the unique report_id values, not hold all records.
    // Scan pages, extract report_ids, discard the rest immediately.
    console.log('Step 2: Discovering ONT report_id values...');
    const discoveredReportIds = new Set();
    let scanOffset = 0;
    let totalScanned = 0;

    while (true) {
      const page = await withRetry(
        () => base44.asServiceRole.entities.ONTPerformanceRecord.filter({}, 'created_date', FETCH_SIZE, scanOffset),
        'ont-scan'
      );
      const arr = Array.isArray(page) ? page : [];
      if (arr.length === 0) break;

      for (const rec of arr) {
        if (rec.report_id) discoveredReportIds.add(rec.report_id);
      }

      totalScanned += arr.length;
      scanOffset += arr.length;

      if (totalScanned % 250 === 0) {
        console.log(`  Scanned ${totalScanned} records, ${discoveredReportIds.size} distinct report_ids`);
      }

      if (arr.length < FETCH_SIZE) break;
      // Let GC reclaim before next fetch
      await sleep(THROTTLE_MS);
    }

    console.log(`Scan complete: ${totalScanned} records, ${discoveredReportIds.size} distinct report_ids`);

    // ── Step 3: Identify orphaned report_ids ──
    const orphanedReportIds = [];
    for (const rid of discoveredReportIds) {
      if (!validReportIds.has(rid)) {
        orphanedReportIds.push(rid);
      }
    }

    console.log(`Found ${orphanedReportIds.length} orphaned report_id(s)`);

    if (orphanedReportIds.length === 0) {
      return Response.json({
        success: true,
        dry_run: dryRun,
        total_scanned: totalScanned,
        valid_reports: validReportIds.size,
        orphaned_report_ids: 0,
        orphaned_records: 0,
        deleted_records: 0,
        message: 'No orphaned ONT records found. Database is clean.'
      });
    }

    // ── Step 4: Count (and optionally delete) per orphaned report_id ──
    let totalOrphaned = 0;
    let totalDeleted = 0;

    for (const reportId of orphanedReportIds) {
      console.log(`Processing orphaned report_id: ${reportId}`);

      // Repeatedly fetch + delete until no more records remain for this report_id
      while (true) {
        const page = await withRetry(
          () => base44.asServiceRole.entities.ONTPerformanceRecord.filter(
            { report_id: reportId }, 'created_date', FETCH_SIZE
          ),
          `fetch-${reportId}`
        );
        const arr = Array.isArray(page) ? page : [];
        if (arr.length === 0) break;

        totalOrphaned += arr.length;

        if (dryRun) {
          // In dry-run, we just count. Use offset to paginate.
          // But since we aren't deleting, we need to advance past these.
          // If we get a full page, there may be more; break after one pass
          // and estimate conservatively.
          if (arr.length === FETCH_SIZE) {
            // Count remaining with offset pagination
            let countOffset = FETCH_SIZE;
            while (true) {
              const nextPage = await withRetry(
                () => base44.asServiceRole.entities.ONTPerformanceRecord.filter(
                  { report_id: reportId }, 'created_date', FETCH_SIZE, countOffset
                ),
                `count-${reportId}`
              );
              const nextArr = Array.isArray(nextPage) ? nextPage : [];
              if (nextArr.length === 0) break;
              totalOrphaned += nextArr.length;
              countOffset += nextArr.length;
              if (nextArr.length < FETCH_SIZE) break;
              await sleep(THROTTLE_MS);
            }
          }
          break; // Move to next report_id
        }

        // Not dry run — delete this batch
        for (let i = 0; i < arr.length; i += DELETE_BATCH) {
          const batch = arr.slice(i, i + DELETE_BATCH);
          const results = await Promise.allSettled(
            batch.map((rec) => withRetry(
              () => base44.asServiceRole.entities.ONTPerformanceRecord.delete(rec.id),
              `del-${rec.id}`
            ))
          );
          for (const r of results) {
            if (r.status === 'fulfilled') totalDeleted++;
          }
          await sleep(DELETE_THROTTLE_MS);
        }

        // After deleting a page, the next fetch (no offset) will get the next batch
        await sleep(THROTTLE_MS);
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      total_scanned: totalScanned,
      valid_reports: validReportIds.size,
      orphaned_report_ids: orphanedReportIds.length,
      orphaned_report_id_list: orphanedReportIds,
      orphaned_records: totalOrphaned,
      deleted_records: totalDeleted,
      message: dryRun
        ? `Found ${totalOrphaned} orphaned ONT records across ${orphanedReportIds.length} missing report(s). Run with dry_run=false to delete.`
        : `Deleted ${totalDeleted} of ${totalOrphaned} orphaned ONT records from ${orphanedReportIds.length} missing report(s).`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});