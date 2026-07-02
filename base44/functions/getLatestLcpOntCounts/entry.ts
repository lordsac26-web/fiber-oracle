import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only: exposes aggregated LCP/splitter ONT counts and per-LCP health
    // status derived from ONTPerformanceRecord — sensitive network topology data.
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedReportIds = body.report_ids; // optional array

    let reportsToProcess = [];

    if (Array.isArray(requestedReportIds) && requestedReportIds.length > 0) {
      const allReports = await base44.entities.PONPMReport.filter(
        { processing_status: 'completed' },
        'upload_date',
        100
      );
      reportsToProcess = allReports.filter(r => requestedReportIds.includes(r.id));
    } else {
      // Default: latest report
      const reports = await base44.entities.PONPMReport.list('-upload_date', 1);
      const latestReport = reports[0] || null;

      if (!latestReport) {
        return Response.json({ success: true, report: null, counts: {}, lcpSummary: {} });
      }

      const { counts, lcpSummary } = await aggregateCountsForReport(base44, latestReport.id);

      return Response.json({
        success: true,
        report: {
          id: latestReport.id,
          report_name: latestReport.report_name,
          upload_date: latestReport.upload_date,
        },
        counts,
        lcpSummary,
      });
    }

    // Multi-report mode
    const results = [];
    for (let i = 0; i < reportsToProcess.length; i++) {
      const report = reportsToProcess[i];
      const { counts, lcpSummary } = await aggregateCountsForReport(base44, report.id);
      results.push({
        reportId: report.id,
        reportName: report.report_name,
        date: report.upload_date,
        counts,
        lcpSummary,
      });
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
  // counts: legacy per-splitter count { "lcpNum|splitterNum": number }
  // lcpSummary: per-LCP aggregated { "lcpNum": { total, ok, warning, critical, offline } }
  const counts = {};
  const lcpSummary = {};
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
      const lcpNumber = (record.lcp_number || '').trim();
      const splitterNumber = (record.splitter_number || '').trim();
      if (!lcpNumber) continue;

      // Legacy splitter-level count
      const key = `${lcpNumber.toUpperCase()}|${splitterNumber.toUpperCase()}`;
      counts[key] = (counts[key] || 0) + 1;

      // Per-LCP status summary (case-preserved lcp_number for frontend matching)
      if (!lcpSummary[lcpNumber]) {
        lcpSummary[lcpNumber] = { total: 0, ok: 0, warning: 0, critical: 0, offline: 0 };
      }
      lcpSummary[lcpNumber].total += 1;
      const status = (record.status || 'ok').toLowerCase();
      if (status === 'critical') lcpSummary[lcpNumber].critical += 1;
      else if (status === 'warning') lcpSummary[lcpNumber].warning += 1;
      else if (status === 'offline') lcpSummary[lcpNumber].offline += 1;
      else lcpSummary[lcpNumber].ok += 1;
    }

    if (page.length < pageSize) break;
    skip += pageSize;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { counts, lcpSummary };
}