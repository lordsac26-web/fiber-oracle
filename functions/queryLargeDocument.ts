import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, query, max_chunks = 3 } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'document_id required' }, { status: 400 });
    }

    // Fetch the document metadata
    const doc = await base44.entities.ReferenceDocument.get(document_id);
    
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    let fullContent = '';
    
    // Check if it's a Google Drive file
    if (doc.source_url && doc.source_url.includes('drive.google.com')) {
      // Extract file ID from Google Drive URL
      const fileIdMatch = doc.source_url.match(/[-\w]{25,}/);
      
      if (!fileIdMatch) {
        return Response.json({ error: 'Invalid Google Drive URL' }, { status: 400 });
      }

      const fileId = fileIdMatch[0];
      
      // Get access token for Google Drive
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
      
      // Download file from Google Drive
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!driveResponse.ok) {
        return Response.json({ 
          error: 'Failed to fetch from Google Drive',
          details: await driveResponse.text()
        }, { status: 500 });
      }

      const fileBlob = await driveResponse.blob();
      
      // Extract text from PDF using InvokeLLM with file support
      const extractResult = await base44.integrations.Core.InvokeLLM({
        prompt: 'Extract all text content from this PDF document. Return the raw text.',
        file_urls: [URL.createObjectURL(fileBlob)]
      });
      
      fullContent = extractResult || '';
      
    } else if (doc.source_url) {
      // Fetch from regular URL
      const response = await fetch(doc.source_url);
      
      if (!response.ok) {
        return Response.json({ error: 'Failed to fetch document' }, { status: 500 });
      }

      const fileBlob = await response.blob();
      
      // Use Core.UploadFile to get a stable URL
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: new File([fileBlob], 'temp.pdf', { type: 'application/pdf' })
      });
      
      // Extract text using InvokeLLM
      const extractResult = await base44.integrations.Core.InvokeLLM({
        prompt: 'Extract all text content from this PDF document. Return the raw text.',
        file_urls: [uploadResult.file_url]
      });
      
      fullContent = extractResult || '';
      
    } else if (doc.content) {
      // Use stored content
      fullContent = doc.content;
    } else {
      return Response.json({ error: 'No content available for this document' }, { status: 404 });
    }

    // If no query, return chunked content
    if (!query) {
      const chunkSize = 5000;
      const chunks = [];
      for (let i = 0; i < fullContent.length; i += chunkSize) {
        chunks.push({
          index: Math.floor(i / chunkSize),
          text: fullContent.substring(i, i + chunkSize)
        });
      }
      
      return Response.json({
        document_title: doc.title,
        total_chunks: chunks.length,
        chunks: chunks.slice(0, max_chunks),
        message: 'Returning first chunks. Provide a query for relevant section extraction.'
      });
    }

    // Chunk the content for processing
    const chunkSize = 4000;
    const chunks = [];
    for (let i = 0; i < fullContent.length; i += chunkSize) {
      chunks.push({
        index: Math.floor(i / chunkSize),
        text: fullContent.substring(i, i + chunkSize),
        start_pos: i,
        end_pos: Math.min(i + chunkSize, fullContent.length)
      });
    }

    // Use AI to find most relevant chunks
    const relevancePrompt = `Given this search query: "${query}"

Analyze these document chunks and identify which chunks are most relevant to the query.
Return a JSON array of chunk indices (numbers) ordered by relevance, with the most relevant first.
Only include chunks that contain information directly relevant to the query.

Document chunks:
${chunks.map(c => `Chunk ${c.index}: ${c.text.substring(0, 300)}...`).join('\n\n')}`;

    const relevanceResult = await base44.integrations.Core.InvokeLLM({
      prompt: relevancePrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          relevant_chunk_indices: {
            type: 'array',
            items: { type: 'number' }
          },
          reasoning: { type: 'string' }
        }
      }
    });

    const relevantIndices = relevanceResult.relevant_chunk_indices || [];
    const relevantChunks = relevantIndices
      .slice(0, max_chunks)
      .map(idx => chunks[idx])
      .filter(Boolean);

    if (relevantChunks.length === 0) {
      return Response.json({
        document_title: doc.title,
        query,
        message: 'No relevant sections found for this query',
        suggestion: 'Try a different search term or broader query'
      });
    }

    // Extract and combine relevant sections
    const relevantContent = relevantChunks
      .map(chunk => `[Section ${chunk.index + 1}]\n${chunk.text}`)
      .join('\n\n---\n\n');

    return Response.json({
      document_title: doc.title,
      document_id: doc.id,
      query,
      total_chunks: chunks.length,
      relevant_chunks_count: relevantChunks.length,
      relevant_content: relevantContent,
      chunk_indices: relevantChunks.map(c => c.index),
      reasoning: relevanceResult.reasoning
    });

  } catch (error) {
    console.error('Error in queryLargeDocument:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});