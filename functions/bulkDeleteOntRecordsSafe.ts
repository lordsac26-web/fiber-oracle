import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Safe batched ONT record deletion
// Uses small concurrent batches with delays to avoid MongoDB timeouts
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { record_ids } = await req.json();

    if (!record_ids || !Array.isArray(record_ids)) {
      return Response.json({ error: 'record_ids array is required' }, { status: 400 });
    }

    if (record_ids.length > 500) {
      return Response.json({ 
        error: 'Too many records. Please delete in batches of 500 or fewer.' 
      }, { status: 400 });
    }

    const CONCURRENT = 5;   // parallel deletes per micro-batch (conservative)
    const BATCH_DELAY = 150; // ms pause between micro-batches
    let deletedCount = 0;
    const errors = [];

    for (let i = 0; i < record_ids.length; i += CONCURRENT) {
      const slice = record_ids.slice(i, i + CONCURRENT);

      const results = await Promise.allSettled(
        slice.map(id => base44.asServiceRole.entities.ONTPerformanceRecord.delete(id))
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j].status === 'fulfilled') {
          deletedCount++;
        } else {
          errors.push({ id: slice[j], error: results[j].reason?.message || 'unknown' });
        }
      }

      // Pause between micro-batches to avoid overwhelming the DB
      if (i + CONCURRENT < record_ids.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    return Response.json({ 
      success: true,
      deleted: deletedCount,
      failed: errors.length,
      errors: errors.slice(0, 10)
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});