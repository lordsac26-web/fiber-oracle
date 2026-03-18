import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * advancedDocumentSearch — Searches ALL documents via pre-indexed chunks.
 * 
 * Flow:
 * 1. Extract query keywords
 * 2. Search DocumentChunk records by keyword matching (lightweight, no OOM)
 * 3. Score and rank chunks across ALL documents
 * 4. Use LLM to semantically rank top candidates
 * 5. Return results grouped by document with relevant excerpts
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const body = await req.json();
    const query = body.query;
    const maxResults = body.max_results || 8;

    if (!query) {
      return Response.json({ error: 'query parameter required' }, { status: 400 });
    }

    console.log('[search] Query:', query);

    // Step 1: Get all chunks — they're lightweight (no huge content fields on parent docs)
    // Paginate to get all chunks
    let allChunks = [];
    let page = 0;
    const pageSize = 100;

    while (true) {
      let batch;
      try {
        const raw = await base44.asServiceRole.entities.DocumentChunk.list(
          '-created_date', pageSize, page * pageSize
        );
        if (typeof raw === 'string') {
          batch = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          batch = raw;
        } else {
          batch = [];
        }
      } catch (e) {
        console.error('[search] Chunk fetch error page', page, e.message);
        batch = [];
      }

      if (batch.length === 0) break;
      allChunks = allChunks.concat(batch);
      page++;

      // Safety limit — 5000 chunks should cover 120+ docs well
      if (allChunks.length >= 5000) break;
    }

    console.log('[search] Total chunks loaded:', allChunks.length);

    if (allChunks.length === 0) {
      return Response.json({
        query,
        results: [],
        total_results: 0,
        message: 'No document chunks found. Run chunkAllDocuments first.'
      });
    }

    // Step 2: Keyword scoring across all chunks
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scoredChunks = allChunks.map(chunk => {
      let score = 0;
      const keywords = (chunk.keywords || '').toLowerCase();
      const title = (chunk.document_title || '').toLowerCase();
      const category = (chunk.document_category || '').toLowerCase();
      const content = (chunk.content || '').toLowerCase();

      for (const word of queryWords) {
        // Title match is strongest signal
        if (title.includes(word)) score += 10;
        // Category match
        if (category.includes(word)) score += 5;
        // Keyword index match (pre-extracted important terms)
        if (keywords.includes(word)) score += 4;
        // Direct content match
        if (content.includes(word)) score += 2;
      }

      // Find best snippet around first match
      let snippet = '';
      if (score > 0) {
        for (const word of queryWords) {
          const idx = content.indexOf(word);
          if (idx !== -1) {
            const s = Math.max(0, idx - 80);
            const e = Math.min(content.length, idx + 250);
            snippet = chunk.content.substring(s, e);
            break;
          }
        }
      }

      return { ...chunk, score, snippet };
    }).filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    console.log('[search] Chunks with matches:', scoredChunks.length);

    // Step 3: Deduplicate by document — keep best chunk per doc, but collect all
    const docBestChunks = new Map();
    for (const chunk of scoredChunks) {
      const existing = docBestChunks.get(chunk.document_id);
      if (!existing || chunk.score > existing.score) {
        docBestChunks.set(chunk.document_id, chunk);
      }
    }

    // Take top candidates for LLM ranking
    const candidates = Array.from(docBestChunks.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(maxResults * 2, 12));

    console.log('[search] Unique docs matched:', docBestChunks.size, '| LLM candidates:', candidates.length);

    if (candidates.length === 0) {
      return Response.json({
        query,
        total_documents_searched: new Set(allChunks.map(c => c.document_id)).size,
        total_results: 0,
        results: [],
        message: 'No matching documents found for this query.'
      });
    }

    // Step 4: LLM semantic ranking
    const rankResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these document excerpts by relevance to the query: "${query}". Return the top ${maxResults} most relevant.

${candidates.map((d, i) => `[${i+1}] DocID:${d.document_id} Title:"${d.document_title}" Category:${d.document_category}
Excerpt: ${(d.snippet || d.content || '').substring(0, 400)}`).join('\n\n')}`,
      response_json_schema: {
        type: 'object',
        properties: {
          ranked_documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                document_id: { type: 'string' },
                relevance_score: { type: 'number' },
                match_reasoning: { type: 'string' }
              },
              required: ['document_id', 'relevance_score']
            }
          }
        },
        required: ['ranked_documents']
      }
    });

    const ranked = (rankResult?.ranked_documents || [])
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);

    console.log('[search] LLM returned', ranked.length, 'results');

    // Step 5: Build final results with document metadata and content previews
    const results = ranked.map(r => {
      const chunk = candidates.find(c => c.document_id === r.document_id);
      if (!chunk) return null;
      return {
        document_id: chunk.document_id,
        title: chunk.document_title,
        category: chunk.document_category,
        source_type: chunk.metadata?.source_type,
        source_url: chunk.metadata?.source_url,
        tags: chunk.metadata?.tags || [],
        relevance_score: r.relevance_score,
        match_reasoning: r.match_reasoning,
        content_preview: chunk.snippet || chunk.content?.substring(0, 400) || null
      };
    }).filter(Boolean);

    const uniqueDocIds = new Set(allChunks.map(c => c.document_id));

    return Response.json({
      query,
      total_documents_searched: uniqueDocIds.size,
      total_chunks_searched: allChunks.length,
      total_results: results.length,
      results
    });

  } catch (error) {
    console.error('[search] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});