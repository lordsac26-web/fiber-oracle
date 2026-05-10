/**
 * pdfDownload.js
 *
 * Downloads a PDF from a Base44 backend function.
 * base44.functions.invoke() only handles JSON responses, so we must call
 * the function endpoint directly via fetch() to receive binary PDF data.
 */

import { appParams } from '@/lib/app-params';

/**
 * Call a backend function that returns PDF binary and trigger a browser download.
 *
 * @param {string} functionName - Backend function name (e.g. 'generatePDF')
 * @param {object} payload      - JSON body to POST
 * @param {string} filename     - Suggested download filename
 */
export async function downloadPdfFromFunction(functionName, payload, filename) {
  const { appId, serverUrl, token } = appParams;

  // Base44 V3 function URL format
  const url = `${serverUrl}/api/apps/${appId}/functions/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    // Do NOT use credentials:'include' — the platform responds with
    // Access-Control-Allow-Origin: * which browsers reject for credentialed
    // requests. The Bearer token above is sufficient for authentication.
    body: JSON.stringify({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...payload,
    }),
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
    // Function returned JSON error even with 200 status
    try {
      const errJson = await response.json();
      throw new Error(errJson.error || 'PDF generation returned unexpected content');
    } catch (_) {
      throw new Error('PDF generation returned unexpected content type: ' + contentType);
    }
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}