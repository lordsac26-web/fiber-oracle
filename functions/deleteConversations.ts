import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { conversation_ids } = await req.json();

        if (!conversation_ids || !Array.isArray(conversation_ids)) {
            return Response.json({ error: 'Invalid conversation_ids' }, { status: 400 });
        }

        const results = {
            total: conversation_ids.length,
            deleted: 0,
            failed: 0,
            errors: []
        };

        for (const id of conversation_ids) {
            try {
                // Conversations are stored in the ConversationAgents entity
                // We need to delete the conversation record directly
                const url = `https://api.base44.com/v1/agents/conversations/${id}`;
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
                    }
                });
                
                if (response.ok) {
                    results.deleted++;
                } else {
                    const error = await response.text();
                    results.failed++;
                    results.errors.push({ id, error });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        return Response.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Delete conversations error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});