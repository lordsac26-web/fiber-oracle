import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { validateCsvFile, downloadCsvTemplate, PONPM_CSV_SPEC } from '@/lib/csvValidator';

/**
 * Validated CSV upload zone for PON PM Analysis.
 * Uses the shared csvValidator so errors are consistent and reference the
 * same template/column list shown in the UI.
 */
export default function FileUploadZone({ onChange, isLoading }) {
  const [validating, setValidating] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setValidating(true);
    const validation = await validateCsvFile(file, PONPM_CSV_SPEC);
    setValidating(false);

    if (!validation.ok) {
      toast.error(validation.message, { duration: 7000 });
      e.target.value = '';
      return;
    }

    onChange(e);
  };

  const busy = isLoading || validating;

  return (
    <div className="space-y-2">
      <label className="block">
        <div className="border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-blue-50/50">
          <div className="flex flex-col items-center gap-3">
            {busy ? (
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            ) : (
              <Upload className="h-10 w-10 text-gray-400" />
            )}
            <span className="text-sm text-gray-600">
              {busy ? 'Processing…' : 'Click to upload or drag and drop'}
            </span>
            <span className="text-xs text-gray-400">
              CSV exports from your SMx PON PM system (.csv)
            </span>
          </div>
        </div>
        <Input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
          disabled={busy}
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
          Download blank template (column reference)
        </Button>
      </div>
    </div>
  );
}