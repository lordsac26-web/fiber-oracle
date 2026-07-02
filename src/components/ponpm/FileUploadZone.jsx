import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { validateCsvFile, downloadCsvTemplate, PONPM_CSV_SPEC } from '@/lib/csvValidator';

/**
 * File upload zone for PON PM CSVs.
 * Calls onChange(file) with the File object directly (not a synthetic event).
 * The parent (PONPMAnalysis) must accept a File, not an event.
 */
const MAX_CSV_SIZE = 100 * 1024 * 1024; // 100MB — prevents accidental memory exhaustion on oversized files

export default function FileUploadZone({ onChange, isLoading, disabled = false, disabledMessage = null }) {
  const [validating, setValidating] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input immediately so the same file can be re-selected
    e.target.value = '';

    if (file.size > MAX_CSV_SIZE) {
      toast.error(`File is ${(file.size / 1024 / 1024).toFixed(0)}MB — maximum is 100MB`, { duration: 7000 });
      return;
    }

    setValidating(true);
    const validation = await validateCsvFile(file, PONPM_CSV_SPEC);
    setValidating(false);

    if (!validation.ok) {
      toast.error(validation.message, { duration: 7000 });
      return;
    }

    // Pass the File object directly to avoid React synthetic event pooling issues
    onChange(file);
  };

  const busy = isLoading || validating;
  const blocked = disabled && !busy;

  return (
    <div className="space-y-2">
      <label className={`block ${blocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className={`border-2 border-dashed rounded-xl p-8 transition-colors ${
          blocked
            ? 'border-amber-300 bg-amber-50/50 opacity-70'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
        }`}>
          <div className="flex flex-col items-center gap-3">
            {busy ? (
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            ) : (
              <Upload className={`h-10 w-10 ${blocked ? 'text-amber-500' : 'text-gray-400'}`} />
            )}
            <span className="text-sm text-gray-600">
              {busy
                ? 'Processing…'
                : blocked
                ? (disabledMessage || 'Upload temporarily disabled')
                : 'Click to upload or drag and drop'}
            </span>
            <span className="text-xs text-gray-400">
              {blocked
                ? 'Indexing in progress — uploading now would cause rate-limit errors.'
                : 'CSV exports from your SMx PON PM system (.csv)'}
            </span>
          </div>
        </div>
        <Input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
          disabled={busy || blocked}
        />
      </label>
      <div className="text-center">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="text-xs h-auto py-1"
          onClick={() => downloadCsvTemplate(PONPM_CSV_SPEC)}
        >
          <Download className="h-3 w-3 mr-1" />
          Download column reference template
        </Button>
      </div>
    </div>
  );
}