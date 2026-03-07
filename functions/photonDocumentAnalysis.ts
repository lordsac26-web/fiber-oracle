import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const APP_ID = Deno.env.get('BASE44_APP_ID');
    const authHeader = req.headers.get('authorization') || '';
    const serviceToken = req.headers.get('x-service-token') || '';

    let body = {};
    try { body = await req.json(); } catch (_) { /* ok */ }

    const { query, max_documents = 10 } = body;

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    // Fetch docs via direct fetch to avoid Brotli decompression bug in SDK
    const baseHeaders = {
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (serviceToken) baseHeaders['x-service-token'] = serviceToken;
    else if (authHeader) baseHeaders['authorization'] = authHeader;

    let docs = [];
    try {
      const url = `https://api.base44.com/api/apps/${APP_ID}/entities/ReferenceDocument/list?sort=-created_date&limit=200`;
      const res = await fetch(url, { headers: baseHeaders });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      docs = Array.isArray(data) ? data : (data.data || data.items || []);
      docs = docs.filter(d => d.is_active !== false);
    } catch (fetchErr) {
      // SDK fallback
      const base44 = createClientFromRequest(req);
      const result = await base44.asServiceRole.entities.ReferenceDocument.filter({ is_active: true });
      docs = Array.isArray(result) ? result : [];
    }

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

    // LLM analysis via direct fetch
    const analysisPrompt = `You are analyzing multiple technical reference documents to answer a query.

Query: ${query}

Available Documents:
${documentSummaries.map((doc, i) => `
${i + 1}. ${doc.title} (${doc.source})
   Metadata: ${JSON.stringify(doc.metadata)}
   Content Preview: ${doc.content_preview}
`).join('\n')}

Analyze and provide: relevant documents, key extracted information, conflicts, synthesized answer, safety warnings, and recommended procedure.`;

    let aiResponse = {};
    try {
      const llmUrl = `https://api.base44.com/api/apps/${APP_ID}/integrations/Core/InvokeLLM`;
      const llmRes = await fetch(llmUrl, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          prompt: analysisPrompt,
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
      });
      if (llmRes.ok) aiResponse = await llmRes.json();
    } catch (llmErr) {
      console.warn('LLM direct fetch failed:', llmErr.message);
      // fallback via SDK
      const base44 = createClientFromRequest(req);
      aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        add_context_from_internet: false
      });
    }

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