import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { days_old = 90, batch_size = 50 } = await req.json().catch(() => ({}));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_old);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`Deleting ONT records older than ${days_old} days (before ${cutoffDateStr})`);

    let totalDeleted = 0;
    let batchCount = 0;
    const maxBatches = 5;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (batchCount < maxBatches) {
      const oldRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_date: { $lt: cutoffDateStr } },
        null,
        batch_size
      );

      if (oldRecords.length === 0) {
        console.log('No more records to delete');
        break;
      }

      console.log(`Batch ${batchCount + 1}: Deleting ${oldRecords.length} records...`);

      for (const record of oldRecords) {
        try {
          await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
          totalDeleted++;
          await delay(100);
        } catch (err) {
          console.error(`Failed to delete record ${record.id}:`, err.message);
          await delay(300);
        }
      }

      batchCount++;
      console.log(`Progress: ${totalDeleted} records deleted so far`);

      if (oldRecords.length < batch_size) {
        break;
      }

      await delay(1000);
    }

    const hasMoreRecords = batchCount >= maxBatches;

    return Response.json({
      success: true,
      deleted_count: totalDeleted,
      batches_processed: batchCount,
      has_more: hasMoreRecords,
      message: hasMoreRecords 
        ? `Deleted ${totalDeleted} records. Run again to continue cleanup.`
        : `Successfully deleted ${totalDeleted} ONT records older than ${days_old} days`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});