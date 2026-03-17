import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const query = body.query;
    const maxResults = body.max_results || 8;

    if (!query) {
      return Response.json({ error: 'query parameter required' }, { status: 400 });
    }

    console.log('[search] Query:', query);

    // Fetch docs via list (filter crashes isolate with large content payloads)
    const allDocs = await base44.asServiceRole.entities.ReferenceDocument.list('-created_date', 100);
    const activeDocs = allDocs.filter(d => d.is_active);

    console.log('[search] Found', activeDocs.length, 'active docs');

    if (activeDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents found in knowledge base.' });
    }

    // Keyword scoring
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scored = activeDocs.map(doc => {
      let score = 0;
      let bestSnippet = '';
      const title = (doc.title || '').toLowerCase();
      const tags = (doc.tags || []).join(' ').toLowerCase();
      const category = (doc.category || '').toLowerCase();
      const content = (doc.content || '').toLowerCase();

      for (const word of queryWords) {
        if (title.includes(word)) score += 10;
        if (tags.includes(word)) score += 5;
        if (category.includes(word)) score += 3;
        const idx = content.indexOf(word);
        if (idx !== -1) {
          score += 2;
          const start = Math.max(0, idx - 100);
          const end = Math.min(content.length, idx + 300);
          bestSnippet = (doc.content || '').substring(start, end);
        }
      }

      return {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        source_type: doc.source_type,
        source_url: doc.source_url,
        tags: doc.tags,
        score,
        bestSnippet,
        contentPreview: (doc.content || '').substring(0, 400)
      };
    }).sort((a, b) => b.score - a.score);

    // Take top candidates
    const candidates = scored.slice(0, Math.max(maxResults * 2, 10));

    // LLM semantic ranking
    console.log('[search] Ranking', candidates.length, 'candidates via LLM');

    const rankingResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these documents by relevance to: "${query}". Return the top ${maxResults}.

${candidates.map((d, i) => `[${i+1}] ID:${d.id} Title:"${d.title}" Cat:${d.category} Tags:${(d.tags||[]).join(',')}
Excerpt: ${d.bestSnippet || d.contentPreview || '(none)'}`).join('\n\n')}`,
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

    const ranked = (rankingResult?.ranked_documents || [])
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);

    console.log('[search] LLM returned', ranked.length, 'ranked docs');

    const results = ranked.map(r => {
      const doc = candidates.find(c => c.id === r.document_id);
      if (!doc) return null;
      return {
        document_id: doc.id,
        title: doc.title,
        category: doc.category,
        source_type: doc.source_type,
        source_url: doc.source_url,
        tags: doc.tags,
        relevance_score: r.relevance_score,
        match_reasoning: r.match_reasoning,
        content_preview: doc.bestSnippet || doc.contentPreview || null,
      };
    }).filter(Boolean);

    return Response.json({
      query,
      total_documents_searched: activeDocs.length,
      total_results: results.length,
      results
    });

  } catch (error) {
    console.error('[search] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});