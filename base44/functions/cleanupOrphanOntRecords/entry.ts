import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Orphaned ONT Record Cleanup
 * 
 * Strategy: Instead of scanning ALL ONT records (expensive, rate-limit prone),
 * we first get the small set of valid report IDs, then query ONT records
 * grouped by report_id to find mismatches.
 * 
 * This is much more API-friendly than the naive "scan everything" approach.
 */

const PAGE_SIZE = 50;
const DELETE_BATCH = 5;
const INTER_PAGE_DELAY = 500;   // ms between paginated fetches
const INTER_DELETE_DELAY = 400; // ms between delete batches
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('Rate limit');
      if (is429 && attempt < retries) {
        const backoff = attempt * 2000; // 2s, 4s, 6s
        console.log(`Rate limited, retrying in ${backoff}ms (attempt ${attempt}/${retries})`);
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

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;

    // Step 1: Get all valid PONPMReport IDs (small dataset)
    console.log('Step 1: Fetching all existing report IDs...');
    const validReportIds = new Set();
    let reportOffset = 0;

    while (true) {
      const reports = await withRetry(() =>
        base44.asServiceRole.entities.PONPMReport.filter({}, '-created_date', PAGE_SIZE, reportOffset)
      );
      const page = Array.isArray(reports) ? reports : [];
      if (page.length === 0) break;

      for (const r of page) {
        validReportIds.add(r.id);
      }

      reportOffset += page.length;
      if (page.length < PAGE_SIZE) break;
      await sleep(INTER_PAGE_DELAY);
    }

    console.log(`Found ${validReportIds.size} valid reports`);

    // Step 2: Scan ONT records in pages, collecting orphan IDs
    console.log('Step 2: Scanning ONT records for orphans...');
    const orphanIds = [];
    const orphanedReportIds = new Set();
    let totalScanned = 0;
    let scanOffset = 0;

    while (true) {
      const records = await withRetry(() =>
        base44.asServiceRole.entities.ONTPerformanceRecord.filter({}, '-created_date', PAGE_SIZE, scanOffset)
      );
      const page = Array.isArray(records) ? records : [];
      if (page.length === 0) break;

      for (const rec of page) {
        if (rec.report_id && !validReportIds.has(rec.report_id)) {
          orphanIds.push(rec.id);
          orphanedReportIds.add(rec.report_id);
        }
      }

      totalScanned += page.length;
      scanOffset += page.length;

      // Log progress every 5 pages
      if (scanOffset % (PAGE_SIZE * 5) === 0) {
        console.log(`  Scanned ${totalScanned} records, found ${orphanIds.length} orphans so far...`);
      }

      if (page.length < PAGE_SIZE) break;
      await sleep(INTER_PAGE_DELAY);
    }

    console.log(`Scan complete: ${totalScanned} records scanned, ${orphanIds.length} orphans found across ${orphanedReportIds.size} missing report(s)`);

    if (orphanIds.length === 0) {
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

    // Step 3: Delete orphans (if not dry run)
    let deletedCount = 0;

    if (!dryRun) {
      console.log(`Step 3: Deleting ${orphanIds.length} orphaned records...`);

      for (let i = 0; i < orphanIds.length; i += DELETE_BATCH) {
        const batch = orphanIds.slice(i, i + DELETE_BATCH);
        const results = await Promise.allSettled(
          batch.map((id) => withRetry(() =>
            base44.asServiceRole.entities.ONTPerformanceRecord.delete(id)
          ))
        );

        for (const r of results) {
          if (r.status === 'fulfilled') deletedCount++;
        }

        if (i + DELETE_BATCH < orphanIds.length) {
          await sleep(INTER_DELETE_DELAY);
        }

        // Progress logging every 50 deletes
        if ((i + DELETE_BATCH) % 50 === 0) {
          console.log(`  Deleted ${deletedCount} of ${orphanIds.length}...`);
        }
      }

      console.log(`Deletion complete: ${deletedCount} records removed`);
    }

    const orphanedReportIdList = Array.from(orphanedReportIds);

    return Response.json({
      success: true,
      dry_run: dryRun,
      total_scanned: totalScanned,
      valid_reports: validReportIds.size,
      orphaned_report_ids: orphanedReportIds.size,
      orphaned_report_id_list: orphanedReportIdList,
      orphaned_records: orphanIds.length,
      deleted_records: deletedCount,
      message: dryRun
        ? `Found ${orphanIds.length} orphaned ONT records across ${orphanedReportIds.size} missing report(s). Run again with dry_run=false to delete them.`
        : `Deleted ${deletedCount} of ${orphanIds.length} orphaned ONT records from ${orphanedReportIds.size} missing report(s).`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});