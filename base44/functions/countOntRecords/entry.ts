import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Count all records using service role — records are written by service role,
    // not by user email, so no created_by filter here.
    let totalCount = 0;
    const batchSize = 1000;

    while (true) {
      const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        {},
        'id',
        batchSize,
        totalCount
      );

      totalCount += batch.length;

      if (batch.length < batchSize) break;
      if (totalCount > 1_000_000) break; // safety cap
    }

    return Response.json({ count: totalCount });
  } catch (error) {
    console.error('Count error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});