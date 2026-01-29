import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { 
      days_old = 45, 
      batch_size = 100, 
      max_batches = 20,
      dry_run = false,
      delay_between_deletes = 50,
      delay_between_batches = 3000
    } = await req.json().catch(() => ({}));

    // Validate parameters
    if (days_old < 1 || days_old > 365) {
      return Response.json({ error: 'days_old must be between 1 and 365' }, { status: 400 });
    }
    if (batch_size < 1 || batch_size > 1001) {
      return Response.json({ error: 'batch_size must be between 1 and 100' }, { status: 400 });
    }
    if (max_batches < 1 || max_batches > 50) {
      return Response.json({ error: 'max_batches must be between 1 and 50' }, { status: 400 });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_old);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`${dry_run ? '[DRY RUN] ' : ''}Processing ONT records older than ${days_old} days (before ${cutoffDateStr})`);
    console.log(`Configuration: batch_size=${batch_size}, max_batches=${max_batches}`);

    let totalDeleted = 0;
    let totalFailed = 0;
    let batchCount = 0;
    const failedRecords = [];
    const previewRecords = [];

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (batchCount < max_batches) {
      const oldRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_date: { $lt: cutoffDateStr } },
        null,
        batch_size
      );

      if (oldRecords.length === 0) {
        console.log('No more records to delete');
        break;
      }

      console.log(`Batch ${batchCount + 1}/${max_batches}: Found ${oldRecords.length} records`);

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
        // Actual deletion
        for (const record of oldRecords) {
          try {
            await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
            totalDeleted++;
            
            if (totalDeleted % 10 === 0) {
              console.log(`Progress: ${totalDeleted} records deleted`);
            }
            
            await delay(delay_between_deletes);
          } catch (err) {
            totalFailed++;
            const errorInfo = {
              record_id: record.id,
              serial_number: record.serial_number,
              error: err.message
            };
            failedRecords.push(errorInfo);
            console.error(`Failed to delete record ${record.id}:`, err.message);
            await delay(delay_between_deletes * 3);
          }
        }
      }

      batchCount++;

      if (oldRecords.length < batch_size) {
        console.log('Reached end of records matching criteria');
        break;
      }

      if (batchCount < max_batches) {
        console.log(`Waiting ${delay_between_batches}ms before next batch...`);
        await delay(delay_between_batches);
      }
    }

    const hasMoreRecords = batchCount >= max_batches;

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
      has_more: hasMoreRecords,
      remaining_estimate: remainingCount,
      parameters: {
        days_old,
        batch_size,
        max_batches,
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