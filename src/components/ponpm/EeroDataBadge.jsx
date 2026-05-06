import React from 'react';
import { Wifi, Upload, ChevronDown, Database } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { toast } from 'sonner';

/**
 * Eero data badge + dropdown shown in the PONPMAnalysis header.
 *
 * Mirrors the subscriber data badge UX: shows current dataset date and
 * record/match counts when loaded, prompts to upload when missing, and
 * exposes "Upload new" + "Load from existing dataset" actions.
 *
 * Extracted to its own file to keep PONPMAnalysis under the 2000-line
 * platform editing limit.
 */
export default function EeroDataBadge({
  eeroMeta,
  eeroRecordsLoaded,
  eeroMatchCount,
  eeroLoading,
  onUploadClick,
  onLoadExistingClick,
}) {
  const triggerClass = eeroRecordsLoaded
    ? 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
    : eeroMeta
      ? 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100'
      : 'text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100';

  const triggerLabel = eeroRecordsLoaded
    ? `eero: ${format(new Date(eeroMeta.upload_date || eeroMeta.created_date), 'MMM d, yyyy')} • ${eeroMeta.record_count?.toLocaleString()} (${eeroMatchCount} matched)`
    : eeroMeta
      ? `eero data not loaded • ${eeroMeta.record_count?.toLocaleString()}`
      : 'Upload eero data';

  const handleLoadExisting = async () => {
    toast.loading('Loading eero data…', { id: 'eero-reload' });
    try {
      await onLoadExistingClick();
      toast.success('eero data loaded', { id: 'eero-reload' });
    } catch (_e) {
      toast.error('Failed to load eero data', { id: 'eero-reload' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 text-xs rounded-md px-2.5 py-1 font-semibold border transition-colors cursor-pointer ${triggerClass}`}
          title="eero data actions"
          aria-label="eero data actions"
        >
          <Wifi className="h-3 w-3" />
          {triggerLabel}
          <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={onUploadClick}>
          <Upload className="h-4 w-4 mr-2 text-cyan-500" />
          Upload new eero CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!eeroMeta || eeroLoading}
          onClick={handleLoadExisting}
        >
          <Database className="h-4 w-4 mr-2 text-emerald-500" />
          {eeroLoading ? 'Loading…' : 'Load from existing dataset'}
        </DropdownMenuItem>
        {eeroMeta && (
          <div className="px-2 py-1.5 text-[10px] text-gray-500 border-t mt-1">
            Latest in DB: {eeroMeta.record_count?.toLocaleString()} records
            <br />
            {format(new Date(eeroMeta.upload_date || eeroMeta.created_date), 'MMM d, yyyy h:mm a')}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}