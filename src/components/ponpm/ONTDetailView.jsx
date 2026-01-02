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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  ArrowUpDown,
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

const STATUS_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
  offline: 'bg-purple-100 text-purple-800 border-purple-300',
};

export default function ONTDetailView({ ont, onClose }) {
  const [historicalData, setHistoricalData] = useState([]);
  const [jobReports, setJobReports] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHistoricalData();
    loadJobReports();
  }, [ont.SerialNumber]);

  const loadHistoricalData = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await base44.functions.invoke('searchOntHistory', {
        searchType: 'serial',
        searchValue: ont.SerialNumber
      });

      if (response.data?.results?.length > 0) {
        setHistoricalData(response.data.results[0].data_points || []);
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
      // Search for job reports that contain this ONT's serial number
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

  // Sort historical data
  const sortedHistory = [...historicalData].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case 'date':
        aVal = new Date(a.date);
        bVal = new Date(b.date);
        break;
      case 'ont_rx':
        aVal = a.ont_rx_power || -999;
        bVal = b.ont_rx_power || -999;
        break;
      case 'olt_rx':
        aVal = a.olt_rx_power || -999;
        bVal = b.olt_rx_power || -999;
        break;
      case 'bip':
        aVal = (a.us_bip_errors || 0) + (a.ds_bip_errors || 0);
        bVal = (b.us_bip_errors || 0) + (b.ds_bip_errors || 0);
        break;
      default:
        aVal = new Date(a.date);
        bVal = new Date(b.date);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Filter job reports
  const filteredJobReports = jobReports.filter(report =>
    !searchTerm || 
    report.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.technician_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chart data
  const chartData = historicalData.map(d => ({
    date: moment(d.date).format('MM/DD'),
    fullDate: moment(d.date).format('YYYY-MM-DD HH:mm'),
    'ONT Rx': d.ont_rx_power,
    'OLT Rx': d.olt_rx_power,
    'ONT Tx': d.ont_tx_power,
    'US BIP': d.us_bip_errors || 0,
    'DS BIP': d.ds_bip_errors || 0,
    'US FEC': d.us_fec_uncorrected || 0,
    'DS FEC': d.ds_fec_uncorrected || 0,
  })).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">
              History
              {historicalData.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">{historicalData.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs">
              Job Reports
              {jobReports.length > 0 && (
                <Badge variant="outline" className="ml-1 text-xs">{jobReports.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
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
                    <span className="text-gray-500">Model:</span>
                    <span className="font-medium">{ont.model || 'Unknown'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Physical Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {ont._lcpNumber ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">LCP:</span>
                        <span className="font-medium">{ont._lcpNumber}</span>
                      </div>
                      {ont._splitterNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Splitter:</span>
                          <span className="font-medium">{ont._splitterNumber}</span>
                        </div>
                      )}
                      {ont._lcpLocation && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location:</span>
                          <span className="font-medium text-right">{ont._lcpLocation}</span>
                        </div>
                      )}
                      {ont._lcpAddress && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Address:</span>
                          <span className="font-medium text-right text-xs">{ont._lcpAddress}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-400 text-xs">No LCP data available</div>
                  )}
                </CardContent>
              </Card>
            </div>

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
                    <div className="text-lg font-bold font-mono">{ont.UpstreamFecUncorrectedCodeWords || 0}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">DS FEC Uncorrected</div>
                    <div className="text-lg font-bold font-mono">{ont.DownstreamFecUncorrectedCodeWords || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
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
                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis yAxisId="power" domain={[-35, -5]} tick={{ fontSize: 10 }} label={{ value: 'Power (dBm)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                          <YAxis yAxisId="errors" orientation="right" tick={{ fontSize: 10 }} label={{ value: 'Errors', angle: 90, position: 'insideRight', fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <ReferenceLine yAxisId="power" y={-27} stroke="red" strokeDasharray="5 5" label={{ value: 'Critical', fontSize: 8 }} />
                          <ReferenceLine yAxisId="power" y={-25} stroke="orange" strokeDasharray="5 5" label={{ value: 'Warning', fontSize: 8 }} />
                          <Line yAxisId="power" type="monotone" dataKey="ONT Rx" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          <Line yAxisId="power" type="monotone" dataKey="OLT Rx" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          <Line yAxisId="errors" type="monotone" dataKey="US BIP" stroke="#f59e0b" strokeWidth={1} dot={{ r: 2 }} />
                          <Line yAxisId="errors" type="monotone" dataKey="DS BIP" stroke="#ef4444" strokeWidth={1} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Table with Sorting */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Historical Data Points</CardTitle>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Sort by Date</SelectItem>
                          <SelectItem value="ont_rx">Sort by ONT Rx</SelectItem>
                          <SelectItem value="olt_rx">Sort by OLT Rx</SelectItem>
                          <SelectItem value="bip">Sort by BIP Errors</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      </Button>
                    </div>
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
                          {sortedHistory.map((record, idx) => (
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
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search job reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoadingJobs ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-500">Loading job reports...</p>
              </div>
            ) : filteredJobReports.length === 0 ? (
              <Card className="border-2 border-gray-200 bg-gray-50">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {searchTerm ? 'No matching job reports' : 'No Job Reports'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {searchTerm 
                      ? 'Try adjusting your search terms'
                      : 'No job reports have been created for this ONT yet.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredJobReports.map((report, idx) => (
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