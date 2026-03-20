import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only check
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { module_type, report_id } = await req.json();

    if (!module_type) {
      return Response.json({ error: 'module_type is required' }, { status: 400 });
    }

    let deletedCount = 0;
    let entityName = '';

    switch (module_type) {
      case 'pon_pm_all':
        // Delete in batches to avoid timeout
        entityName = 'ONTPerformanceRecord';
        let totalOntRecords = 0;
        let batch;
        
        // Delete ONT records in batches of 100
        do {
          batch = await base44.asServiceRole.entities.ONTPerformanceRecord.list('', 100);
          for (const record of batch) {
            await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
            totalOntRecords++;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (batch.length === 100);

        // Delete all PON PM reports
        let totalReports = 0;
        let ponPmReportBatch;
        do {
          ponPmReportBatch = await base44.asServiceRole.entities.PONPMReport.list('', 100);
          for (const report of ponPmReportBatch) {
            await base44.asServiceRole.entities.PONPMReport.delete(report.id);
            totalReports++;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (ponPmReportBatch.length === 100);
        
        return Response.json({ 
          success: true, 
          deleted_records: totalOntRecords,
          deleted_reports: totalReports,
          message: `Purged all PON PM data: ${totalOntRecords} records and ${totalReports} reports`
        });

      case 'pon_pm_report':
        // Delete ONT records for a specific report
        if (!report_id) {
          return Response.json({ error: 'report_id required for pon_pm_report' }, { status: 400 });
        }
        
        entityName = 'ONTPerformanceRecord';
        let reportRecordCount = 0;
        let reportBatch;
        
        do {
          reportBatch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter({ report_id }, '', 100);
          for (const record of reportBatch) {
            await base44.asServiceRole.entities.ONTPerformanceRecord.delete(record.id);
            reportRecordCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (reportBatch.length === 100);

        // Delete the report itself
        await base44.asServiceRole.entities.PONPMReport.delete(report_id);
        
        return Response.json({ 
          success: true, 
          deleted_records: reportRecordCount,
          message: `Purged report data: ${reportRecordCount} records and 1 report`
        });

      case 'lcp_all':
        // Delete all LCP entries in batches
        entityName = 'LCPEntry';
        let totalLcpEntries = 0;
        let lcpBatch;
        
        do {
          lcpBatch = await base44.asServiceRole.entities.LCPEntry.list('', 100);
          for (const entry of lcpBatch) {
            await base44.asServiceRole.entities.LCPEntry.delete(entry.id);
            totalLcpEntries++;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (lcpBatch.length === 100);
        
        return Response.json({ 
          success: true, 
          deleted_records: totalLcpEntries,
          message: `Purged all LCP data: ${totalLcpEntries} entries`
        });

      case 'job_reports_all':
        // Delete all job reports in batches
        entityName = 'JobReport';
        let totalJobReports = 0;
        let jobBatch;
        
        do {
          jobBatch = await base44.asServiceRole.entities.JobReport.list('', 100);
          for (const report of jobBatch) {
            await base44.asServiceRole.entities.JobReport.delete(report.id);
            totalJobReports++;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (jobBatch.length === 100);
        
        return Response.json({ 
          success: true, 
          deleted_records: totalJobReports,
          message: `Purged all job reports: ${totalJobReports} reports`
        });

      case 'test_reports_all':
        // Delete all test reports in batches
        entityName = 'TestReport';
        let totalTestReports = 0;
        let testBatch;
        
        do {
          testBatch = await base44.asServiceRole.entities.TestReport.list('', 100);
          for (const report of testBatch) {
            await base44.asServiceRole.entities.TestReport.delete(report.id);
            totalTestReports++;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (testBatch.length === 100);
        
        return Response.json({ 
          success: true, 
          deleted_records: totalTestReports,
          message: `Purged all test reports: ${totalTestReports} reports`
        });

      default:
        return Response.json({ error: 'Invalid module_type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Purge module data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});