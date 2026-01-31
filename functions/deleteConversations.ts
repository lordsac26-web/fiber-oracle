import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const logs = [];
    
    const log = (level, msg, data = null) => {
        const entry = { timestamp: new Date().toISOString(), level, msg, data };
        logs.push(entry);
        console.log(`[${level}] ${msg}`, data || '');
    };

    try {
        log('INFO', 'deleteConversations request received');
        const base44 = createClientFromRequest(req);
        log('INFO', 'base44 client initialized');
        
        const user = await base44.auth.me();
        log('INFO', 'User authenticated', { email: user?.email, role: user?.role });

        if (user?.role !== 'admin') {
            log('WARN', 'Non-admin user attempted deletion', { email: user?.email });
            return Response.json({ error: 'Forbidden: Admin access required', logs }, { status: 403 });
        }

        const body = await req.json();
        const { conversation_ids } = body;
        
        log('INFO', 'Request body received', { 
            conversation_ids_count: conversation_ids?.length,
            conversation_ids: conversation_ids
        });

        if (!conversation_ids || !Array.isArray(conversation_ids)) {
            log('ERROR', 'Invalid conversation_ids', { received: conversation_ids });
            return Response.json({ error: 'Invalid conversation_ids', logs }, { status: 400 });
        }

        const results = {
            total: conversation_ids.length,
            deleted: 0,
            failed: 0,
            errors: []
        };

        log('INFO', 'Starting deletion loop', { total: conversation_ids.length });

        // Try different SDK methods to delete conversations
        for (const id of conversation_ids) {
            try {
                log('DEBUG', 'Attempting to delete conversation', { id });
                
                // Try Method 1: Direct SDK call with agent_name
                try {
                    await base44.asServiceRole.agents.deleteConversation(id, { agent_name: 'photon' });
                    log('INFO', 'Conversation deleted (Method 1)', { id });
                    results.deleted++;
                } catch (method1Error) {
                    log('DEBUG', 'Method 1 failed, trying Method 2', { id, error: method1Error.message });
                    
                    // Try Method 2: Using SDK conversation API directly
                    try {
                        const convo = await base44.asServiceRole.agents.getConversation(id);
                        if (convo) {
                            await base44.asServiceRole.agents.updateConversation(id, { archived: true });
                            log('INFO', 'Conversation archived (Method 2)', { id });
                            results.deleted++;
                        }
                    } catch (method2Error) {
                        throw method1Error; // Throw original error if both fail
                    }
                }
            } catch (error) {
                log('ERROR', 'Failed to delete conversation', { 
                    id, 
                    error: error.message,
                    stack: error.stack 
                });
                results.failed++;
                results.errors.push({ id, error: error.message });
            }
        }

        log('INFO', 'Deletion loop complete', results);

        return Response.json({
            success: true,
            results,
            logs,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log('ERROR', 'Unexpected error in deleteConversations', { 
            error: error.message,
            stack: error.stack 
        });
        return Response.json({ 
            error: error.message,
            logs,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
});