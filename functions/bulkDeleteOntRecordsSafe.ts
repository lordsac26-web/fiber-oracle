import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { record_ids } = await req.json();

    if (!record_ids || !Array.isArray(record_ids)) {
      return Response.json({ error: 'record_ids array is required' }, { status: 400 });
    }

    // Limit to 500 records at a time to prevent timeouts
    if (record_ids.length > 500) {
      return Response.json({ 
        error: 'Too many records. Please delete in batches of 500 or fewer.' 
      }, { status: 400 });
    }

    let deletedCount = 0;
    const errors = [];

    // Delete records one by one with small delays
    for (const id of record_ids) {
      try {
        await base44.asServiceRole.entities.ONTPerformanceRecord.delete(id);
        deletedCount++;
        
        // Small delay every 10 records to avoid rate limits
        if (deletedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (err) {
        errors.push({ id, error: err.message });
      }
    }

    return Response.json({ 
      success: true,
      deleted: deletedCount,
      failed: errors.length,
      errors: errors.slice(0, 10) // Only return first 10 errors
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});