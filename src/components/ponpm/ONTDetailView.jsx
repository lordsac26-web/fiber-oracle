import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  FileText,
  Calendar,
  MapPin,
  Zap,
  Router,
  Wifi,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';
import EnhancedHistoryChart from './EnhancedHistoryChart';

const STATUS_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
  offline: 'bg-purple-100 text-purple-800 border-purple-300',
};

export default function ONTDetailView({ ont, onClose, allOnts }) {
  const [historicalData, setHistoricalData] = useState([]);
  const [jobReports, setJobReports] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [peerData, setPeerData] = useState({ onts: [], avgMetrics: null });
  const [showPeerComparison, setShowPeerComparison] = useState(false);

  useEffect(() => {
    loadHistoricalData();
    loadJobReports();
    loadPeerData();
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

  const loadHistoricalData = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await base44.functions.invoke('searchOntHistory', {
        search_type: 'serial',
        search_value: ont.SerialNumber
      });

      if (response.data?.results?.length > 0) {
        setHistoricalData(response.data.results[0].history || []);
      }
    } catch (error) {
      console.error('Failed to load historical data:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadJobReports = async () => {
    setIsLoadingJobs(true);
    try {
      const reports = await base44.entities.JobReport.list('-created_date');
      const relatedReports = reports.filter(report => 
        report.fiber_info?.fsan === ont.SerialNumber ||
        report.notes?.includes(ont.SerialNumber)
      );
      setJobReports(relatedReports);
    } catch (error) {
      console.error('Failed to load job reports:', error);
    } finally {
      setIsLoadingJobs(false);
    }
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
            <TabsTrigger value="jobs">
              Jobs
              {jobReports.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">{jobReports.length}</Badge>
              )}
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
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">OLT Rx Power</div>
                    <div className="text-lg font-bold font-mono">
                      {ont.OLTRXOptPwr || 'N/A'} dBm
                    </div>
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

            {/* Anomaly Detection */}
            {historicalData.length >= 3 && (
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-purple-600" />
                    Detected Anomalies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const recentData = historicalData.slice(-10);
                    const anomalies = [];
                    
                    // Check for degrading Rx power
                    const rxTrend = recentData.slice(-3).map(d => d.ont_rx_power);
                    if (rxTrend.every((v, i, arr) => i === 0 || v < arr[i - 1])) {
                      anomalies.push({
                        type: 'Degrading Rx Power',
                        severity: 'warning',
                        message: 'ONT Rx power has been consistently decreasing'
                      });
                    }
                    
                    // Check for error spikes
                    const avgBip = recentData.reduce((sum, d) => sum + (d.us_bip_errors || 0) + (d.ds_bip_errors || 0), 0) / recentData.length;
                    const latestBip = (recentData[recentData.length - 1]?.us_bip_errors || 0) + (recentData[recentData.length - 1]?.ds_bip_errors || 0);
                    if (latestBip > avgBip * 3 && latestBip > 100) {
                      anomalies.push({
                        type: 'Error Spike',
                        severity: 'critical',
                        message: `Current error count (${latestBip}) is 3x higher than average (${avgBip.toFixed(0)})`
                      });
                    }
                    
                    // Check for power instability
                    const rxStdDev = Math.sqrt(recentData.reduce((sum, d) => {
                      const diff = d.ont_rx_power - (recentData.reduce((s, r) => s + r.ont_rx_power, 0) / recentData.length);
                      return sum + diff * diff;
                    }, 0) / recentData.length);
                    
                    if (rxStdDev > 2) {
                      anomalies.push({
                        type: 'Power Instability',
                        severity: 'warning',
                        message: `High variance in Rx power (σ = ${rxStdDev.toFixed(2)} dB)`
                      });
                    }
                    
                    return anomalies.length > 0 ? (
                      <div className="space-y-2">
                        {anomalies.map((anomaly, i) => (
                          <div key={i} className={`p-3 rounded-lg border ${
                            anomaly.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-semibold ${
                                anomaly.severity === 'critical' ? 'text-red-800' : 'text-amber-800'
                              }`}>
                                {anomaly.type}
                              </span>
                              <Badge variant="outline" className={
                                anomaly.severity === 'critical' ? 'border-red-400 text-red-700' : 'border-amber-400 text-amber-700'
                              }>
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <p className={`text-xs ${
                              anomaly.severity === 'critical' ? 'text-red-700' : 'text-amber-700'
                            }`}>
                              {anomaly.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-sm text-gray-600">
                        No anomalies detected in recent data
                      </div>
                    );
                  })()}
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">US BIP Errors</div>
                    <div className="text-lg font-bold font-mono">{ont.UpstreamBipErrors || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">DS BIP Errors</div>
                    <div className="text-lg font-bold font-mono">{ont.DownstreamBipErrors || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">US FEC Uncorrected</div>
                    <div className={`text-lg font-bold font-mono ${parseInt(ont.UpstreamFecUncorrectedCodeWords) > 0 ? 'text-amber-600' : ''}`}>{ont.UpstreamFecUncorrectedCodeWords || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">DS FEC Uncorrected</div>
                    <div className={`text-lg font-bold font-mono ${parseInt(ont.DownstreamFecUncorrectedCodeWords) > 0 ? 'text-amber-600' : ''}`}>{ont.DownstreamFecUncorrectedCodeWords || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">US FEC Corrected</div>
                    <div className="text-lg font-bold font-mono">{ont.UpstreamFecCorrectedCodeWords || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">DS FEC Corrected</div>
                    <div className="text-lg font-bold font-mono">{ont.DownstreamFecCorrectedCodeWords || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">Missed Bursts (US)</div>
                    <div className={`text-lg font-bold font-mono ${parseInt(ont.UpstreamMissedBursts) >= 10 ? 'text-amber-600' : ''}`}>{ont.UpstreamMissedBursts || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">GEM HEC Errors (US)</div>
                    <div className={`text-lg font-bold font-mono ${parseInt(ont.UpstreamGemHecErrors) >= 10 ? 'text-amber-600' : ''}`}>{ont.UpstreamGemHecErrors || 0}</div>
                  </div>
                </div>
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
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serial Number</TableHead>
                            <TableHead className="text-right">ONT Rx</TableHead>
                            <TableHead className="text-right">OLT Rx</TableHead>
                            <TableHead className="text-right">US BIP</TableHead>
                            <TableHead className="text-right">DS BIP</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Current ONT */}
                          <TableRow className="bg-blue-50 border-l-4 border-blue-500">
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
                          {peerData.onts.map((peer, idx) => (
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
            ) : (
              <>
                {/* Date Range Filter */}
                <DateRangeFilter 
                  onRangeChange={setDateRange}
                  availableDates={historicalData.map(d => d.date)}
                />

                {/* Enhanced Chart */}
                <EnhancedHistoryChart
                  historicalData={historicalData}
                  title={`${ont.SerialNumber} - Performance Trends`}
                  serialNumber={ont.SerialNumber}
                />

                {/* Data Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Historical Data Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
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
                        <TableBody>
                          {historicalData
                            .filter(d => {
                              const dateStr = moment(d.date).format('YYYY-MM-DD');
                              if (dateRange.start && dateStr < dateRange.start) return false;
                              if (dateRange.end && dateStr > dateRange.end) return false;
                              return true;
                            })
                            .map((record, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">{moment(record.date).format('MM/DD/YY HH:mm')}</TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {record.ont_rx_power?.toFixed(1) || '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {record.olt_rx_power?.toFixed(1) || '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {record.ont_tx_power?.toFixed(1) || '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {record.us_bip_errors || 0}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {record.ds_bip_errors || 0}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {record.us_fec_uncorrected || 0}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {record.ds_fec_uncorrected || 0}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[record.status] || ''}`}>
                                  {record.status}
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

          {/* Job Reports Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {isLoadingJobs ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-500">Loading job reports...</p>
              </div>
            ) : jobReports.length === 0 ? (
              <Card className="border-2 border-gray-200 bg-gray-50">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">No Job Reports</h3>
                  <p className="text-sm text-gray-600">
                    No job reports have been created for this ONT yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {jobReports.map((report, idx) => (
                  <Card key={idx} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm">Job #{report.job_number}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {moment(report.created_date).format('MMM D, YYYY')}
                            {report.technician_name && (
                              <span>• Tech: {report.technician_name}</span>
                            )}
                          </div>
                        </div>
                        <Badge className={STATUS_COLORS[report.status] || 'bg-gray-100'}>
                          {report.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      {report.start_power_level && (
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="text-gray-500">Power:</span>
                          <span className="font-mono">{report.start_power_level} dBm</span>
                          {report.end_power_level && (
                            <>
                              <span>→</span>
                              <span className="font-mono font-bold">{report.end_power_level} dBm</span>
                              <Badge className="bg-green-100 text-green-800">
                                {report.end_power_level - report.start_power_level > 0 ? '+' : ''}
                                {(report.end_power_level - report.start_power_level).toFixed(1)} dB
                              </Badge>
                            </>
                          )}
                        </div>
                      )}
                      {report.notes && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{report.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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