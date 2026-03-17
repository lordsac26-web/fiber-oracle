import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, max_documents = 10 } = await req.json();

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('[analysis] Query:', query);

    // Fetch active reference documents
    let docs;
    try {
      const rawDocs = await base44.asServiceRole.entities.ReferenceDocument.list('-created_date', 20);
      if (typeof rawDocs === 'string') {
        docs = JSON.parse(rawDocs).filter(d => d.is_active !== false);
      } else if (Array.isArray(rawDocs)) {
        docs = rawDocs.filter(d => d.is_active !== false);
      } else {
        docs = [];
      }
      console.log('[analysis] Found', docs.length, 'active documents');
    } catch (fetchErr) {
      console.error('[analysis] Fetch error:', fetchErr.message);
      return Response.json({ error: 'Failed to fetch documents: ' + fetchErr.message, success: false }, { status: 500 });
    }

    if (!docs || docs.length === 0) {
      return Response.json({
        success: true,
        documents: [],
        analysis: 'No reference documents found in knowledge base.',
        recommendations: ['Upload technical manuals and reference PDFs to build the knowledge base.']
      });
    }

    // Build document summaries — truncate content to keep LLM prompt manageable
    const documentSummaries = docs.slice(0, max_documents).map(doc => ({
      title: doc.title,
      source: doc.source_type,
      metadata: doc.metadata,
      content_preview: (doc.content || '').substring(0, 2000) || 'No content available'
    }));

    const analysisPrompt = `You are analyzing multiple technical reference documents to answer a query.

Query: ${query}

Available Documents:
${documentSummaries.map((doc, i) => `
${i + 1}. ${doc.title} (${doc.source})
   Metadata: ${JSON.stringify(doc.metadata || {})}
   Content Preview: ${doc.content_preview}
`).join('\n')}

Analyze these documents and provide:
1. Which documents are most relevant to the query
2. Key information extracted from each relevant document
3. Any conflicts or discrepancies between documents
4. A synthesized, consolidated answer
5. Safety warnings or critical notes
6. Recommended prioritization if conflicts exist

Be thorough and cross-reference multiple sources.`;

    console.log('[analysis] Calling LLM with', documentSummaries.length, 'documents...');

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          relevant_documents: {
            type: "array",
            items: { type: "string" }
          },
          extracted_information: {
            type: "object",
            description: "Key info from each document"
          },
          conflicts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issue: { type: "string" },
                sources: { type: "array", items: { type: "string" } },
                recommendation: { type: "string" }
              }
            }
          },
          synthesized_answer: { type: "string" },
          safety_warnings: {
            type: "array",
            items: { type: "string" }
          },
          recommended_procedure: {
            type: "array",
            items: { type: "string" }
          },
          confidence_level: { 
            type: "string",
            enum: ["high", "medium", "low"]
          },
          gaps_identified: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    console.log('[analysis] LLM response received');

    return Response.json({
      success: true,
      total_documents: docs.length,
      analyzed_documents: documentSummaries.length,
      analysis: aiResponse,
      raw_documents: docs.slice(0, max_documents).map(doc => ({
        id: doc.id,
        title: doc.title,
        source_type: doc.source_type,
        source_url: doc.source_url
      }))
    });

  } catch (error) {
    console.error('[analysis] Error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});