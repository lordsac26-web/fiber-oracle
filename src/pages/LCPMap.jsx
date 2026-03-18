import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, List, Loader2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import LCPMapDetails from '@/components/lcp/LCPMapDetails';
import LCPMapFilters from '@/components/lcp/LCPMapFilters';
import { downloadLcpAuditCsv, downloadLcpAuditPdf } from '@/utils/lcpMapAuditExport';

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATUS_PRIORITY = {
  critical: 0,
  offline: 1,
  warning: 2,
  ok: 3,
};

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

function normalizeOntStatus(status) {
  const normalized = String(status || 'ok').toLowerCase();

  if (normalized === 'critical') return 'critical';
  if (normalized === 'warning') return 'warning';
  if (normalized === 'offline') return 'offline';

  return 'ok';
}

function sortOntRecords(records) {
  return [...records].sort((a, b) => {
    const statusDiff = STATUS_PRIORITY[normalizeOntStatus(a.status)] - STATUS_PRIORITY[normalizeOntStatus(b.status)];
    if (statusDiff !== 0) return statusDiff;

    const splitterA = parseInt(a.splitter_number, 10);
    const splitterB = parseInt(b.splitter_number, 10);
    if (!Number.isNaN(splitterA) && !Number.isNaN(splitterB) && splitterA !== splitterB) {
      return splitterA - splitterB;
    }

    return String(a.serial_number || '').localeCompare(String(b.serial_number || ''));
  });
}

function summarizeOntRecords(records) {
  const summary = {
    critical: 0,
    warning: 0,
    offline: 0,
    ok: 0,
    impacted: 0,
    total: records.length,
    highestSeverity: 'ok',
  };

  for (const record of records) {
    const status = normalizeOntStatus(record.status);
    summary[status] += 1;
  }

  summary.impacted = summary.critical + summary.warning + summary.offline;

  if (summary.critical > 0) summary.highestSeverity = 'critical';
  else if (summary.offline > 0) summary.highestSeverity = 'offline';
  else if (summary.warning > 0) summary.highestSeverity = 'warning';

  return summary;
}

