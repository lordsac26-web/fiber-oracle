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
      return Response.json({ error: 'Missing report_id' }, { status: 400 });
    }

    // Paginate through all ONT records for this report (may exceed 5000)
    const PAGE_SIZE = 2000;
    let skip = 0;
    let deletedCount = 0;
    const CONCURRENT = 10;   // parallel deletes per micro-batch
    const BATCH_DELAY = 300; // ms between micro-batches to avoid rate limits

    while (true) {
      const page = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id }, '-created_date', PAGE_SIZE, skip
      );
      if (!page || page.length === 0) break;

      // Delete CONCURRENT records at a time within the page
      for (let i = 0; i < page.length; i += CONCURRENT) {
        const slice = page.slice(i, i + CONCURRENT);
        await Promise.all(
          slice.map(r => base44.asServiceRole.entities.ONTPerformanceRecord.delete(r.id))
        );
        deletedCount += slice.length;
        // Brief pause between micro-batches
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }

      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    // Delete the report itself
    await base44.asServiceRole.entities.PONPMReport.delete(report_id);

    return Response.json({ 
      success: true, 
      deletedRecords: deletedCount,
      message: `Deleted report and ${deletedCount} ONT records`
    });

  } catch (error) {
    console.error('Delete report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});