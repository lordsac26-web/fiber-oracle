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
    const PAGE_SIZE = 200;
    const CONCURRENT = 5;   // parallel deletes per micro-batch
    const BATCH_DELAY = 200; // ms between micro-batches

    while (true) {
      const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id },
        null,
        PAGE_SIZE
      );

      if (!records || records.length === 0) break;

      console.log(`Deleting batch of ${records.length} records...`);

      // Process in small concurrent slices to avoid DB timeouts
      for (let i = 0; i < records.length; i += CONCURRENT) {
        const slice = records.slice(i, i + CONCURRENT);
        const results = await Promise.allSettled(
          slice.map(r => base44.asServiceRole.entities.ONTPerformanceRecord.delete(r.id))
        );
        totalDeleted += results.filter(r => r.status === 'fulfilled').length;
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }

      console.log(`Progress: ${totalDeleted} records deleted`);

      if (records.length < PAGE_SIZE) break;
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