import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { document_id, query, max_chunks = 3 } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'document_id required' }, { status: 400 });
    }

    // Fetch the document metadata using service role so any user can read docs
    const doc = await base44.asServiceRole.entities.ReferenceDocument.get(document_id);
    
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    let fullContent = '';
    
    if (doc.source_url && doc.source_url.includes('drive.google.com')) {
      // Extract file ID from Google Drive URL
      const fileIdMatch = doc.source_url.match(/[-\w]{25,}/);
      
      if (!fileIdMatch) {
        return Response.json({ error: 'Invalid Google Drive URL' }, { status: 400 });
      }

      const fileId = fileIdMatch[0];
      
      // Get access token for Google Drive via proper connector API
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
      
      // Download file from Google Drive
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!driveResponse.ok) {
        return Response.json({ 
          error: 'Failed to fetch from Google Drive',
          details: await driveResponse.text()
        }, { status: 500 });
      }

      const fileBlob = await driveResponse.blob();
      const arrayBuffer = await fileBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Re-upload the file so we have a stable Base44 URL for InvokeLLM
      const formData = new FormData();
      formData.append('file', new Blob([uint8Array], { type: 'application/pdf' }), 'document.pdf');
      
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
        file: new Blob([uint8Array], { type: 'application/pdf' })
      });

      const extractResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: 'Extract all text content from this PDF document. Return the complete raw text only, no formatting or commentary.',
        file_urls: [uploadResult.file_url]
      });
      
      fullContent = typeof extractResult === 'string' ? extractResult : (extractResult?.text || '');
      
    } else if (doc.source_url && !doc.source_url.includes('drive.google.com')) {
      // Fetch from regular URL (Base44 hosted file)
      const response = await fetch(doc.source_url);
      
      if (!response.ok) {
        // Fall back to stored content if available
        if (doc.content) {
          fullContent = doc.content;
        } else {
          return Response.json({ error: 'Failed to fetch document from URL' }, { status: 500 });
        }
      } else {
        const fileBlob = await response.blob();
        const arrayBuffer = await fileBlob.arrayBuffer();
        
        // Re-upload so we have a fresh URL for InvokeLLM vision/file support
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
          file: new Blob([arrayBuffer], { type: 'application/pdf' })
        });
        
        const extractResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: 'Extract all text content from this PDF document. Return the complete raw text only, no formatting or commentary.',
          file_urls: [uploadResult.file_url]
        });
        
        fullContent = typeof extractResult === 'string' ? extractResult : (extractResult?.text || '');
      }
      
    } else if (doc.content) {
      fullContent = doc.content;
    } else {
      return Response.json({ error: 'No content available for this document' }, { status: 404 });
    }

    if (!fullContent || fullContent.length < 10) {
      return Response.json({ 
        error: 'Document content could not be extracted',
        document_title: doc.title 
      }, { status: 422 });
    }

    // If no query, return first N chunks
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
        document_id: doc.id,
        total_chunks: chunks.length,
        chunks: chunks.slice(0, max_chunks),
        message: 'Returning first chunks. Provide a query for targeted section extraction.'
      });
    }

    // Chunk the content for targeted retrieval
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

Analyze these document chunks and identify which chunks are most relevant.
Return only chunk indices that directly answer or relate to the query.

Document: "${doc.title}"

Chunks (showing first 400 chars each):
${chunks.map(c => `Chunk ${c.index}: ${c.text.substring(0, 400)}...`).join('\n\n')}`;

    const relevanceResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: relevancePrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          relevant_chunk_indices: {
            type: 'array',
            items: { type: 'number' }
          },
          reasoning: { type: 'string' }
        },
        required: ['relevant_chunk_indices']
      }
    });

    const relevantIndices = relevanceResult.relevant_chunk_indices || [];
    const relevantChunks = relevantIndices
      .slice(0, max_chunks)
      .map(idx => chunks[idx])
      .filter(Boolean);

    if (relevantChunks.length === 0) {
      // Fallback: return first chunk so agent isn't left empty-handed
      return Response.json({
        document_title: doc.title,
        document_id: doc.id,
        query,
        message: 'No highly relevant sections found. Returning document introduction.',
        relevant_content: chunks[0]?.text || '',
        relevant_chunks_count: 1,
        chunk_indices: [0],
        fallback: true
      });
    }

    const relevantContent = relevantChunks
      .map(chunk => `[Section ${chunk.index + 1} of ${doc.title}]\n${chunk.text}`)
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
      error: error.message 
    }, { status: 500 });
  }
});