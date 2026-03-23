import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reports = await base44.asServiceRole.entities.PONPMReport.list('-upload_date', 1);
    const latestReport = reports[0] || null;

    if (!latestReport) {
      return Response.json({ success: true, report: null, counts: {} });
    }

    const counts = {};
    const pageSize = 2000;
    let skip = 0;

    while (true) {
      const page = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id: latestReport.id },
        '-created_date',
        pageSize,
        skip
      );

      if (!page.length) break;

      for (const record of page) {
        const lcpNumber = (record.lcp_number || '').trim().toUpperCase();
        const splitterNumber = (record.splitter_number || '').trim().toUpperCase();
        if (!lcpNumber || !splitterNumber) continue;
        const key = `${lcpNumber}|${splitterNumber}`;
        counts[key] = (counts[key] || 0) + 1;
      }

      if (page.length < pageSize) break;
      skip += pageSize;
    }

    return Response.json({
      success: true,
      report: {
        id: latestReport.id,
        report_name: latestReport.report_name,
        upload_date: latestReport.upload_date,
      },
      counts,
    });
  } catch (error) {
    console.error('Latest LCP count error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});