import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BATCH_SIZE = 100;

// Helper to batch delete records
async function batchDeleteRecords(base44, entity, entityName) {
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch batch of records
    const batch = await base44.asServiceRole.entities[entityName].list('-created_date', BATCH_SIZE);
    
    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    // Delete each record in batch
    for (const record of batch) {
      try {
        await base44.asServiceRole.entities[entityName].delete(record.id);
        deletedCount++;
      } catch (err) {
        console.error(`Failed to delete ${entityName} ${record.id}:`, err.message);
      }
    }
  }

  return deletedCount;
}

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
      // First delete all ONT records (associated with reports)
      deletedCount += await batchDeleteRecords(base44, ONTPerformanceRecord, 'ONTPerformanceRecord');
      // Then delete all reports
      deletedCount += await batchDeleteRecords(base44, PONPMReport, 'PONPMReport');

      return Response.json({
        success: true,
        message: `Purged ${deletedCount} PON PM records and reports`,
      });
    }

    // Purge LCP data
    if (module_type === 'lcp_all') {
      deletedCount = await batchDeleteRecords(base44, LCPEntry, 'LCPEntry');
      return Response.json({
        success: true,
        message: `Purged ${deletedCount} LCP entries`,
      });
    }

    // Purge Job Reports
    if (module_type === 'job_reports_all') {
      deletedCount = await batchDeleteRecords(base44, JobReport, 'JobReport');
      return Response.json({
        success: true,
        message: `Purged ${deletedCount} job reports`,
      });
    }

    // Purge Test Reports
    if (module_type === 'test_reports_all') {
      deletedCount = await batchDeleteRecords(base44, TestReport, 'TestReport');
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