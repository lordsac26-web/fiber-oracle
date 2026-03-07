import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    // Disable brotli by setting Accept-Encoding to identity only
    const APP_ID = Deno.env.get('BASE44_APP_ID');

    let body = {};
    try { body = await req.json(); } catch (_) { /* empty body is ok */ }

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

    // Extract auth token from incoming request to forward as service-role
    const authHeader = req.headers.get('authorization') || '';
    const serviceToken = req.headers.get('x-service-token') || '';

    // Use fetch directly to avoid the SDK's Brotli decompression bug
    const fetchDocs = async () => {
      const url = `https://api.base44.com/api/apps/${APP_ID}/entities/ReferenceDocument/list?sort=-created_date&limit=500`;
      const headers = {
        'Accept-Encoding': 'gzip, deflate', // explicitly exclude brotli
        'Content-Type': 'application/json',
      };
      if (serviceToken) headers['x-service-token'] = serviceToken;
      else if (authHeader) headers['authorization'] = authHeader;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to fetch documents: ${res.status} ${await res.text()}`);
      return res.json();
    };

    let allDocs = [];
    try {
      const result = await fetchDocs();
      allDocs = Array.isArray(result) ? result : (result.data || result.items || []);
    } catch (fetchErr) {
      // Fallback: try via SDK (in case fetch approach also fails)
      const base44 = createClientFromRequest(req);
      const sdkResult = await base44.asServiceRole.entities.ReferenceDocument.list('-created_date', 500);
      allDocs = Array.isArray(sdkResult) ? sdkResult : [];
    }

    if (allDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents found in the knowledge base' });
    }

    // Apply metadata filters in-memory
    let filteredDocs = allDocs;
    if (filters.category) filteredDocs = filteredDocs.filter(d => d.category === filters.category);
    if (filters.source_type) filteredDocs = filteredDocs.filter(d => d.source_type === filters.source_type);
    if (filters.is_active !== undefined) filteredDocs = filteredDocs.filter(d => d.is_active === filters.is_active);
    if (filters.is_latest_version !== undefined) filteredDocs = filteredDocs.filter(d => d.is_latest_version === filters.is_latest_version);
    if (filters.date_from) filteredDocs = filteredDocs.filter(d => new Date(d.created_date) >= new Date(filters.date_from));
    if (filters.date_to) filteredDocs = filteredDocs.filter(d => new Date(d.created_date) <= new Date(filters.date_to));

    if (filteredDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents matched the filters' });
    }

    // STAGE 1: Keyword pre-scoring
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored = filteredDocs.map(doc => {
      let score = 0;
      const title = (doc.title || '').toLowerCase();
      const content = (doc.content || '').toLowerCase();
      const tags = (doc.tags || []).join(' ').toLowerCase();
      const category = (doc.category || '').toLowerCase();
      for (const word of queryWords) {
        if (title.includes(word)) score += 10;
        if (tags.includes(word)) score += 5;
        if (category.includes(word)) score += 3;
        if (content.includes(word)) score += 1;
      }
      return { doc, score };
    }).sort((a, b) => b.score - a.score);

    const hasHits = scored.some(s => s.score > 0);
    const topDocs = (hasHits ? scored.filter(s => s.score > 0) : scored).slice(0, 50).map(s => s.doc);

    // STAGE 2: LLM semantic ranking
    const docSummaries = topDocs.map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      tags: doc.tags || [],
      content_preview: (doc.content || '').substring(0, 500)
    }));

    // Use fetch directly for LLM call too
    const llmFetch = async (prompt, schema) => {
      const url = `https://api.base44.com/api/apps/${APP_ID}/integrations/Core/InvokeLLM`;
      const headers = {
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      };
      if (serviceToken) headers['x-service-token'] = serviceToken;
      else if (authHeader) headers['authorization'] = authHeader;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, response_json_schema: schema })
      });
      if (!res.ok) throw new Error(`LLM call failed: ${res.status}`);
      return res.json();
    };

    let rankedDocs = topDocs.slice(0, max_results).map((doc, i) => ({
      document_id: doc.id,
      relevance_score: 100 - i,
      match_reasoning: 'Keyword match'
    }));

    try {
      const rankingResult = await llmFetch(
        `Rank these documents by relevance to the search query: "${query}"\n\nDocuments:\n${docSummaries.map(d =>
          `ID: ${d.id}\nTitle: ${d.title}\nCategory: ${d.category}\nTags: ${d.tags.join(', ')}\nPreview: ${d.content_preview}`
        ).join('\n---\n')}\n\nReturn a ranked list with relevance scores 0-100.`,
        {
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
      );
      if (rankingResult.ranked_documents?.length > 0) {
        rankedDocs = rankingResult.ranked_documents.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, max_results);
      }
    } catch (llmErr) {
      console.warn('LLM ranking failed, falling back to keyword order:', llmErr.message);
    }

    // Build final results
    const results = rankedDocs.map(ranked => {
      const doc = topDocs.find(d => d.id === ranked.document_id);
      if (!doc) return null;

      let contentPreview = '';
      if (include_content_preview && doc.content) {
        const contentLower = doc.content.toLowerCase();
        let bestIdx = queryWords.reduce((best, word) => {
          const i = contentLower.indexOf(word);
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
        version: doc.version,
        tags: doc.tags || [],
        created_date: doc.created_date,
        relevance_score: ranked.relevance_score,
        match_reasoning: ranked.match_reasoning,
        content_preview: include_content_preview ? contentPreview : null,
        metadata: { is_active: doc.is_active, is_latest_version: doc.is_latest_version, ...(doc.metadata || {}) }
      };
    }).filter(Boolean);

    return Response.json({
      query,
      filters_applied: filters,
      total_documents_searched: filteredDocs.length,
      total_results: results.length,
      results,
      search_metadata: {
        keyword_hits_found: hasHits,
        stage_1_candidates: topDocs.length,
        semantic_ranking_used: rankedDocs.length > 0,
        max_results
      }
    });

  } catch (error) {
    console.error('advancedDocumentSearch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});