import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * chunkAllDocuments — Processes all active ReferenceDocuments into searchable chunks.
 * 
 * Strategy: Since listing ReferenceDocuments causes OOM (huge content fields),
 * we use a workaround — fetch document IDs from existing chunks + use the 
 * InvokeLLM integration to query the database metadata.
 * 
 * Actually: use .list() with limit=1 and offset to iterate one doc at a time.
 * Each individual doc fetch works fine, it's only bulk fetches that break.
 * 
 * Call with batch_size and skip to paginate through all docs.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const forceRechunk = body.force || false;
    const batchSize = body.batch_size || 5;
    const skipCount = body.skip || 0;

    console.log(`[chunkAll] Starting. skip=${skipCount}, batch=${batchSize}, force=${forceRechunk}`);

    // Step 1: Iterate through documents ONE AT A TIME to build an index
    // This avoids the OOM from bulk-loading massive content fields
    const docIndex = [];
    let offset = 0;
    let consecutiveErrors = 0;

    while (consecutiveErrors < 3) {
      try {
        const raw = await base44.asServiceRole.entities.ReferenceDocument.list(
          'created_date', 1, offset
        );

        let docs;
        if (typeof raw === 'string') {
          docs = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          docs = raw;
        } else {
          docs = [];
        }

        if (docs.length === 0) break;

        const doc = docs[0];
        docIndex.push({
          id: doc.id,
          title: doc.title,
          is_active: doc.is_active !== false,
          has_content: !!(doc.content && doc.content.length > 20),
          content_length: doc.content?.length || 0,
          already_chunked: !!doc.metadata?.chunked_at
        });

        offset++;
        consecutiveErrors = 0;

        // Safety limit
        if (docIndex.length > 300) break;
      } catch (e) {
        console.error(`[chunkAll] Error at offset ${offset}:`, e.message);
        consecutiveErrors++;
        offset++;
      }
    }

    console.log(`[chunkAll] Indexed ${docIndex.length} documents`);

    // Step 2: Filter to docs needing chunking
    const docsToProcess = docIndex.filter(d => {
      if (!d.has_content) return false;
      if (!d.is_active) return false;
      if (!forceRechunk && d.already_chunked) return false;
      return true;
    });

    console.log(`[chunkAll] ${docsToProcess.length} need chunking`);

    // Step 3: Process batch
    const batch = docsToProcess.slice(skipCount, skipCount + batchSize);
    const results = { success: [], failed: [] };

    for (const doc of batch) {
      try {
        console.log(`[chunkAll] Chunking "${doc.title}" (${doc.content_length} chars)...`);

        // Call chunkAndEmbedDocument directly via service role
        const res = await base44.asServiceRole.functions.invoke('chunkAndEmbedDocument', {
          document_id: doc.id,
          _service_call: true
        });

        const data = res.data || res;
        results.success.push({
          id: doc.id,
          title: doc.title,
          chunks: data.chunks_created || 0
        });
      } catch (err) {
        console.error(`[chunkAll] Failed "${doc.title}":`, err.message);
        results.failed.push({
          id: doc.id,
          title: doc.title,
          error: err.message
        });
      }
    }

    const remaining = Math.max(0, docsToProcess.length - skipCount - batch.length);

    console.log(`[chunkAll] Batch done. OK: ${results.success.length}, Fail: ${results.failed.length}, Remaining: ${remaining}`);

    return Response.json({
      total_documents: docIndex.length,
      active_with_content: docsToProcess.length + (docIndex.length - docsToProcess.length - docIndex.filter(d => !d.has_content || !d.is_active).length),
      need_chunking: docsToProcess.length,
      batch_processed: batch.length,
      batch_success: results.success.length,
      batch_failed: results.failed.length,
      remaining,
      next_skip: remaining > 0 ? skipCount + batchSize : null,
      call_again: remaining > 0 ? `Call with {"skip": ${skipCount + batchSize}, "batch_size": ${batchSize}, "force": ${forceRechunk}}` : null,
      details: results
    });

  } catch (error) {
    console.error('[chunkAll] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});