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

    const { module_type, data } = await req.json();

    if (!module_type || !data) {
      return Response.json({ error: 'module_type and data are required' }, { status: 400 });
    }

    // Validate data format
    if (data.module !== module_type.replace('_all', '')) {
      return Response.json({ 
        error: `Invalid backup file. Expected ${module_type.replace('_all', '')} module data.` 
      }, { status: 400 });
    }

    let importedCount = 0;
    const chunkSize = 50;

    switch (module_type) {
      case 'pon_pm_all':
        // Import reports first
        if (data.reports && data.reports.length > 0) {
          for (const report of data.reports) {
            const { id, created_date, updated_date, created_by, ...reportData } = report;
            await base44.entities.PONPMReport.create(reportData);
          }
        }

        // Import ONT records in chunks
        if (data.records && data.records.length > 0) {
          for (let i = 0; i < data.records.length; i += chunkSize) {
            const chunk = data.records.slice(i, i + chunkSize);
            const cleanedChunk = chunk.map(record => {
              const { id, created_date, updated_date, created_by, ...recordData } = record;
              return recordData;
            });
            await base44.asServiceRole.entities.ONTPerformanceRecord.bulkCreate(cleanedChunk);
            importedCount += chunk.length;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        return Response.json({ 
          success: true, 
          imported_reports: data.reports?.length || 0,
          imported_records: importedCount,
          message: `Imported ${data.reports?.length || 0} reports and ${importedCount} records`
        });

      case 'lcp_all':
        if (data.entries && data.entries.length > 0) {
          for (let i = 0; i < data.entries.length; i += chunkSize) {
            const chunk = data.entries.slice(i, i + chunkSize);
            const cleanedChunk = chunk.map(entry => {
              const { id, created_date, updated_date, created_by, ...entryData } = entry;
              return entryData;
            });
            await base44.entities.LCPEntry.bulkCreate(cleanedChunk);
            importedCount += chunk.length;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        return Response.json({ 
          success: true, 
          imported_entries: importedCount,
          message: `Imported ${importedCount} LCP entries`
        });

      case 'job_reports_all':
        if (data.reports && data.reports.length > 0) {
          for (let i = 0; i < data.reports.length; i += chunkSize) {
            const chunk = data.reports.slice(i, i + chunkSize);
            const cleanedChunk = chunk.map(report => {
              const { id, created_date, updated_date, created_by, ...reportData } = report;
              return reportData;
            });
            await base44.entities.JobReport.bulkCreate(cleanedChunk);
            importedCount += chunk.length;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        return Response.json({ 
          success: true, 
          imported_reports: importedCount,
          message: `Imported ${importedCount} job reports`
        });

      case 'test_reports_all':
        if (data.reports && data.reports.length > 0) {
          for (let i = 0; i < data.reports.length; i += chunkSize) {
            const chunk = data.reports.slice(i, i + chunkSize);
            const cleanedChunk = chunk.map(report => {
              const { id, created_date, updated_date, created_by, ...reportData } = report;
              return reportData;
            });
            await base44.entities.TestReport.bulkCreate(cleanedChunk);
            importedCount += chunk.length;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        return Response.json({ 
          success: true, 
          imported_reports: importedCount,
          message: `Imported ${importedCount} test reports`
        });

      default:
        return Response.json({ error: 'Invalid module_type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Import module data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});