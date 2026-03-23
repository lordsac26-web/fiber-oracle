import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify this is called from an entity automation or admin
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { event, data, old_data } = await req.json();

    // Only proceed if status changed from pending to approved/denied
    if (!old_data || old_data.status === data.status) {
      return Response.json({ message: 'No status change' });
    }

    if (data.status === 'approved' || data.status === 'denied') {
      const statusText = data.status === 'approved' ? 'Approved' : 'Denied';
      const message = data.status === 'approved' 
        ? `Your document "${data.title}" has been approved and added to the knowledge base.`
        : `Your document "${data.title}" was not approved. Reason: ${data.denial_reason || 'Not specified'}`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: data.submitted_by,
        subject: `Document Submission ${statusText}: ${data.title}`,
        body: `
Hello,

${message}

Document Details:
- Title: ${data.title}
- Category: ${data.category}
- Version: ${data.version}
${data.status === 'approved' ? `- Reviewed by: ${data.reviewed_by}` : ''}
- Review Date: ${new Date(data.review_date).toLocaleString()}

${data.comments ? `Your comments: ${data.comments}` : ''}

Thank you for your contribution!
        `
      });

      return Response.json({ 
        message: 'Notification sent',
        status: data.status 
      });
    }

    return Response.json({ message: 'No notification needed' });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});