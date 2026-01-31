import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function GoogleDrivePicker({ onComplete, onClose }) {
  const [driveUrl, setDriveUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const extractFileId = (url) => {
    // Extract file ID from various Google Drive URL formats
    const patterns = [
      /\/file\/d\/([^\/]+)/,
      /id=([^&]+)/,
      /\/d\/([^\/\?]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleLink = async () => {
    if (!driveUrl.trim()) {
      toast.error('Please enter a Google Drive URL');
      return;
    }

    const fileId = extractFileId(driveUrl);
    if (!fileId) {
      toast.error('Invalid Google Drive URL. Please use a shareable link.');
      return;
    }

    setProcessing(true);
    toast.loading('Accessing Google Drive file...', { id: 'drive-link' });

    try {
      // Call backend function to fetch and process Google Drive file
      const response = await base44.functions.invoke('linkGoogleDriveFile', {
        file_id: fileId,
        url: driveUrl
      });

      if (response.data?.success) {
        setResult({
          status: 'success',
          title: response.data.document.title,
          documentId: response.data.document.id
        });
        toast.success('Google Drive file linked successfully', { id: 'drive-link' });
      } else {
        throw new Error(response.data?.error || 'Failed to link file');
      }
    } catch (error) {
      console.error('Google Drive link error:', error);
      setResult({
        status: 'error',
        message: error.message
      });
      toast.error('Failed to link Google Drive file', { id: 'drive-link' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">Link Google Drive File</h4>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>• File must be shared with "Anyone with the link can view"</li>
          <li>• Supports Google Docs, PDFs, and text files</li>
          <li>• Content will be indexed and made searchable</li>
        </ul>
      </div>

      {!result && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Google Drive Shareable Link
            </label>
            <Input
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              disabled={processing}
              className="font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleLink}
            disabled={processing || !driveUrl.trim()}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Link File
              </>
            )}
          </Button>
        </div>
      )}

      {result && (
        <div className={`border rounded-lg p-4 ${
          result.status === 'success' 
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className="flex items-start gap-3">
            {result.status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {result.status === 'success' ? (
                <>
                  <div className="font-semibold text-sm text-green-900 dark:text-green-100 mb-1">
                    Successfully Linked
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-200">
                    {result.title}
                  </div>
                  <Badge variant="outline" className="mt-2 bg-green-100 text-green-700 border-green-300">
                    Active in Knowledge Base
                  </Badge>
                </>
              ) : (
                <>
                  <div className="font-semibold text-sm text-red-900 dark:text-red-100 mb-1">
                    Link Failed
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-200">
                    {result.message}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => {
            if (result?.status === 'success') onComplete();
            onClose();
          }}
        >
          {result ? 'Done' : 'Cancel'}
        </Button>
      </div>
    </div>
  );
}