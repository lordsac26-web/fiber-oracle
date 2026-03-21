import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function LCPSummarySection({ result, onPortClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLCP, setSelectedLCP] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusFilters, setStatusFilters] = useState(['all']);

  // Fetch LCP entries from database
  const { data: lcpEntries = [], isLoading } = useQuery({
    queryKey: ['lcp-entries'],
    queryFn: async () => {
      const entries = await base44.entities.LCPEntry.list();
      return entries;
    },
  });

  // Aggregate LCP data from ONTs and match with LCP database
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
          onts: [],
          critical: 0,
          warning: 0,
          ok: 0,
          offline: 0,
          degrading: 0,
        };
      }
    });

    // Then, aggregate ONT data
    // Live-parsed ONTs use _lcpNumber (underscore prefix); saved records use lcp_number
    result.onts.forEach(ont => {
      const lcpNumber = ont._lcpNumber || ont.lcp_number;
      if (!lcpNumber) return;

      // Create entry if not found in database (for LCPs not yet in database)
      if (!lcpMap[lcpNumber]) {
        lcpMap[lcpNumber] = {
          lcpNumber,
          location: 'Unknown',
          gps_lat: null,
          gps_lng: null,
          ports: new Set(),
          onts: [],
          critical: 0,
          warning: 0,
          ok: 0,
          offline: 0,
          degrading: 0,
        };
      }

      const lcp = lcpMap[lcpNumber];
      lcp.onts.push(ont);
      lcp.ports.add(`${ont._oltName}/${ont._port}`);

      // Count status
      const status = ont._analysis?.status;
      if (status === 'critical') lcp.critical++;
      else if (status === 'warning') lcp.warning++;
      else if (status === 'offline') lcp.offline++;
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

                      <div className="flex gap-1 flex-wrap">
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
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] px-1.5">
                            {lcp.offline} Offline
                          </Badge>
                        )}
                        {lcp.degrading > 0 && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] px-1.5">
                            <TrendingDown className="h-3 w-3 mr-0.5" />
                            {lcp.degrading}
                          </Badge>
                        )}
                        {getTileStatus(lcp) === 'healthy' && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">
                            Healthy
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
          </DialogHeader>

          {selectedLCP && (
            <div className="space-y-4">
              {/* LCP Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedLCP.ontCount}</div>
                    <div className="text-xs text-gray-500">Total ONTs</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedLCP.portCount}</div>
                    <div className="text-xs text-gray-500">PON Ports</div>
                  </CardContent>
                </Card>
                <Card className={`border ${
                  selectedLCP.critical > 0 ? 'bg-red-50' : 
                  selectedLCP.warning > 0 ? 'bg-amber-50' : 'bg-green-50'
                }`}>
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
              </div>

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

              {/* Map */}
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
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}