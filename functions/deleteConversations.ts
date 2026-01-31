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
                // Delete conversation using agents API
                await base44.asServiceRole.agents.deleteConversation(id);
                results.deleted++;
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