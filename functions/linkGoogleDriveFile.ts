import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_id, url } = await req.json();

    if (!file_id) {
      return Response.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    if (!accessToken) {
      return Response.json({ 
        error: 'Google Drive not connected. Please authorize Google Drive access first.' 
      }, { status: 401 });
    }

    // Get file metadata
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?fields=id,name,mimeType,size`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!metadataResponse.ok) {
      throw new Error('Failed to access Google Drive file. Ensure it is shared with "Anyone with the link".');
    }

    const metadata = await metadataResponse.json();

    // Download file content
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!contentResponse.ok) {
      throw new Error('Failed to download file content');
    }

    let content = '';

    // Handle different mime types
    if (metadata.mimeType === 'application/vnd.google-apps.document') {
      // Export Google Doc as plain text
      const exportResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file_id}/export?mimeType=text/plain`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      content = await exportResponse.text();
    } else if (metadata.mimeType.startsWith('text/') || metadata.mimeType === 'application/pdf') {
      content = await contentResponse.text();
    } else {
      throw new Error(`Unsupported file type: ${metadata.mimeType}`);
    }

    // Create reference document
    const doc = await base44.asServiceRole.entities.ReferenceDocument.create({
      title: metadata.name,
      source_type: 'pdf',
      source_url: url,
      content: content,
      metadata: {
        google_drive_id: file_id,
        mime_type: metadata.mimeType,
        file_size: metadata.size,
        linked_date: new Date().toISOString(),
        source: 'google_drive'
      },
      is_active: true
    });

    // Log audit event
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'pdf_upload',
      user_email: user.email,
      content: `Linked Google Drive file: ${metadata.name}`,
      metadata: {
        document_id: doc.id,
        google_drive_id: file_id,
        file_name: metadata.name,
        mime_type: metadata.mimeType
      },
      status: 'success'
    });

    return Response.json({
      success: true,
      document: {
        id: doc.id,
        title: metadata.name
      }
    });

  } catch (error) {
    console.error('Google Drive link error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});