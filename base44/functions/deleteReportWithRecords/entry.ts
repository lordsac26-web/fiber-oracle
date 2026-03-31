import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PAGE_SIZE = 100;
const CONCURRENT = 2;
const BATCH_DELAY = 500;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function deleteWithRetry(base44, entityName, id) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await base44.asServiceRole.entities[entityName].delete(id);
      return;
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.originalError?.response?.status;
      if (status !== 429 || attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(400 * (attempt + 1));
    }
  }

  throw lastError;
}

function extractArray(result) {
  if (Array.isArray(result)) return result;
  if (result?.items && Array.isArray(result.items)) return result.items;
  if (result?.data && Array.isArray(result.data)) return result.data;
  return [];
}

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

    const { report_id } = await req.json();

    if (!report_id) {
      return Response.json({ error: 'Missing report_id' }, { status: 400 });
    }

    // Check the report exists before we start
    const report = await base44.asServiceRole.entities.PONPMReport.get(report_id).catch(() => null);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    let deletedCount = 0;

    while (true) {
      const raw = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id: report_id },
        '-created_date',
        PAGE_SIZE
      );

      const page = extractArray(raw);
      if (page.length === 0) break;

      for (let i = 0; i < page.length; i += CONCURRENT) {
        const slice = page.slice(i, i + CONCURRENT);
        const results = await Promise.allSettled(
          slice.map((record) => deleteWithRetry(base44, 'ONTPerformanceRecord', record.id))
        );

        const failed = results.find((result) => result.status === 'rejected');
        if (failed) {
          throw failed.reason;
        }

        deletedCount += slice.length;
        await sleep(BATCH_DELAY);
      }
    }

    // Verify all child records are gone
    const remainingRaw = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
      { report_id: report_id },
      '-created_date',
      1
    );

    const remainingRecords = extractArray(remainingRaw);

    if (remainingRecords.length > 0) {
      return Response.json({
        success: false,
        error: 'Some ONT records could not be deleted. Please retry.',
        deletedRecords: deletedCount,
      }, { status: 429 });
    }

    await deleteWithRetry(base44, 'PONPMReport', report_id);

    return Response.json({
      success: true,
      deletedRecords: deletedCount,
      message: `Deleted report and ${deletedCount} ONT records`,
    });
  } catch (error) {
    console.error('Delete report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});