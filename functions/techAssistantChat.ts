import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { question } = await req.json();

        if (!question) {
            return Response.json({ error: 'Question is required' }, { status: 400 });
        }

        // Fetch all active reference documents
        const documents = await base44.asServiceRole.entities.ReferenceDocument.filter({ 
            is_active: true 
        });

        if (documents.length === 0) {
            return Response.json({ 
                answer: "I don't have any reference materials loaded yet. Please ask an admin to upload technical documentation.",
                has_references: false
            });
        }

        // Build context from all documents
        const contextParts = documents.map((doc, idx) => 
            `=== Reference ${idx + 1}: ${doc.title} (${doc.source_type}) ===\n${doc.content}\n`
        );

        const fullContext = contextParts.join('\n\n');

        // Use InvokeLLM with the context
        const prompt = `You are a technical assistant with access to reference documentation. Answer the user's question based ONLY on the information provided in the reference materials below. If the answer is not in the references, say so clearly.

REFERENCE MATERIALS:
${fullContext.substring(0, 100000)}

USER QUESTION: ${question}

Provide a clear, accurate answer based on the reference materials. Cite which reference document(s) you used.`;

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: false
        });

        return Response.json({ 
            answer: response,
            has_references: true,
            references_used: documents.map(d => ({ title: d.title, type: d.source_type }))
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});