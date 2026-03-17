import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, MapPin, Server, List, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import LCPMapPin from '@/components/lcp/LCPMapPin';
import LCPMapDetails from '@/components/lcp/LCPMapDetails';

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
}

/**
 * Groups LCP entries by lcp_number so that one map pin represents
 * one physical LCP location with all its splitters listed.
 */
function groupByLcp(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = entry.lcp_number;
    if (!map.has(key)) {
      map.set(key, {
        lcp_number: entry.lcp_number,
        gps_lat: entry.gps_lat,
        gps_lng: entry.gps_lng,
        location: entry.location,
        entries: [],
      });
    }
    map.get(key).entries.push(entry);
  }
  return Array.from(map.values());
}

/**
 * Determine pin color from optic status of a grouped LCP:
 * - green: all entries with an olt_port have optic info populated
 * - red:   at least one entry with an olt_port is missing optic info
 * - gray:  no entries have olt_port defined at all
 */
function getPinStatus(group) {
  const withPort = group.entries.filter(e => e.olt_port);
  if (withPort.length === 0) return 'gray';
  const allHaveOptic = withPort.every(e => e.optic_make || e.optic_model);
  return allHaveOptic ? 'green' : 'red';
}

function createLcpIcon(lcpNumber, status) {
  const colors = {
    green: { bg: '#16a34a', border: '#15803d', ring: 'rgba(22,163,74,0.25)' },
    red:   { bg: '#dc2626', border: '#b91c1c', ring: 'rgba(220,38,38,0.25)' },
    gray:  { bg: '#6366f1', border: '#4f46e5', ring: 'rgba(99,102,241,0.25)' },
  };
  const c = colors[status] || colors.gray;
  const label = lcpNumber.length > 10 ? lcpNumber.substring(0, 9) + '…' : lcpNumber;

  return new L.DivIcon({
    className: 'custom-lcp-pin',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="background:${c.bg};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:2px solid ${c.border};box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;text-align:center;line-height:1.3;">${label}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${c.bg};margin-top:-1px;"></div>
      <div style="width:6px;height:6px;background:${c.bg};border-radius:50%;margin-top:1px;box-shadow:0 0 0 3px ${c.ring};"></div>
    </div>`,
    iconSize: [80, 48],
    iconAnchor: [40, 48],
    popupAnchor: [0, -48],
  });
}

function splitterRangeLabel(entries) {
  const nums = entries
    .map(e => e.splitter_number)
    .filter(Boolean)
    .sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  if (nums.length === 0) return '';
  if (nums.length === 1) return `Splitter ${nums[0]}`;
  return `Splitters ${nums[0]}–${nums[nums.length - 1]}`;
}

export default function LCPMap() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { data: lcpEntries = [], isLoading } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date'),
  });

  const entriesWithCoords = useMemo(() =>
    lcpEntries.filter(e => e.gps_lat && e.gps_lng && !isNaN(e.gps_lat) && !isNaN(e.gps_lng)),
    [lcpEntries]
  );

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entriesWithCoords;
    const term = searchTerm.toLowerCase();
    return entriesWithCoords.filter(entry =>
      entry.lcp_number?.toLowerCase().includes(term) ||
      entry.splitter_number?.toLowerCase().includes(term) ||
      entry.location?.toLowerCase().includes(term) ||
      entry.olt_name?.toLowerCase().includes(term)
    );
  }, [entriesWithCoords, searchTerm]);

  const groups = useMemo(() => groupByLcp(filteredEntries), [filteredEntries]);

  const positions = useMemo(() => groups.map(g => [g.gps_lat, g.gps_lng]), [groups]);

  const defaultCenter = positions.length > 0 ? positions[0] : [39.8283, -98.5795];

  // When selected group's LCP data changes (e.g., after optic import), refresh it
  useEffect(() => {
    if (selectedGroup) {
      const updated = groups.find(g => g.lcp_number === selectedGroup.lcp_number);
      if (updated) setSelectedGroup(updated);
      else setSelectedGroup(null);
    }
  }, [groups]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-[1000] backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('LCPInfo')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">LCP Map View</h1>
                <p className="text-xs text-gray-500">{groups.length} locations • {filteredEntries.length} entries</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 mr-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block"></span>Optic OK</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>Missing Optic</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>No Port</span>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search LCPs..."
                  className="pl-10 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Link to={createPageUrl('LCPInfo')}>
                <Button variant="outline" size="sm">
                  <List className="h-4 w-4 mr-2" />
                  List View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-73px)]">
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-600">Loading map data...</h3>
              </div>
            </div>
          ) : groups.length > 0 ? (
            <MapContainer
              center={defaultCenter}
              zoom={10}
              className="h-full w-full"
              style={{ zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds positions={positions} />

              {groups.map((group) => {
                const status = getPinStatus(group);
                const icon = createLcpIcon(group.lcp_number, status);
                const splitterLabel = splitterRangeLabel(group.entries);

                return (
                  <Marker
                    key={group.lcp_number}
                    position={[group.gps_lat, group.gps_lng]}
                    icon={icon}
                    eventHandlers={{ click: () => setSelectedGroup(group) }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold text-lg text-indigo-600">{group.lcp_number}</div>
                        {splitterLabel && (
                          <div className="text-sm text-gray-600 mb-1">{splitterLabel}</div>
                        )}
                        {group.location && (
                          <div className="flex items-start gap-1 text-sm mb-1">
                            <MapPin className="h-3 w-3 mt-0.5 text-gray-400 shrink-0" />
                            <span>{group.location}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {group.entries.length} splitter{group.entries.length !== 1 ? 's' : ''} • Click for details
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No LCPs with coordinates</h3>
                <p className="text-sm text-gray-500 mt-1">Add GPS coordinates to your LCP entries to see them on the map</p>
                <Link to={createPageUrl('LCPInfo')}>
                  <Button className="mt-4">Go to LCP List</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar details panel */}
        {selectedGroup && (
          <LCPMapDetails group={selectedGroup} onClose={() => setSelectedGroup(null)} />
        )}
      </main>
    </div>
  );
}