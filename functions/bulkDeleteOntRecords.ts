import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { record_ids = [] } = await req.json().catch(() => ({}));

    if (!Array.isArray(record_ids) || record_ids.length === 0) {
      return Response.json({ error: 'record_ids must be a non-empty array' }, { status: 400 });
    }

    if (record_ids.length > 100) {
      return Response.json({ error: 'Cannot delete more than 100 records at once' }, { status: 400 });
    }

    console.log(`Bulk deleting ${record_ids.length} ONT records`);

    let successCount = 0;
    let failCount = 0;
    const failedRecords = [];
    const RATE_LIMIT_DELAY = 500; // 150 ops/min

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (const recordId of record_ids) {
      try {
        await base44.asServiceRole.entities.ONTPerformanceRecord.delete(recordId);
        successCount++;
        await delay(RATE_LIMIT_DELAY);
      } catch (err) {
        failCount++;
        failedRecords.push({ id: recordId, error: err.message });
        console.error(`Failed to delete record ${recordId}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      deleted_count: successCount,
      failed_count: failCount,
      total_requested: record_ids.length,
      ...(failedRecords.length > 0 && { failed_records: failedRecords })
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});