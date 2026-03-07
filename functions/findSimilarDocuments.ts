import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { document_id, similarity_threshold = 70 } = await req.json();

    if (!document_id) {
      return Response.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Fetch the reference document
    const referenceDoc = await base44.asServiceRole.entities.ReferenceDocument.get(document_id);

    if (!referenceDoc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch all documents for comparison
    const allDocs = await base44.asServiceRole.entities.ReferenceDocument.list();

    const docsToCompare = allDocs.filter(doc => doc.id !== document_id && doc.content);

    if (docsToCompare.length === 0) {
      return Response.json({
        success: true,
        reference_document: referenceDoc.title,
        similar_documents: [],
        message: 'No other documents to compare'
      });
    }

    // Use AI to find similar documents
    const prompt = `Compare this reference document to a list of other documents and identify similar ones.

Reference Document:
Title: ${referenceDoc.title}
Category: ${referenceDoc.category}
Tags: ${referenceDoc.tags?.join(', ') || 'None'}
Content Preview: ${referenceDoc.content.substring(0, 1000)}

Documents to Compare:
${docsToCompare.slice(0, 50).map((doc, idx) => `
${idx + 1}. ${doc.title}
   Category: ${doc.category}
   Tags: ${doc.tags?.join(', ') || 'None'}
   Preview: ${doc.content.substring(0, 300)}
`).join('\n')}

Analyze and return documents that are similar in:
- Topic/subject matter
- Technical content
- Equipment/technology discussed
- Purpose (troubleshooting, installation, etc.)

Return similarity scores (0-100) for each document. Only include documents with score >= ${similarity_threshold}.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          similar_documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                document_index: { type: 'number' },
                document_title: { type: 'string' },
                similarity_score: { type: 'number' },
                similarity_reasons: { type: 'string' }
              },
              required: ['document_index', 'similarity_score']
            }
          }
        },
        required: ['similar_documents']
      }
    });

    // Map results back to document IDs
    const similarDocs = result.similar_documents.map(similar => {
      const doc = docsToCompare[similar.document_index - 1];
      return {
        document_id: doc?.id,
        title: doc?.title,
        category: doc?.category,
        tags: doc?.tags,
        similarity_score: similar.similarity_score,
        similarity_reasons: similar.similarity_reasons
      };
    }).filter(doc => doc.document_id);

    return Response.json({
      success: true,
      reference_document: {
        id: referenceDoc.id,
        title: referenceDoc.title,
        category: referenceDoc.category
      },
      similar_documents: similarDocs,
      total_found: similarDocs.length
    });

  } catch (error) {
    console.error('Error finding similar documents:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});