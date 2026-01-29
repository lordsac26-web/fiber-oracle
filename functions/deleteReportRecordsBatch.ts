import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await req.json();

    if (!report_id) {
      return Response.json({ error: 'report_id is required' }, { status: 400 });
    }

    console.log(`Deleting ONT records for report ${report_id} in batches...`);

    let totalDeleted = 0;
    const batchSize = 100;
    let hasMore = true;

    while (hasMore) {
      // Fetch a batch of records for this report
      const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id },
        null,
        batchSize
      );

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Deleting batch of ${records.length} records...`);

      // Delete in smaller chunks
      for (const record of records) {
        try {
          await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
          totalDeleted++;
        } catch (err) {
          console.error(`Failed to delete record ${record.id}:`, err.message);
        }
      }

      console.log(`Progress: ${totalDeleted} records deleted`);

      if (records.length < batchSize) {
        hasMore = false;
      }
    }

    // Now delete the report itself
    await base44.entities.PONPMReport.delete(report_id);

    return Response.json({
      success: true,
      ont_records_deleted: totalDeleted,
      message: `Deleted report and ${totalDeleted} ONT records`
    });

  } catch (error) {
    console.error('Delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});