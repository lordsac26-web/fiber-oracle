import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { googleDriveUrl, category, comments } = await req.json();

    if (!googleDriveUrl) {
      return Response.json({ error: 'Google Drive URL is required' }, { status: 400 });
    }

    // Extract file ID from various Google Drive URL formats
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]{25,})$/ // Direct file ID
    ];
    
    let fileId = null;
    for (const pattern of patterns) {
      const match = googleDriveUrl.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }

    if (!fileId) {
      return Response.json({ error: 'Invalid Google Drive URL: Could not extract file ID' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");
    if (!accessToken) {
      return Response.json({ error: 'Google Drive connector not authorized' }, { status: 500 });
    }

    // Fetch file metadata from Google Drive API
    const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size,webViewLink,modifiedTime`;
    const driveResponse = await fetch(driveApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!driveResponse.ok) {
      const errorData = await driveResponse.json();
      console.error('Google Drive API error:', errorData);
      return Response.json({ error: `Failed to fetch file: ${errorData.error?.message || 'Unknown error'}` }, { status: driveResponse.status });
    }

    const fileMetadata = await driveResponse.json();

    // Create ReferenceDocument entity
    const newDocument = await base44.asServiceRole.entities.ReferenceDocument.create({
      title: fileMetadata.name || 'Untitled Google Drive Document',
      category: category || 'other',
      source_type: 'googledrive',
      source_url: fileMetadata.webViewLink || googleDriveUrl,
      content: '',
      metadata: {
        file_id: fileId,
        mime_type: fileMetadata.mimeType,
        size: fileMetadata.size,
        modified_time: fileMetadata.modifiedTime,
        linked_by_user_email: user.email,
        linked_date: new Date().toISOString(),
      },
      comments: comments || '',
      is_active: true,
    });

    // Log audit event
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'document_reference',
      user_email: user.email,
      content: `Linked Google Drive document: ${newDocument.title}`,
      metadata: {
        action: 'linked_googledrive',
        document_id: newDocument.id,
        document_title: newDocument.title,
        file_id: fileId,
        mime_type: fileMetadata.mimeType,
      },
      status: 'success'
    });

    return Response.json({
      success: true,
      message: 'Google Drive document linked successfully',
      document: newDocument,
    });

  } catch (error) {
    console.error('Error linking Google Drive document:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
});