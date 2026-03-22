import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * advancedDocumentSearch — Searches ALL documents via pre-indexed chunks.
 * 
 * FIXED: Previous version loaded 5000 chunks sorted by -created_date,
 * which meant only the most recently chunked ~7 docs were ever searched.
 * 
 * New approach:
 * 1. Extract query keywords
 * 2. For each keyword, query DocumentChunk by keyword field (indexed)
 * 3. Score and deduplicate across all fetched chunks
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

    // Step 1: Extract meaningful query keywords (>2 chars, lowercase)
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
      .filter(w => w.length > 2 && !stopWords.has(w));

    console.log('[search] Keywords:', queryWords.join(', '));

    if (queryWords.length === 0) {
      return Response.json({
        query,
        total_results: 0,
        results: [],
        message: 'No meaningful keywords extracted from query.'
      });
    }

    // Step 2: Fetch chunks matching each keyword using filter (uses index)
    // We search by keyword substring match in the keywords field
    // Strategy: fetch a batch of chunks per keyword, merge & score
    const chunkMap = new Map(); // chunk.id -> { chunk, score }
    const CHUNKS_PER_KEYWORD = 200;

    // Fetch chunks for all keywords in parallel
    const keywordFetches = queryWords.map(async (word) => {
      try {
        // Use filter on the keywords field which contains space-separated terms
        // The SDK filter does substring/contains matching
        const chunks = await base44.asServiceRole.entities.DocumentChunk.filter(
          { keywords: word },
          '-created_date',
          CHUNKS_PER_KEYWORD
        );
        return { word, chunks: Array.isArray(chunks) ? chunks : [] };
      } catch (e) {
        console.error(`[search] Error fetching chunks for keyword "${word}":`, e.message);
        return { word, chunks: [] };
      }
    });

    const keywordResults = await Promise.all(keywordFetches);

    // Step 3: Merge and score all fetched chunks
    for (const { word, chunks } of keywordResults) {
      for (const chunk of chunks) {
        const id = chunk.id;
        if (!chunkMap.has(id)) {
          chunkMap.set(id, { chunk, score: 0, matchedWords: new Set() });
        }
        const entry = chunkMap.get(id);
        entry.matchedWords.add(word);

        const keywords = (chunk.keywords || '').toLowerCase();
        const title = (chunk.document_title || '').toLowerCase();
        const category = (chunk.document_category || '').toLowerCase();
        const content = (chunk.content || '').toLowerCase();

        // Title match is strongest signal
        if (title.includes(word)) entry.score += 10;
        // Category match
        if (category.includes(word)) entry.score += 5;
        // Keyword index match (pre-extracted important terms)
        if (keywords.includes(word)) entry.score += 4;
        // Direct content match
        if (content.includes(word)) entry.score += 2;
      }
    }

    const allScoredChunks = Array.from(chunkMap.values());
    console.log('[search] Total unique chunks fetched:', allScoredChunks.length);

    // Boost chunks that matched more query words (breadth bonus)
    for (const entry of allScoredChunks) {
      const wordCoverage = entry.matchedWords.size / queryWords.length;
      entry.score *= (1 + wordCoverage); // up to 2x boost for full coverage
    }

    // Sort by score descending
    allScoredChunks.sort((a, b) => b.score - a.score);

    if (allScoredChunks.length === 0) {
      return Response.json({
        query,
        total_results: 0,
        results: [],
        message: 'No matching document chunks found for this query.'
      });
    }

    // Step 4: Deduplicate by document — keep best chunk per doc
    const docBestChunks = new Map();
    for (const entry of allScoredChunks) {
      const docId = entry.chunk.document_id;
      const existing = docBestChunks.get(docId);
      if (!existing || entry.score > existing.score) {
        // Extract snippet
        let snippet = '';
        const content = entry.chunk.content || '';
        const contentLower = content.toLowerCase();
        for (const word of queryWords) {
          const idx = contentLower.indexOf(word);
          if (idx !== -1) {
            const s = Math.max(0, idx - 80);
            const e = Math.min(content.length, idx + 250);
            snippet = content.substring(s, e);
            break;
          }
        }
        docBestChunks.set(docId, { ...entry, snippet });
      }
    }

    const uniqueDocCount = docBestChunks.size;
    console.log('[search] Unique docs matched:', uniqueDocCount);

    // Take top candidates for LLM ranking
    const candidates = Array.from(docBestChunks.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(maxResults * 2, 16));

    console.log('[search] LLM candidates:', candidates.length);

    // Step 5: LLM semantic ranking
    const rankResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these document excerpts by relevance to the query: "${query}". Return the top ${maxResults} most relevant.

${candidates.map((d, i) => `[${i+1}] DocID:${d.chunk.document_id} Title:"${d.chunk.document_title}" Category:${d.chunk.document_category}
Excerpt: ${(d.snippet || d.chunk.content || '').substring(0, 400)}`).join('\n\n')}`,
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

    // Step 6: Build final results with document metadata and content previews
    const results = ranked.map(r => {
      const entry = candidates.find(c => c.chunk.document_id === r.document_id);
      if (!entry) return null;
      return {
        document_id: entry.chunk.document_id,
        title: entry.chunk.document_title,
        category: entry.chunk.document_category,
        source_type: entry.chunk.metadata?.source_type,
        source_url: entry.chunk.metadata?.source_url,
        tags: entry.chunk.metadata?.tags || [],
        relevance_score: r.relevance_score,
        match_reasoning: r.match_reasoning,
        content_preview: entry.snippet || entry.chunk.content?.substring(0, 400) || null
      };
    }).filter(Boolean);

    return Response.json({
      query,
      total_unique_documents_matched: uniqueDocCount,
      total_chunks_evaluated: allScoredChunks.length,
      total_results: results.length,
      results
    });

  } catch (error) {
    console.error('[search] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});