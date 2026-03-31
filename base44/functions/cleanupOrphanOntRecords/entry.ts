import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PAGE_SIZE = 100;
const DELETE_BATCH = 5;
const BATCH_DELAY = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const dryRun = body.dry_run !== false; // default to dry run for safety

    // Step 1: Collect all unique report_ids referenced by ONT records
    console.log('Scanning ONT records for unique report_ids...');
    const reportIdSet = new Set();
    let scanOffset = 0;
    let totalScanned = 0;

    while (true) {
      const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        {},
        '-created_date',
        PAGE_SIZE,
        scanOffset
      );

      const page = Array.isArray(records) ? records : [];
      if (page.length === 0) break;

      for (const rec of page) {
        if (rec.report_id) {
          reportIdSet.add(rec.report_id);
        }
      }

      totalScanned += page.length;
      scanOffset += page.length;

      // Safety: pause every few pages to avoid rate limits
      if (scanOffset % (PAGE_SIZE * 3) === 0) {
        await sleep(200);
      }
    }

    console.log(`Scanned ${totalScanned} ONT records, found ${reportIdSet.size} unique report_ids`);

    // Step 2: Check which report_ids still have a valid parent report
    const orphanedReportIds = [];

    for (const reportId of reportIdSet) {
      try {
        await base44.asServiceRole.entities.PONPMReport.get(reportId);
        // Report exists — not orphaned
      } catch (_err) {
        // Report doesn't exist — these ONT records are orphans
        orphanedReportIds.push(reportId);
      }
      await sleep(50); // small delay between lookups
    }

    console.log(`Found ${orphanedReportIds.length} orphaned report_id(s): ${orphanedReportIds.join(', ')}`);

    if (orphanedReportIds.length === 0) {
      return Response.json({
        success: true,
        dry_run: dryRun,
        total_scanned: totalScanned,
        unique_report_ids: reportIdSet.size,
        orphaned_report_ids: 0,
        orphaned_records: 0,
        deleted_records: 0,
        message: 'No orphaned ONT records found. Database is clean.'
      });
    }

    // Step 3: Count and optionally delete orphaned records
    let orphanedCount = 0;
    let deletedCount = 0;

    for (const reportId of orphanedReportIds) {
      let offset = 0;

      while (true) {
        const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { report_id: reportId },
          '-created_date',
          PAGE_SIZE
        );

        const page = Array.isArray(records) ? records : [];
        if (page.length === 0) break;

        orphanedCount += page.length;

        if (dryRun) {
          // In dry run, we still need to paginate using offset since we're not deleting
          offset += page.length;
          // But filter doesn't support offset well for counting, so fetch next page via offset
          const nextPage = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
            { report_id: reportId },
            '-created_date',
            PAGE_SIZE,
            offset
          );
          const next = Array.isArray(nextPage) ? nextPage : [];
          if (next.length === 0) break;
          orphanedCount += next.length;
          offset += next.length;
          // Continue scanning
          if (next.length < PAGE_SIZE) break;
          await sleep(200);
          continue;
        }

        // Not dry run — delete in small batches
        for (let i = 0; i < page.length; i += DELETE_BATCH) {
          const slice = page.slice(i, i + DELETE_BATCH);
          const results = await Promise.allSettled(
            slice.map((rec) => base44.asServiceRole.entities.ONTPerformanceRecord.delete(rec.id))
          );

          for (const result of results) {
            if (result.status === 'fulfilled') deletedCount++;
          }

          await sleep(BATCH_DELAY);
        }
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      total_scanned: totalScanned,
      unique_report_ids: reportIdSet.size,
      orphaned_report_ids: orphanedReportIds.length,
      orphaned_report_id_list: orphanedReportIds,
      orphaned_records: dryRun ? orphanedCount : orphanedCount,
      deleted_records: deletedCount,
      message: dryRun
        ? `Found ${orphanedCount} orphaned ONT records across ${orphanedReportIds.length} missing report(s). Run again with dry_run=false to delete them.`
        : `Deleted ${deletedCount} orphaned ONT records from ${orphanedReportIds.length} missing report(s).`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});