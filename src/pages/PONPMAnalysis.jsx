import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ArrowLeft, 
  Upload, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
  Search,
  Download,
  FileSpreadsheet,
  Router,
  Loader2,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STATUS_COLORS = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  ok: 'bg-green-500',
  info: 'bg-blue-500',
};

const STATUS_BADGES = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
};

export default function PONPMAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [oltFilter, setOltFilter] = useState('all');
  const [portFilter, setPortFilter] = useState('all');
  const [expandedOlts, setExpandedOlts] = useState([]);
  const [expandedPorts, setExpandedPorts] = useState([]);
  const [issueDetailView, setIssueDetailView] = useState(null); // { type: 'critical'|'warning', oltName?, portKey? }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    toast.loading('Parsing PON PM data...', { id: 'pon-parse' });

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Parse the file
      const response = await base44.functions.invoke('parsePonPm', { file_url });

      if (response.data?.success) {
        setResult(response.data);
        // Start collapsed
        setExpandedOlts([]);
        setExpandedPorts([]);
        toast.success(`Parsed ${response.data.summary.totalOnts} ONTs successfully`, { id: 'pon-parse' });
      } else {
        toast.error(response.data?.error || 'Failed to parse file', { id: 'pon-parse' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process file', { id: 'pon-parse' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOlt = (oltName) => {
    setExpandedOlts(prev => 
      prev.includes(oltName) 
        ? prev.filter(o => o !== oltName)
        : [...prev, oltName]
    );
  };

  const togglePort = (portKey) => {
    setExpandedPorts(prev => 
      prev.includes(portKey) 
        ? prev.filter(p => p !== portKey)
        : [...prev, portKey]
    );
  };

  const filteredOnts = result?.onts?.filter(ont => {
    const matchesSearch = !searchTerm || 
      ont.SerialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ont.OntID?.toString().includes(searchTerm) ||
      ont['Shelf/Slot/Port']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ont.OLTName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ont._analysis.status === statusFilter;
    const matchesOlt = oltFilter === 'all' || ont._oltName === oltFilter;
    const matchesPort = portFilter === 'all' || ont._port === portFilter;

    return matchesSearch && matchesStatus && matchesOlt && matchesPort;
  }) || [];

  const exportCSV = () => {
    if (!result?.onts) return;

    const headers = [
      'Status', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model',
      'OntRxOptPwr', 'OntTxPwr', 'OLTRXOptPwr',
      'UpstreamBipErrors', 'DownstreamBipErrors',
      'UpstreamFecUncorrected', 'DownstreamFecUncorrected',
      'Issues'
    ];

    const rows = filteredOnts.map(ont => [
      ont._analysis.status,
      ont['Shelf/Slot/Port'],
      ont.OntID,
      ont.SerialNumber,
      ont.model,
      ont.OntRxOptPwr,
      ont.OntTxPwr,
      ont.OLTRXOptPwr,
      ont.UpstreamBipErrors,
      ont.DownstreamBipErrors,
      ont.UpstreamFecUncorrectedCodeWords,
      ont.DownstreamFecUncorrectedCodeWords,
      [...ont._analysis.issues, ...ont._analysis.warnings].map(i => i.message).join('; ')
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pon-pm-analysis-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported analysis results');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">PON PM Analysis</h1>
                <p className="text-xs text-gray-500">SMx Performance Monitoring Parser</p>
              </div>
            </div>
            {result && (
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Section */}
        {!result && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl">
                  <FileSpreadsheet className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Upload PON PM Export
                  </h2>
                  <p className="text-gray-500 mt-2 max-w-lg mx-auto">
                    Upload a CSV export from your SMx PON Performance Monitoring system. 
                    The tool will automatically parse and analyze all ONT data for power levels and error rates.
                  </p>
                </div>

                <div className="max-w-md mx-auto">
                  <label className="block">
                    <div className={`border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer ${
                      isLoading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}>
                      {isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                          <span className="text-sm text-gray-600">Processing...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Upload className="h-10 w-10 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Click to upload or drag and drop
                          </span>
                          <span className="text-xs text-gray-400">CSV files only</span>
                        </div>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      disabled={isLoading}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
                  <Card className="border bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold flex items-center gap-2 mb-2 text-cyan-800 dark:text-cyan-200">
                        <Activity className="h-4 w-4" />
                        What It Analyzes
                      </h3>
                      <ul className="text-sm text-cyan-700 dark:text-cyan-300 space-y-1">
                        <li>• ONT & OLT optical power levels</li>
                        <li>• Upstream/downstream BIP errors</li>
                        <li>• FEC corrected & uncorrected</li>
                        <li>• Missed bursts & GEM HEC errors</li>
                        <li>• BER rates (Us/Ds)</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border bg-purple-50 dark:bg-purple-900/20 border-purple-200">
                    <CardContent className="p-4">
                      <h3 className="font-semibold flex items-center gap-2 mb-2 text-purple-800 dark:text-purple-200">
                        <Zap className="h-4 w-4" />
                        Peer Comparison
                      </h3>
                      <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                        <li>• Groups ONTs by Shelf/Slot/Port</li>
                        <li>• Calculates segment averages</li>
                        <li>• Identifies outliers</li>
                        <li>• Flags ONTs below peer average</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {result.summary.totalOnts}
                  </div>
                  <div className="text-xs text-gray-500">Total ONTs</div>
                </CardContent>
              </Card>
              <Card 
                className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-red-300 ${issueDetailView?.type === 'critical' && !issueDetailView?.oltName ? 'ring-2 ring-red-500' : ''}`}
                onClick={() => setIssueDetailView(issueDetailView?.type === 'critical' && !issueDetailView?.oltName ? null : { type: 'critical' })}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {result.summary.criticalCount}
                  </div>
                  <div className="text-xs text-gray-500">Critical Issues</div>
                </CardContent>
              </Card>
              <Card 
                className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-amber-300 ${issueDetailView?.type === 'warning' && !issueDetailView?.oltName ? 'ring-2 ring-amber-500' : ''}`}
                onClick={() => setIssueDetailView(issueDetailView?.type === 'warning' && !issueDetailView?.oltName ? null : { type: 'warning' })}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {result.summary.warningCount}
                  </div>
                  <div className="text-xs text-gray-500">Warnings</div>
                </CardContent>
              </Card>
              <Card 
                className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-green-300 ${statusFilter === 'ok' ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => { setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok'); setIssueDetailView(null); }}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.summary.okCount}
                  </div>
                  <div className="text-xs text-gray-500">Healthy</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.summary.oltCount}
                  </div>
                  <div className="text-xs text-gray-500">OLTs</div>
                </CardContent>
              </Card>
            </div>

            {/* Issue Detail Panel */}
            {issueDetailView && (
              <Card className={`border-2 ${issueDetailView.type === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`flex items-center gap-2 ${issueDetailView.type === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
                      {issueDetailView.type === 'critical' ? <AlertCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      {issueDetailView.type === 'critical' ? 'Critical Issues' : 'Warnings'}
                      {issueDetailView.oltName && <span className="text-sm font-normal">— {issueDetailView.oltName}</span>}
                      {issueDetailView.portKey && <span className="text-sm font-normal">/ {issueDetailView.portKey}</span>}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setIssueDetailView(null)}>
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {result.onts
                      .filter(ont => {
                        const matchesType = issueDetailView.type === 'critical' 
                          ? ont._analysis.issues.length > 0 
                          : ont._analysis.warnings.length > 0;
                        const matchesOlt = !issueDetailView.oltName || ont._oltName === issueDetailView.oltName;
                        const matchesPort = !issueDetailView.portKey || ont._port === issueDetailView.portKey;
                        return matchesType && matchesOlt && matchesPort;
                      })
                      .map((ont, idx) => {
                        const issues = issueDetailView.type === 'critical' ? ont._analysis.issues : ont._analysis.warnings;
                        return (
                          <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold text-sm">
                                <span className="text-gray-500">{ont._oltName} / {ont._port} /</span> ONT {ont.OntID}
                              </div>
                              <span className="font-mono text-xs text-gray-500">{ont.SerialNumber}</span>
                            </div>
                            <div className="space-y-1">
                              {issues.map((issue, i) => (
                                <div key={i} className={`text-sm p-2 rounded ${issueDetailView.type === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{issue.field}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs bg-white/70 px-1.5 py-0.5 rounded font-bold">
                                        {issue.value}
                                      </span>
                                      {issue.threshold && (
                                        <span className="font-mono text-xs text-gray-600 bg-white/50 px-1.5 py-0.5 rounded">
                                          Threshold: {issue.threshold}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs opacity-80">{issue.message}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    }
                    {result.onts.filter(ont => {
                      const matchesType = issueDetailView.type === 'critical' 
                        ? ont._analysis.issues.length > 0 
                        : ont._analysis.warnings.length > 0;
                      const matchesOlt = !issueDetailView.oltName || ont._oltName === issueDetailView.oltName;
                      const matchesPort = !issueDetailView.portKey || ont._port === issueDetailView.portKey;
                      return matchesType && matchesOlt && matchesPort;
                    }).length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No {issueDetailView.type === 'critical' ? 'critical issues' : 'warnings'} found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Health Overview */}
            <Card className="border-0 shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Network Health</span>
                  <span className="text-sm text-gray-500">
                    {((result.summary.okCount / result.summary.totalOnts) * 100).toFixed(1)}% healthy
                  </span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                  <div 
                    className="bg-green-500 transition-all" 
                    style={{ width: `${(result.summary.okCount / result.summary.totalOnts) * 100}%` }}
                  />
                  <div 
                    className="bg-amber-500 transition-all" 
                    style={{ width: `${(result.summary.warningCount / result.summary.totalOnts) * 100}%` }}
                  />
                  <div 
                    className="bg-red-500 transition-all" 
                    style={{ width: `${(result.summary.criticalCount / result.summary.totalOnts) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="border-0 shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by Serial, ONT ID, or Port..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="ok">OK</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={oltFilter} onValueChange={(v) => { setOltFilter(v); setPortFilter('all'); }}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="OLT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All OLTs</SelectItem>
                      {Object.keys(result.olts).sort().map(olt => (
                        <SelectItem key={olt} value={olt}>{olt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={portFilter} onValueChange={setPortFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Port" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ports</SelectItem>
                      {oltFilter !== 'all' && result.olts[oltFilter] && 
                        Object.keys(result.olts[oltFilter].ports).sort().map(port => (
                          <SelectItem key={port} value={port}>{port}</SelectItem>
                        ))
                      }
                      {oltFilter === 'all' && 
                        [...new Set(result.onts.map(o => o._port))].sort().map(port => (
                          <SelectItem key={port} value={port}>{port}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={() => { setSearchTerm(''); setStatusFilter('all'); setOltFilter('all'); setPortFilter('all'); }}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* OLT / Port Hierarchy */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Router className="h-5 w-5 text-blue-500" />
                  OLT &amp; PON Port Overview
                </h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setExpandedOlts(Object.keys(result.olts));
                      const allPorts = [];
                      Object.entries(result.olts).forEach(([oltName, olt]) => {
                        Object.keys(olt.ports).forEach(port => allPorts.push(`${oltName}|${port}`));
                      });
                      setExpandedPorts(allPorts);
                    }}
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Expand All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setExpandedOlts([]);
                      setExpandedPorts([]);
                    }}
                  >
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Collapse All
                  </Button>
                </div>
              </div>
              
              {Object.entries(result.olts).sort().map(([oltName, oltStats]) => {
                const oltOnts = result.onts.filter(o => o._oltName === oltName);
                const oltCritical = oltOnts.filter(o => o._analysis.status === 'critical').length;
                const oltWarning = oltOnts.filter(o => o._analysis.status === 'warning').length;
                const isOltExpanded = expandedOlts.includes(oltName);

                return (
                  <Collapsible key={oltName} open={isOltExpanded} onOpenChange={() => toggleOlt(oltName)}>
                    <Card className={`border-0 shadow-lg ${oltCritical > 0 ? 'ring-2 ring-red-300' : oltWarning > 0 ? 'ring-2 ring-amber-300' : ''}`}>
                      <CollapsibleTrigger className="w-full">
                        <CardContent className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isOltExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              <Router className="h-5 w-5 text-blue-600" />
                              <div className="text-left">
                                <div className="font-bold text-lg">{oltName}</div>
                                <div className="text-xs text-gray-500">{oltStats.portCount} ports • {oltStats.totalOnts} ONTs</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="hidden md:block text-center">
                                <div className="text-gray-500 text-xs">Avg ONT Rx</div>
                                <div className="font-mono font-medium">
                                  {oltStats.avgOntRxOptPwr?.toFixed(1) || 'N/A'} dBm
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {oltCritical > 0 && (
                                  <Badge 
                                    className="bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200"
                                    onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'critical', oltName }); }}
                                  >
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {oltCritical}
                                  </Badge>
                                )}
                                {oltWarning > 0 && (
                                  <Badge 
                                    className="bg-amber-100 text-amber-800 border-amber-300 cursor-pointer hover:bg-amber-200"
                                    onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'warning', oltName }); }}
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {oltWarning}
                                  </Badge>
                                )}
                                {oltCritical === 0 && oltWarning === 0 && (
                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                          {Object.entries(oltStats.ports).sort().map(([portKey, portStats]) => {
                            const portOnts = oltOnts.filter(o => o._port === portKey);
                            const portCritical = portOnts.filter(o => o._analysis.status === 'critical').length;
                            const portWarning = portOnts.filter(o => o._analysis.status === 'warning').length;
                            const portId = `${oltName}|${portKey}`;
                            const isPortExpanded = expandedPorts.includes(portId);

                            return (
                              <Collapsible key={portKey} open={isPortExpanded} onOpenChange={() => togglePort(portId)}>
                                <Card className={`border shadow-sm ${portCritical > 0 ? 'border-red-300' : portWarning > 0 ? 'border-amber-300' : 'border-gray-200'}`}>
                                  <CollapsibleTrigger className="w-full">
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          {isPortExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                          <div className="text-left">
                                            <div className="font-semibold text-sm">{portKey}</div>
                                            <div className="text-xs text-gray-500">{portStats.count} ONTs</div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                          <div className="hidden md:flex items-center gap-4 text-sm">
                                            <div className="text-center">
                                              <div className="text-gray-500 text-[10px]">Avg ONT Rx</div>
                                              <div className="font-mono text-xs font-medium">
                                                {portStats.avgOntRxOptPwr?.toFixed(1) || 'N/A'} dBm
                                              </div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-gray-500 text-[10px]">Range</div>
                                              <div className="font-mono text-[10px] font-medium">
                                                {portStats.minOntRxOptPwr?.toFixed(1) || 'N/A'} to {portStats.maxOntRxOptPwr?.toFixed(1) || 'N/A'}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1">
                                            {portCritical > 0 && (
                                              <Badge 
                                                className="bg-red-100 text-red-800 border-red-300 text-xs px-1.5 cursor-pointer hover:bg-red-200"
                                                onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'critical', oltName, portKey }); }}
                                              >
                                                {portCritical}
                                              </Badge>
                                            )}
                                            {portWarning > 0 && (
                                              <Badge 
                                                className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-1.5 cursor-pointer hover:bg-amber-200"
                                                onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'warning', oltName, portKey }); }}
                                              >
                                                {portWarning}
                                              </Badge>
                                            )}
                                            {portCritical === 0 && portWarning === 0 && (
                                              <Badge className="bg-green-100 text-green-800 border-green-300 text-xs px-1.5">
                                                OK
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <div className="border-t">
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-12">Status</TableHead>
                                              <TableHead>ONT ID</TableHead>
                                              <TableHead>Serial</TableHead>
                                              <TableHead>Model</TableHead>
                                              <TableHead className="text-right">ONT Rx</TableHead>
                                              <TableHead className="text-right">OLT Rx</TableHead>
                                              <TableHead className="text-right">US BIP</TableHead>
                                              <TableHead className="text-right">DS BIP</TableHead>
                                              <TableHead>Issues</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {portOnts.map((ont, idx) => (
                                              <TableRow key={idx} className={ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' : ont._analysis.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                                                <TableCell>
                                                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[ont._analysis.status]}`} />
                                                </TableCell>
                                                <TableCell className="font-mono">{ont.OntID || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{ont.SerialNumber || '-'}</TableCell>
                                                <TableCell className="text-xs">{ont.model || '-'}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                  <span className={
                                                    parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' :
                                                    parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' : ''
                                                  }>
                                                    {ont.OntRxOptPwr || '-'}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                  <span className={
                                                    parseFloat(ont.OLTRXOptPwr) < -30 ? 'text-red-600 font-bold' :
                                                    parseFloat(ont.OLTRXOptPwr) < -28 ? 'text-amber-600' : ''
                                                  }>
                                                    {ont.OLTRXOptPwr || '-'}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                  <span className={parseInt(ont.UpstreamBipErrors) > 100 ? 'text-amber-600' : ''}>
                                                    {ont.UpstreamBipErrors || '0'}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                  <span className={parseInt(ont.DownstreamBipErrors) > 100 ? 'text-amber-600' : ''}>
                                                    {ont.DownstreamBipErrors || '0'}
                                                  </span>
                                                </TableCell>
                                                <TableCell>
                                                  <TooltipProvider>
                                                    <div className="flex flex-wrap gap-1">
                                                      {ont._analysis.issues.slice(0, 2).map((issue, i) => (
                                                        <Tooltip key={i}>
                                                          <TooltipTrigger>
                                                            <Badge variant="outline" className="text-[10px] bg-red-50 border-red-300 text-red-700">
                                                              {issue.field}
                                                            </Badge>
                                                          </TooltipTrigger>
                                                          <TooltipContent>{issue.message}</TooltipContent>
                                                        </Tooltip>
                                                      ))}
                                                      {ont._analysis.warnings.slice(0, 2).map((warn, i) => (
                                                        <Tooltip key={`w-${i}`}>
                                                          <TooltipTrigger>
                                                            <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-300 text-amber-700">
                                                              {warn.field}
                                                            </Badge>
                                                          </TooltipTrigger>
                                                          <TooltipContent>{warn.message}</TooltipContent>
                                                        </Tooltip>
                                                      ))}
                                                      {(ont._analysis.issues.length + ont._analysis.warnings.length) > 4 && (
                                                        <Badge variant="outline" className="text-[10px]">
                                                          +{ont._analysis.issues.length + ont._analysis.warnings.length - 4}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </TooltipProvider>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </Card>
                              </Collapsible>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>

            {/* New Analysis Button */}
            <div className="text-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => setResult(null)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}