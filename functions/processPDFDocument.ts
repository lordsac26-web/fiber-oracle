import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { file_url, title, category = 'other' } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Use LLM to extract markdown content and structured metadata in one call
        const extractionResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a technical document processor specializing in fiber optic equipment and FTTH products.

Extract and structure information from this PDF document:

1. Convert the ENTIRE document text into clean, well-formatted Markdown. Preserve:
   - Headings hierarchy (# ## ###)
   - Lists (bullet and numbered)
   - Tables (markdown format)
   - Code blocks or technical specifications
   - Important notes and warnings

2. Identify and extract key metadata:
   - product_model: Model number/name (e.g., "HG8145V5", "Nokia G-010S-A")
   - technology_type: PON technology (e.g., "GPON", "XGS-PON", "EPON", "Combo")
   - manufacturer: Company name (e.g., "Huawei", "Nokia", "Adtran")
   - product_category: Type (e.g., "ONT", "OLT", "Splitter", "Cable", "Connector", "Tool")
   - specifications: Key technical specs (e.g., {"max_distance": "20km", "ports": "4xGE", "optical_class": "Class B+"})
   - application: Use case (e.g., "Residential ONT", "Field Testing", "Installation")
   - standards: Applicable standards (e.g., ["ITU-T G.984", "TIA-568-D"])
   - document_type: Type of document (e.g., "User Manual", "Datasheet", "Installation Guide", "Quick Start")

Extract as much metadata as possible from the document. If a field is not found, omit it from the JSON.`,
            file_urls: [file_url],
            response_json_schema: {
                type: "object",
                properties: {
                    markdown_content: {
                        type: "string",
                        description: "Full document text in markdown format"
                    },
                    metadata: {
                        type: "object",
                        properties: {
                            product_model: { type: "string" },
                            technology_type: { type: "string" },
                            manufacturer: { type: "string" },
                            product_category: { type: "string" },
                            specifications: { type: "object" },
                            application: { type: "string" },
                            standards: { 
                                type: "array",
                                items: { type: "string" }
                            },
                            document_type: { type: "string" }
                        }
                    },
                    suggested_tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "5-10 relevant tags for categorization and search (e.g., GPON, XGS-PON, ONT, OLT, Installation, Troubleshooting, Huawei, Nokia, Fiber Optic, Testing, Configuration)"
                    }
                },
                required: ["markdown_content", "metadata", "suggested_tags"]
            }
        });

        // Create ReferenceDocument with extracted data
        const document = await base44.asServiceRole.entities.ReferenceDocument.create({
            title: title || extractionResult.metadata.product_model || 'Untitled Document',
            category: category,
            source_type: 'pdf',
            source_url: file_url,
            content: extractionResult.markdown_content,
            metadata: {
                ...extractionResult.metadata,
                extracted_date: new Date().toISOString(),
                word_count: extractionResult.markdown_content.split(/\s+/).length,
                processing_method: 'llm_enhanced'
            },
            suggested_tags: extractionResult.suggested_tags || [],
            tags: [],
            tags_confirmed: false,
            is_active: true,
            is_latest_version: true
        });

        return Response.json({
            success: true,
            document_id: document.id,
            title: document.title,
            metadata: document.metadata,
            suggested_tags: document.suggested_tags,
            tags_confirmed: document.tags_confirmed,
            content_preview: extractionResult.markdown_content.substring(0, 500) + '...'
        });

    } catch (error) {
        console.error('PDF processing error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});