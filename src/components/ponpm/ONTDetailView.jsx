import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Activity,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Zap,
  Router,
  Wifi,
  Users,
  ChevronDown,
  ChevronRight,
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';
import EnhancedHistoryChart from './EnhancedHistoryChart';
import PeerComparisonChart from './PeerComparisonChart';

const STATUS_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
  offline: 'bg-purple-100 text-purple-800 border-purple-300',
};

export default function ONTDetailView({ ont, onClose, allOnts }) {
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [peerData, setPeerData] = useState({ onts: [], avgMetrics: null });
  const [peerSort, setPeerSort] = useState({ key: 'serial', direction: 'asc' });
  const [showPeerComparison, setShowPeerComparison] = useState(false);

  // History "Data Points" table — collapsed by default so the dialog opens
  // compactly. Archived section (rows beyond the chart cap) is also collapsed
  // by default and nested inside the main section once expanded.
  const [showHistoryTable, setShowHistoryTable] = useState(false);
  const [showArchivedHistory, setShowArchivedHistory] = useState(false);

  // Max history points used in the trend chart at the top. Roughly 3 months
  // of weekly snapshots — keeps the chart readable and bounded. Any older
  // points are still visible in the table below under the "Archived" group.
  const HISTORY_CHART_CAP = 90;

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      // Historical data
      setIsLoadingHistory(true);
      try {
        const response = await base44.functions.invoke('searchOntHistory', {
          search_type: 'serial',
          search_value: ont.SerialNumber
        });
        if (!cancelled && response.data?.results?.length > 0) {
          setHistoricalData(response.data.results[0].history || []);
        }
      } catch (error) {
        console.error('Failed to load historical data:', error);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }

      // Peer data (sync — no API call)
      if (!cancelled) loadPeerData();
    };

    loadAll();
    return () => { cancelled = true; };
  }, [ont.SerialNumber]);

  const loadPeerData = () => {
    if (!allOnts) return;
    
    // Find peers on same OLT/Port
    const peers = allOnts.filter(o => 
      o.SerialNumber !== ont.SerialNumber &&
      o._oltName === ont._oltName &&
      o._port === ont._port
    );

    if (peers.length > 0) {
      const avgRx = peers.reduce((sum, p) => sum + (parseFloat(p.OntRxOptPwr) || 0), 0) / peers.length;
      const avgOltRx = peers.reduce((sum, p) => sum + (parseFloat(p.OLTRXOptPwr) || 0), 0) / peers.length;
      const avgUsBip = peers.reduce((sum, p) => sum + (parseInt(p.UpstreamBipErrors) || 0), 0) / peers.length;
      const avgDsBip = peers.reduce((sum, p) => sum + (parseInt(p.DownstreamBipErrors) || 0), 0) / peers.length;
      
      setPeerData({
        onts: peers,
        avgMetrics: { avgRx, avgOltRx, avgUsBip, avgDsBip }
      });
    }
  };

  // loadHistoricalData and loadJobReports are now inlined in the useEffect above
  // with cancellation support to prevent stale writes on rapid ONT switching.

  const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const getComparisonRecord = () => {
    if (historicalData.length === 0) return null;

    const currentReportId = ont.report_id || ont.reportId || ont._reportId;

    for (let i = historicalData.length - 1; i >= 0; i -= 1) {
      const record = historicalData[i];
      const sameReport = currentReportId && record.report_id === currentReportId;
      const sameSnapshot =
        toNumber(record.ont_rx_power) === toNumber(ont.OntRxOptPwr) &&
        toNumber(record.olt_rx_power) === toNumber(ont.OLTRXOptPwr) &&
        toNumber(record.ont_tx_power) === toNumber(ont.OntTxPwr) &&
        toNumber(record.us_bip_errors) === toNumber(ont.UpstreamBipErrors) &&
        toNumber(record.ds_bip_errors) === toNumber(ont.DownstreamBipErrors) &&
        toNumber(record.us_fec_uncorrected) === toNumber(ont.UpstreamFecUncorrectedCodeWords) &&
        toNumber(record.ds_fec_uncorrected) === toNumber(ont.DownstreamFecUncorrectedCodeWords) &&
        toNumber(record.us_fec_corrected) === toNumber(ont.UpstreamFecCorrectedCodeWords) &&
        toNumber(record.ds_fec_corrected) === toNumber(ont.DownstreamFecCorrectedCodeWords) &&
        toNumber(record.us_gem_hec_errors) === toNumber(ont.UpstreamGemHecErrors) &&
        toNumber(record.us_missed_bursts) === toNumber(ont.UpstreamMissedBursts) &&
        record.status === ont._analysis?.status;

      if (!sameReport && !sameSnapshot) {
        return record;
      }
    }

    return null;
  };

  const getPeerSortValue = (row, key) => {
    switch (key) {
      case 'serial': return row.SerialNumber || '';
      case 'ontRx': return toNumber(row.OntRxOptPwr);
      case 'oltRx': return toNumber(row.OLTRXOptPwr);
      case 'usBip': return parseInt(row.UpstreamBipErrors, 10) || 0;
      case 'dsBip': return parseInt(row.DownstreamBipErrors, 10) || 0;
      case 'status': return row._analysis?.status || '';
      default: return '';
    }
  };

  const sortedPeerOnts = useMemo(() => {
    const direction = peerSort.direction === 'asc' ? 1 : -1;
    return [...peerData.onts].sort((a, b) => {
      const aVal = getPeerSortValue(a, peerSort.key);
      const bVal = getPeerSortValue(b, peerSort.key);

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * direction;
      return String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' }) * direction;
    });
  }, [peerData.onts, peerSort]);

  const handlePeerSort = (key) => {
    setPeerSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortablePeerHeader = ({ sortKey, children, className = '' }) => {
    const active = peerSort.key === sortKey;
    const Icon = !active ? ArrowUpDown : peerSort.direction === 'asc' ? ArrowUp : ArrowDown;

    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => handlePeerSort(sortKey)}
          className={`inline-flex items-center gap-1 hover:text-blue-700 ${className.includes('text-right') ? 'justify-end w-full' : ''}`}
        >
          {children}
          <Icon className="h-3 w-3" />
        </button>
      </TableHead>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Activity className="h-5 w-5 text-blue-500" />
            ONT Details: {ont.SerialNumber}
            <Badge className={STATUS_COLORS[ont._analysis.status]}>
              {ont._analysis.status.toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">Performance details for ONT {ont.SerialNumber}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">
              History
              {historicalData.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">{historicalData.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="peers">
              Peers
              {peerData.onts.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">{peerData.onts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="compare">
              Compare
            </TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">ONT Rx Power</div>
                    <div className={`text-lg font-bold font-mono ${
                      parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600' :
                      parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {ont.OntRxOptPwr || 'N/A'} dBm
                    </div>
                    {peerData.avgMetrics && (() => {
                      const delta = parseFloat(ont.OntRxOptPwr) - peerData.avgMetrics.avgRx;
                      if (isNaN(delta)) return null;
                      return (
                        <div className={`text-xs font-mono mt-0.5 ${delta < -2 ? 'text-red-600' : delta < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)} dB vs port avg ({peerData.avgMetrics.avgRx.toFixed(1)})
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">OLT Rx Power</div>
                    <div className="text-lg font-bold font-mono">
                      {ont.OLTRXOptPwr || 'N/A'} dBm
                    </div>
                    {peerData.avgMetrics && (() => {
                      const delta = parseFloat(ont.OLTRXOptPwr) - peerData.avgMetrics.avgOltRx;
                      if (isNaN(delta)) return null;
                      return (
                        <div className={`text-xs font-mono mt-0.5 ${delta < -2 ? 'text-red-600' : delta < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)} dB vs port avg ({peerData.avgMetrics.avgOltRx.toFixed(1)})
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">ONT Tx Power</div>
                    <div className="text-lg font-bold font-mono">
                      {ont.OntTxPwr || 'N/A'} dBm
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">ONT ID</div>
                    <div className="text-lg font-bold font-mono">
                      {ont.OntID || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Trends Summary */}
                {ont._trends && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Changes since {moment(ont._trends.previous_date).format('MMM D, YYYY')} ({ont._trends.days_since_last} days ago)
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {ont._trends.ont_rx_change !== null && ont._trends.ont_rx_change !== undefined && (
                        <div className={`p-2 rounded text-xs ${
                          ont._trends.ont_rx_change < -1 ? 'bg-red-50 text-red-700' :
                          ont._trends.ont_rx_change > 1 ? 'bg-green-50 text-green-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          <div className="font-medium">ONT Rx</div>
                          <div className="font-bold flex items-center gap-1">
                            {ont._trends.ont_rx_change < -0.1 ? <TrendingDown className="h-3 w-3" /> : ont._trends.ont_rx_change > 0.1 ? <TrendingUp className="h-3 w-3" /> : '→'}
                            {ont._trends.ont_rx_change > 0 ? '+' : ''}{ont._trends.ont_rx_change.toFixed(1)} dB
                          </div>
                        </div>
                      )}
                      {ont._trends.olt_rx_change !== null && ont._trends.olt_rx_change !== undefined && (
                        <div className={`p-2 rounded text-xs ${
                          ont._trends.olt_rx_change < -1 ? 'bg-red-50 text-red-700' :
                          ont._trends.olt_rx_change > 1 ? 'bg-green-50 text-green-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          <div className="font-medium">OLT Rx</div>
                          <div className="font-bold flex items-center gap-1">
                            {ont._trends.olt_rx_change < -0.1 ? <TrendingDown className="h-3 w-3" /> : ont._trends.olt_rx_change > 0.1 ? <TrendingUp className="h-3 w-3" /> : '→'}
                            {ont._trends.olt_rx_change > 0 ? '+' : ''}{ont._trends.olt_rx_change.toFixed(1)} dB
                          </div>
                        </div>
                      )}
                      {ont._trends.us_bip_change !== null && ont._trends.us_bip_change !== 0 && (
                        <div className={`p-2 rounded text-xs ${
                          ont._trends.us_bip_change > 100 ? 'bg-red-50 text-red-700' :
                          ont._trends.us_bip_change > 0 ? 'bg-amber-50 text-amber-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          <div className="font-medium">US BIP</div>
                          <div className="font-bold">{ont._trends.us_bip_change > 0 ? '+' : ''}{ont._trends.us_bip_change}</div>
                        </div>
                      )}
                      {ont._trends.ds_bip_change !== null && ont._trends.ds_bip_change !== 0 && (
                        <div className={`p-2 rounded text-xs ${
                          ont._trends.ds_bip_change > 100 ? 'bg-red-50 text-red-700' :
                          ont._trends.ds_bip_change > 0 ? 'bg-amber-50 text-amber-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          <div className="font-medium">DS BIP</div>
                          <div className="font-bold">{ont._trends.ds_bip_change > 0 ? '+' : ''}{ont._trends.ds_bip_change}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Router className="h-4 w-4" />
                    Network Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">OLT:</span>
                    <span className="font-mono font-medium">{ont._oltName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Port:</span>
                    <span className="font-mono font-medium">{ont._port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Technology:</span>
                    <Badge variant="outline">{ont._techType || 'GPON'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Model:</span>
                    <span className="font-medium">{ont.model || 'Unknown'}</span>
                  </div>
                  {peerData.onts.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500">
                        {peerData.onts.length} peer ONT{peerData.onts.length > 1 ? 's' : ''} on this port
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={ont._lcpNumber ? 'border-blue-200 bg-blue-50/30' : ''}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    LCP / Splitter Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {ont._lcpNumber ? (
                    <>
                      <div className="p-2 bg-white rounded border border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">LCP Number</span>
                          <span className="font-bold text-blue-700">{ont._lcpNumber}</span>
                        </div>
                      </div>
                      {ont._splitterNumber && (
                        <div className="p-2 bg-white rounded border border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Splitter</span>
                            <span className="font-bold text-blue-700">{ont._splitterNumber}</span>
                          </div>
                        </div>
                      )}
                      {ont._lcpLocation && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-gray-500 mb-1">Location</div>
                          <div className="font-medium">{ont._lcpLocation}</div>
                        </div>
                      )}
                      {ont._lcpAddress && (
                        <div className="text-xs text-gray-600">{ont._lcpAddress}</div>
                      )}
                      {ont._lcpGpsLat && ont._lcpGpsLng && (
                        <a 
                          href={`https://www.google.com/maps?q=${ont._lcpGpsLat},${ont._lcpGpsLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline pt-2"
                        >
                          <MapPin className="h-3 w-3" />
                          View on Map
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-gray-400 text-xs mb-1">No LCP data available</div>
                      <div className="text-xs text-gray-500">Import LCP data to see location details</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>


            {/* Subscriber Info */}
            {ont._subscriber && (
              <Card className="border-indigo-200 bg-indigo-50/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Subscriber / Customer Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {ont._subscriber.name && (
                      <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-medium">{ont._subscriber.name}</span></div>
                    )}
                    {ont._subscriber.account && (
                      <div className="flex justify-between"><span className="text-gray-500">Account:</span><span className="font-mono font-medium">{ont._subscriber.account}</span></div>
                    )}
                    {(ont._subscriber.streetAddress || ont._subscriber.address) && (
                      <div className="flex justify-between"><span className="text-gray-500">Address:</span><span className="font-medium">{ont._subscriber.streetAddress || ont._subscriber.address}</span></div>
                    )}
                    {(ont._subscriber.city || ont._subscriber.zip) && (
                      <div className="flex justify-between"><span className="text-gray-500">City/Zip:</span><span className="font-medium">{[ont._subscriber.city, ont._subscriber.state, ont._subscriber.zip].filter(Boolean).join(', ')}</span></div>
                    )}
                    {(ont._subscriber.model || ont.model) && (
                      <div className="flex justify-between"><span className="text-gray-500">ONT Model:</span><span className="font-medium">{ont._subscriber.model || ont.model}</span></div>
                    )}
                    {ont._subscriber.serialNo && !ont.SerialNumber && (
                      <div className="flex justify-between"><span className="text-gray-500">Serial (CSV):</span><span className="font-mono text-xs">{ont._subscriber.serialNo}</span></div>
                    )}
                    {ont._subscriber.softwareVersion && (
                      <div className="flex justify-between"><span className="text-gray-500">Software:</span><span className="font-mono text-xs">{ont._subscriber.softwareVersion}</span></div>
                    )}
                    {ont._subscriber.ontRanged && (
                      <div className="flex justify-between"><span className="text-gray-500">Ranged:</span><span className="font-medium">{ont._subscriber.ontRanged}</span></div>
                    )}
                  </div>

                  {/* eero info nested inside subscriber pane — only when matched */}
                  {ont._eero && (
                    <div className="mt-3 pt-3 border-t border-indigo-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Router className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Has eero</span>
                        <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-300">
                          matched
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                        {ont._eero.serial && (
                          <div className="flex justify-between"><span className="text-gray-500">Serial:</span><span className="font-mono font-medium">{ont._eero.serial}</span></div>
                        )}
                        {ont._eero.model && (
                          <div className="flex justify-between"><span className="text-gray-500">Model:</span><span className="font-medium">{ont._eero.model}</span></div>
                        )}
                        {ont._eero.network_created && (
                          <div className="flex justify-between"><span className="text-gray-500">Created:</span><span className="font-mono">{ont._eero.network_created}</span></div>
                        )}
                        {ont._eero.last_alive && (
                          <div className="flex justify-between"><span className="text-gray-500">Last alive:</span><span className="font-mono">{ont._eero.last_alive}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Issues & Warnings */}
            {(ont._analysis.issues.length > 0 || ont._analysis.warnings.length > 0) && (
              <Card className="border-2 border-red-300">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    Detected Issues
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ont._analysis.issues.map((issue, i) => (
                    <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-red-800">{issue.field}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold bg-white px-2 py-0.5 rounded">
                            {issue.value}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Threshold: {issue.threshold}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-red-700">{issue.message}</p>
                    </div>
                  ))}
                  {ont._analysis.warnings.map((warning, i) => (
                    <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-amber-800">{warning.field}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold bg-white px-2 py-0.5 rounded">
                            {warning.value}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Threshold: {warning.threshold}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-amber-700">{warning.message}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Error Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Error Metrics
                  {getComparisonRecord() && (
                    <span className="text-[10px] font-normal text-gray-400 ml-1">
                      Δ vs {moment(getComparisonRecord()?.date).format('MMM D, YYYY')}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const comparisonRecord = getComparisonRecord();
                  const delta = (currentVal, previousVal) => {
                    if (comparisonRecord === null || previousVal === undefined || previousVal === null) return null;
                    return (parseInt(currentVal, 10) || 0) - (parseInt(previousVal, 10) || 0);
                  };
                  const DeltaBadge = ({ value }) => {
                    if (value === null) return null;
                    if (value === 0) return <span className="text-[10px] text-gray-400 font-mono ml-1">Δ0</span>;
                    const color = value > 0 ? 'text-red-600' : 'text-green-600';
                    return <span className={`text-[10px] font-mono font-semibold ml-1 ${color}`}>Δ{value > 0 ? '+' : ''}{value.toLocaleString()}</span>;
                  };
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">US BIP Errors</div>
                        <div className="text-lg font-bold font-mono flex items-baseline">
                          {ont.UpstreamBipErrors || 0}
                          <DeltaBadge value={delta(ont.UpstreamBipErrors, comparisonRecord?.us_bip_errors)} />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">DS BIP Errors</div>
                        <div className="text-lg font-bold font-mono flex items-baseline">
                          {ont.DownstreamBipErrors || 0}
                          <DeltaBadge value={delta(ont.DownstreamBipErrors, comparisonRecord?.ds_bip_errors)} />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">US FEC Uncorrected</div>
                        <div className={`text-lg font-bold font-mono flex items-baseline ${parseInt(ont.UpstreamFecUncorrectedCodeWords) > 0 ? 'text-amber-600' : ''}`}>
                          {ont.UpstreamFecUncorrectedCodeWords || 0}
                          <DeltaBadge value={delta(ont.UpstreamFecUncorrectedCodeWords, comparisonRecord?.us_fec_uncorrected)} />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">DS FEC Uncorrected</div>
                        <div className={`text-lg font-bold font-mono flex items-baseline ${parseInt(ont.DownstreamFecUncorrectedCodeWords) > 0 ? 'text-amber-600' : ''}`}>
                          {ont.DownstreamFecUncorrectedCodeWords || 0}
                          <DeltaBadge value={delta(ont.DownstreamFecUncorrectedCodeWords, comparisonRecord?.ds_fec_uncorrected)} />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">US FEC Corrected</div>
                        <div className="text-lg font-bold font-mono flex items-baseline">
                          {ont.UpstreamFecCorrectedCodeWords || 0}
                          <DeltaBadge value={delta(ont.UpstreamFecCorrectedCodeWords, comparisonRecord?.us_fec_corrected)} />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">DS FEC Corrected</div>
                        <div className="text-lg font-bold font-mono flex items-baseline">
                          {ont.DownstreamFecCorrectedCodeWords || 0}
                          <DeltaBadge value={delta(ont.DownstreamFecCorrectedCodeWords, comparisonRecord?.ds_fec_corrected)} />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">Missed Bursts (US)</div>
                        <div className={`text-lg font-bold font-mono flex items-baseline ${parseInt(ont.UpstreamMissedBursts) >= 10 ? 'text-amber-600' : ''}`}>
                          {ont.UpstreamMissedBursts || 0}
                          <DeltaBadge value={delta(ont.UpstreamMissedBursts, comparisonRecord?.us_missed_bursts)} />
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">GEM HEC Errors (US)</div>
                        <div className={`text-lg font-bold font-mono flex items-baseline ${parseInt(ont.UpstreamGemHecErrors) >= 10 ? 'text-amber-600' : ''}`}>
                          {ont.UpstreamGemHecErrors || 0}
                          <DeltaBadge value={delta(ont.UpstreamGemHecErrors, comparisonRecord?.us_gem_hec_errors)} />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Peer Comparison Tab */}
          <TabsContent value="peers" className="space-y-4">
            {peerData.onts.length === 0 ? (
              <Card className="border-2 border-gray-200 bg-gray-50">
                <CardContent className="p-8 text-center">
                  <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">No Peer ONTs</h3>
                  <p className="text-sm text-gray-600">
                    This ONT is the only one on port {ont._port}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Comparison Summary */}
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="text-sm">Performance vs Peers on {ont._oltName} / {ont._port}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-white rounded-lg border">
                        <div className="text-xs text-gray-500 mb-1">ONT Rx Power</div>
                        <div className="flex items-baseline gap-2">
                          <div className={`text-lg font-bold font-mono ${
                            parseFloat(ont.OntRxOptPwr) < peerData.avgMetrics.avgRx - 2 ? 'text-red-600' :
                            parseFloat(ont.OntRxOptPwr) < peerData.avgMetrics.avgRx ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {ont.OntRxOptPwr}
                          </div>
                          <div className="text-xs text-gray-500">
                            vs {peerData.avgMetrics.avgRx.toFixed(1)} avg
                          </div>
                        </div>
                        <div className={`text-xs mt-1 ${
                          parseFloat(ont.OntRxOptPwr) < peerData.avgMetrics.avgRx ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {parseFloat(ont.OntRxOptPwr) > peerData.avgMetrics.avgRx ? '+' : ''}
                          {(parseFloat(ont.OntRxOptPwr) - peerData.avgMetrics.avgRx).toFixed(1)} dB
                        </div>
                      </div>
                      
                      <div className="p-3 bg-white rounded-lg border">
                        <div className="text-xs text-gray-500 mb-1">OLT Rx Power</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-lg font-bold font-mono">
                            {ont.OLTRXOptPwr}
                          </div>
                          <div className="text-xs text-gray-500">
                            vs {peerData.avgMetrics.avgOltRx.toFixed(1)} avg
                          </div>
                        </div>
                        <div className={`text-xs mt-1 ${
                          parseFloat(ont.OLTRXOptPwr) < peerData.avgMetrics.avgOltRx ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {parseFloat(ont.OLTRXOptPwr) > peerData.avgMetrics.avgOltRx ? '+' : ''}
                          {(parseFloat(ont.OLTRXOptPwr) - peerData.avgMetrics.avgOltRx).toFixed(1)} dB
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border">
                        <div className="text-xs text-gray-500 mb-1">US BIP Errors</div>
                        <div className="flex items-baseline gap-2">
                          <div className={`text-lg font-bold font-mono ${
                            parseInt(ont.UpstreamBipErrors) > peerData.avgMetrics.avgUsBip * 2 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {ont.UpstreamBipErrors || 0}
                          </div>
                          <div className="text-xs text-gray-500">
                            vs {peerData.avgMetrics.avgUsBip.toFixed(0)} avg
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border">
                        <div className="text-xs text-gray-500 mb-1">DS BIP Errors</div>
                        <div className="flex items-baseline gap-2">
                          <div className={`text-lg font-bold font-mono ${
                            parseInt(ont.DownstreamBipErrors) > peerData.avgMetrics.avgDsBip * 2 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {ont.DownstreamBipErrors || 0}
                          </div>
                          <div className="text-xs text-gray-500">
                            vs {peerData.avgMetrics.avgDsBip.toFixed(0)} avg
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Peer List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">All ONTs on This Port ({peerData.onts.length + 1} total)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 z-30 bg-white shadow-sm">
                          <TableRow>
                            <SortablePeerHeader sortKey="serial">Serial Number</SortablePeerHeader>
                            <SortablePeerHeader sortKey="ontRx" className="text-right">ONT Rx</SortablePeerHeader>
                            <SortablePeerHeader sortKey="oltRx" className="text-right">OLT Rx</SortablePeerHeader>
                            <SortablePeerHeader sortKey="usBip" className="text-right">US BIP</SortablePeerHeader>
                            <SortablePeerHeader sortKey="dsBip" className="text-right">DS BIP</SortablePeerHeader>
                            <SortablePeerHeader sortKey="status">Status</SortablePeerHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Current ONT */}
                          <TableRow className="sticky top-10 z-20 bg-blue-50 border-l-4 border-blue-500 shadow-sm">
                            <TableCell className="font-bold">{ont.SerialNumber} (This ONT)</TableCell>
                            <TableCell className="text-right font-mono">{ont.OntRxOptPwr}</TableCell>
                            <TableCell className="text-right font-mono">{ont.OLTRXOptPwr}</TableCell>
                            <TableCell className="text-right font-mono">{ont.UpstreamBipErrors || 0}</TableCell>
                            <TableCell className="text-right font-mono">{ont.DownstreamBipErrors || 0}</TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[ont._analysis.status]}>
                                {ont._analysis.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {/* Peer ONTs */}
                          {sortedPeerOnts.map((peer, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{peer.SerialNumber}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{peer.OntRxOptPwr}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{peer.OLTRXOptPwr}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{peer.UpstreamBipErrors || 0}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{peer.DownstreamBipErrors || 0}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[peer._analysis.status]}`}>
                                  {peer._analysis.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* History Tab with Enhanced Chart */}
          <TabsContent value="history" className="space-y-4">
            {isLoadingHistory ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-500">Loading historical data...</p>
              </div>
            ) : historicalData.length === 0 ? (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">No Historical Data</h3>
                  <p className="text-sm text-gray-600">
                    This ONT has only appeared in one report. Historical trends will appear when the ONT is present in multiple reports.
                  </p>
                </CardContent>
              </Card>
            ) : (() => {
              // historicalData is ordered oldest → newest (see getComparisonRecord
              // which walks from the end backwards). The chart should only render
              // the most recent HISTORY_CHART_CAP points; older points are still
              // shown in the table below under an "Archived" subsection.
              const recent = historicalData.length > HISTORY_CHART_CAP
                ? historicalData.slice(-HISTORY_CHART_CAP)
                : historicalData;
              const archived = historicalData.length > HISTORY_CHART_CAP
                ? historicalData.slice(0, historicalData.length - HISTORY_CHART_CAP)
                : [];

              // Reusable row renderer keeps the recent/archived bodies in sync.
              const renderRow = (record, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs">{moment(record.date).format('MM/DD/YY HH:mm')}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{record.ont_rx_power?.toFixed(1) || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{record.olt_rx_power?.toFixed(1) || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{record.ont_tx_power?.toFixed(1) || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{record.us_bip_errors || 0}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{record.ds_bip_errors || 0}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{record.us_fec_uncorrected || 0}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{record.ds_fec_uncorrected || 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[record.status] || ''}`}>
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );

              const tableHead = (
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">ONT Rx</TableHead>
                    <TableHead className="text-right">OLT Rx</TableHead>
                    <TableHead className="text-right">ONT Tx</TableHead>
                    <TableHead className="text-right">US BIP</TableHead>
                    <TableHead className="text-right">DS BIP</TableHead>
                    <TableHead className="text-right">US FEC</TableHead>
                    <TableHead className="text-right">DS FEC</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
              );

              return (
                <>
                  {/* Chart — capped to most recent 90 points */}
                  <EnhancedHistoryChart
                    historicalData={recent}
                    title={`${ont.SerialNumber} - Performance Trends`}
                    serialNumber={ont.SerialNumber}
                  />
                  {archived.length > 0 && (
                    <p className="text-xs text-gray-500 -mt-2 px-1">
                      Showing the most recent {recent.length} of {historicalData.length} data points in the chart.
                      Older points are available under <span className="font-medium">Archived</span> below.
                    </p>
                  )}

                  {/* Collapsible Data Table */}
                  <Card>
                    <button
                      type="button"
                      onClick={() => setShowHistoryTable(v => !v)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-t-lg"
                      aria-expanded={showHistoryTable}
                    >
                      <span className="text-sm font-semibold flex items-center gap-2">
                        {showHistoryTable ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        Historical Data Points
                        <Badge variant="outline" className="ml-1 text-xs">{historicalData.length}</Badge>
                      </span>
                      <span className="text-xs text-gray-500">
                        {showHistoryTable ? 'Hide' : 'Show'}
                      </span>
                    </button>
                    {showHistoryTable && (
                      <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            {tableHead}
                            <TableBody>
                              {/* Recent points first (newest at bottom — matches array order) */}
                              {recent.map(renderRow)}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Archived (older than the chart cap) — nested collapsible */}
                        {archived.length > 0 && (
                          <div className="mt-4 border-t pt-3">
                            <button
                              type="button"
                              onClick={() => setShowArchivedHistory(v => !v)}
                              className="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-2 py-2"
                              aria-expanded={showArchivedHistory}
                            >
                              <span className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                {showArchivedHistory ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Archive className="h-4 w-4" />
                                Archived (older than last {HISTORY_CHART_CAP} points)
                                <Badge variant="outline" className="ml-1 text-xs">{archived.length}</Badge>
                              </span>
                              <span className="text-xs text-gray-500">
                                {showArchivedHistory ? 'Hide' : 'Show'}
                              </span>
                            </button>
                            {showArchivedHistory && (
                              <div className="max-h-96 overflow-y-auto mt-2">
                                <Table>
                                  {tableHead}
                                  <TableBody>
                                    {archived.map(renderRow)}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* Interactive Comparison Tab */}
          <TabsContent value="compare" className="space-y-4">
            <PeerComparisonChart currentOnt={ont} peers={peerData.onts} />
          </TabsContent>

          {/* Raw Data Tab */}
          <TabsContent value="raw" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Complete ONT Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(ont, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}