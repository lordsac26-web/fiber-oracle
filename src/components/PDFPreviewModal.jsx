import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, AlertCircle, X } from 'lucide-react';
import { appParams } from '@/lib/app-params';

/**
 * PDFPreviewModal
 *
 * Fetches a PDF from a Base44 backend function and renders it in an iframe
 * for in-browser preview. Uses a blob object URL so no extra packages are needed.
 *
 * Props:
 *  open         - boolean controlling dialog visibility
 *  onOpenChange - (open: boolean) => void
 *  title        - dialog title string
 *  functionName - backend function name (e.g. 'generatePDF')
 *  payload      - JSON body to POST to the function
 *  filename     - suggested download filename
 */
export default function PDFPreviewModal({
  open,
  onOpenChange,
  title = 'PDF Preview',
  functionName,
  payload,
  filename = 'document.pdf',
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const prevOpenRef = useRef(false);

  // Fetch PDF blob whenever the modal opens
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      fetchPdf();
    }
    if (!open && prevOpenRef.current && blobUrl) {
      // Revoke the old blob URL to free memory when modal closes
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setError(null);
    }
    prevOpenRef.current = open;
  }, [open]);

  const fetchPdf = async () => {
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    try {
      const { appId, serverUrl, token } = appParams;
      const url = `${serverUrl}/api/apps/${appId}/functions/${functionName}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // Do NOT use credentials:'include' — the platform responds with
        // Access-Control-Allow-Origin: * which browsers reject for credentialed
        // requests. The Bearer token above is sufficient for authentication.
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let msg = `PDF generation failed (HTTP ${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson.error) msg = errJson.error;
        } catch (_) {}
        throw new Error(msg);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        try {
          const errJson = await response.json();
          throw new Error(errJson.error || 'Unexpected response from server');
        } catch (_) {
          throw new Error('Server did not return a PDF');
        }
      }

      const blob = await response.blob();
      setBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            <DialogDescription className="sr-only">PDF document preview with download option</DialogDescription>
            <div className="flex items-center gap-2">
              {blobUrl && (
                <Button size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-sm">Generating PDF preview...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-red-500 px-8 text-center">
              <AlertCircle className="h-10 w-10" />
              <p className="font-medium">Failed to generate PDF</p>
              <p className="text-sm text-gray-500">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPdf}>
                Retry
              </Button>
            </div>
          )}

          {blobUrl && (
            <iframe
              src={blobUrl}
              title={title}
              className="w-full h-full border-0"
              style={{ minHeight: '100%' }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}