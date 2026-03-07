import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) { /* ok */ }

    const { query, max_documents = 10 } = body;

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Fetch active reference documents via service role
    let docs = await base44.asServiceRole.entities.ReferenceDocument.filter({ is_active: true });
    if (!Array.isArray(docs)) docs = [];

    if (docs.length === 0) {
      return Response.json({
        success: true,
        documents: [],
        analysis: 'No reference documents found in knowledge base.',
        recommendations: ['Upload technical manuals and reference PDFs to build the knowledge base.']
      });
    }

    const documentSummaries = docs.slice(0, max_documents).map(doc => ({
      title: doc.title,
      source: doc.source_type,
      content_preview: (doc.content || '').substring(0, 2000)
    }));

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are analyzing multiple technical reference documents to answer a query.\n\nQuery: ${query}\n\nAvailable Documents:\n${documentSummaries.map((doc, i) =>
        `${i + 1}. ${doc.title} (${doc.source})\n   Content Preview: ${doc.content_preview}`
      ).join('\n\n')}\n\nProvide: relevant documents, synthesized answer, safety warnings, recommended procedure, confidence level, and knowledge gaps.`,
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          relevant_documents: { type: 'array', items: { type: 'string' } },
          synthesized_answer: { type: 'string' },
          safety_warnings: { type: 'array', items: { type: 'string' } },
          recommended_procedure: { type: 'array', items: { type: 'string' } },
          confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
          gaps_identified: { type: 'array', items: { type: 'string' } }
        }
      }
    });

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
    console.error('photonDocumentAnalysis error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});