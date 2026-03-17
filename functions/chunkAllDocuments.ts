import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const forceRechunk = body.force || false;

    console.log('[chunkAll] Starting batch chunking...');

    // Paginate through ALL documents using filter (avoids the giant string problem)
    let allDocs = [];
    let page = 0;
    const pageSize = 50;

    while (true) {
      // Use filter with empty query to paginate safely
      const batch = await base44.asServiceRole.entities.ReferenceDocument.filter(
        { is_active: true },
        '-created_date',
        pageSize,
        page * pageSize
      );

      // Handle string response from SDK
      let docs;
      if (typeof batch === 'string') {
        docs = JSON.parse(batch);
      } else if (Array.isArray(batch)) {
        docs = batch;
      } else {
        docs = [];
      }

      if (docs.length === 0) break;
      allDocs = allDocs.concat(docs);
      page++;

      // Safety limit
      if (allDocs.length > 500) break;
    }

    console.log(`[chunkAll] Found ${allDocs.length} active documents`);

    // Filter to only docs with content and optionally skip already-chunked ones
    const docsToProcess = allDocs.filter(doc => {
      if (!doc.content || doc.content.length < 20) return false;
      if (!forceRechunk && doc.metadata?.chunked_at) return false;
      return true;
    });

    console.log(`[chunkAll] ${docsToProcess.length} documents need chunking`);

    const results = { success: [], failed: [], skipped: allDocs.length - docsToProcess.length };

    // Process each document by calling chunkAndEmbedDocument
    for (const doc of docsToProcess) {
      try {
        console.log(`[chunkAll] Chunking: "${doc.title}" (${doc.content.length} chars)`);
        const res = await base44.functions.invoke('chunkAndEmbedDocument', {
          document_id: doc.id
        });
        results.success.push({
          id: doc.id,
          title: doc.title,
          chunks: res.data?.chunks_created || 0
        });
      } catch (err) {
        console.error(`[chunkAll] Failed: "${doc.title}":`, err.message);
        results.failed.push({
          id: doc.id,
          title: doc.title,
          error: err.message
        });
      }
    }

    console.log(`[chunkAll] Done. Success: ${results.success.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped}`);

    return Response.json({
      total_documents: allDocs.length,
      processed: results.success.length,
      failed: results.failed.length,
      skipped: results.skipped,
      details: results
    });

  } catch (error) {
    console.error('[chunkAll] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});