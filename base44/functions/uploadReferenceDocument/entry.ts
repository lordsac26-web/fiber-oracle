import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { file_url, title, source_type } = await req.json();

        if (!file_url || !title || !source_type) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Extract content based on source type
        let content = '';
        let metadata = {};

        if (source_type === 'pdf') {
            // Use Base44's ExtractDataFromUploadedFile to get PDF text
            const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
                file_url: file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        text: { type: "string" }
                    }
                }
            });

            if (extractResult.status === 'success' && extractResult.output) {
                content = extractResult.output.text || '';
                metadata = { 
                    word_count: content.split(/\s+/).length,
                    char_count: content.length 
                };
            } else {
                return Response.json({ 
                    error: 'Failed to extract PDF content', 
                    details: extractResult.details 
                }, { status: 400 });
            }
        } else if (source_type === 'website') {
            // For websites, we'll fetch and use InvokeLLM to extract the text content
            const response = await fetch(file_url);
            const html = await response.text();
            
            // Use LLM to extract clean text from HTML
            const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `Extract all meaningful text content from this HTML, removing scripts, styles, and navigation. Return only the main content text:\n\n${html.substring(0, 50000)}`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        text: { type: "string" }
                    }
                }
            });

            content = llmResult.text || '';
            metadata = { 
                url: file_url,
                word_count: content.split(/\s+/).length 
            };
        }

        // Create the reference document
        const document = await base44.asServiceRole.entities.ReferenceDocument.create({
            title,
            source_type,
            source_url: file_url,
            content,
            metadata,
            is_active: true
        });

        return Response.json({ 
            success: true, 
            document_id: document.id,
            word_count: metadata.word_count 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});