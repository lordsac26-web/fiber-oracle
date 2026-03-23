import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * advancedDocumentSearch — Two-stage search across all documents.
 * 
 * Stage 1: Fetch all ReferenceDocument records (lightweight — just titles/categories)
 *          and score them by keyword match. This is fast since there are ~126 docs.
 * Stage 2: For the top candidate documents, fetch their DocumentChunks to find
 *          the best matching content excerpts.
 * Stage 3: LLM semantic ranking of top results with snippets.
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
      .filter(w => w.length > 2 && !stopWords.has(w));

    console.log('[search] Keywords:', queryWords.join(', '));

    if (queryWords.length === 0) {
      return Response.json({ query, total_results: 0, results: [], message: 'No meaningful keywords.' });
    }

    // ── Stage 1: Score all ReferenceDocuments by title/category/tags/comments ──
    // Fetch all docs (there are ~126, so this is fast — 2-3 pages)
    let allDocs = [];
    let page = 0;
    while (page < 10) {
      try {
        const batch = await base44.asServiceRole.entities.ReferenceDocument.filter(
          { is_active: true },
          'created_date',
          50,
          page * 50
        );
        const arr = Array.isArray(batch) ? batch : [];
        if (arr.length === 0) break;
        allDocs = allDocs.concat(arr);
        page++;
      } catch (e) {
        console.error('[search] Doc fetch error page', page, ':', e.message);
        break;
      }
    }

    console.log('[search] Total documents loaded:', allDocs.length);

    // Score each document (already filtered to active)
    const scoredDocs = allDocs.map(doc => {
        let score = 0;
        const title = (doc.title || '').toLowerCase();
        const category = (doc.category || '').toLowerCase();
        const comments = (doc.comments || '').toLowerCase();
        const tags = (doc.tags || []).join(' ').toLowerCase();
        const content = (doc.content || '').toLowerCase();
        const matchedWords = new Set();

        for (const word of queryWords) {
          if (title.includes(word)) { score += 15; matchedWords.add(word); }
          if (category.includes(word)) { score += 8; matchedWords.add(word); }
          if (comments.includes(word)) { score += 6; matchedWords.add(word); }
          if (tags.includes(word)) { score += 5; matchedWords.add(word); }
          // Check content field (may be large JSON or text) — just check first 5000 chars
          if (content.substring(0, 5000).includes(word)) { score += 3; matchedWords.add(word); }
        }

        // Breadth bonus
        if (matchedWords.size > 0) {
          score *= (1 + matchedWords.size / queryWords.length);
        }

        return { doc, score, matchedWords: matchedWords.size };
      })
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score);

    console.log('[search] Documents with matches:', scoredDocs.length);

    if (scoredDocs.length === 0) {
      return Response.json({
        query,
        total_documents_searched: allDocs.length,
        total_results: 0,
        results: [],
        message: 'No matching documents found.'
      });
    }

    // Take top candidates for chunk-level search
    const topDocs = scoredDocs.slice(0, Math.max(maxResults * 2, 16));

    // ── Stage 2: Fetch chunks for top candidate documents (in parallel) ──
    const CHUNKS_PER_DOC = 5;
    const chunkFetches = topDocs.map(async ({ doc }) => {
      try {
        const chunks = await base44.asServiceRole.entities.DocumentChunk.filter(
          { document_id: doc.id },
          '-created_date',
          CHUNKS_PER_DOC
        );
        return { docId: doc.id, chunks: Array.isArray(chunks) ? chunks : [] };
      } catch (e) {
        console.error(`[search] Chunk fetch error for ${doc.id}:`, e.message);
        return { docId: doc.id, chunks: [] };
      }
    });

    const chunkResults = await Promise.all(chunkFetches);

    // Find best matching chunk per document and extract snippet
    const candidatesWithSnippets = topDocs.map(({ doc, score }) => {
      const docChunks = chunkResults.find(r => r.docId === doc.id)?.chunks || [];
      
      // Score each chunk by keyword overlap in content
      let bestSnippet = '';
      let bestChunkScore = 0;
      for (const chunk of docChunks) {
        const content = (chunk.content || '').toLowerCase();
        let chunkScore = 0;
        for (const word of queryWords) {
          if (content.includes(word)) chunkScore++;
        }
        if (chunkScore > bestChunkScore) {
          bestChunkScore = chunkScore;
          // Extract snippet around first keyword match
          for (const word of queryWords) {
            const idx = content.indexOf(word);
            if (idx !== -1) {
              const raw = chunk.content || '';
              bestSnippet = raw.substring(Math.max(0, idx - 80), Math.min(raw.length, idx + 300));
              break;
            }
          }
        }
      }

      if (!bestSnippet && docChunks.length > 0) {
        bestSnippet = (docChunks[0].content || '').substring(0, 300);
      }

      return {
        docId: doc.id,
        title: doc.title,
        category: doc.category,
        source_type: doc.source_type,
        source_url: doc.source_url,
        tags: doc.tags || [],
        score,
        snippet: bestSnippet,
        metadata: doc.metadata,
      };
    });

    console.log('[search] Candidates with snippets:', candidatesWithSnippets.length);

    // ── Stage 3: LLM semantic ranking ──
    const rankResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these document excerpts by relevance to the query: "${query}". Return the top ${maxResults} most relevant.

${candidatesWithSnippets.map((d, i) => `[${i+1}] DocID:${d.docId} Title:"${d.title}" Category:${d.category}
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
      const c = candidatesWithSnippets.find(x => x.docId === r.document_id);
      if (!c) return null;
      return {
        document_id: c.docId,
        title: c.title,
        category: c.category,
        source_type: c.source_type,
        source_url: c.source_url,
        tags: c.tags,
        relevance_score: r.relevance_score,
        match_reasoning: r.match_reasoning,
        content_preview: c.snippet || null
      };
    }).filter(Boolean);

    return Response.json({
      query,
      total_documents_searched: allDocs.length,
      total_unique_documents_matched: scoredDocs.length,
      total_results: results.length,
      results
    });

  } catch (error) {
    console.error('[search] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});