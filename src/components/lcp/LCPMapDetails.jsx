import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Server, X } from 'lucide-react';

const OPTIC_TYPE_COLORS = {
  'XGS-DD': 'bg-purple-600',
  'XGS-COMBO': 'bg-emerald-600',
  'XGS-COMBO-EXT': 'bg-amber-600',
};

function formatOltLocation(entry) {
  // Format: OLT Name → Slot X → Port Y → Optic Type
  const parts = [];
  if (entry.olt_name) parts.push(entry.olt_name);
  if (entry.olt_slot) parts.push(`Slot ${entry.olt_slot}`);
  if (entry.olt_port) parts.push(`Port ${entry.olt_port}`);
  return parts;
}

function SplitterRow({ entry }) {
  const oltParts = formatOltLocation(entry);
  const hasOptic = entry.optic_make || entry.optic_model;
  const hasPort = !!entry.olt_port;

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="font-mono text-xs">
          {entry.splitter_number}
        </Badge>
        {hasPort && (
          <span className={`w-2 h-2 rounded-full ${hasOptic ? 'bg-green-500' : 'bg-red-500'}`} 
                title={hasOptic ? 'Optic info populated' : 'Missing optic info'} />
        )}
      </div>

      {/* OLT Location: Name → Slot → Port → Type */}
      {oltParts.length > 0 && (
        <div className="flex items-start gap-2">
          <Server className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
          <div className="text-xs space-y-0.5">
            <div className="font-mono text-gray-700 dark:text-gray-300 flex items-center gap-1 flex-wrap">
              {oltParts.map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-gray-400">→</span>}
                  <span>{part}</span>
                </React.Fragment>
              ))}
              {entry.optic_type && (
                <>
                  <span className="text-gray-400">→</span>
                  <Badge className={`${OPTIC_TYPE_COLORS[entry.optic_type] || 'bg-gray-500'} text-[10px] py-0 px-1.5`}>
                    {entry.optic_type}
                  </Badge>
                </>
              )}
            </div>
            {entry.olt_shelf && (
              <div className="text-gray-400">Shelf {entry.olt_shelf}</div>
            )}
          </div>
        </div>
      )}

      {/* Optic details */}
      {hasOptic && (
        <div className="text-xs text-gray-600 dark:text-gray-400 pl-5">
          {[entry.optic_make, entry.optic_model].filter(Boolean).join(' ')}
          {entry.optic_serial && <span className="text-gray-400 ml-1">S/N: {entry.optic_serial}</span>}
        </div>
      )}
    </div>
  );
}

export default function LCPMapDetails({ group, onClose }) {
  const sortedEntries = [...group.entries].sort((a, b) => {
    const na = parseInt(a.splitter_number, 10);
    const nb = parseInt(b.splitter_number, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return (a.splitter_number || '').localeCompare(b.splitter_number || '');
  });

  const splitterNums = sortedEntries.map(e => e.splitter_number).filter(Boolean);
  const splitterSummary = splitterNums.length <= 1
    ? splitterNums[0] || ''
    : `${splitterNums[0]}–${splitterNums[splitterNums.length - 1]}`;

  const withPort = group.entries.filter(e => e.olt_port);
  const withOptic = withPort.filter(e => e.optic_make || e.optic_model);
  const opticRatio = withPort.length > 0 ? `${withOptic.length}/${withPort.length}` : null;

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between z-10">
        <h3 className="font-semibold text-sm">LCP Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <Badge className="bg-indigo-600 text-base px-3 py-1">{group.lcp_number}</Badge>
          {splitterSummary && (
            <div className="text-sm text-gray-500 mt-1.5">
              Splitters {splitterSummary} ({sortedEntries.length} total)
            </div>
          )}
        </div>

        {/* Location */}
        {group.location && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Location</div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span className="text-sm">{group.location}</span>
            </div>
          </div>
        )}

        {/* Coordinates */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Coordinates</div>
          <div className="font-mono text-sm text-blue-600">
            {group.gps_lat}, {group.gps_lng}
          </div>
        </div>

        {/* Optic status summary */}
        {opticRatio && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">Optic Coverage:</div>
            <Badge variant="outline" className={
              withOptic.length === withPort.length
                ? 'border-green-300 text-green-700 bg-green-50'
                : 'border-red-300 text-red-700 bg-red-50'
            }>
              {opticRatio} ports
            </Badge>
          </div>
        )}

        {/* Splitter entries */}
        <div>
          <div className="text-xs text-gray-500 mb-2 font-medium">Splitters & OLT Ports</div>
          <div className="space-y-2">
            {sortedEntries.map(entry => (
              <SplitterRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>

        {/* Notes - show first non-empty note */}
        {sortedEntries.some(e => e.notes) && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            {sortedEntries.filter(e => e.notes).map(e => (
              <div key={e.id} className="text-sm italic text-gray-600 dark:text-gray-400 mb-1">
                <span className="text-xs font-mono text-gray-400 not-italic">[{e.splitter_number}]</span> {e.notes}
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(`https://www.google.com/maps?q=${group.gps_lat},${group.gps_lng}`, '_blank')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Open in Google Maps
        </Button>
      </div>
    </div>
  );
}