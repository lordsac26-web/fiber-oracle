import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use service role to count all records efficiently
    let totalCount = 0;
    let hasMore = true;
    const batchSize = 1000;
    
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { created_by: user.email },
        '-created_date',
        batchSize
      );
      
      totalCount += batch.length;
      hasMore = batch.length === batchSize;
      
      // Safety limit to prevent infinite loops
      if (totalCount > 1000000) break;
    }

    return Response.json({ count: totalCount });
  } catch (error) {
    console.error('Count error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});