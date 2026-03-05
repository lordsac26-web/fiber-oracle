import React from 'react';
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Validated CSV upload zone for PON PM Analysis.
 * Shows a dashed drop-target and enforces file-type / size constraints
 * before calling onChange.
 */
export default function FileUploadZone({ onChange, isLoading }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();

    if (!name.endsWith('.csv')) {
      toast.error(
        `Invalid file: "${file.name}". PON PM Analysis requires a CSV export from your SMx system. Please upload a .csv file.`,
        { duration: 6000 }
      );
      e.target.value = '';
      return;
    }

    if (file.size === 0) {
      toast.error('The selected file is empty. Please choose a valid CSV export.', { duration: 5000 });
      e.target.value = '';
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File is too large (max 100 MB). Please upload a smaller CSV export.', { duration: 5000 });
      e.target.value = '';
      return;
    }

    onChange(e);
  };

  return (
    <label className="block">
      <div className="border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-blue-50/50">
        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          ) : (
            <Upload className="h-10 w-10 text-gray-400" />
          )}
          <span className="text-sm text-gray-600">
            {isLoading ? 'Processing…' : 'Click to upload or drag and drop'}
          </span>
          <span className="text-xs text-gray-400">CSV files only (.csv)</span>
        </div>
      </div>
      <Input
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
        disabled={isLoading}
      />
    </label>
  );
}