import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * advancedDocumentSearch — Keyword-targeted chunk search.
 * 
 * Uses DocumentChunk.filter({ keywords: word }) to fetch only relevant chunks
 * for each search keyword. This avoids loading all chunks or all documents,
 * and leverages the indexed keywords field for fast lookups.
 * 
 * Processes keywords sequentially (not all at once) to avoid rate limits.
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
      .slice(0, 6); // Cap at 6 keywords

    console.log('[search] Keywords:', queryWords.join(', '));

    if (queryWords.length === 0) {
      return Response.json({ query, total_results: 0, results: [], message: 'No meaningful keywords.' });
    }

    // ── Stage 1: Fetch chunks per keyword (sequential to avoid rate limits) ──
    const CHUNKS_PER_KEYWORD = 100;
    const chunkMap = new Map(); // chunk.id -> { chunk, matchedWords, score }

    for (const word of queryWords) {
      try {
        console.log(`[search] Fetching chunks for keyword: "${word}"`);
        const chunks = await base44.asServiceRole.entities.DocumentChunk.filter(
          { keywords: word },
          '-created_date',
          CHUNKS_PER_KEYWORD
        );
        const arr = Array.isArray(chunks) ? chunks : [];
        console.log(`[search] Got ${arr.length} chunks for "${word}"`);

        for (const chunk of arr) {
          if (!chunkMap.has(chunk.id)) {
            chunkMap.set(chunk.id, { chunk, matchedWords: new Set(), score: 0 });
          }
          const entry = chunkMap.get(chunk.id);
          entry.matchedWords.add(word);

          const title = (chunk.document_title || '').toLowerCase();
          const category = (chunk.document_category || '').toLowerCase();
          const keywords = (chunk.keywords || '').toLowerCase();

          if (title.includes(word)) entry.score += 10;
          if (category.includes(word)) entry.score += 5;
          if (keywords.includes(word)) entry.score += 4;
        }
      } catch (e) {
        console.error(`[search] Error fetching for "${word}":`, e.message);
      }
    }

    console.log('[search] Total unique chunks found:', chunkMap.size);

    if (chunkMap.size === 0) {
      return Response.json({ query, total_results: 0, results: [], message: 'No matching chunks found.' });
    }

    // Apply breadth bonus and sort
    const allEntries = Array.from(chunkMap.values());
    for (const entry of allEntries) {
      const coverage = entry.matchedWords.size / queryWords.length;
      entry.score *= (1 + coverage);
    }
    allEntries.sort((a, b) => b.score - a.score);

    // ── Stage 2: Deduplicate by document — keep best chunk per doc ──
    const docBest = new Map();
    for (const entry of allEntries) {
      const docId = entry.chunk.document_id;
      if (!docBest.has(docId) || entry.score > docBest.get(docId).score) {
        // Extract snippet around first keyword match
        let snippet = '';
        const content = entry.chunk.content || '';
        const contentLower = content.toLowerCase();
        for (const word of queryWords) {
          const idx = contentLower.indexOf(word);
          if (idx !== -1) {
            snippet = content.substring(Math.max(0, idx - 80), Math.min(content.length, idx + 300));
            break;
          }
        }
        if (!snippet) snippet = content.substring(0, 300);

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

    // Top candidates for LLM ranking
    const candidates = Array.from(docBest.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(maxResults * 2, 12));

    console.log('[search] LLM candidates:', candidates.length);

    // ── Stage 3: LLM semantic ranking ──
    const rankResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these document excerpts by relevance to the query: "${query}". Return the top ${maxResults} most relevant.

${candidates.map((d, i) => `[${i+1}] DocID:${d.chunk.document_id} Title:"${d.title}" Category:${d.category}
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

    // Build final results
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
    console.error('[search] Stack:', error?.stack || 'no stack');
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});