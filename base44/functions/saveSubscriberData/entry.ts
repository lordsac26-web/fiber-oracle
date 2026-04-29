import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { records, file_name } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return Response.json({ error: 'No records provided' }, { status: 400 });
    }

    // 1) Mark any existing active upload as 'replaced'
    const existingMeta = await base44.entities.SubscriberUploadMeta.filter(
      { status: 'active', created_by: user.email }
    );
    for (const meta of existingMeta) {
      await base44.entities.SubscriberUploadMeta.update(meta.id, { status: 'replaced' });
    }

    // 2) Delete all existing subscriber records for this user — paginate to handle >10k
    let deleteOffset = 0;
    const DELETE_PAGE = 500;
    while (true) {
      const existingBatch = await base44.entities.SubscriberRecord.filter(
        { created_by: user.email }, null, DELETE_PAGE, deleteOffset
      );
      if (!existingBatch.length) break;
      // Delete in parallel chunks of 50 for speed
      for (let i = 0; i < existingBatch.length; i += 50) {
        const chunk = existingBatch.slice(i, i + 50);
        await Promise.all(chunk.map(r => base44.entities.SubscriberRecord.delete(r.id)));
      }
      if (existingBatch.length < DELETE_PAGE) break;
      // Don't advance offset — we deleted records so the next page is now at 0
    }

    // 3) Bulk-create new records in chunks of 200 for better throughput
    const CHUNK_SIZE = 200;
    let savedCount = 0;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      await base44.entities.SubscriberRecord.bulkCreate(chunk);
      savedCount += chunk.length;
    }

    // 4) Create upload metadata record
    const meta = await base44.entities.SubscriberUploadMeta.create({
      file_name: file_name || 'subscriber_data.csv',
      record_count: savedCount,
      upload_date: new Date().toISOString(),
      status: 'active',
    });

    return Response.json({
      success: true,
      saved_count: savedCount,
      meta_id: meta.id,
      upload_date: meta.upload_date,
    });
  } catch (error) {
    console.error('Save subscriber data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});