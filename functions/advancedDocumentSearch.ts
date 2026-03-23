import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * advancedDocumentSearch — Paginate through all DocumentChunks and score in memory.
 * 
 * Uses lightweight scoring on title/category/keywords/tags fields (not full content)
 * to avoid OOM. Paginates in batches with rate-limit-safe delays.
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
      .slice(0, 8);

    console.log('[search] Keywords:', queryWords.join(', '));

    if (queryWords.length === 0) {
      return Response.json({ query, total_results: 0, results: [], message: 'No meaningful keywords.' });
    }

    // ── Stage 1: Paginate all chunks, score in memory (lightweight fields only) ──
    // We keep only: document_id, document_title, document_category, keywords, metadata.tags, score
    // We do NOT store full content in memory — only fetch content for top candidates later
    const PAGE_SIZE = 50;
    const MAX_CHUNKS = 20000;
    const docBest = new Map(); // document_id -> best score info (no content stored)
    let totalChunks = 0;
    let page = 0;

    while (totalChunks < MAX_CHUNKS) {
      let batch;
      try {
        batch = await base44.asServiceRole.entities.DocumentChunk.list(
          'created_date', PAGE_SIZE, page * PAGE_SIZE
        );
        if (!Array.isArray(batch) || batch.length === 0) break;
      } catch (e) {
        console.error('[search] Page', page, 'error:', e.message);
        // On rate limit or connection error, use what we have
        break;
      }

      for (const chunk of batch) {
        totalChunks++;
        let score = 0;
        const title = (chunk.document_title || '').toLowerCase();
        const category = (chunk.document_category || '').toLowerCase();
        const keywords = (chunk.keywords || '').toLowerCase();
        const tags = ((chunk.metadata?.tags) || []).join(' ').toLowerCase();
        const matchedWords = new Set();

        for (const word of queryWords) {
          if (title.includes(word)) { score += 10; matchedWords.add(word); }
          if (category.includes(word)) { score += 5; matchedWords.add(word); }
          if (keywords.includes(word)) { score += 4; matchedWords.add(word); }
          if (tags.includes(word)) { score += 7; matchedWords.add(word); }
        }

        if (score === 0) continue;

        // Breadth bonus
        score *= (1 + matchedWords.size / queryWords.length);

        const docId = chunk.document_id;
        const existing = docBest.get(docId);
        if (!existing || score > existing.score) {
          docBest.set(docId, {
            score,
            chunkId: chunk.id,
            title: chunk.document_title,
            category: chunk.document_category,
            tags: chunk.metadata?.tags || [],
            sourceType: chunk.metadata?.source_type,
            sourceUrl: chunk.metadata?.source_url,
          });
        }
      }

      page++;
    }

    console.log('[search] Chunks scanned:', totalChunks, '| Docs matched:', docBest.size);

    if (docBest.size === 0) {
      return Response.json({
        query,
        total_chunks_scanned: totalChunks,
        total_results: 0,
        results: [],
        message: 'No matching documents found.'
      });
    }

    // ── Stage 2: For top candidates, fetch a few chunks to get content snippets ──
    const candidates = Array.from(docBest.entries())
      .map(([docId, data]) => ({ docId, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(maxResults * 2, 12));

    // Fetch 3 chunks per candidate doc (sequential to avoid rate limits)
    for (const c of candidates) {
      try {
        const chunks = await base44.asServiceRole.entities.DocumentChunk.filter(
          { document_id: c.docId },
          'chunk_index',
          3
        );
        const arr = Array.isArray(chunks) ? chunks : [];
        
        // Find best content snippet
        let bestSnippet = '';
        let bestScore = 0;
        for (const ch of arr) {
          // Clean JSON noise
          const raw = (ch.content || '');
          const clean = raw.replace(/\{"title":null,"content":null\}/g, '').replace(/,{2,}/g, ',').trim();
          const lower = clean.toLowerCase();
          let s = 0;
          for (const w of queryWords) { if (lower.includes(w)) s++; }
          if (s > bestScore || !bestSnippet) {
            bestScore = s;
            for (const w of queryWords) {
              const idx = lower.indexOf(w);
              if (idx !== -1) {
                bestSnippet = clean.substring(Math.max(0, idx - 80), Math.min(clean.length, idx + 300)).trim();
                break;
              }
            }
            if (!bestSnippet) bestSnippet = clean.substring(0, 300).trim();
          }
        }
        c.snippet = bestSnippet;
      } catch (e) {
        console.error(`[search] Snippet fetch error for ${c.docId}:`, e.message);
        c.snippet = '';
      }
    }

    console.log('[search] Candidates ready:', candidates.length);

    // ── Stage 3: LLM semantic ranking ──
    const rankResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these document excerpts by relevance to the query: "${query}". Return the top ${maxResults} most relevant.

${candidates.map((d, i) => `[${i+1}] DocID:${d.docId} Title:"${d.title}" Category:${d.category} Tags:${d.tags.join(',')}
Excerpt: ${(d.snippet || '(no excerpt)').substring(0, 400)}`).join('\n\n')}`,
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
      const c = candidates.find(x => x.docId === r.document_id);
      if (!c) return null;
      return {
        document_id: c.docId,
        title: c.title,
        category: c.category,
        source_type: c.sourceType,
        source_url: c.sourceUrl,
        tags: c.tags,
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
    console.error('[search] Error:', error?.message || error);
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
});