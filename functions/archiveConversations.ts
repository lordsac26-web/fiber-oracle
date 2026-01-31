import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const log = (level, msg, data = {}) => {
  console.log(`[${level}] ${msg}`, data);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    log('INFO', 'archiveConversations request received');

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { conversation_ids, days } = body;

    if (!conversation_ids || !Array.isArray(conversation_ids)) {
      return Response.json({ error: 'conversation_ids must be an array' }, { status: 400 });
    }

    if (!days || ![7, 15, 30].includes(days)) {
      return Response.json({ error: 'days must be 7, 15, or 30' }, { status: 400 });
    }

    log('INFO', 'User authenticated', { email: user.email, role: user.role });
    log('INFO', 'Request body received', { conversation_ids_count: conversation_ids.length, days });

    const results = {
      archived: 0,
      failed: 0,
      errors: []
    };

    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() + days);
    const archivedAt = new Date().toISOString();

    log('INFO', 'Starting archive loop', { total: conversation_ids.length, days, archiveDate });

    for (const id of conversation_ids) {
      try {
        log('DEBUG', 'Attempting to archive conversation', { id, days });

        // Create record in Conversation entity
        await base44.asServiceRole.entities.Conversation.create({
          agent_id: id,
          agent_name: 'photon',
          is_archived: true,
          archive_date: archiveDate.toISOString(),
          archived_at: archivedAt
        });

        log('INFO', 'Conversation archived successfully', { id });
        results.archived++;
      } catch (error) {
        log('ERROR', 'Failed to archive conversation', { id, error: error.message });
        results.failed++;
        results.errors.push({ id, error: error.message });
      }
    }

    log('INFO', 'Archive loop complete', { 
      total: conversation_ids.length, 
      archived: results.archived, 
      failed: results.failed 
    });

    return Response.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log('ERROR', 'Unhandled error', { error: error.message });
    return Response.json({ error: error.message }, { status: 500 });
  }
});