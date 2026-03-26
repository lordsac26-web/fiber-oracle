import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedReportIds = body.report_ids; // optional array

    let reportsToProcess = [];

    if (Array.isArray(requestedReportIds) && requestedReportIds.length > 0) {
      // Fetch specific reports by ID
      const allReports = await base44.entities.PONPMReport.filter(
        { processing_status: 'completed' },
        'upload_date',
        100
      );
      reportsToProcess = allReports.filter(r => requestedReportIds.includes(r.id));
    } else {
      // Legacy behavior: just return the latest report
      const reports = await base44.entities.PONPMReport.list('-upload_date', 1);
      const latestReport = reports[0] || null;

      if (!latestReport) {
        return Response.json({ success: true, report: null, counts: {} });
      }

      const counts = await aggregateCountsForReport(base44, latestReport.id);

      return Response.json({
        success: true,
        report: {
          id: latestReport.id,
          report_name: latestReport.report_name,
          upload_date: latestReport.upload_date,
        },
        counts,
      });
    }

    // Multi-report mode: aggregate counts per report
    const results = [];
    for (let i = 0; i < reportsToProcess.length; i++) {
      const report = reportsToProcess[i];
      const counts = await aggregateCountsForReport(base44, report.id);
      results.push({
        reportId: report.id,
        reportName: report.report_name,
        date: report.upload_date,
        counts,
      });
      // Small delay between reports to avoid rate limiting
      if (i < reportsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('LCP count error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function aggregateCountsForReport(base44, reportId) {
  const counts = {};
  const pageSize = 2000;
  let skip = 0;

  while (true) {
    const page = await base44.entities.ONTPerformanceRecord.filter(
      { report_id: reportId },
      '-created_date',
      pageSize,
      skip
    );

    if (!page.length) break;

    for (const record of page) {
      const lcpNumber = (record.lcp_number || '').trim().toUpperCase();
      const splitterNumber = (record.splitter_number || '').trim().toUpperCase();
      if (!lcpNumber) continue;
      const key = `${lcpNumber}|${splitterNumber}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    if (page.length < pageSize) break;
    skip += pageSize;
    // Small delay between pages to be rate-limit friendly
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return counts;
}