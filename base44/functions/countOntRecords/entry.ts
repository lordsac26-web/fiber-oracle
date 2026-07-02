import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

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

    // Instead of paginating through potentially hundreds of thousands of
    // ONTPerformanceRecord rows (which causes timeouts), sum the denormalized
    // `ont_count` field stored on each PONPMReport. There are typically only a
    // few dozen reports, so this completes in 1–2 API calls.
    let totalCount = 0;
    let skip = 0;
    const batchSize = 500;

    while (true) {
      const reports = await base44.asServiceRole.entities.PONPMReport.filter(
        {},
        '-created_date',
        batchSize,
        skip
      );

      for (const report of reports) {
        // Only count ONTs from fully-processed reports — pending/failed
        // reports may have incomplete ont_count values.
        if (report.processing_status === 'completed') {
          totalCount += report.ont_count || 0;
        }
      }

      if (reports.length < batchSize) break;
      skip += batchSize;
    }

    return Response.json({ count: totalCount });
  } catch (error) {
    console.error('Count error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});