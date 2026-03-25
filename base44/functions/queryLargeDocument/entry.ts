import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * queryLargeDocument — Retrieves specific sections from a document using pre-indexed chunks.
 * 
 * No more re-downloading PDFs or re-parsing. Uses DocumentChunk records directly.
 * Falls back to stored content on ReferenceDocument if chunks don't exist.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate the requesting user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, query, max_chunks = 3 } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'document_id required' }, { status: 400 });
    }

    // Fetch document metadata using user-scoped access (RLS enforced)
    const doc = await base44.entities.ReferenceDocument.get(document_id);
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    console.log(`[queryDoc] User ${user.email} querying "${doc.title}" for: ${query || '(no query)'}`);

    // Fetch pre-indexed chunks using user-scoped access (RLS enforced)
    let chunks = [];
    try {
      const raw = await base44.entities.DocumentChunk.filter(
        { document_id },
        'chunk_index',
        200
      );
      if (typeof raw === 'string') {
        chunks = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        chunks = raw;
      }
    } catch (e) {
      console.error('[queryDoc] Chunk fetch error:', e.message);
    }

    console.log(`[queryDoc] Found ${chunks.length} pre-indexed chunks`);

    // If no chunks exist, fall back to stored content (split on-the-fly)
    if (chunks.length === 0 && doc.content) {
      console.log('[queryDoc] No chunks found, using stored content fallback');
      const chunkSize = 2000;
      chunks = [];
      for (let i = 0; i < doc.content.length; i += chunkSize) {
        chunks.push({
          chunk_index: Math.floor(i / chunkSize),
          content: doc.content.substring(i, i + chunkSize),
          keywords: ''
        });
      }
    }

    if (chunks.length === 0) {
      return Response.json({
        error: 'No content available for this document',
        document_title: doc.title
      }, { status: 404 });
    }

    // If no query, return first N chunks
    if (!query) {
      return Response.json({
        document_title: doc.title,
        document_id: doc.id,
        total_chunks: chunks.length,
        chunks: chunks.slice(0, max_chunks).map(c => ({
          index: c.chunk_index,
          text: c.content
        })),
        message: 'Returning first chunks. Provide a query for targeted section extraction.'
      });
    }

    // Score chunks by keyword relevance to query
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scoredChunks = chunks.map(chunk => {
      let score = 0;
      const keywords = (chunk.keywords || '').toLowerCase();
      const content = (chunk.content || '').toLowerCase();

      for (const word of queryWords) {
        if (keywords.includes(word)) score += 4;
        if (content.includes(word)) score += 2;
      }
      return { ...chunk, score };
    }).sort((a, b) => b.score - a.score);

    // Take top scoring chunks
    const topChunks = scoredChunks.slice(0, max_chunks);

    // If keyword scoring found nothing, use LLM to find relevant sections
    if (topChunks.every(c => c.score === 0) && chunks.length <= 30) {
      console.log('[queryDoc] No keyword matches, using LLM for relevance');
      const relevanceResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Given this search query: "${query}"

Analyze these document chunks and identify which chunks are most relevant.

Document: "${doc.title}"

Chunks (showing first 300 chars each):
${chunks.map(c => `Chunk ${c.chunk_index}: ${c.content.substring(0, 300)}...`).join('\n\n')}`,
        response_json_schema: {
          type: 'object',
          properties: {
            relevant_chunk_indices: { type: 'array', items: { type: 'number' } },
            reasoning: { type: 'string' }
          },
          required: ['relevant_chunk_indices']
        }
      });

      const llmIndices = relevanceResult.relevant_chunk_indices || [];
      const llmChunks = llmIndices
        .slice(0, max_chunks)
        .map(idx => chunks.find(c => c.chunk_index === idx))
        .filter(Boolean);

      if (llmChunks.length > 0) {
        const relevantContent = llmChunks
          .map(c => `[Section ${c.chunk_index + 1} of ${doc.title}]\n${c.content}`)
          .join('\n\n---\n\n');

        return Response.json({
          document_title: doc.title,
          document_id: doc.id,
          query,
          total_chunks: chunks.length,
          relevant_chunks_count: llmChunks.length,
          relevant_content: relevantContent,
          chunk_indices: llmChunks.map(c => c.chunk_index),
          reasoning: relevanceResult.reasoning
        });
      }
    }

    // Build response from top scored chunks
    const relevantContent = topChunks
      .filter(c => c.score > 0 || topChunks.indexOf(c) === 0)
      .map(c => `[Section ${c.chunk_index + 1} of ${doc.title}]\n${c.content}`)
      .join('\n\n---\n\n');

    return Response.json({
      document_title: doc.title,
      document_id: doc.id,
      query,
      total_chunks: chunks.length,
      relevant_chunks_count: topChunks.filter(c => c.score > 0).length || 1,
      relevant_content: relevantContent,
      chunk_indices: topChunks.map(c => c.chunk_index)
    });

  } catch (error) {
    console.error('[queryDoc] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});