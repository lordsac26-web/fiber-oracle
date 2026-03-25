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

    const { module_type } = await req.json();

    if (!module_type) {
      return Response.json({ error: 'module_type is required' }, { status: 400 });
    }

    let exportData = {};
    let filename = '';

    switch (module_type) {
      case 'pon_pm_all':
        const ontRecords = await base44.entities.ONTPerformanceRecord.filter({});
        const ponReports = await base44.entities.PONPMReport.filter({});
        
        exportData = {
          module: 'pon_pm',
          exported_at: new Date().toISOString(),
          exported_by: user.email,
          reports: ponReports,
          records: ontRecords
        };
        filename = `pon_pm_backup_${Date.now()}.json`;
        break;

      case 'lcp_all':
        const lcpEntries = await base44.entities.LCPEntry.filter({});
        
        exportData = {
          module: 'lcp',
          exported_at: new Date().toISOString(),
          exported_by: user.email,
          entries: lcpEntries
        };
        filename = `lcp_backup_${Date.now()}.json`;
        break;

      case 'job_reports_all':
        const jobReports = await base44.entities.JobReport.filter({});
        
        exportData = {
          module: 'job_reports',
          exported_at: new Date().toISOString(),
          exported_by: user.email,
          reports: jobReports
        };
        filename = `job_reports_backup_${Date.now()}.json`;
        break;

      case 'test_reports_all':
        const testReports = await base44.entities.TestReport.filter({});
        
        exportData = {
          module: 'test_reports',
          exported_at: new Date().toISOString(),
          exported_by: user.email,
          reports: testReports
        };
        filename = `test_reports_backup_${Date.now()}.json`;
        break;

      default:
        return Response.json({ error: 'Invalid module_type' }, { status: 400 });
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Export module data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});