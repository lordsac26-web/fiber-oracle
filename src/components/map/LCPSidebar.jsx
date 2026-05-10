import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  Loader2, MapPin, Navigation, Server, WifiOff, X
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Right sidebar for LCP detail.
 * Shows splitter list, expand to see ONTs, checkbox to map them.
 */
export default function LCPSidebar({ lcpGroup, lcpOntCounts, onClose, onMapOnts, onUnmapOnt, mappedOntIds }) {
  const [expandedSplitters, setExpandedSplitters] = useState([]);
  const [geocodingSplitter, setGeocodingSplitter] = useState(null);

  const sortedEntries = useMemo(() => {
    return [...lcpGroup.entries].sort((a, b) => {
      const numA = parseInt(a.splitter_number, 10);
      const numB = parseInt(b.splitter_number, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (a.splitter_number || '').localeCompare(b.splitter_number || '');
    });
  }, [lcpGroup.entries]);

  const toggleSplitter = useCallback((splitterNum) => {
    setExpandedSplitters(prev =>
      prev.includes(splitterNum)
        ? prev.filter(s => s !== splitterNum)
        : [...prev, splitterNum]
    );
  }, []);

  // Health summary from pre-aggregated counts
  const health = lcpOntCounts || { total: 0, ok: 0, critical: 0, warning: 0, offline: 0 };

  return (
    <div className="w-96 max-w-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between z-10">
        <div>
          <Badge className="bg-indigo-600 text-base px-3 py-1">{lcpGroup.lcp_number}</Badge>
          {lcpGroup.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
              <MapPin className="h-3 w-3" />
              {lcpGroup.location}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Health summary */}
      {health.total > 0 && (
        <div className="px-4 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">ONT Health (Latest Report)</div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded border border-red-200 bg-red-50 py-1.5">
              <div className="text-sm font-bold text-red-700">{health.critical || 0}</div>
              <div className="text-[9px] text-red-500">Critical</div>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 py-1.5">
              <div className="text-sm font-bold text-amber-700">{health.warning || 0}</div>
              <div className="text-[9px] text-amber-500">Warning</div>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 py-1.5">
              <div className="text-sm font-bold text-slate-700">{health.offline || 0}</div>
              <div className="text-[9px] text-slate-500">Offline</div>
            </div>
            <div className="rounded border border-emerald-200 bg-emerald-50 py-1.5">
              <div className="text-sm font-bold text-emerald-700">{health.ok || 0}</div>
              <div className="text-[9px] text-emerald-500">OK</div>
            </div>
          </div>
        </div>
      )}

      {/* OLT assignments */}
      {lcpGroup.oltNames.length > 0 && (
        <div className="px-4 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">OLT Assignments</div>
          <div className="flex flex-wrap gap-1">
            {lcpGroup.oltNames.map(olt => (
              <Badge key={olt} variant="outline" className="text-[10px]">
                <Server className="h-3 w-3 mr-1" />{olt}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Splitter list */}
      <div className="px-4 pt-4 pb-4 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Splitters ({sortedEntries.length})
        </div>
        <div className="space-y-1.5">
          {sortedEntries.map(entry => (
            <SplitterAccordion
              key={entry.id}
              entry={entry}
              lcpNumber={lcpGroup.lcp_number}
              isExpanded={expandedSplitters.includes(entry.splitter_number)}
              onToggle={() => toggleSplitter(entry.splitter_number)}
              onMapOnts={onMapOnts}
              onUnmapOnt={onUnmapOnt}
              mappedOntIds={mappedOntIds}
              geocodingSplitter={geocodingSplitter}
              setGeocodingSplitter={setGeocodingSplitter}
            />
          ))}
        </div>
      </div>

      {/* Google Maps link */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="outline"
          className="w-full text-xs"
          onClick={() => window.open(`https://www.google.com/maps?q=${lcpGroup.gps_lat},${lcpGroup.gps_lng}`, '_blank')}
        >
          <MapPin className="h-3 w-3 mr-1" />
          Open in Google Maps
        </Button>
      </div>
    </div>
  );
}

/** Individual splitter accordion — lazy-loads ONTs on expand */
function SplitterAccordion({ entry, lcpNumber, isExpanded, onToggle, onMapOnts, onUnmapOnt, mappedOntIds, geocodingSplitter, setGeocodingSplitter }) {
  const queryClient = useQueryClient();
  // Lazy-load ONTs for this specific splitter when expanded
  const { data: ontRecords = [], isLoading: loadingOnts } = useQuery({
    queryKey: ['splitter-onts', lcpNumber, entry.splitter_number],
    enabled: isExpanded,
    queryFn: () => base44.entities.ONTPerformanceRecord.filter(
      { lcp_number: lcpNumber, splitter_number: entry.splitter_number },
      '-updated_date', 200
    ),
    staleTime: 3 * 60 * 1000,
  });

  // Deduplicate by serial_number — keep latest
  const uniqueOnts = useMemo(() => {
    const seen = new Map();
    for (const ont of ontRecords) {
      const key = ont.serial_number || ont.id;
      if (!seen.has(key)) seen.set(key, ont);
    }
    return Array.from(seen.values());
  }, [ontRecords]);

  const hasOltInfo = entry.olt_name || entry.olt_slot || entry.olt_port;

  // Select all / deselect all
  const allMapped = uniqueOnts.length > 0 && uniqueOnts.every(o => mappedOntIds.has(o.id));

  const handleSelectAll = () => {
    if (allMapped) {
      uniqueOnts.forEach(o => onUnmapOnt(o.id));
    } else {
      onMapOnts(uniqueOnts);
    }
  };

  const handleGeocode = async () => {
    const needsGeocode = uniqueOnts.filter(o =>
      (!o.gps_lat || !o.gps_lng) && o.subscriber_address && o.subscriber_address.trim().length >= 5
    );
    if (needsGeocode.length === 0) {
      toast.info('All ONTs with addresses already have coordinates');
      return;
    }
    setGeocodingSplitter(entry.splitter_number);
    try {
      const items = needsGeocode
        .filter(o => o.id)
        .map(o => ({ id: o.id, address: o.subscriber_address.trim() }));
      toast.loading(`Geocoding ${items.length} addresses…`, { id: 'geocode-splitter' });
      const res = await base44.functions.invoke('geocodeAddresses', { items });
      const { geocoded: count = 0, updated = [], failed = 0, errors = [] } = res.data || {};

      // Refresh the splitter ONT list so new coords appear
      await queryClient.invalidateQueries({ queryKey: ['splitter-onts', lcpNumber, entry.splitter_number] });

      // Auto-map the newly geocoded ONTs so they show on the map immediately
      if (updated.length > 0) {
        const coordMap = new Map(updated.map(u => [u.id, u]));
        const updatedOnts = uniqueOnts
          .filter(o => coordMap.has(o.id))
          .map(o => ({ ...o, gps_lat: coordMap.get(o.id).gps_lat, gps_lng: coordMap.get(o.id).gps_lng }));
        if (updatedOnts.length > 0) onMapOnts(updatedOnts);
      }

      if (count > 0) {
        toast.success(`Geocoded ${count} addresses` + (failed > 0 ? `, ${failed} failed` : ''), { id: 'geocode-splitter' });
      } else {
        toast.warning(`No addresses could be geocoded` + (errors.length > 0 ? `: ${errors[0]}` : ''), { id: 'geocode-splitter' });
      }
    } catch (err) {
      toast.error('Geocoding failed: ' + err.message, { id: 'geocode-splitter' });
    } finally {
      setGeocodingSplitter(null);
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
            <Badge variant="outline" className="font-mono text-xs">
              Splitter {entry.splitter_number}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            {hasOltInfo && (
              <span className="font-mono">
                {[entry.olt_name, entry.olt_slot && `S${entry.olt_slot}`, entry.olt_port && `P${entry.olt_port}`].filter(Boolean).join('/')}
              </span>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-5 mt-1.5 mb-2 space-y-1.5">
          {loadingOnts ? (
            <div className="flex items-center gap-2 p-3 text-xs text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading ONTs...
            </div>
          ) : uniqueOnts.length === 0 ? (
            <div className="p-3 text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-lg">
              No ONT records found for this splitter
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={handleSelectAll}>
                  {allMapped ? 'Unmap All' : `Map All (${uniqueOnts.length})`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={geocodingSplitter === entry.splitter_number}
                  onClick={handleGeocode}
                >
                  {geocodingSplitter === entry.splitter_number
                    ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    : <Navigation className="h-3 w-3 mr-1" />
                  }
                  Geocode
                </Button>
              </div>

              {/* ONT list */}
              {uniqueOnts.map(ont => (
                <OntRow
                  key={ont.id}
                  ont={ont}
                  isMapped={mappedOntIds.has(ont.id)}
                  onToggle={() => {
                    if (mappedOntIds.has(ont.id)) {
                      onUnmapOnt(ont.id);
                    } else {
                      onMapOnts([ont]);
                    }
                  }}
                />
              ))}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Single ONT row with checkbox */
function OntRow({ ont, isMapped, onToggle }) {
  const status = (ont.status || 'ok').toLowerCase();
  const statusColors = {
    critical: 'border-red-300 bg-red-50',
    warning: 'border-amber-300 bg-amber-50',
    offline: 'border-slate-300 bg-slate-50',
    ok: 'border-gray-200 bg-white',
  };
  const statusIcons = {
    critical: <AlertCircle className="h-3 w-3 text-red-500" />,
    warning: <AlertTriangle className="h-3 w-3 text-amber-500" />,
    offline: <WifiOff className="h-3 w-3 text-slate-500" />,
    ok: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  };

  const hasCoords = ont.gps_lat && ont.gps_lng;
  const address = ont.subscriber_address || '';

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${statusColors[status] || statusColors.ok}`}>
      <Checkbox
        checked={isMapped}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {statusIcons[status]}
          <span className="font-mono font-semibold truncate">{ont.serial_number || 'Unknown'}</span>
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          ONT {ont.ont_id || '—'}
          {ont.ont_rx_power != null && ` • Rx: ${Number(ont.ont_rx_power).toFixed(1)} dBm`}
        </div>
        {ont.subscriber_account_name && (
          <div className="text-[10px] text-gray-600 truncate mt-0.5">
            {ont.subscriber_account_name}
          </div>
        )}
        {address && (
          <div className="text-[10px] text-gray-400 truncate mt-0.5">
            {address}
            {hasCoords && <span className="text-green-600 ml-1">📍</span>}
          </div>
        )}
      </div>
    </div>
  );
}