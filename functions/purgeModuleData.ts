import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { module_type, report_id } = await req.json();

    if (!module_type) {
      return Response.json({ error: 'module_type is required' }, { status: 400 });
    }

    let deletedCount = 0;
    let entityName = '';

    switch (module_type) {
      case 'pon_pm_all':
        // Delete all ONT performance records using service role for efficiency
        entityName = 'ONTPerformanceRecord';
        const ontRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter({});
        
        for (const record of ontRecords) {
          await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
          deletedCount++;
          // Rate limiting delay - much slower to avoid 429 errors
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Delete all PON PM reports
        const reports = await base44.asServiceRole.entities.PONPMReport.filter({});
        for (const report of reports) {
          await base44.asServiceRole.entities.PONPMReport.delete(report.id);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        return Response.json({ 
          success: true, 
          deleted_records: deletedCount,
          deleted_reports: reports.length,
          message: `Purged all PON PM data: ${deletedCount} records and ${reports.length} reports`
        });

      case 'pon_pm_report':
        // Delete ONT records for a specific report
        if (!report_id) {
          return Response.json({ error: 'report_id required for pon_pm_report' }, { status: 400 });
        }
        
        entityName = 'ONTPerformanceRecord';
        const reportRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter({ report_id });
        
        for (const record of reportRecords) {
          await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
          deletedCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Delete the report itself
        await base44.asServiceRole.entities.PONPMReport.delete(report_id);
        
        return Response.json({ 
          success: true, 
          deleted_records: deletedCount,
          message: `Purged report data: ${deletedCount} records and 1 report`
        });

      case 'lcp_all':
        // Delete all LCP entries
        entityName = 'LCPEntry';
        const lcpEntries = await base44.asServiceRole.entities.LCPEntry.filter({});
        
        for (const entry of lcpEntries) {
          await base44.asServiceRole.entities.LCPEntry.delete(entry.id);
          deletedCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return Response.json({ 
          success: true, 
          deleted_records: deletedCount,
          message: `Purged all LCP data: ${deletedCount} entries`
        });

      case 'job_reports_all':
        // Delete all job reports
        entityName = 'JobReport';
        const jobReports = await base44.asServiceRole.entities.JobReport.filter({});
        
        for (const report of jobReports) {
          await base44.asServiceRole.entities.JobReport.delete(report.id);
          deletedCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return Response.json({ 
          success: true, 
          deleted_records: deletedCount,
          message: `Purged all job reports: ${deletedCount} reports`
        });

      case 'test_reports_all':
        // Delete all test reports
        entityName = 'TestReport';
        const testReports = await base44.asServiceRole.entities.TestReport.filter({});
        
        for (const report of testReports) {
          await base44.asServiceRole.entities.TestReport.delete(report.id);
          deletedCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return Response.json({ 
          success: true, 
          deleted_records: deletedCount,
          message: `Purged all test reports: ${deletedCount} reports`
        });

      default:
        return Response.json({ error: 'Invalid module_type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Purge module data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});