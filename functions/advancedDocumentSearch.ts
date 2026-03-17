import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Search strategy:
// 1. Fetch ReferenceDocument METADATA only (no content field used) - small payload
// 2. Search DocumentChunk records for content matches - chunks are ~4000 chars each, manageable
// 3. Rank by relevance via LLM using titles + chunk excerpts
// This avoids the Brotli decompression crash caused by fetching 500 full-content documents at once.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try {
      body = await req.json();
    } catch (_) {
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

    // STEP 1: Fetch document metadata (titles, tags, categories) — NO large content fields
    // Use filter to get only active, latest-version docs with metadata fields
    const docFilter = { is_active: true, is_latest_version: true };
    if (filters.category) docFilter.category = filters.category;
    if (filters.source_type) docFilter.source_type = filters.source_type;

    const allDocs = await base44.asServiceRole.entities.ReferenceDocument.filter(docFilter, '-created_date', 200);

    if (!allDocs || allDocs.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No documents found in knowledge base.' });
    }

    // Build a lightweight doc map (id -> metadata only, no content)
    const docMap = {};
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
        is_active: doc.is_active,
        is_latest_version: doc.is_latest_version
      };
    }

    const docIds = Object.keys(docMap);

    // STEP 2: Keyword pre-filter on titles/tags (no content needed)
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const titleScoredDocs = docIds.map(id => {
      const doc = docMap[id];
      let score = 0;
      const title = doc.title.toLowerCase();
      const tags = doc.tags.join(' ').toLowerCase();
      const category = doc.category.toLowerCase();
      for (const word of queryWords) {
        if (title.includes(word)) score += 10;
        if (tags.includes(word)) score += 5;
        if (category.includes(word)) score += 3;
      }
      return { id, score };
    }).sort((a, b) => b.score - a.score);

    // Take top candidates for chunk search (title matches first, then all if no hits)
    const hasTitleHits = titleScoredDocs.some(d => d.score > 0);
    const candidateDocIds = hasTitleHits
      ? titleScoredDocs.filter(d => d.score > 0).slice(0, 30).map(d => d.id)
      : titleScoredDocs.slice(0, 30).map(d => d.id);

    // STEP 3: Search DocumentChunks for the candidate documents
    // Fetch chunks in batches of 10 doc IDs to keep payloads small
    const chunksByDoc = {};
    const batchSize = 10;

    for (let i = 0; i < candidateDocIds.length; i += batchSize) {
      const batchIds = candidateDocIds.slice(i, i + batchSize);
      // Fetch chunks for each doc in this batch concurrently
      await Promise.all(batchIds.map(async (docId) => {
        try {
          const chunks = await base44.asServiceRole.entities.DocumentChunk.filter(
            { document_id: docId }, 'chunk_index', 20
          );
          if (chunks && chunks.length > 0) {
            chunksByDoc[docId] = chunks;
          }
        } catch (_) {
          // If chunk fetch fails for one doc, skip it gracefully
        }
      }));
    }

    // STEP 4: Score docs by chunk content keyword matches
    const contentScoredDocs = candidateDocIds.map(id => {
      const titleScore = titleScoredDocs.find(d => d.id === id)?.score || 0;
      const chunks = chunksByDoc[id] || [];
      let contentScore = 0;
      let bestChunkText = '';
      let bestChunkScore = 0;

      for (const chunk of chunks) {
        const text = (chunk.content || '').toLowerCase();
        let chunkScore = 0;
        for (const word of queryWords) {
          const count = (text.match(new RegExp(word, 'g')) || []).length;
          chunkScore += count;
        }
        if (chunkScore > bestChunkScore) {
          bestChunkScore = chunkScore;
          bestChunkText = chunk.content || '';
        }
        contentScore += chunkScore;
      }

      return {
        id,
        totalScore: titleScore * 2 + contentScore,
        bestChunkText,
        hasChunks: chunks.length > 0
      };
    }).sort((a, b) => b.totalScore - a.totalScore);

    // Take top candidates for LLM ranking
    const topCandidates = contentScoredDocs.slice(0, 20);

    if (topCandidates.length === 0) {
      return Response.json({ query, results: [], total_results: 0, message: 'No relevant documents found.' });
    }

    // STEP 5: LLM semantic ranking on top candidates (using title + best chunk excerpt)
    const llmInput = topCandidates.map(c => ({
      id: c.id,
      title: docMap[c.id]?.title || '',
      category: docMap[c.id]?.category || '',
      tags: (docMap[c.id]?.tags || []).join(', '),
      excerpt: c.bestChunkText ? c.bestChunkText.substring(0, 400) : '(no content indexed)'
    }));

    const rankingResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Rank these documents by relevance to the search query. Return top ${max_results} most relevant.

Query: "${query}"

Documents:
${llmInput.map((d, i) => `[${i+1}] ID: ${d.id}
Title: ${d.title}
Category: ${d.category} | Tags: ${d.tags}
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

    // STEP 6: Build final result set
    const results = rankedDocs.map(ranked => {
      const doc = docMap[ranked.document_id];
      if (!doc) return null;

      const candidate = contentScoredDocs.find(c => c.id === ranked.document_id);
      let contentPreview = '';
      if (include_content_preview && candidate?.bestChunkText) {
        let snippet = candidate.bestChunkText.substring(0, 500);
        for (const word of queryWords) {
          snippet = snippet.replace(new RegExp(`(${word})`, 'gi'), '**$1**');
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
        tags: doc.tags,
        created_date: doc.created_date,
        relevance_score: ranked.relevance_score,
        match_reasoning: ranked.match_reasoning,
        content_preview: contentPreview || null,
        has_indexed_chunks: !!(chunksByDoc[doc.id]?.length)
      };
    }).filter(Boolean);

    return Response.json({
      query,
      filters_applied: filters,
      total_documents_searched: candidateDocIds.length,
      total_results: results.length,
      results,
      search_metadata: {
        strategy: 'metadata_first_chunk_search',
        title_hits: hasTitleHits,
        candidates_evaluated: topCandidates.length,
        semantic_ranking: true
      }
    });

  } catch (error) {
    console.error('advancedDocumentSearch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});