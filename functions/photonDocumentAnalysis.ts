import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * photonDocumentAnalysis — Cross-document synthesis using pre-indexed chunks.
 * 
 * Flow:
 * 1. Search chunks for relevant content across ALL documents
 * 2. Group best chunks by document
 * 3. Send relevant excerpts to LLM for multi-document analysis
 * 4. Return synthesized answer with source citations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, max_documents = 10 } = await req.json();

    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('[analysis] Query:', query);

    // Step 1: Load all chunks (lightweight records)
    let allChunks = [];
    let page = 0;
    const pageSize = 100;

    while (true) {
      let batch;
      try {
        const raw = await base44.asServiceRole.entities.DocumentChunk.list(
          '-created_date', pageSize, page * pageSize
        );
        if (typeof raw === 'string') {
          batch = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          batch = raw;
        } else {
          batch = [];
        }
      } catch (e) {
        console.error('[analysis] Chunk fetch error page', page, e.message);
        batch = [];
      }

      if (batch.length === 0) break;
      allChunks = allChunks.concat(batch);
      page++;
      if (allChunks.length >= 5000) break;
    }

    console.log('[analysis] Total chunks loaded:', allChunks.length);

    if (allChunks.length === 0) {
      return Response.json({
        success: true,
        total_documents: 0,
        analysis: {
          synthesized_answer: 'No documents found in the knowledge base. Please run the document chunking process first.',
          relevant_documents: [],
          confidence_level: 'low'
        }
      });
    }

    // Step 2: Score chunks by keyword relevance
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scoredChunks = allChunks.map(chunk => {
      let score = 0;
      const keywords = (chunk.keywords || '').toLowerCase();
      const title = (chunk.document_title || '').toLowerCase();
      const content = (chunk.content || '').toLowerCase();

      for (const word of queryWords) {
        if (title.includes(word)) score += 10;
        if (keywords.includes(word)) score += 4;
        if (content.includes(word)) score += 2;
      }
      return { ...chunk, score };
    }).filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);

    // Step 3: Group by document, keep top 2 chunks per doc
    const docChunks = new Map();
    for (const chunk of scoredChunks) {
      const existing = docChunks.get(chunk.document_id) || [];
      if (existing.length < 2) {
        existing.push(chunk);
        docChunks.set(chunk.document_id, existing);
      }
    }

    // Take top N documents by their best chunk score
    const topDocs = Array.from(docChunks.entries())
      .map(([docId, chunks]) => ({
        docId,
        title: chunks[0].document_title,
        category: chunks[0].document_category,
        source_type: chunks[0].metadata?.source_type,
        source_url: chunks[0].metadata?.source_url,
        bestScore: Math.max(...chunks.map(c => c.score)),
        excerpts: chunks.map(c => c.content.substring(0, 1500)).join('\n---\n')
      }))
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, max_documents);

    console.log('[analysis] Relevant docs:', topDocs.length, '/', docChunks.size, 'matched');

    // If no matches, do a broader analysis with random sample of chunks
    let analysisInput;
    if (topDocs.length === 0) {
      // Fallback: sample from first few chunks of various documents
      const sampleDocs = new Map();
      for (const chunk of allChunks) {
        if (!sampleDocs.has(chunk.document_id) && sampleDocs.size < max_documents) {
          sampleDocs.set(chunk.document_id, chunk);
        }
      }
      analysisInput = Array.from(sampleDocs.values()).map(c => ({
        title: c.document_title,
        category: c.document_category,
        excerpt: c.content.substring(0, 1000)
      }));
    } else {
      analysisInput = topDocs.map(d => ({
        title: d.title,
        category: d.category,
        excerpt: d.excerpts.substring(0, 2000)
      }));
    }

    // Step 4: LLM cross-document analysis
    const analysisPrompt = `You are analyzing technical reference documents to answer a query.

Query: ${query}

Relevant Document Excerpts:
${analysisInput.map((doc, i) => `
${i + 1}. ${doc.title} (${doc.category})
   Content: ${doc.excerpt}
`).join('\n')}

Provide a thorough analysis including:
1. Which documents are most relevant and why
2. Key information extracted from each relevant document
3. Any conflicts or discrepancies between documents
4. A synthesized, consolidated answer
5. Safety warnings or critical notes
6. Recommended procedure steps if applicable`;

    console.log('[analysis] Calling LLM with', analysisInput.length, 'documents...');

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          relevant_documents: { type: "array", items: { type: "string" } },
          extracted_information: { type: "object" },
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
          safety_warnings: { type: "array", items: { type: "string" } },
          recommended_procedure: { type: "array", items: { type: "string" } },
          confidence_level: { type: "string", enum: ["high", "medium", "low"] },
          gaps_identified: { type: "array", items: { type: "string" } }
        }
      }
    });

    console.log('[analysis] LLM response received');

    const uniqueDocIds = new Set(allChunks.map(c => c.document_id));

    return Response.json({
      success: true,
      total_documents: uniqueDocIds.size,
      analyzed_documents: analysisInput.length,
      analysis: aiResponse,
      raw_documents: topDocs.map(d => ({
        id: d.docId,
        title: d.title,
        source_type: d.source_type,
        source_url: d.source_url
      }))
    });

  } catch (error) {
    console.error('[analysis] Error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});