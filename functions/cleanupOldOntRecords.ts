import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { days_old = 90, batch_size = 500 } = await req.json().catch(() => ({}));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_old);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`Deleting ONT records older than ${days_old} days (before ${cutoffDateStr})`);

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch a batch of old records
      const oldRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_date: { $lt: cutoffDateStr } },
        null,
        batch_size
      );

      if (oldRecords.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Deleting batch of ${oldRecords.length} records...`);

      // Delete records one by one to avoid timeout
      for (const record of oldRecords) {
        try {
          await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
          totalDeleted++;
        } catch (err) {
          console.error(`Failed to delete record ${record.id}:`, err.message);
        }
      }

      console.log(`Progress: ${totalDeleted} records deleted so far`);

      // If we got fewer records than batch size, we're done
      if (oldRecords.length < batch_size) {
        hasMore = false;
      }
    }

    return Response.json({
      success: true,
      deleted_count: totalDeleted,
      message: `Successfully deleted ${totalDeleted} ONT records older than ${days_old} days`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});