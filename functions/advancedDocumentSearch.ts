import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch (_e) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      query,
      filters = {},
      max_results = 8,
      include_content_preview = true
    } = body;

    if (!query) {
      return Response.json({ error: 'query parameter required' }, { status: 400 });
    }

    console.log('[search] Query:', query);

    // STEP 1: Fetch document metadata in small batches to avoid OOM
    const docFilter = { is_active: true };
    if (filters.category) docFilter.category = filters.category;
    if (filters.source_type) docFilter.source_type = filters.source_type;

    let allDocs;
    try {
      allDocs = await base44.asServiceRole.entities.ReferenceDocument.list('-created_date', 100);
      // Post-filter for active docs since .filter() crashes the isolate with large content fields
      allDocs = allDocs.filter(d => d.is_active);
      if (docFilter.category) allDocs = allDocs.filter(d => d.category === docFilter.category);
      if (docFilter.source_type) allDocs = allDocs.filter(d => d.source_type === docFilter.source_type);
      console.log('[search] Found', allDocs.length, 'docs');
    } catch (fetchErr) {
      console.error('[search] Failed to fetch docs:', fetchErr.message);
      return Response.json({ error: 'Failed to fetch documents: ' + fetchErr.message }, { status: 500 });
    }

    if (!allDocs || allDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents found in knowledge base.' });
    }

    // Build lightweight doc map — strip out the large content field to save memory
    const docMap = {};
    const docContents = {};
    for (const doc of allDocs) {
      docMap[doc.id] = {
        id: doc.id,
        title: doc.title || '',
        category: doc.category || '',
        source_type: doc.source_type || '',
        source_url: doc.source_url || '',
        version: doc.version || '1.0',
        tags: doc.tags || [],
        created_date: doc.created_date,
      };
      // Keep content separately for search, truncated
      if (doc.content) {
        docContents[doc.id] = doc.content.substring(0, 8000);
      }
    }

    const docIds = Object.keys(docMap);

    // STEP 2: Keyword scoring on titles/tags/content
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scoredDocs = docIds.map(id => {
      const doc = docMap[id];
      const content = (docContents[id] || '').toLowerCase();
      let score = 0;
      let bestSnippet = '';
      let bestSnippetScore = 0;

      for (const word of queryWords) {
        if (doc.title.toLowerCase().includes(word)) score += 10;
        if ((doc.tags || []).join(' ').toLowerCase().includes(word)) score += 5;
        if ((doc.category || '').toLowerCase().includes(word)) score += 3;

        // Content keyword search
        const idx = content.indexOf(word);
        if (idx !== -1) {
          score += 2;
          // Count occurrences
          const matches = content.match(new RegExp(word, 'g'));
          const count = matches ? matches.length : 0;
          score += Math.min(count, 10);

          // Extract snippet around match
          if (count > bestSnippetScore) {
            bestSnippetScore = count;
            const start = Math.max(0, idx - 100);
            const end = Math.min(content.length, idx + 300);
            bestSnippet = (docContents[id] || '').substring(start, end);
          }
        }
      }

      return { id, score, bestSnippet };
    }).sort((a, b) => b.score - a.score);

    // Take top candidates
    const topCandidates = scoredDocs.filter(d => d.score > 0).slice(0, max_results * 2);

    // If no keyword hits, return all docs with basic info
    if (topCandidates.length === 0) {
      // Try broader match — return docs with LLM ranking
      const allCandidates = scoredDocs.slice(0, 10);
      
      if (allCandidates.length === 0) {
        return Response.json({ query, results: [], total_results: 0, message: 'No relevant documents found.' });
      }

      // Use LLM to rank even without keyword hits
      const llmInput = allCandidates.map(c => ({
        id: c.id,
        title: docMap[c.id]?.title || '',
        category: docMap[c.id]?.category || '',
        tags: (docMap[c.id]?.tags || []).join(', '),
        excerpt: (docContents[c.id] || '').substring(0, 400) || '(no content)'
      }));

      console.log('[search] No keyword hits, using LLM ranking on', llmInput.length, 'docs');

      const rankingResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Rank these documents by relevance to the search query. Return top ${max_results} most relevant.

Query: "${query}"

Documents:
${llmInput.map((d, i) => `[${i+1}] ID: ${d.id} | Title: ${d.title} | Category: ${d.category} | Tags: ${d.tags}
Excerpt: ${d.excerpt}`).join('\n\n')}`,
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

      const results = (rankingResult?.ranked_documents || [])
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, max_results)
        .map(ranked => {
          const doc = docMap[ranked.document_id];
          if (!doc) return null;
          return {
            document_id: doc.id,
            title: doc.title,
            category: doc.category,
            source_type: doc.source_type,
            source_url: doc.source_url,
            tags: doc.tags,
            relevance_score: ranked.relevance_score,
            match_reasoning: ranked.match_reasoning,
            content_preview: (docContents[doc.id] || '').substring(0, 500) || null,
          };
        }).filter(Boolean);

      return Response.json({
        query,
        total_documents_searched: allDocs.length,
        total_results: results.length,
        results,
        search_metadata: { strategy: 'llm_semantic_ranking', title_hits: false }
      });
    }

    console.log('[search]', topCandidates.length, 'keyword candidates, calling LLM...');

    // STEP 3: LLM semantic ranking on keyword-matched candidates
    const llmInput = topCandidates.map(c => ({
      id: c.id,
      title: docMap[c.id]?.title || '',
      category: docMap[c.id]?.category || '',
      tags: (docMap[c.id]?.tags || []).join(', '),
      excerpt: c.bestSnippet ? c.bestSnippet.substring(0, 400) : (docContents[c.id] || '').substring(0, 400)
    }));

    const rankingResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these documents by relevance to the search query. Return top ${max_results} most relevant.

Query: "${query}"

Documents:
${llmInput.map((d, i) => `[${i+1}] ID: ${d.id} | Title: ${d.title} | Category: ${d.category} | Tags: ${d.tags}
Excerpt: ${d.excerpt}`).join('\n\n')}`,
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

    const rankedDocs = (rankingResult?.ranked_documents || [])
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, max_results);

    console.log('[search] LLM ranked', rankedDocs.length, 'docs');

    // Build final results
    const results = rankedDocs.map(ranked => {
      const doc = docMap[ranked.document_id];
      if (!doc) return null;
      const candidate = topCandidates.find(c => c.id === ranked.document_id);
      let contentPreview = '';
      if (include_content_preview) {
        contentPreview = candidate?.bestSnippet?.substring(0, 500) || (docContents[doc.id] || '').substring(0, 500);
        for (const word of queryWords) {
          contentPreview = contentPreview.replace(new RegExp(`(${word})`, 'gi'), '**$1**');
        }
      }
      return {
        document_id: doc.id,
        title: doc.title,
        category: doc.category,
        source_type: doc.source_type,
        source_url: doc.source_url,
        tags: doc.tags,
        relevance_score: ranked.relevance_score,
        match_reasoning: ranked.match_reasoning,
        content_preview: contentPreview || null,
      };
    }).filter(Boolean);

    return Response.json({
      query,
      total_documents_searched: allDocs.length,
      total_results: results.length,
      results,
      search_metadata: {
        strategy: 'keyword_plus_llm_ranking',
        title_hits: true,
        candidates_evaluated: topCandidates.length,
        semantic_ranking: true
      }
    });

  } catch (error) {
    console.error('[search] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});