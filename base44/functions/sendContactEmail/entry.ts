import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, reason_label, subject, message } = await req.json();

    if (!name || !email || !reason_label || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminEmail = Deno.env.get('ADMIN_CONTACT_EMAIL');
    if (!adminEmail) {
      return Response.json({ error: 'Admin contact email not configured' }, { status: 500 });
    }

    const emailBody = `New Contact Form Submission from Fiber Oracle

From: ${name}
Email: ${email}
Reason: ${reason_label}
Subject: ${subject || 'N/A'}

Message:
${message}

---
Sent via Fiber Oracle Contact Form`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `[Fiber Oracle] ${reason_label}: ${subject || 'New Message'}`,
      body: emailBody,
      from_name: 'Fiber Oracle Contact'
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Contact email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});