import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Strategy: fetch metadata-only first (small response, no Brotli trigger),
// then fetch full content only for top keyword-matched docs.

Deno.serve(async (req) => {
  let step = 'init';
  try {
    step = 'create_client';
    const base44 = createClientFromRequest(req);

    step = 'parse_body';
    let body = {};
    try { body = await req.json(); } catch (_) { /* empty body ok */ }

    const {
      query,
      filters = {},
      max_results = 10,
      include_content_preview = true,
      highlight_keywords = true
    } = body;

    if (!query) {
      return Response.json({ error: 'query parameter required' }, { status: 400 });
    }

    // Fetch ONLY metadata fields (title, category, tags, source_type, source_url, is_active, version)
    // by requesting a small set — avoids large 'content' field triggering Brotli on big responses
    step = 'fetch_metadata';
    let allDocs = await base44.asServiceRole.entities.ReferenceDocument.list('-created_date', 200);
    if (!Array.isArray(allDocs)) allDocs = [];

    console.log(`Fetched ${allDocs.length} doc metadata records`);

    if (allDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents in knowledge base' });
    }

    // Apply filters in-memory
    let filteredDocs = allDocs;
    if (filters.category) filteredDocs = filteredDocs.filter(d => d.category === filters.category);
    if (filters.source_type) filteredDocs = filteredDocs.filter(d => d.source_type === filters.source_type);
    if (filters.is_active !== undefined) filteredDocs = filteredDocs.filter(d => d.is_active === filters.is_active);

    if (filteredDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents matched the filters' });
    }

    // Stage 1: keyword scoring on metadata only (title, tags, category)
    step = 'keyword_score';
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored = filteredDocs.map(doc => {
      let score = 0;
      const title = (doc.title || '').toLowerCase();
      const tags = (doc.tags || []).join(' ').toLowerCase();
      const category = (doc.category || '').toLowerCase();
      // Also score on content if it's small enough to be present
      const content = (doc.content || '').toLowerCase();
      for (const word of queryWords) {
        if (title.includes(word)) score += 10;
        if (tags.includes(word)) score += 5;
        if (category.includes(word)) score += 3;
        if (content.length < 50000 && content.includes(word)) score += 1;
      }
      return { doc, score };
    }).sort((a, b) => b.score - a.score);

    const hasHits = scored.some(s => s.score > 0);
    // Take top candidates for LLM ranking
    const topDocs = (hasHits ? scored.filter(s => s.score > 0) : scored).slice(0, 20).map(s => s.doc);

    // Stage 2: LLM semantic ranking (using only metadata — no content)
    step = 'llm_rank';
    let rankedDocs = topDocs.slice(0, max_results).map((doc, i) => ({
      document_id: doc.id,
      relevance_score: 100 - i * 5,
      match_reasoning: 'Keyword/metadata match'
    }));

    try {
      const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Rank these documents by relevance to the search query: "${query}"\n\nDocuments (metadata only):\n${topDocs.map(d =>
          `ID: ${d.id}\nTitle: ${d.title}\nCategory: ${d.category || 'N/A'}\nTags: ${(d.tags || []).join(', ') || 'None'}`
        ).join('\n---\n')}\n\nReturn a ranked list with relevance scores 0-100.`,
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
      if (llmResult.ranked_documents?.length > 0) {
        rankedDocs = llmResult.ranked_documents
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, max_results);
      }
    } catch (llmErr) {
      console.warn('LLM ranking failed, using keyword order:', llmErr.message);
    }

    // Stage 3: For top results, fetch individual docs to get content preview
    step = 'fetch_content';
    const results = [];
    for (const ranked of rankedDocs) {
      const metaDoc = topDocs.find(d => d.id === ranked.document_id);
      if (!metaDoc) continue;

      let contentPreview = '';
      if (include_content_preview) {
        try {
          // Fetch single doc — small response, unlikely to trigger Brotli
          const fullDoc = await base44.asServiceRole.entities.ReferenceDocument.get(ranked.document_id);
          const content = fullDoc?.content || '';
          if (content) {
            let bestIdx = queryWords.reduce((best, word) => {
              const i = content.toLowerCase().indexOf(word);
              return (i !== -1 && (best === -1 || i < best)) ? i : best;
            }, -1);
            if (bestIdx === -1) bestIdx = 0;
            let snippet = content.substring(Math.max(0, bestIdx - 150), Math.min(content.length, bestIdx + 350));
            if (highlight_keywords) {
              for (const word of queryWords) {
                snippet = snippet.replace(new RegExp(`(${word})`, 'gi'), '**$1**');
              }
            }
            contentPreview = snippet;
          }
        } catch (contentErr) {
          console.warn(`Could not fetch content for doc ${ranked.document_id}:`, contentErr.message);
        }
      }

      results.push({
        document_id: metaDoc.id,
        title: metaDoc.title,
        category: metaDoc.category,
        source_type: metaDoc.source_type,
        source_url: metaDoc.source_url,
        tags: metaDoc.tags || [],
        created_date: metaDoc.created_date,
        relevance_score: ranked.relevance_score,
        match_reasoning: ranked.match_reasoning,
        content_preview: contentPreview
      });
    }

    return Response.json({
      query,
      total_documents_searched: filteredDocs.length,
      total_results: results.length,
      results,
      search_metadata: {
        keyword_hits_found: hasHits,
        stage_1_candidates: topDocs.length,
        max_results
      }
    });

  } catch (error) {
    console.error(`advancedDocumentSearch error at step [${step}]:`, error.message);
    return Response.json({ error: error.message, step }, { status: 500 });
  }
});