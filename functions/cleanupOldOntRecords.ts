import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { 
      days_old = 42, 
      batch_size = 20, 
      max_batches = 5,
      dry_run = false,
      run_until_complete = true
    } = await req.json().catch(() => ({}));

    // 150 ops/min = 2.5 ops/sec = 400ms between ops (with buffer: 500ms)
    const RATE_LIMIT_DELAY = 500; // ms between operations
    const BATCH_DELAY = 2000; // ms between batches

    // Validate parameters
    if (days_old < 1 || days_old > 365) {
      return Response.json({ error: 'days_old must be between 1 and 365' }, { status: 400 });
    }
    if (batch_size < 1 || batch_size > 100) {
      return Response.json({ error: 'batch_size must be between 1 and 100' }, { status: 400 });
    }
    if (!run_until_complete && (max_batches < 1 || max_batches > 500)) {
      return Response.json({ error: 'max_batches must be between 1 and 500' }, { status: 400 });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_old);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`${dry_run ? '[DRY RUN] ' : ''}Processing ONT records older than ${days_old} days (before ${cutoffDateStr})`);
    console.log(`Configuration: batch_size=${batch_size}, max_batches=${run_until_complete ? 'unlimited' : max_batches}, rate_limit=150 ops/min`);

    let totalDeleted = 0;
    let totalFailed = 0;
    let batchCount = 0;
    let retryCount = 0;
    const failedRecords = [];
    const previewRecords = [];

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Exponential backoff retry wrapper
    const deleteWithRetry = async (recordId, maxRetries = 3) => {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await base44.asServiceRole.entities.ONTPerformanceRecord.delete(recordId);
          return { success: true };
        } catch (err) {
          lastError = err;
          if (err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit')) {
            const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
            console.log(`Rate limit hit on record ${recordId}, backing off ${backoffDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            retryCount++;
            await delay(backoffDelay);
          } else {
            // Non-rate-limit error, don't retry
            break;
          }
        }
      }
      return { success: false, error: lastError };
    };

    while (run_until_complete || batchCount < max_batches) {
      const oldRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_date: { $lt: cutoffDateStr } },
        null,
        batch_size
      );

      if (oldRecords.length === 0) {
        console.log('No more records to delete');
        break;
      }

      console.log(`Batch ${batchCount + 1}${run_until_complete ? '' : `/${max_batches}`}: Found ${oldRecords.length} records`);

      if (dry_run) {
        // In dry run mode, just collect preview data
        previewRecords.push(...oldRecords.slice(0, 5).map(r => ({
          id: r.id,
          serial_number: r.serial_number,
          report_date: r.report_date,
          olt_name: r.olt_name
        })));
        totalDeleted += oldRecords.length;
      } else {
        // Actual deletion with rate limiting and retry
        for (const record of oldRecords) {
          const result = await deleteWithRetry(record.id);
          
          if (result.success) {
            totalDeleted++;
            if (totalDeleted % 10 === 0) {
              console.log(`Progress: ${totalDeleted} records deleted, ${retryCount} retries`);
            }
          } else {
            totalFailed++;
            const errorInfo = {
              record_id: record.id,
              serial_number: record.serial_number,
              error: result.error.message
            };
            failedRecords.push(errorInfo);
            console.error(`Failed to delete record ${record.id}:`, result.error.message);
          }
          
          // Rate limit: 500ms between operations
          await delay(RATE_LIMIT_DELAY);
        }
      }

      batchCount++;

      if (oldRecords.length < batch_size) {
        console.log('Reached end of records matching criteria');
        break;
      }

      if (run_until_complete || batchCount < max_batches) {
        console.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
        await delay(BATCH_DELAY);
      }
    }

    const hasMoreRecords = !run_until_complete && batchCount >= max_batches;

    // Count remaining records if needed
    let remainingCount = 0;
    if (hasMoreRecords || dry_run) {
      const remainingRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_date: { $lt: cutoffDateStr } },
        null,
        1
      );
      if (remainingRecords.length > 0) {
        // Approximate count by checking if records exist
        remainingCount = '1000+';
      }
    }

    return Response.json({
      success: true,
      dry_run,
      deleted_count: totalDeleted,
      failed_count: totalFailed,
      batches_processed: batchCount,
      retry_count: retryCount,
      has_more: hasMoreRecords,
      remaining_estimate: remainingCount,
      parameters: {
        days_old,
        batch_size,
        max_batches: run_until_complete ? 'unlimited' : max_batches,
        run_until_complete,
        cutoff_date: cutoffDateStr
      },
      ...(dry_run && { 
        preview_records: previewRecords,
        message: `DRY RUN: Found ${totalDeleted} records that would be deleted. Set dry_run=false to execute.`
      }),
      ...(failedRecords.length > 0 && { 
        failed_records: failedRecords.slice(0, 10),
        failed_records_truncated: failedRecords.length > 10
      }),
      ...(!dry_run && {
        message: hasMoreRecords 
          ? `Deleted ${totalDeleted} records (${totalFailed} failed). Run again to continue cleanup.`
          : `Successfully deleted ${totalDeleted} ONT records older than ${days_old} days. ${totalFailed > 0 ? `${totalFailed} deletions failed.` : ''}`
      })
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});