function groupByLcp(entries, ontRecordsByLcp, latestReportName) {
  const map = new Map();

  for (const entry of entries) {
    const key = String(entry.lcp_number || '').trim();
    if (!key) continue;

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

  return Array.from(map.values()).map((group) => {
    const ontRecords = sortOntRecords(ontRecordsByLcp.get(String(group.lcp_number).trim()) || []);
    const issueRecords = ontRecords.filter((record) => normalizeOntStatus(record.status) !== 'ok');

    return {
      ...group,
      ontRecords,
      issueRecords,
      issueSummary: summarizeOntRecords(ontRecords),
      latestReportName,
    };
  });
}

function getOpticStatus(group) {
  const withPort = group.entries.filter((entry) => entry.olt_port);
  if (withPort.length === 0) return 'gray';

  const allHaveOptic = withPort.every((entry) => entry.optic_make || entry.optic_model);
  return allHaveOptic ? 'green' : 'red';
}

function createLcpIcon(lcpNumber, opticStatus, issueSummary) {
  const colors = {
    green: { bg: '#16a34a', border: '#15803d', ring: 'rgba(22,163,74,0.25)' },
    red: { bg: '#dc2626', border: '#b91c1c', ring: 'rgba(220,38,38,0.25)' },
    gray: { bg: '#6366f1', border: '#4f46e5', ring: 'rgba(99,102,241,0.25)' },
    critical: { bg: '#dc2626', border: '#991b1b', ring: 'rgba(220,38,38,0.35)' },
    warning: { bg: '#d97706', border: '#b45309', ring: 'rgba(217,119,6,0.30)' },
    offline: { bg: '#475569', border: '#334155', ring: 'rgba(71,85,105,0.30)' },
  };

  const colorKey = issueSummary.impacted > 0 ? issueSummary.highestSeverity : opticStatus;
  const color = colors[colorKey] || colors.gray;
  const label = lcpNumber.length > 10 ? `${lcpNumber.substring(0, 9)}…` : lcpNumber;
  const impactedCount = issueSummary.impacted > 99 ? '99+' : String(issueSummary.impacted || '');
  const issueBadge = issueSummary.impacted > 0
    ? `<div style="position:absolute;top:-8px;right:-10px;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#111827;color:#fff;border:2px solid #fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${impactedCount}</div>`
    : '';

  return new L.DivIcon({
    className: 'custom-lcp-pin',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      ${issueBadge}
      <div style="background:${color.bg};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:2px solid ${color.border};box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;text-align:center;line-height:1.3;">${label}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color.bg};margin-top:-1px;"></div>
      <div style="width:6px;height:6px;background:${color.bg};border-radius:50%;margin-top:1px;box-shadow:0 0 0 3px ${color.ring};"></div>
    </div>`,
    iconSize: [84, 50],
    iconAnchor: [42, 50],
    popupAnchor: [0, -50],
  });
}

function splitterRangeLabel(entries) {
  const nums = entries
    .map((entry) => entry.splitter_number)
    .filter(Boolean)
    .sort((a, b) => {
      const splitterA = parseInt(a, 10);
      const splitterB = parseInt(b, 10);
      if (!Number.isNaN(splitterA) && !Number.isNaN(splitterB)) return splitterA - splitterB;
      return a.localeCompare(b);
    });

  if (nums.length === 0) return '';
  if (nums.length === 1) return `Splitter ${nums[0]}`;

  return `Splitters ${nums[0]}–${nums[nums.length - 1]}`;
}

function matchesFilters(group, viewFilter, severityFilter) {
  if (viewFilter === 'issues' && group.issueSummary.impacted === 0) {
    return false;
  }

  if (severityFilter === 'all') {
    return true;
  }

  return group.issueSummary[severityFilter] > 0;
}

export default function LCPMap() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { data: lcpEntries = [], isLoading: isLoadingLcpEntries } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
  });

  const { data: latestReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['latestPonPmReport'],
    queryFn: () => base44.entities.PONPMReport.list('-created_date', 5),
    initialData: [],
  });

  const latestReport = latestReports.find((report) => report.processing_status === 'completed') || latestReports[0] || null;

  const { data: latestOntRecords = [], isLoading: isLoadingOntRecords } = useQuery({
    queryKey: ['lcpMapLatestOntRecords', latestReport?.id],
    enabled: !!latestReport?.id,
    queryFn: () => base44.entities.ONTPerformanceRecord.filter({ report_id: latestReport.id }, '-updated_date', 10000),
    initialData: [],
  });

  const entriesWithCoords = useMemo(() => {
    return lcpEntries.filter((entry) => entry.gps_lat && entry.gps_lng && !Number.isNaN(entry.gps_lat) && !Number.isNaN(entry.gps_lng));
  }, [lcpEntries]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entriesWithCoords;

    const term = searchTerm.toLowerCase();
    return entriesWithCoords.filter((entry) => {
      return entry.lcp_number?.toLowerCase().includes(term)
        || entry.splitter_number?.toLowerCase().includes(term)
        || entry.location?.toLowerCase().includes(term)
        || entry.olt_name?.toLowerCase().includes(term);
    });
  }, [entriesWithCoords, searchTerm]);

  const ontRecordsByLcp = useMemo(() => {
    const groupedRecords = new Map();

    for (const record of latestOntRecords) {
      const lcpNumber = String(record.lcp_number || '').trim();
      if (!lcpNumber) continue;

      if (!groupedRecords.has(lcpNumber)) {
        groupedRecords.set(lcpNumber, []);
      }

      groupedRecords.get(lcpNumber).push({
        ...record,
        status: normalizeOntStatus(record.status),
      });
    }

    return groupedRecords;
  }, [latestOntRecords]);

  const baseGroups = useMemo(() => {
    return groupByLcp(filteredEntries, ontRecordsByLcp, latestReport?.report_name || null);
  }, [filteredEntries, ontRecordsByLcp, latestReport?.report_name]);

  const groupStatusCounts = useMemo(() => {
    const totals = {
      critical: 0,
      warning: 0,
      offline: 0,
      ok: 0,
      total: baseGroups.length,
    };

    for (const group of baseGroups) {
      const status = group.issueSummary.impacted > 0 ? group.issueSummary.highestSeverity : 'ok';
      totals[status] += 1;
    }

    return totals;
  }, [baseGroups]);

  const groups = useMemo(() => {
    if (selectedStatuses.length === 0) return [];

    return baseGroups.filter((group) => {
      const status = group.issueSummary.impacted > 0 ? group.issueSummary.highestSeverity : 'ok';
      return selectedStatuses.includes(status);
    });
  }, [baseGroups, selectedStatuses]);

  const networkStatusTotals = useMemo(() => {
    const critical = Number(latestReport?.critical_count || 0);
    const warning = Number(latestReport?.warning_count || 0);
    const ok = Number(latestReport?.ok_count || 0);
    const total = Number(latestReport?.ont_count || critical + warning + ok);
    const offline = Math.max(0, total - critical - warning - ok);

    return {
      critical,
      warning,
      offline,
      ok,
      total,
    };
  }, [latestReport]);

  const positions = useMemo(() => groups.map((group) => [group.gps_lat, group.gps_lng]), [groups]);
  const fallbackCenter = entriesWithCoords.length > 0 ? [entriesWithCoords[0].gps_lat, entriesWithCoords[0].gps_lng] : [39.8283, -98.5795];
  const defaultCenter = positions.length > 0 ? positions[0] : fallbackCenter;
  const isLoading = isLoadingLcpEntries || isLoadingReports || isLoadingOntRecords;

  useEffect(() => {
    if (!selectedGroup) return;

    const updatedGroup = groups.find((group) => group.lcp_number === selectedGroup.lcp_number);
    if (updatedGroup) setSelectedGroup(updatedGroup);
    else setSelectedGroup(null);
  }, [groups, selectedGroup]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-[1000] border-b border-gray-200/50 bg-white/70 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/70">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('LCPInfo')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fiber Network Map</h1>
                <p className="text-xs text-gray-500">
                  {groups.length} visible locations • {filteredEntries.length} splitter entries
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={groups.length === 0}
                onClick={() => downloadLcpAuditCsv({
                  groups,
                  latestReport,
                  searchTerm,
                  selectedStatuses,
                })}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={groups.length === 0}
                onClick={() => downloadLcpAuditPdf({
                  groups,
                  latestReport,
                  searchTerm,
                  selectedStatuses,
                })}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
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
        <div className="relative flex-1">
          <LCPMapFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            latestReport={latestReport}
            networkStatusTotals={networkStatusTotals}
            groupStatusCounts={groupStatusCounts}
            selectedStatuses={selectedStatuses}
            onStatusToggle={(status) => {
              setSelectedStatuses((current) =>
                current.includes(status)
                  ? current.filter((value) => value !== status)
                  : [...current, status]
              );
            }}
          />

          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-600">Loading fiber map...</h3>
              </div>
            </div>
          ) : entriesWithCoords.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-6">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No LCPs with coordinates</h3>
                <p className="text-sm text-gray-500 mt-1">Add GPS coordinates to your LCP entries to see them on the map.</p>
                <Link to={createPageUrl('LCPInfo')}>
                  <Button className="mt-4">Go to LCP List</Button>
                </Link>
              </div>
            </div>
          ) : selectedStatuses.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-6">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No pins selected yet</h3>
                <p className="text-sm text-gray-500 mt-1">Use the status checkboxes above to show the LCP pins you want on the map.</p>
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <FitBounds positions={positions} />

              {groups.map((group) => {
                const opticStatus = getOpticStatus(group);
                const icon = createLcpIcon(group.lcp_number, opticStatus, group.issueSummary);
                const splitterLabel = splitterRangeLabel(group.entries);

                return (
                  <Marker
                    key={group.lcp_number}
                    position={[group.gps_lat, group.gps_lng]}
                    icon={icon}
                    eventHandlers={{ click: () => setSelectedGroup(group) }}
                  >
                    <Popup>
                      <div className="min-w-[220px]">
                        <div className="font-bold text-lg text-indigo-600">{group.lcp_number}</div>
                        {splitterLabel && (
                          <div className="text-sm text-gray-600 mb-1">{splitterLabel}</div>
                        )}
                        {group.location && (
                          <div className="flex items-start gap-1 text-sm mb-2">
                            <MapPin className="h-3 w-3 mt-0.5 text-gray-400 shrink-0" />
                            <span>{group.location}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>{group.entries.length} splitter{group.entries.length !== 1 ? 's' : ''} at this location</div>
                          <div>
                            {group.issueSummary.critical} critical • {group.issueSummary.warning} warning • {group.issueSummary.offline} offline
                          </div>
                          <div className="text-gray-500">Click for full LCP and ONT issue details</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center px-6">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No locations match the current filters</h3>
                <p className="text-sm text-gray-500 mt-1">Try switching the severity filter or showing all locations.</p>
              </div>
            </div>
          )}
        </div>

        {selectedGroup && (
          <LCPMapDetails group={selectedGroup} onClose={() => setSelectedGroup(null)} />
        )}
      </main>
    </div>
  );
}