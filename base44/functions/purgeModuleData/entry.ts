import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin check
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { module_type } = await req.json();

    if (!module_type) {
      return Response.json(
        { error: 'module_type is required' },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    // Purge PON PM data (reports + associated ONT records)
    if (module_type === 'pon_pm_all') {
      // Get all reports to delete their associated ONT records
      const reports = await base44.asServiceRole.entities.PONPMReport.list('-created_date', 10000);
      const reportIds = reports.map(r => r.id);

      // Delete ONT records for these reports
      if (reportIds.length > 0) {
        const ontRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.list('-created_date', 100000);
        const recordsToDelete = ontRecords.filter(r => reportIds.includes(r.report_id));
        
        for (const record of recordsToDelete) {
          await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
          deletedCount++;
        }
      }

      // Delete the reports themselves
      for (const report of reports) {
        await base44.asServiceRole.entities.PONPMReport.delete(report.id);
        deletedCount++;
      }

      return Response.json({
        success: true,
        message: `Purged ${deletedCount} PON PM records and reports`,
      });
    }

    // Purge LCP data
    if (module_type === 'lcp_all') {
      const lcpEntries = await base44.asServiceRole.entities.LCPEntry.list('-created_date', 10000);
      for (const entry of lcpEntries) {
        await base44.asServiceRole.entities.LCPEntry.delete(entry.id);
        deletedCount++;
      }

      return Response.json({
        success: true,
        message: `Purged ${deletedCount} LCP entries`,
      });
    }

    // Purge Job Reports
    if (module_type === 'job_reports_all') {
      const jobReports = await base44.asServiceRole.entities.JobReport.list('-created_date', 10000);
      for (const report of jobReports) {
        await base44.asServiceRole.entities.JobReport.delete(report.id);
        deletedCount++;
      }

      return Response.json({
        success: true,
        message: `Purged ${deletedCount} job reports`,
      });
    }

    // Purge Test Reports
    if (module_type === 'test_reports_all') {
      const testReports = await base44.asServiceRole.entities.TestReport.list('-created_date', 10000);
      for (const report of testReports) {
        await base44.asServiceRole.entities.TestReport.delete(report.id);
        deletedCount++;
      }

      return Response.json({
        success: true,
        message: `Purged ${deletedCount} test reports`,
      });
    }

    return Response.json(
      { error: 'Invalid module_type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Purge error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});