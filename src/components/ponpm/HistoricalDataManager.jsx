import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Database,
  Search,
  Trash2,
  Calendar,
  TrendingDown,
  TrendingUp,
  Minus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  History,
  FileText,
  Router,
  Activity,
  X,
  Eye,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';

export default function HistoricalDataManager({ 
  reports, 
  onReportDeleted,
  onReportSelected,
  onClose,
  isLoading 
}) {
  const [searchType, setSearchType] = useState('fsan');
  const [searchValue, setSearchValue] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedOnt, setSelectedOnt] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'search'

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error('Please enter a search value');
      return;
    }

    setIsSearching(true);
    setSearchResults(null);

    try {
      const response = await base44.functions.invoke('searchOntHistory', {
        search_type: searchType,
        search_value: searchValue.trim(),
        date_from: dateFrom || null,
        date_to: dateTo || null,
      });

      if (response.data?.success) {
        setSearchResults(response.data);
        if (response.data.results.length === 0) {
          toast.info('No matching records found');
        } else {
          toast.success(`Found ${response.data.unique_onts} ONT(s) with ${response.data.total_records} records`);
        }
      } else {
        toast.error(response.data?.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search history');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Delete this report and all associated ONT records? This cannot be undone.')) {
      return;
    }

    setDeletingReportId(reportId);

    try {
      const response = await base44.functions.invoke('deleteReportWithRecords', {
        report_id: reportId,
      });

      if (response.data?.success) {
        toast.success(response.data.message);
        onReportDeleted?.();
      } else {
        toast.error(response.data?.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeletingReportId(null);
    }
  };

  const getTrendIcon = (trend) => {
    if (!trend || trend.rx_change === null) return <Minus className="h-4 w-4 text-gray-400" />;
    if (trend.rx_change < -1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (trend.rx_change > 1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendBadge = (trend) => {
    if (!trend || trend.rx_change === null) return null;
    const change = trend.rx_change;
    if (change < -2) return <Badge className="bg-red-100 text-red-800">{change.toFixed(1)} dB</Badge>;
    if (change < -1) return <Badge className="bg-amber-100 text-amber-800">{change.toFixed(1)} dB</Badge>;
    if (change > 1) return <Badge className="bg-green-100 text-green-800">+{change.toFixed(1)} dB</Badge>;
    return <Badge variant="outline">{change >= 0 ? '+' : ''}{change.toFixed(1)} dB</Badge>;
  };

  // Chart data for selected ONT
  const chartData = selectedOnt?.history?.map(h => ({
    date: moment(h.date).format('MM/DD'),
    fullDate: moment(h.date).format('YYYY-MM-DD HH:mm'),
    'ONT Rx': h.ont_rx_power,
    'OLT Rx': h.olt_rx_power,
    'US BIP': h.us_bip_errors,
  })) || [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            Historical Data Manager
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reports' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText className="h-4 w-4 inline mr-1" />
            Saved Reports ({reports?.length || 0})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search' 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setActiveTab('search')}
          >
            <Search className="h-4 w-4 inline mr-1" />
            Search History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-3 py-4">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                  <p className="text-sm text-gray-500 mt-2">Loading reports...</p>
                </div>
              ) : reports?.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No saved reports yet.</p>
                  <p className="text-sm">Upload a PON PM CSV to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <Card key={report.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate text-gray-900 dark:text-white">{report.report_name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {moment(report.upload_date).format('MMM D, YYYY h:mm A')}
                              </span>
                              <span>•</span>
                              <span>{report.ont_count?.toLocaleString() || 0} ONTs</span>
                              <span>•</span>
                              <span>{report.olt_count || 0} OLTs</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="flex items-center gap-1">
                              {report.critical_count > 0 && (
                                <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5">
                                  {report.critical_count} crit
                                </Badge>
                              )}
                              {report.warning_count > 0 && (
                                <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5">
                                  {report.warning_count} warn
                                </Badge>
                              )}
                              {report.critical_count === 0 && report.warning_count === 0 && (
                                <Badge className="bg-green-100 text-green-800 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                            {onReportSelected && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8"
                                onClick={() => onReportSelected(report)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 h-8 w-8"
                              disabled={deletingReportId === report.id}
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              {deletingReportId === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {report.avg_ont_rx && (
                          <div className="mt-2 pt-2 border-t text-xs text-gray-600 dark:text-gray-400 flex gap-4">
                            <span>Avg Rx: <span className="font-mono">{report.avg_ont_rx?.toFixed(1)} dBm</span></span>
                            <span>Range: <span className="font-mono">{report.min_ont_rx?.toFixed(1)} ~ {report.max_ont_rx?.toFixed(1)}</span></span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4 py-4">
              {/* Search Form */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Search Type</Label>
                      <Select value={searchType} onValueChange={setSearchType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fsan">FSAN / Serial</SelectItem>
                          <SelectItem value="olt">OLT Name</SelectItem>
                          <SelectItem value="port">Shelf/Slot/Port</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Search Value</Label>
                      <Input
                        placeholder={
                          searchType === 'fsan' ? 'Enter FSAN or Serial Number...' :
                          searchType === 'olt' ? 'Enter OLT name...' :
                          'Enter Shelf/Slot/Port (e.g., 0/1/0)...'
                        }
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSearch} disabled={isSearching} className="w-full">
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Search
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <Label className="text-xs">From Date (optional)</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To Date (optional)</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results */}
              {searchResults && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">
                      Results: {searchResults.unique_onts} ONT(s), {searchResults.total_records} records
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setSearchResults(null)}>
                      Clear
                    </Button>
                  </div>

                  {searchResults.results.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>No matching records found</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100 dark:bg-gray-800">
                            <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Serial / FSAN</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">OLT / Port</TableHead>
                            <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Model</TableHead>
                            <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">Data Points</TableHead>
                            <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">Trend</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.results.map((ont, idx) => (
                            <TableRow 
                              key={idx} 
                              className={`cursor-pointer hover:bg-gray-50 ${selectedOnt?.serial_number === ont.serial_number ? 'bg-blue-50' : ''}`}
                              onClick={() => setSelectedOnt(ont)}
                            >
                              <TableCell className="font-mono text-sm">{ont.serial_number}</TableCell>
                              <TableCell className="text-sm">
                               <div className="text-gray-900 dark:text-white">{ont.olt_name}</div>
                               <div className="text-xs text-gray-600 dark:text-gray-400">{ont.shelf_slot_port}</div>
                              </TableCell>
                              <TableCell className="text-xs">{ont.model || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{ont.history.length}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {getTrendIcon(ont.trend)}
                                  {getTrendBadge(ont.trend)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">
                                  <Activity className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              {/* Selected ONT Detail */}
              {selectedOnt && (
                <Card className="border-2 border-blue-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        {selectedOnt.serial_number} - Performance History
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedOnt(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500 flex gap-3">
                      <span>{selectedOnt.olt_name} / {selectedOnt.shelf_slot_port}</span>
                      {selectedOnt.model && <span>• {selectedOnt.model}</span>}
                      {selectedOnt.lcp_number && <span className="text-blue-600">• LCP: {selectedOnt.lcp_number}</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Trend Summary */}
                    {selectedOnt.trend && (
                      <div className="flex gap-3 mb-4">
                        <Badge variant="outline" className="text-xs">
                          {selectedOnt.trend.data_points} data points
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {selectedOnt.trend.days_span} days span
                        </Badge>
                        {selectedOnt.trend.rx_change !== null && (
                          <Badge className={
                            selectedOnt.trend.rx_change < -2 ? 'bg-red-100 text-red-800' :
                            selectedOnt.trend.rx_change < -1 ? 'bg-amber-100 text-amber-800' :
                            selectedOnt.trend.rx_change > 1 ? 'bg-green-100 text-green-800' :
                            ''
                          }>
                            Rx Change: {selectedOnt.trend.rx_change >= 0 ? '+' : ''}{selectedOnt.trend.rx_change.toFixed(2)} dB
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Chart */}
                    {chartData.length > 0 && (
                      <div className="h-48 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis domain={[-35, -5]} tick={{ fontSize: 10 }} />
                            <Tooltip 
                              labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                            />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <ReferenceLine y={-27} stroke="red" strokeDasharray="5 5" />
                            <ReferenceLine y={-25} stroke="orange" strokeDasharray="5 5" />
                            <Line type="monotone" dataKey="ONT Rx" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="OLT Rx" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Data Table */}
                    <div className="max-h-40 overflow-y-auto border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs text-right">ONT Rx</TableHead>
                            <TableHead className="text-xs text-right">OLT Rx</TableHead>
                            <TableHead className="text-xs text-right">US BIP</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOnt.history.map((h, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs">{moment(h.date).format('MM/DD/YY HH:mm')}</TableCell>
                              <TableCell className="text-xs text-right font-mono">
                                <span className={
                                  h.ont_rx_power < -27 ? 'text-red-600 font-bold' :
                                  h.ont_rx_power < -25 ? 'text-amber-600' : ''
                                }>
                                  {h.ont_rx_power?.toFixed(1) || '-'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono">{h.olt_rx_power?.toFixed(1) || '-'}</TableCell>
                              <TableCell className="text-xs text-right font-mono">{h.us_bip_errors || 0}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${
                                  h.status === 'critical' ? 'bg-red-50 text-red-700' :
                                  h.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                                  'bg-green-50 text-green-700'
                                }`}>
                                  {h.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}