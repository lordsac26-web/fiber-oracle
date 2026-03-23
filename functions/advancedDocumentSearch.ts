import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * advancedDocumentSearch — Two-stage document search.
 * 
 * Stage 1: Fetch DocumentChunk records by document_title filter for each keyword.
 *          Also fetch by keywords field as a secondary signal.
 *          Sequential to avoid rate limits. Uses document_title which is reliable.
 * Stage 2: Score and deduplicate by document.
 * Stage 3: LLM semantic ranking with content excerpts.
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

    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'some', 'them',
      'than', 'its', 'over', 'such', 'that', 'this', 'with', 'will', 'each',
      'from', 'they', 'were', 'which', 'their', 'what', 'about', 'would',
      'there', 'when', 'make', 'like', 'how', 'does', 'into', 'could', 'other',
      'more', 'also', 'then', 'these', 'two', 'may', 'any', 'who', 'did',
    ]);

    const queryWords = query.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 6);

    console.log('[search] Keywords:', queryWords.join(', '));

    if (queryWords.length === 0) {
      return Response.json({ query, total_results: 0, results: [], message: 'No meaningful keywords.' });
    }

    // ── Stage 1: Fetch chunks matching keywords via document_title and keywords fields ──
    const LIMIT = 50;
    const chunkMap = new Map();

    // Helper to add chunks to map
    const addChunks = (chunks, matchSource, word) => {
      for (const chunk of chunks) {
        if (!chunkMap.has(chunk.id)) {
          chunkMap.set(chunk.id, { chunk, score: 0, titleMatches: new Set(), keywordMatches: new Set(), contentMatches: new Set() });
        }
        const entry = chunkMap.get(chunk.id);
        if (matchSource === 'title') entry.titleMatches.add(word);
        if (matchSource === 'keywords') entry.keywordMatches.add(word);
      }
    };

    // Search by document_title for each keyword (sequential to avoid rate limits)
    for (const word of queryWords) {
      try {
        console.log(`[search] Searching title for: "${word}"`);
        const byTitle = await base44.asServiceRole.entities.DocumentChunk.filter(
          { document_title: word },
          '-created_date',
          LIMIT
        );
        addChunks(Array.isArray(byTitle) ? byTitle : [], 'title', word);
      } catch (e) {
        console.error(`[search] Title search error for "${word}":`, e.message);
      }

      try {
        const byKeyword = await base44.asServiceRole.entities.DocumentChunk.filter(
          { keywords: word },
          '-created_date',
          LIMIT
        );
        addChunks(Array.isArray(byKeyword) ? byKeyword : [], 'keywords', word);
      } catch (e) {
        console.error(`[search] Keyword search error for "${word}":`, e.message);
      }
    }

    console.log('[search] Total unique chunks found:', chunkMap.size);

    if (chunkMap.size === 0) {
      return Response.json({ query, total_results: 0, results: [], message: 'No matching chunks found.' });
    }

    // ── Stage 2: Score chunks ──
    for (const entry of chunkMap.values()) {
      const title = (entry.chunk.document_title || '').toLowerCase();
      const category = (entry.chunk.document_category || '').toLowerCase();
      const content = (entry.chunk.content || '').toLowerCase();
      const tags = ((entry.chunk.metadata?.tags) || []).join(' ').toLowerCase();

      for (const word of queryWords) {
        if (title.includes(word)) entry.score += 10;
        if (category.includes(word)) entry.score += 5;
        if (tags.includes(word)) entry.score += 7;
        if (content.includes(word)) {
          entry.score += 3;
          entry.contentMatches.add(word);
        }
      }

      // Breadth bonus: matching more distinct words ranks higher
      const allMatches = new Set([...entry.titleMatches, ...entry.keywordMatches, ...entry.contentMatches]);
      const coverage = allMatches.size / queryWords.length;
      entry.score *= (1 + coverage);
    }

    // Deduplicate by document — keep best chunk per doc
    const docBest = new Map();
    const allEntries = Array.from(chunkMap.values()).sort((a, b) => b.score - a.score);

    for (const entry of allEntries) {
      const docId = entry.chunk.document_id;
      if (!docBest.has(docId) || entry.score > docBest.get(docId).score) {
        // Extract snippet
        let snippet = '';
        const content = entry.chunk.content || '';
        const contentLower = content.toLowerCase();
        // Clean up JSON noise from content for snippet
        const cleanContent = content.replace(/\{"title":null,"content":null\}/g, '').replace(/\[|\]/g, '').trim();
        
        for (const word of queryWords) {
          const idx = cleanContent.toLowerCase().indexOf(word);
          if (idx !== -1) {
            snippet = cleanContent.substring(Math.max(0, idx - 80), Math.min(cleanContent.length, idx + 300)).trim();
            break;
          }
        }
        if (!snippet && cleanContent.length > 10) {
          snippet = cleanContent.substring(0, 300).trim();
        }

        docBest.set(docId, {
          ...entry,
          snippet,
          title: entry.chunk.document_title,
          category: entry.chunk.document_category,
          metadata: entry.chunk.metadata,
        });
      }
    }

    const uniqueDocCount = docBest.size;
    console.log('[search] Unique docs matched:', uniqueDocCount);

    const candidates = Array.from(docBest.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(maxResults * 2, 12));

    console.log('[search] LLM candidates:', candidates.length);

    // ── Stage 3: LLM semantic ranking ──
    const rankResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these document excerpts by relevance to the query: "${query}". Return the top ${maxResults} most relevant.

${candidates.map((d, i) => `[${i+1}] DocID:${d.chunk.document_id} Title:"${d.title}" Category:${d.category} Tags:${(d.metadata?.tags || []).join(',')}
Excerpt: ${(d.snippet || '').substring(0, 400)}`).join('\n\n')}`,
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

    const results = ranked.map(r => {
      const c = candidates.find(x => x.chunk.document_id === r.document_id);
      if (!c) return null;
      return {
        document_id: c.chunk.document_id,
        title: c.title,
        category: c.category,
        source_type: c.metadata?.source_type,
        source_url: c.metadata?.source_url,
        tags: c.metadata?.tags || [],
        relevance_score: r.relevance_score,
        match_reasoning: r.match_reasoning,
        content_preview: c.snippet || null
      };
    }).filter(Boolean);

    return Response.json({
      query,
      total_unique_documents_matched: uniqueDocCount,
      total_chunks_evaluated: chunkMap.size,
      total_results: results.length,
      results
    });

  } catch (error) {
    console.error('[search] Error:', error?.message || error);
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});