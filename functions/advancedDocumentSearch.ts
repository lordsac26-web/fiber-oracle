import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both authenticated users and agent/service-role callers.
    // All entity reads use asServiceRole below, so end-user RLS is not a concern.
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (!isAuthenticated) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      query, 
      filters = {},
      max_results = 10,
      include_content_preview = true,
      highlight_keywords = true
    } = await req.json();

    if (!query) {
      return Response.json({ error: 'query parameter required' }, { status: 400 });
    }

    // Build entity filter based on metadata
    const entityFilter = {};
    
    if (filters.category) entityFilter.category = filters.category;
    if (filters.source_type) entityFilter.source_type = filters.source_type;
    if (filters.is_active !== undefined) entityFilter.is_active = filters.is_active;
    if (filters.is_latest_version !== undefined) entityFilter.is_latest_version = filters.is_latest_version;

    // Fetch all documents via service role (bypasses RLS for agent calls)
    let allDocs = await base44.asServiceRole.entities.ReferenceDocument.list('-created_date', 500);
    if (!Array.isArray(allDocs)) allDocs = [];

    // Apply metadata filters if specified
    if (Object.keys(entityFilter).length > 0) {
      allDocs = allDocs.filter(doc => {
        for (const [key, value] of Object.entries(entityFilter)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    }

    if (allDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents found matching the filters' });
    }

    // Apply date range filter if specified
    let filteredDocs = allDocs;
    if (filters.date_from || filters.date_to) {
      filteredDocs = allDocs.filter(doc => {
        const docDate = new Date(doc.created_date);
        if (filters.date_from && docDate < new Date(filters.date_from)) return false;
        if (filters.date_to && docDate > new Date(filters.date_to)) return false;
        return true;
      });
    }

    if (filteredDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents found in the specified date range' });
    }

    // STAGE 1: Keyword-based pre-filtering
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const keywordScoredDocs = filteredDocs.map(doc => {
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

    // Fall through to semantic stage with all docs if no keyword hits
    const hasKeywordHits = keywordScoredDocs.some(item => item.score > 0);
    const keywordFilteredDocs = hasKeywordHits
      ? keywordScoredDocs.filter(item => item.score > 0).slice(0, 100)
      : keywordScoredDocs.slice(0, 50);

    filteredDocs = keywordFilteredDocs.map(item => item.doc);

    // STAGE 2: Semantic ranking via LLM
    const docSummaries = filteredDocs.slice(0, 50).map(doc => ({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      content_preview: doc.content ? doc.content.substring(0, 500) : '',
      metadata: doc.metadata || {},
      tags: doc.tags || []
    }));

    const semanticPrompt = `You are analyzing a document search query and ranking documents by relevance.

Search Query: "${query}"

Documents to rank:
${docSummaries.map((doc, idx) => `
Document ${idx + 1}:
- ID: ${doc.id}
- Title: ${doc.title}
- Category: ${doc.category}
- Tags: ${doc.tags.join(', ') || 'None'}
- Metadata: ${JSON.stringify(doc.metadata).substring(0, 200)}
- Preview: ${doc.content_preview}
`).join('\n')}

Rank these documents by relevance. Consider: exact keyword matches, semantic similarity, tag/metadata alignment, and topic relevance.
Return a ranked list of document IDs with relevance scores (0-100).`;

    const rankingResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: semanticPrompt,
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

    const rankedDocs = (rankingResult.ranked_documents || [])
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, max_results);

    // Build final results with content snippets
    const results = (await Promise.all(rankedDocs.map(async (ranked) => {
      const doc = filteredDocs.find(d => d.id === ranked.document_id);
      if (!doc) return null;

      let highlightedPreview = '';
      if (include_content_preview && doc.content) {
        const content = doc.content.toLowerCase();
        let bestMatch = -1;
        for (const word of queryWords) {
          const idx = content.indexOf(word);
          if (idx !== -1 && (bestMatch === -1 || idx < bestMatch)) bestMatch = idx;
        }
        const startIdx = Math.max(0, bestMatch - 150);
        const endIdx = Math.min(doc.content.length, bestMatch + 350);
        let snippet = doc.content.substring(startIdx, endIdx);
        if (highlight_keywords) {
          for (const word of queryWords) {
            snippet = snippet.replace(new RegExp(`(${word})`, 'gi'), '**$1**');
          }
        }
        highlightedPreview = snippet;
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
        content_preview: include_content_preview ? highlightedPreview : null,
        metadata: { is_active: doc.is_active, is_latest_version: doc.is_latest_version, ...doc.metadata }
      };
    }))).filter(Boolean);

    return Response.json({
      query,
      filters_applied: filters,
      total_documents_searched: filteredDocs.length,
      total_results: results.length,
      results,
      search_metadata: {
        two_stage_search: true,
        keyword_hits_found: hasKeywordHits,
        stage_1_results: keywordFilteredDocs.length,
        stage_2_results: results.length,
        semantic_search_used: true,
        keyword_highlighting: highlight_keywords,
        max_results
      }
    });

  } catch (error) {
    console.error('Error in advancedDocumentSearch:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});