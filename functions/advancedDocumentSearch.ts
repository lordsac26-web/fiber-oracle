import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    step = 'fetch_docs';
    let allDocs = await base44.asServiceRole.entities.ReferenceDocument.list('-created_date', 500);
    if (!Array.isArray(allDocs)) allDocs = [];

    console.log(`Fetched ${allDocs.length} documents`);

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

    step = 'keyword_score';
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored = filteredDocs.map(doc => {
      let score = 0;
      const title = (doc.title || '').toLowerCase();
      const content = (doc.content || '').toLowerCase();
      const tags = (doc.tags || []).join(' ').toLowerCase();
      for (const word of queryWords) {
        if (title.includes(word)) score += 10;
        if (tags.includes(word)) score += 5;
        if (content.includes(word)) score += 1;
      }
      return { doc, score };
    }).sort((a, b) => b.score - a.score);

    const hasHits = scored.some(s => s.score > 0);
    const topDocs = (hasHits ? scored.filter(s => s.score > 0) : scored).slice(0, 30).map(s => s.doc);

    step = 'llm_rank';
    let rankedDocs = topDocs.slice(0, max_results).map((doc, i) => ({
      document_id: doc.id,
      relevance_score: 100 - i,
      match_reasoning: 'Keyword match'
    }));

    try {
      const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Rank these documents by relevance to: "${query}"\n\n${topDocs.map(d =>
          `ID: ${d.id}\nTitle: ${d.title}\nPreview: ${(d.content || '').substring(0, 300)}`
        ).join('\n---\n')}\n\nReturn ranked list with relevance scores 0-100.`,
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
        rankedDocs = llmResult.ranked_documents.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, max_results);
      }
    } catch (llmErr) {
      console.warn('LLM ranking failed:', llmErr.message);
    }

    step = 'build_results';
    const results = rankedDocs.map(ranked => {
      const doc = topDocs.find(d => d.id === ranked.document_id);
      if (!doc) return null;

      let contentPreview = '';
      if (include_content_preview && doc.content) {
        let bestIdx = queryWords.reduce((best, word) => {
          const i = doc.content.toLowerCase().indexOf(word);
          return (i !== -1 && (best === -1 || i < best)) ? i : best;
        }, -1);
        if (bestIdx === -1) bestIdx = 0;
        let snippet = doc.content.substring(Math.max(0, bestIdx - 150), Math.min(doc.content.length, bestIdx + 350));
        if (highlight_keywords) {
          for (const word of queryWords) {
            snippet = snippet.replace(new RegExp(`(${word})`, 'gi'), '**$1**');
          }
        }
        contentPreview = snippet;
      }

      return {
        document_id: doc.id,
        title: doc.title,
        category: doc.category,
        source_type: doc.source_type,
        source_url: doc.source_url,
        tags: doc.tags || [],
        created_date: doc.created_date,
        relevance_score: ranked.relevance_score,
        match_reasoning: ranked.match_reasoning,
        content_preview: include_content_preview ? contentPreview : null
      };
    }).filter(Boolean);

    return Response.json({
      query,
      total_documents_searched: filteredDocs.length,
      total_results: results.length,
      results
    });

  } catch (error) {
    console.error(`advancedDocumentSearch error at step [${step}]:`, error.message, error.stack);
    return Response.json({ error: error.message, step }, { status: 500 });
  }
});