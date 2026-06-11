import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Safe batched ONT record deletion
// Uses small concurrent batches with delays to avoid MongoDB timeouts
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

    const { record_ids } = await req.json();

    if (!record_ids || !Array.isArray(record_ids)) {
      return Response.json({ error: 'record_ids array is required' }, { status: 400 });
    }

    if (record_ids.length > 500) {
      return Response.json({ 
        error: 'Too many records. Please delete in batches of 500 or fewer.' 
      }, { status: 400 });
    }

    // Use deleteMany with an $in query — a single API call per chunk instead of
    // one call per record. Per-record deletes were tripping the platform rate
    // limit ("Rate limit exceeded") once selections exceeded ~100 records.
    const CHUNK = 50;
    let deletedCount = 0;
    const errors = [];

    for (let i = 0; i < record_ids.length; i += CHUNK) {
      const slice = record_ids.slice(i, i + CHUNK);
      try {
        const result = await base44.asServiceRole.entities.ONTPerformanceRecord.deleteMany({
          id: { $in: slice }
        });
        deletedCount += result?.deleted_count ?? result?.deletedCount ?? slice.length;
      } catch (err) {
        errors.push({ chunk_start: i, error: err.message || 'unknown' });
      }
    }

    return Response.json({ 
      success: true,
      deleted: deletedCount,
      failed: errors.length > 0 ? record_ids.length - deletedCount : 0,
      errors: errors.slice(0, 10)
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});