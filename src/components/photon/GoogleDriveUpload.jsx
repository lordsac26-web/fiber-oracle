import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const DRIVE_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9-_]+)/;

export default function GoogleDriveUpload({ onDocumentCreated, onClose }) {
  const [driveUrl, setDriveUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  const extractFileId = (url) => {
    const match = url.match(DRIVE_URL_REGEX);
    return match ? match[1] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileId = extractFileId(driveUrl);
    
    if (!fileId) {
      toast.error('Invalid Google Drive link. Please use a shareable link or file ID.');
      return;
    }

    setProcessing(true);
    try {
      // Get file metadata via Google Drive API (through connector)
      const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");
      
      const metaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!metaResponse.ok) throw new Error('Could not access Drive file. Ensure it\'s shared with the app.');
      
      const metadata = await metaResponse.json();
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;

      // Create reference document without uploading (link-only reference)
      const doc = await base44.entities.ReferenceDocument.create({
        title: metadata.name.replace(/\.[^/.]+$/, ''),
        category: 'other',
        source_type: 'googledrive',
        source_url: `https://drive.google.com/file/d/${fileId}/view`,
        content: `[Google Drive Link] - ${metadata.name}. Access via: https://drive.google.com/file/d/${fileId}/view`,
        metadata: {
          drive_file_id: fileId,
          mime_type: metadata.mimeType,
          file_size: metadata.size || 0,
          original_filename: metadata.name,
          linked_date: new Date().toISOString()
        },
        is_active: true,
        version: '1.0'
      });

      // Log audit event
      try {
        const user = await base44.auth.me();
        await base44.entities.AuditLog.create({
          event_type: 'document_reference',
          user_email: user.email,
          content: `Linked Google Drive document: ${metadata.name}`,
          metadata: {
            action: 'linked_drive',
            document_id: doc.id,
            drive_file_id: fileId,
            file_size: metadata.size
          },
          status: 'success'
        });
      } catch (e) {
        console.error('Audit log failed:', e);
      }

      toast.success('Document linked successfully! AI agent can now reference it.');
      onDocumentCreated?.(doc);
      setDriveUrl('');
    } catch (error) {
      console.error('Drive link error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
            Link Google Drive File
          </h4>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Alternative for large files (2-5MB+): Share a Google Drive link instead of uploading. The AI agent can reference it directly.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Google Drive Link or File ID
          </label>
          <Input
            type="text"
            placeholder="https://drive.google.com/file/d/1ABC123XYZ/view or paste file ID"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            disabled={processing}
            className="text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Make sure the file is shared (anyone with link can view)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!driveUrl.trim() || processing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Link Document
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}