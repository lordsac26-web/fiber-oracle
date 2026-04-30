import React, { useState, useMemo } from 'react';
import { buildLcpLookupMap, resolveLcpForOnt } from './lcpLookup';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Search,
  Navigation,
  TrendingDown,
  Loader2,
  Users,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const SPLITTER_CAPACITY = 32;

// Distinct color palette for splitter color-coding (up to 12 splitters)
const SPLITTER_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500', bar: 'bg-blue-200' },
  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-200' },
  { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', dot: 'bg-violet-500', bar: 'bg-violet-200' },
  { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-200' },
  { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', dot: 'bg-rose-500', bar: 'bg-rose-200' },
  { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', dot: 'bg-cyan-500', bar: 'bg-cyan-200' },
  { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500', bar: 'bg-orange-200' },
  { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500', bar: 'bg-indigo-200' },
  { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-500', bar: 'bg-pink-200' },
  { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', dot: 'bg-teal-500', bar: 'bg-teal-200' },
  { bg: 'bg-lime-50', border: 'border-lime-300', text: 'text-lime-700', dot: 'bg-lime-500', bar: 'bg-lime-200' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500', bar: 'bg-fuchsia-200' },
];

export default function LCPSummarySection({ result, onPortClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLCP, setSelectedLCP] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusFilters, setStatusFilters] = useState(['all']);

  // Fetch LCP entries from database
  const { data: lcpEntries = [], isLoading } = useQuery({
    queryKey: ['lcp-entries'],
    queryFn: async () => {
      const entries = await base44.entities.LCPEntry.list('-created_date', 5000);
      return entries;
    },
  });

  // Build lookup map from shared utility
  const lcpLookupMap = useMemo(() => buildLcpLookupMap(lcpEntries), [lcpEntries]);

  // Aggregate LCP data from ONTs, using real-time Map lookup for ONTs missing lcp_number
  const lcpData = useMemo(() => {
    if (!result?.onts || !lcpEntries.length) return [];

    const lcpMap = {};

    // First, initialize from LCP database entries
    lcpEntries.forEach(lcpEntry => {
      const lcpNumber = lcpEntry.lcp_number;
      if (!lcpMap[lcpNumber]) {
        lcpMap[lcpNumber] = {
          lcpNumber,
          location: lcpEntry.location || lcpEntry.address,
          gps_lat: lcpEntry.gps_lat,
          gps_lng: lcpEntry.gps_lng,
          splitter_ratio: lcpEntry.splitter_ratio,
          fiber_count: lcpEntry.fiber_count,
          ports: new Set(),
          splitters: {},
          onts: [],
          critical: 0,
          warning: 0,
          ok: 0,
          offline: 0,
          degrading: 0,
        };
      }

      if (lcpEntry.splitter_number && !lcpMap[lcpNumber].splitters[lcpEntry.splitter_number]) {
        lcpMap[lcpNumber].splitters[lcpEntry.splitter_number] = {
          splitterNumber: lcpEntry.splitter_number,
          ontCount: 0,
        };
      }
    });

    // Then, aggregate ONT data — use shared utility for fallback lookup
    result.onts.forEach(ont => {
      let lcpNumber = ont._lcpNumber || ont.lcp_number;
      let splitterNumber = ont._splitterNumber || ont.splitter_number || 'Unknown';

      if (!lcpNumber) {
        const resolved = resolveLcpForOnt(lcpLookupMap, ont);
        if (resolved) {
          lcpNumber = resolved.lcp_number;
          splitterNumber = resolved.splitter_number || 'Unknown';
        }
      }
      if (!lcpNumber) return;

      // Create entry if not found in database (for LCPs not yet in database)
      if (!lcpMap[lcpNumber]) {
        lcpMap[lcpNumber] = {
          lcpNumber,
          location: 'Unknown',
          gps_lat: null,
          gps_lng: null,
          ports: new Set(),
          splitters: {},
          onts: [],
          critical: 0,
          warning: 0,
          ok: 0,
          offline: 0,
          degrading: 0,
        };
      }

      const lcp = lcpMap[lcpNumber];
      if (!lcp.splitters[splitterNumber]) {
        lcp.splitters[splitterNumber] = {
          splitterNumber,
          ontCount: 0,
        };
      }

      lcp.splitters[splitterNumber].ontCount += 1;
      lcp.onts.push(ont);
      lcp.ports.add(`${ont._oltName}/${ont._port}`);

      // Count status — prioritize offline detection
      const status = ont._analysis?.status;
      if (status === 'offline') lcp.offline++;
      else if (status === 'critical') lcp.critical++;
      else if (status === 'warning') lcp.warning++;
      else if (!status || status === undefined || status === null) lcp.offline++;
      else lcp.ok++;

      // Check if degrading
      const rxPower = parseFloat(ont.OntRxOptPwr);
      if (!isNaN(rxPower) && rxPower < -25) {
        lcp.degrading++;
      }
    });

    // Convert to array and add computed properties, filter out LCPs with no ONTs
    return Object.values(lcpMap)
      .filter(lcp => lcp.onts.length > 0)
      .map(lcp => ({
        ...lcp,
        splitters: Object.values(lcp.splitters).map((splitter) => ({
          ...splitter,
          approxFibersLeft: Math.max(0, SPLITTER_CAPACITY - splitter.ontCount),
        })).sort((a, b) => String(a.splitterNumber).localeCompare(String(b.splitterNumber), undefined, { numeric: true })),
        portCount: lcp.ports.size,
        ontCount: lcp.onts.length,
        healthScore: lcp.ok / lcp.ontCount,
        issueRate: (lcp.critical + lcp.warning + lcp.offline) / lcp.ontCount,
        hasGPS: !!(lcp.gps_lat && lcp.gps_lng),
      }))
      .sort((a, b) => b.issueRate - a.issueRate);
  }, [result, lcpEntries]);

  const getTileStatus = (lcp) => {
    if (lcp.critical > 0) return 'critical';
    if (lcp.warning > 0) return 'warning';
    if (lcp.offline > 0) return 'offline';
    return 'healthy';
  };

  // Filter LCPs
  const filteredLCPs = useMemo(() => {
    const selectedStatuses = statusFilters.includes('all')
      ? ['critical', 'warning', 'healthy', 'offline']
      : statusFilters;

    return lcpData.filter((lcp) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        lcp.lcpNumber?.toLowerCase().includes(term) ||
        lcp.location?.toLowerCase().includes(term);
      const matchesStatus = selectedStatuses.includes(getTileStatus(lcp));
      return matchesSearch && matchesStatus;
    });
  }, [lcpData, searchTerm, statusFilters]);

  const getHealthColor = (lcp) => {
    if (lcp.critical > 0) return 'border-red-300 bg-red-50';
    if (lcp.warning > 0) return 'border-amber-300 bg-amber-50';
    if (lcp.offline > 0) return 'border-purple-300 bg-purple-50';
    return 'border-green-300 bg-green-50';
  };

  const getHealthIcon = (lcp) => {
    if (lcp.critical > 0) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (lcp.warning > 0) return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    if (lcp.offline > 0) return <AlertTriangle className="h-4 w-4 text-purple-600" />;
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  };

  const toggleStatusFilter = (value) => {
    if (value === 'all') {
      setStatusFilters(['all']);
      return;
    }

    const nextFilters = statusFilters.includes('all')
      ? [value]
      : statusFilters.includes(value)
        ? statusFilters.filter((status) => status !== value)
        : [...statusFilters, value];

    setStatusFilters(nextFilters.length === 0 ? ['all'] : nextFilters);
  };

  if (isLoading) {
    return (
      <Card className="border">
        <CardContent className="p-8 flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading LCP data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">LCP Overview</h3>
              <Badge variant="outline">{filteredLCPs.length} shown</Badge>
              <Badge variant="outline">{lcpData.length} total</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsExpanded((value) => !value)}>
              {isExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              {isExpanded ? 'Hide Tiles' : 'Show Tiles'}
            </Button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 max-w-xs relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search LCP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {['all', 'warning', 'critical', 'healthy', 'offline'].map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={statusFilters.includes(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                  />
                  <span className="capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {isExpanded && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLCPs.map((lcp, idx) => (
                  <Card 
                    key={idx} 
                    className={`border-2 cursor-pointer hover:shadow-lg transition-all ${getHealthColor(lcp)}`}
                    onClick={() => setSelectedLCP(lcp)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getHealthIcon(lcp)}
                          <span className="font-bold">{lcp.lcpNumber}</span>
                        </div>
                        {lcp.hasGPS && (
                          <Navigation className="h-3 w-3 text-blue-500" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs text-gray-600 truncate">
                        {lcp.location || 'No location info'}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">ONTs</span>
                        <span className="font-mono font-bold">{lcp.ontCount}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Ports</span>
                        <span className="font-mono">{lcp.portCount}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Splitters</span>
                        <span className="font-mono">{lcp.splitters.length}</span>
                      </div>

                      <div className="rounded-md border border-white/60 bg-white/70 p-2">
                        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">Splitter usage</div>
                        <div className="space-y-1">
                          {lcp.splitters.slice(0, 3).map((splitter) => (
                            <div key={splitter.splitterNumber} className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-gray-700">S{splitter.splitterNumber}</span>
                              <span className="font-mono text-gray-600">{splitter.ontCount} ONTs • ~{splitter.approxFibersLeft} left</span>
                            </div>
                          ))}
                          {lcp.splitters.length > 3 && (
                            <div className="text-[10px] text-gray-500">+{lcp.splitters.length - 3} more splitters</div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-wrap">
                        {lcp.ok > 0 && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px] px-1.5">
                            {lcp.ok} Healthy
                          </Badge>
                        )}
                        {lcp.critical > 0 && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] px-1.5">
                            {lcp.critical} Critical
                          </Badge>
                        )}
                        {lcp.warning > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5">
                            {lcp.warning} Warning
                          </Badge>
                        )}
                        {lcp.offline > 0 && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-300 text-[10px] px-1.5">
                            {lcp.offline} Offline
                          </Badge>
                        )}
                        {lcp.degrading > 0 && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] px-1.5">
                            <TrendingDown className="h-3 w-3 mr-0.5" />
                            {lcp.degrading}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredLCPs.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No LCPs found matching your filters</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* LCP Detail Dialog */}
      <Dialog open={!!selectedLCP} onOpenChange={() => setSelectedLCP(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              LCP {selectedLCP?.lcpNumber}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detailed LCP overview including location, ports, and health distribution.
            </DialogDescription>
          </DialogHeader>

          {selectedLCP && (
            <div className="space-y-4">
              {/* LCP Stats */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedLCP.ontCount}</div>
                    <div className="text-xs text-gray-500">Total ONTs</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedLCP.splitters.length}</div>
                    <div className="text-xs text-gray-500">Splitters</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedLCP.portCount}</div>
                    <div className="text-xs text-gray-500">PON Ports</div>
                  </CardContent>
                </Card>
                <Card className="border bg-green-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedLCP.ok}</div>
                    <div className="text-xs text-gray-500">Healthy</div>
                  </CardContent>
                </Card>
                <Card className="border bg-red-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedLCP.critical}</div>
                    <div className="text-xs text-gray-500">Critical</div>
                  </CardContent>
                </Card>
                <Card className="border bg-amber-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">{selectedLCP.warning}</div>
                    <div className="text-xs text-gray-500">Warning</div>
                  </CardContent>
                </Card>
                <Card className="border bg-gray-50">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-gray-600">{selectedLCP.offline}</div>
                    <div className="text-xs text-gray-500">Offline</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Splitter Utilization (32-way approx.)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedLCP.splitters.map((splitter, idx) => {
                      const color = SPLITTER_COLORS[idx % SPLITTER_COLORS.length];
                      return (
                        <div key={splitter.splitterNumber} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${color.bg} ${color.border}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                            <span className={`font-medium ${color.text}`}>Splitter {splitter.splitterNumber}</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-xs text-gray-600">
                            <span>{splitter.ontCount} ONTs</span>
                            <span>~{splitter.approxFibersLeft} fibers left</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Location Info */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">Location</div>
                      <div className="text-sm text-gray-600">
                        {selectedLCP.location || 'No location information available'}
                      </div>
                      {selectedLCP.hasGPS && (
                        <div className="text-xs text-gray-500 mt-1 font-mono">
                          {selectedLCP.gps_lat?.toFixed(6)}, {selectedLCP.gps_lng?.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subscribers at this LCP — color-coded by splitter */}
              {(() => {
                const subsAtLcp = selectedLCP.onts.filter(o => o._subscriber);
                if (subsAtLcp.length === 0) return null;

                // Build splitter index for color lookup
                const splitterColorMap = {};
                selectedLCP.splitters.forEach((s, idx) => {
                  splitterColorMap[s.splitterNumber] = SPLITTER_COLORS[idx % SPLITTER_COLORS.length];
                });

                // Group subscribers by splitter
                const bySplitter = {};
                subsAtLcp.forEach(ont => {
                  const spl = ont._splitterNumber || 'Unknown';
                  if (!bySplitter[spl]) bySplitter[spl] = [];
                  bySplitter[spl].push(ont);
                });

                // Sort splitter keys to match the order in selectedLCP.splitters
                const splitterOrder = selectedLCP.splitters.map(s => s.splitterNumber);
                const sortedKeys = Object.keys(bySplitter).sort((a, b) => {
                  const ai = splitterOrder.indexOf(a);
                  const bi = splitterOrder.indexOf(b);
                  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                });

                return (
                  <Card className="border border-indigo-200 bg-indigo-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Subscribers ({subsAtLcp.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-64 overflow-y-auto space-y-3">
                        {sortedKeys.map(splKey => {
                          const color = splitterColorMap[splKey] || { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', dot: 'bg-gray-500' };
                          const onts = bySplitter[splKey];
                          return (
                            <div key={splKey}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                                <span className={`text-xs font-semibold ${color.text}`}>Splitter {splKey}</span>
                                <span className="text-[10px] text-gray-400">({onts.length})</span>
                              </div>
                              <div className="space-y-1 ml-4">
                                {onts.map((ont, idx) => (
                                  <div key={idx} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded border ${color.bg} ${color.border}`}>
                                    <div className="flex-1 min-w-0">
                                      <span className={`font-medium truncate ${color.text}`}>{ont._subscriber.name || ont._subscriber.account || 'Unknown'}</span>
                                      {ont._subscriber.address && <span className="text-gray-500 ml-2 truncate">{ont._subscriber.address}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 shrink-0">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className={`inline-block w-2 h-2 rounded-full cursor-help ${
                                              ont._analysis?.status === 'ok' ? 'bg-green-500' :
                                              ont._analysis?.status === 'warning' ? 'bg-amber-500' :
                                              ont._analysis?.status === 'critical' ? 'bg-red-500' :
                                              ont._analysis?.status === 'offline' ? 'bg-gray-500' :
                                              'bg-gray-500'
                                            }`} />
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="text-xs">
                                            {ont._analysis?.status === 'ok' ? 'Healthy' :
                                             ont._analysis?.status === 'warning' ? 'Warning - Check signal levels' :
                                             ont._analysis?.status === 'critical' ? 'Critical - Immediate attention needed' :
                                             'Offline'}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <span className="font-mono text-gray-400">ONT {ont.OntID}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Ports Served */}
              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Ports Served ({selectedLCP.portCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedLCP.ports).map((port, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const [olt, portKey] = port.split('/');
                          if (onPortClick) {
                            onPortClick(olt, portKey);
                            setSelectedLCP(null);
                          }
                        }}
                      >
                        {port}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Health Distribution */}
              <Card className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Health Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Healthy</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${(selectedLCP.ok / selectedLCP.ontCount * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">{selectedLCP.ok}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Warning</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500" 
                            style={{ width: `${(selectedLCP.warning / selectedLCP.ontCount * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">{selectedLCP.warning}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Critical</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500" 
                            style={{ width: `${(selectedLCP.critical / selectedLCP.ontCount * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">{selectedLCP.critical}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Offline</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gray-500" 
                            style={{ width: `${(selectedLCP.offline / selectedLCP.ontCount * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono w-12 text-right">{selectedLCP.offline}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map — moved to bottom */}
              {selectedLCP.hasGPS && (
                <Card className="border overflow-hidden">
                  <div style={{ height: '300px', width: '100%' }}>
                    <MapContainer
                      center={[selectedLCP.gps_lat, selectedLCP.gps_lng]}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />
                      <Marker position={[selectedLCP.gps_lat, selectedLCP.gps_lng]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-bold">{selectedLCP.lcpNumber}</div>
                            <div className="text-xs text-gray-600">{selectedLCP.location}</div>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}