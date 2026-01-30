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

    // Delete all ONT records for this report using service role
    const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter({ report_id }, '-created_date', 10000);
    
    // Delete in small batches with delays to avoid rate limits and timeouts
    const chunkSize = 50;
    let deletedCount = 0;
    
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      
      // Delete chunk sequentially with delay
      for (const record of chunk) {
        await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
        deletedCount++;
      }
      
      // Add delay between chunks to avoid rate limiting
      if (i + chunkSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
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