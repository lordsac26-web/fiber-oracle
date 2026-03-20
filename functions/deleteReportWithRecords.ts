import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PAGE_SIZE = 100;
const CONCURRENT = 4;
const BATCH_DELAY = 250;
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

    let deletedCount = 0;

    while (true) {
      const page = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id },
        '-created_date',
        PAGE_SIZE
      );

      if (!page || page.length === 0) break;

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

    const remainingRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
      { report_id },
      '-created_date',
      1
    );

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
      message: `Deleted report and ${deletedCount} ONT records`
    });
  } catch (error) {
    console.error('Delete report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});