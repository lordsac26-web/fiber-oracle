import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CHUNK_SIZE = 1000; // tokens (roughly 4000 chars)
const CHUNK_OVERLAP = 200; // overlap between chunks

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { document_id } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Fetch document
    const doc = await base44.asServiceRole.entities.ReferenceDocument.get(document_id);

    if (!doc || !doc.content) {
      return Response.json({ error: 'Document not found or has no content' }, { status: 404 });
    }

    // Simple chunking by characters (approximation)
    const content = doc.content;
    const chunkSizeChars = CHUNK_SIZE * 4; // rough token to char conversion
    const overlapChars = CHUNK_OVERLAP * 4;
    
    const chunks = [];
    let startPos = 0;
    let chunkIndex = 0;

    while (startPos < content.length) {
      const endPos = Math.min(startPos + chunkSizeChars, content.length);
      const chunkContent = content.substring(startPos, endPos);
      
      if (chunkContent.trim()) {
        chunks.push({
          chunk_index: chunkIndex,
          content: chunkContent,
          start_pos: startPos,
          end_pos: endPos
        });
        chunkIndex++;
      }
      
      startPos = endPos - overlapChars;
      if (startPos >= content.length - overlapChars) break;
    }

    // Generate embeddings for each chunk using AI
    const chunksWithEmbeddings = [];
    
    for (const chunk of chunks) {
      try {
        // Use LLM to generate a semantic summary/embedding representation
        const embeddingResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Generate a concise semantic summary of this technical document chunk in exactly 5 key concepts or phrases, separated by semicolons:\n\n${chunk.content.substring(0, 2000)}`,
          response_json_schema: {
            type: 'object',
            properties: {
              concepts: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['concepts']
          }
        });
        
        // Create a simple embedding from concepts (for now, store as searchable keywords)
        // In production, you'd use a proper embedding model
        const embedding = embeddingResult.concepts || [];
        
        chunksWithEmbeddings.push({
          document_id: document_id,
          chunk_index: chunk.chunk_index,
          content: chunk.content,
          embedding: embedding, // Store as searchable concepts
          token_count: Math.floor(chunk.content.length / 4),
          metadata: {
            start_pos: chunk.start_pos,
            end_pos: chunk.end_pos,
            document_title: doc.title,
            document_category: doc.category
          }
        });
      } catch (error) {
        console.error(`Failed to process chunk ${chunk.chunk_index}:`, error);
      }
    }

    // Delete existing chunks for this document
    const existingChunks = await base44.asServiceRole.entities.DocumentChunk.filter({ document_id });
    for (const oldChunk of existingChunks) {
      await base44.asServiceRole.entities.DocumentChunk.delete(oldChunk.id);
    }

    // Store chunks
    const storedChunks = [];
    for (const chunkData of chunksWithEmbeddings) {
      const stored = await base44.asServiceRole.entities.DocumentChunk.create(chunkData);
      storedChunks.push(stored);
    }

    // Update document metadata
    await base44.asServiceRole.entities.ReferenceDocument.update(document_id, {
      metadata: {
        ...doc.metadata,
        chunk_count: storedChunks.length,
        chunked_at: new Date().toISOString()
      }
    });

    return Response.json({
      success: true,
      document_id,
      chunks_created: storedChunks.length,
      total_tokens: storedChunks.reduce((sum, c) => sum + c.token_count, 0)
    });

  } catch (error) {
    console.error('Error chunking document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});