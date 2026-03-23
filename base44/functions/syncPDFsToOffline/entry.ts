import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { google_drive_file_id, file_url, title, category = 'other' } = await req.json();

    let fileToProcess = file_url;

    // If Google Drive file ID provided, get the file
    if (google_drive_file_id) {
      try {
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
        
        // Fetch file metadata and export as PDF
        const metaResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${google_drive_file_id}?fields=name,mimeType`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        if (!metaResponse.ok) {
          return Response.json(
            { error: 'Failed to access Google Drive file' },
            { status: 400 }
          );
        }

        const metadata = await metaResponse.json();
        const fileName = metadata.name || `Document_${Date.now()}`;

        // Export/download file as PDF
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${google_drive_file_id}?alt=media`;
        const fileResponse = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!fileResponse.ok) {
          return Response.json(
            { error: 'Failed to download file from Google Drive' },
            { status: 400 }
          );
        }

        // Upload to Base44 storage
        const arrayBuffer = await fileResponse.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

        const uploadResponse = await base44.integrations.Core.UploadFile({
          file: blob
        });

        fileToProcess = uploadResponse.file_url;
      } catch (err) {
        return Response.json(
          { error: `Google Drive sync failed: ${err.message}` },
          { status: 500 }
        );
      }
    }

    if (!fileToProcess) {
      return Response.json(
        { error: 'No file URL or Google Drive ID provided' },
        { status: 400 }
      );
    }

    // Extract content from PDF
    let extractedContent = '';
    let metadata = {};

    try {
      const extractResponse = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileToProcess,
        json_schema: {
          type: 'object',
          properties: {
            text_content: { type: 'string' },
            page_count: { type: 'number' },
            summary: { type: 'string' }
          }
        }
      });

      if (extractResponse.status === 'success' && extractResponse.output) {
        extractedContent = extractResponse.output.text_content || '';
        metadata = {
          page_count: extractResponse.output.page_count,
          summary: extractResponse.output.summary,
          extraction_date: new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn(`Content extraction failed: ${err.message}. Continuing with URL only.`);
    }

    // Create ReferenceDocument for offline access
    const docRecord = await base44.entities.ReferenceDocument.create({
      title: title || 'Imported PDF',
      source_type: 'pdf',
      source_url: fileToProcess,
      content: extractedContent,
      category,
      metadata,
      version: '1.0',
      is_active: true,
      is_latest_version: true
    });

    // Log audit event
    await base44.entities.AuditLog.create({
      event_type: 'document_reference',
      user_email: user.email,
      content: `Synced PDF to offline: ${title || 'Imported PDF'}`,
      metadata: {
        action: 'pdf_sync_offline',
        document_id: docRecord.id,
        document_title: docRecord.title,
        source: google_drive_file_id ? 'google_drive' : 'file_upload',
        has_extracted_content: !!extractedContent,
        is_active: true
      },
      status: 'success'
    });

    return Response.json({
      success: true,
      document_id: docRecord.id,
      title: docRecord.title,
      content_extracted: !!extractedContent,
      file_url: fileToProcess,
      message: `PDF "${docRecord.title}" synced to offline library and available for all users`
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});