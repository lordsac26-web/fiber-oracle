import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * advancedDocumentSearch — Searches ALL documents via pre-indexed chunks.
 * 
 * Strategy: Paginate through ALL chunks in batches, but only keep lightweight
 * scoring data in memory (not full content). Score by keyword match on the
 * pre-built keywords field. Then fetch full content only for top candidates.
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

    // Step 1: Paginate through ALL chunks but only keep id, keywords, title, category, document_id
    // This avoids loading huge content fields into memory
    const PAGE_SIZE = 100;
    const MAX_PAGES = 200; // safety: 20,000 chunks max
    
    // Track best chunk per document (by score) - keeps memory minimal
    const docBest = new Map(); // document_id -> { score, chunkId, title, category, keywords, matchedWords }
    let totalChunks = 0;
    let page = 0;

    while (page < MAX_PAGES) {
      let batch;
      try {
        batch = await base44.asServiceRole.entities.DocumentChunk.list(
          'created_date', PAGE_SIZE, page * PAGE_SIZE
        );
        if (!Array.isArray(batch)) batch = [];
      } catch (e) {
        console.error('[search] Fetch error page', page, e.message);
        break;
      }

      if (batch.length === 0) break;
      totalChunks += batch.length;

      // Score each chunk — only use lightweight fields
      for (const chunk of batch) {
        let score = 0;
        const matchedWords = new Set();
        const keywords = (chunk.keywords || '').toLowerCase();
        const title = (chunk.document_title || '').toLowerCase();
        const category = (chunk.document_category || '').toLowerCase();

        for (const word of queryWords) {
          let wordScore = 0;
          if (title.includes(word)) wordScore += 10;
          if (category.includes(word)) wordScore += 5;
          if (keywords.includes(word)) wordScore += 4;
          if (wordScore > 0) {
            matchedWords.add(word);
            score += wordScore;
          }
        }

        if (score === 0) continue;

        // Breadth bonus: chunks matching more keywords rank higher
        const coverage = matchedWords.size / queryWords.length;
        score *= (1 + coverage);

        const docId = chunk.document_id;
        const existing = docBest.get(docId);
        if (!existing || score > existing.score) {
          docBest.set(docId, {
            score,
            chunkId: chunk.id,
            title: chunk.document_title,
            category: chunk.document_category,
            metadata: chunk.metadata,
            matchedWords: matchedWords.size,
          });
        }
      }

      page++;
    }

    console.log('[search] Total chunks scanned:', totalChunks);
    console.log('[search] Unique docs matched:', docBest.size);

    if (docBest.size === 0) {
      return Response.json({
        query, total_chunks_scanned: totalChunks, total_results: 0, results: [],
        message: 'No matching documents found.'
      });
    }

    // Step 2: Get top candidate documents
    const candidates = Array.from(docBest.entries())
      .map(([docId, data]) => ({ docId, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(maxResults * 2, 16));

    console.log('[search] LLM candidates:', candidates.length);

    // Step 3: Fetch the actual best chunk content for each candidate (for snippets)
    // Fetch in parallel, max ~16 chunks
    const chunkFetches = candidates.map(async (c) => {
      try {
        // Fetch a few chunks from this document to get good content
        const chunks = await base44.asServiceRole.entities.DocumentChunk.filter(
          { document_id: c.docId },
          '-created_date',
          3
        );
        const arr = Array.isArray(chunks) ? chunks : [];
        // Find best matching chunk by keyword overlap
        let bestChunk = arr[0];
        let bestScore = 0;
        for (const ch of arr) {
          const content = (ch.content || '').toLowerCase();
          let s = 0;
          for (const w of queryWords) {
            if (content.includes(w)) s++;
          }
          if (s > bestScore) { bestScore = s; bestChunk = ch; }
        }
        return { docId: c.docId, chunk: bestChunk };
      } catch (e) {
        return { docId: c.docId, chunk: null };
      }
    });

    const chunkResults = await Promise.all(chunkFetches);
    const chunkByDoc = new Map();
    for (const r of chunkResults) {
      if (r.chunk) chunkByDoc.set(r.docId, r.chunk);
    }

    // Build snippets
    const candidatesWithSnippets = candidates.map(c => {
      const chunk = chunkByDoc.get(c.docId);
      let snippet = '';
      if (chunk) {
        const content = chunk.content || '';
        const contentLower = content.toLowerCase();
        for (const word of queryWords) {
          const idx = contentLower.indexOf(word);
          if (idx !== -1) {
            snippet = content.substring(Math.max(0, idx - 80), Math.min(content.length, idx + 250));
            break;
          }
        }
        if (!snippet) snippet = content.substring(0, 300);
      }
      return { ...c, snippet };
    });

    // Step 4: LLM semantic ranking
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

    const results = ranked.map(r => {
      const c = candidatesWithSnippets.find(x => x.docId === r.document_id);
      if (!c) return null;
      return {
        document_id: c.docId,
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
      total_chunks_scanned: totalChunks,
      total_unique_documents_matched: docBest.size,
      total_results: results.length,
      results
    });

  } catch (error) {
    console.error('[search] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});