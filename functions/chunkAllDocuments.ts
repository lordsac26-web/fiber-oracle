import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * chunkAllDocuments — Batch processor that chunks all active ReferenceDocuments.
 * 
 * Strategy: Use LLM to get a list of all document IDs (avoids loading massive content fields),
 * then call chunkAndEmbedDocument for each one individually.
 * 
 * Due to Deno Deploy time limits, processes in batches. Call repeatedly with 
 * skip parameter to continue where it left off.
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
    const batchSize = body.batch_size || 10; // Process N docs per call
    const skipCount = body.skip || 0;

    console.log(`[chunkAll] Starting batch. skip=${skipCount}, batchSize=${batchSize}, force=${forceRechunk}`);

    // Use InvokeLLM to query the database for document IDs + titles only
    // This avoids loading massive content fields into memory
    const docListResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Return exactly this text: "READY"`,
    });

    // Instead, directly list documents but only use the fields we need
    // Fetch in small pages to avoid the giant string problem
    let docIndex = [];
    let offset = 0;

    while (true) {
      let batch;
      try {
        // Fetch small batches — even if content is huge, 5 at a time should be manageable
        const raw = await base44.asServiceRole.entities.ReferenceDocument.list(
          'created_date', 5, offset
        );
        if (typeof raw === 'string') {
          // Try to parse — may fail if too large even at 5
          try {
            batch = JSON.parse(raw);
          } catch (parseErr) {
            console.error(`[chunkAll] Parse error at offset ${offset}, trying 1 at a time`);
            // Try 1 at a time
            const rawSingle = await base44.asServiceRole.entities.ReferenceDocument.list(
              'created_date', 1, offset
            );
            if (typeof rawSingle === 'string') {
              batch = JSON.parse(rawSingle);
            } else {
              batch = Array.isArray(rawSingle) ? rawSingle : [];
            }
          }
        } else if (Array.isArray(raw)) {
          batch = raw;
        } else {
          batch = [];
        }
      } catch (e) {
        console.error(`[chunkAll] Fetch error at offset ${offset}:`, e.message);
        break;
      }

      if (batch.length === 0) break;

      // Only store lightweight index info
      for (const doc of batch) {
        docIndex.push({
          id: doc.id,
          title: doc.title,
          is_active: doc.is_active,
          has_content: !!(doc.content && doc.content.length > 20),
          content_length: doc.content?.length || 0,
          already_chunked: !!doc.metadata?.chunked_at
        });
      }

      offset += batch.length;
      
      // Safety limit
      if (docIndex.length > 500) break;
    }

    console.log(`[chunkAll] Found ${docIndex.length} total documents`);

    // Filter to docs that need chunking
    const docsToProcess = docIndex.filter(d => {
      if (!d.has_content) return false;
      if (d.is_active === false) return false;
      if (!forceRechunk && d.already_chunked) return false;
      return true;
    });

    console.log(`[chunkAll] ${docsToProcess.length} need chunking (${docIndex.length - docsToProcess.length} skipped)`);

    // Apply skip/batch pagination
    const batch = docsToProcess.slice(skipCount, skipCount + batchSize);

    console.log(`[chunkAll] Processing batch: ${batch.length} docs (skip=${skipCount})`);

    const results = { success: [], failed: [] };

    for (const doc of batch) {
      try {
        console.log(`[chunkAll] Chunking: "${doc.title}" (${doc.content_length} chars)`);
        const res = await base44.functions.invoke('chunkAndEmbedDocument', {
          document_id: doc.id
        });
        results.success.push({
          id: doc.id,
          title: doc.title,
          chunks: res.data?.chunks_created || 0
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

    const remainingDocs = docsToProcess.length - skipCount - batch.length;

    console.log(`[chunkAll] Batch done. Success: ${results.success.length}, Failed: ${results.failed.length}, Remaining: ${remainingDocs}`);

    return Response.json({
      total_documents: docIndex.length,
      need_chunking: docsToProcess.length,
      batch_processed: batch.length,
      batch_success: results.success.length,
      batch_failed: results.failed.length,
      remaining: Math.max(0, remainingDocs),
      next_skip: remainingDocs > 0 ? skipCount + batchSize : null,
      details: results
    });

  } catch (error) {
    console.error('[chunkAll] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});