// No SDK import — uses native Deno fetch only to avoid Brotli decompression bug

Deno.serve(async (req) => {
  try {
    const APP_ID = Deno.env.get('BASE44_APP_ID');

    let body = {};
    try { body = await req.json(); } catch (_) { /* ok */ }

    const { query, max_documents = 10 } = body;

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const serviceToken = req.headers.get('x-service-token') || '';

    const apiHeaders = {
      'Accept-Encoding': 'identity',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (serviceToken) apiHeaders['x-service-token'] = serviceToken;
    if (authHeader) apiHeaders['authorization'] = authHeader;

    // Fetch active reference documents
    const docsRes = await fetch(
      `https://api.base44.com/api/apps/${APP_ID}/entities/ReferenceDocument?sort=-created_date&limit=200`,
      { headers: apiHeaders }
    );
    if (!docsRes.ok) {
      return Response.json({ error: `Failed to fetch documents: ${docsRes.status}`, success: false }, { status: 502 });
    }
    const docsData = await docsRes.json();
    let docs = Array.isArray(docsData) ? docsData : (docsData.data || docsData.items || docsData.results || []);
    docs = docs.filter(d => d.is_active !== false);

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
      metadata: doc.metadata,
      content_preview: (doc.content || '').substring(0, 2000)
    }));

    const llmRes = await fetch(
      `https://api.base44.com/api/apps/${APP_ID}/integrations/Core/InvokeLLM`,
      {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          prompt: `You are analyzing multiple technical reference documents to answer a query.\n\nQuery: ${query}\n\nAvailable Documents:\n${documentSummaries.map((doc, i) =>
            `${i + 1}. ${doc.title} (${doc.source})\n   Content Preview: ${doc.content_preview}`
          ).join('\n\n')}\n\nProvide: relevant documents, synthesized answer, safety warnings, recommended procedure, confidence level, and any knowledge gaps.`,
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
        })
      }
    );

    const aiResponse = llmRes.ok ? await llmRes.json() : { synthesized_answer: 'LLM analysis unavailable', confidence_level: 'low' };

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