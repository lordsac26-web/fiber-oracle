import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, FileText, List, Loader2, MapPin, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { downloadLcpAuditCsv, downloadLcpAuditPdf } from '@/utils/lcpMapAuditExport';
import LCPSidebar from './LCPSidebar';
import DraggableOntMarker from './DraggableOntMarker';
import FitBoundsHelper from './FitBoundsHelper';
import { createLcpHealthIcon, getHealthColor, createOntPinIcon } from './lcpMapUtils';
import { toast } from 'sonner';

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Create a colored LCP pin icon based on health percentage.
 * healthPct: 0-100 (% of ONTs that are healthy)
 * If no ONT data: neutral blue pin.
 */
function createColoredLcpIcon(lcpNumber, healthPct, ontCount) {
  let bg, border, ring;
  if (ontCount === 0 || healthPct === null) {
    bg = '#6366f1'; border = '#4f46e5'; ring = 'rgba(99,102,241,0.25)';
  } else if (healthPct >= 90) {
    bg = '#16a34a'; border = '#15803d'; ring = 'rgba(22,163,74,0.25)';
  } else if (healthPct >= 70) {
    bg = '#d97706'; border = '#b45309'; ring = 'rgba(217,119,6,0.30)';
  } else if (healthPct >= 50) {
    bg = '#ea580c'; border = '#c2410c'; ring = 'rgba(234,88,12,0.30)';
  } else {
    bg = '#dc2626'; border = '#b91c1c'; ring = 'rgba(220,38,38,0.35)';
  }

  const label = lcpNumber.length > 10 ? `${lcpNumber.substring(0, 9)}…` : lcpNumber;
  const badge = ontCount > 0
    ? `<div style="position:absolute;top:-8px;right:-10px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#111827;color:#fff;border:2px solid #fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${ontCount > 999 ? '999+' : ontCount}</div>`
    : '';

  return new L.DivIcon({
    className: 'custom-lcp-pin',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      ${badge}
      <div style="background:${bg};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:2px solid ${border};box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;text-align:center;line-height:1.3;">${label}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${bg};margin-top:-1px;"></div>
      <div style="width:6px;height:6px;background:${bg};border-radius:50%;margin-top:1px;box-shadow:0 0 0 3px ${ring};"></div>
    </div>`,
    iconSize: [84, 50],
    iconAnchor: [42, 50],
    popupAnchor: [0, -50],
  });
}

/** Group LCPEntry records by lcp_number — lightweight, no ONT data needed */
function groupLcpEntries(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = String(entry.lcp_number || '').trim();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        lcp_number: key,
        gps_lat: entry.gps_lat,
        gps_lng: entry.gps_lng,
        location: entry.location,
        address: entry.address,
        entries: [],
        oltNames: new Set(),
      });
    }
    const group = map.get(key);
    group.entries.push(entry);
    if (entry.olt_name) group.oltNames.add(entry.olt_name);
  }
  // Convert sets to arrays
  return Array.from(map.values()).map(g => ({ ...g, oltNames: Array.from(g.oltNames).sort() }));
}

export default function LCPNetworkMap() {
  const [searchTerm, setSearchTerm] = useState('');
  const [oltFilter, setOltFilter] = useState('all');
  const [selectedLcp, setSelectedLcp] = useState(null); // group object
  const [mappedOnts, setMappedOnts] = useState([]); // ONTs the user has chosen to display

  // 1. Load ONLY LCPEntry records (lightweight — GPS + metadata)
  const { data: lcpEntries = [], isLoading: loadingLcp } = useQuery({
    queryKey: ['lcp-entries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
  });

  // 2. Load per-LCP health summary (tiny payload — just counts by status)
  const { data: lcpHealthData = {} } = useQuery({
    queryKey: ['lcpOntCounts'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestLcpOntCounts', {});
      return res.data?.lcpSummary || {};
    },
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
  });

  // Group entries by LCP — pure LCP reference data, no ONTs
  const lcpGroups = useMemo(() => {
    const entries = lcpEntries.filter(e => e.gps_lat && e.gps_lng && isFinite(e.gps_lat) && isFinite(e.gps_lng));
    return groupLcpEntries(entries);
  }, [lcpEntries]);

  // Available OLTs for filter
  const availableOlts = useMemo(() => {
    return Array.from(new Set(lcpGroups.flatMap(g => g.oltNames))).sort();
  }, [lcpGroups]);

  // Apply search + OLT filter
  const filteredGroups = useMemo(() => {
    return lcpGroups.filter(g => {
      const matchesOlt = oltFilter === 'all' || g.oltNames.includes(oltFilter);
      if (!matchesOlt) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return g.lcp_number.toLowerCase().includes(term)
        || g.location?.toLowerCase().includes(term)
        || g.address?.toLowerCase().includes(term)
        || g.entries.some(e => e.splitter_number?.toLowerCase().includes(term))
        || g.oltNames.some(o => o.toLowerCase().includes(term));
    });
  }, [lcpGroups, searchTerm, oltFilter]);

  // Map positions for FitBounds
  const positions = useMemo(() => filteredGroups.map(g => [g.gps_lat, g.gps_lng]), [filteredGroups]);
  const defaultCenter = positions.length > 0 ? positions[0] : [39.83, -98.58];

  // Handle ONT pin drag
  const handleOntDragEnd = useCallback(async (recordId, newLat, newLng) => {
    try {
      await base44.functions.invoke('saveOntGpsPosition', { recordId, lat: newLat, lng: newLng });
      setMappedOnts(prev => prev.map(o => o.id === recordId ? { ...o, gps_lat: newLat, gps_lng: newLng, gps_manual: true } : o));
      toast.success('Pin position saved');
    } catch (err) {
      toast.error('Failed to save position: ' + err.message);
    }
  }, []);

  // Add ONTs to map
  const handleMapOnts = useCallback((onts) => {
    setMappedOnts(prev => {
      const existingIds = new Set(prev.map(o => o.id));
      const newOnes = onts.filter(o => !existingIds.has(o.id));
      return [...prev, ...newOnes];
    });
  }, []);

  // Remove ONT from map
  const handleUnmapOnt = useCallback((ontId) => {
    setMappedOnts(prev => prev.filter(o => o.id !== ontId));
  }, []);

  // Clear all mapped ONTs
  const handleClearMappedOnts = useCallback(() => {
    setMappedOnts([]);
  }, []);

  // ONTs with valid positions for rendering
  const plottedOnts = useMemo(() => {
    return mappedOnts.filter(o => o.gps_lat && o.gps_lng && isFinite(o.gps_lat) && isFinite(o.gps_lng));
  }, [mappedOnts]);

  // Stats
  const totalLcps = lcpGroups.length;
  const visibleLcps = filteredGroups.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-[1000] border-b border-gray-200/50 bg-white/70 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/70">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('CalixSmxAnalysis')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fiber Network Map</h1>
                <p className="text-xs text-gray-500">
                  {visibleLcps} of {totalLcps} LCPs
                  {mappedOnts.length > 0 && ` • ${plottedOnts.length} ONTs mapped`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mappedOnts.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearMappedOnts}>
                  <X className="h-4 w-4 mr-1" />
                  Clear {mappedOnts.length} ONTs
                </Button>
              )}
              <Link to={createPageUrl('LCPInfo')}>
                <Button variant="outline" size="sm">
                  <List className="h-4 w-4 mr-1" />
                  List View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-57px)]">
        {/* Left: Search/filter panel */}
        <div className="w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search LCP, location, OLT..."
              className="h-9 pl-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={oltFilter} onValueChange={setOltFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All OLTs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All OLTs</SelectItem>
              {availableOlts.map(olt => (
                <SelectItem key={olt} value={olt}>{olt}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Legend */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">LCP Health Legend</div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-600" />≥90% OK</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-600" />70-89%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-600" />50-69%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-600" />&lt;50%</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-500" />No data</span>
            </div>
          </div>

          {/* Mapped ONTs count */}
          {mappedOnts.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
              <div className="text-xs font-medium text-blue-800">
                {plottedOnts.length} of {mappedOnts.length} ONTs plotted
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">
                {mappedOnts.length - plottedOnts.length > 0 && `${mappedOnts.length - plottedOnts.length} need geocoding`}
              </div>
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 relative">
          {loadingLcp ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center px-6">
              <div>
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">
                  {lcpGroups.length === 0 ? 'No LCPs with coordinates' : 'No LCPs match your filters'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {lcpGroups.length === 0
                    ? 'Add GPS coordinates to your LCP entries to see them on the map.'
                    : 'Try adjusting your search or OLT filter.'}
                </p>
              </div>
            </div>
          ) : (
            <MapContainer center={defaultCenter} zoom={10} className="h-full w-full" style={{ zIndex: 1 }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {positions.length > 0 && <FitBoundsHelper positions={positions} />}

              {/* LCP pins — colored by health */}
              {filteredGroups.map(group => {
                const health = lcpHealthData[group.lcp_number];
                let healthPct = null;
                let ontCount = 0;
                if (health) {
                  ontCount = health.total || 0;
                  healthPct = ontCount > 0 ? ((health.ok || 0) / ontCount) * 100 : null;
                }
                const icon = createColoredLcpIcon(group.lcp_number, healthPct, ontCount);
                return (
                  <Marker
                    key={group.lcp_number}
                    position={[group.gps_lat, group.gps_lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedLcp(group),
                    }}
                  />
                );
              })}

              {/* ONT pins — user-selected, draggable */}
              {plottedOnts.map(ont => (
                <DraggableOntMarker
                  key={ont.id}
                  ont={ont}
                  onDragEnd={handleOntDragEnd}
                />
              ))}
            </MapContainer>
          )}
        </div>

        {/* Right sidebar — LCP detail with splitter drill-down */}
        {selectedLcp && (
          <LCPSidebar
            lcpGroup={selectedLcp}
            lcpOntCounts={lcpHealthData[selectedLcp.lcp_number]}
            onClose={() => setSelectedLcp(null)}
            onMapOnts={handleMapOnts}
            onUnmapOnt={handleUnmapOnt}
            mappedOntIds={new Set(mappedOnts.map(o => o.id))}
          />
        )}
      </main>
    </div>
  );
}