import React, { useState, useEffect } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  Filter,
  Settings,
  FileText,
  RotateCcw,
  History,
  Database,
  Trash2,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import HistoricalTrends from '@/components/ponpm/HistoricalTrends';
import OLTPortSummary from '@/components/ponpm/OLTPortSummary';
import HistoricalDataManager from '@/components/ponpm/HistoricalDataManager';

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

const DEFAULT_THRESHOLDS = {
  OntRxOptPwr: { low: -27, marginal: -25, high: -8 },
  OLTRXOptPwr: { low: -30, marginal: -28, high: -8 },
  OntTxPwr: { low: 0.5, high: 5 },
  UsSdberRate: { warning: 1e-9, critical: 1e-6 },
  DsSdberRate: { warning: 1e-9, critical: 1e-6 },
  UpstreamBipErrors: { warning: 100, critical: 1000 },
  DownstreamBipErrors: { warning: 100, critical: 1000 },
  UpstreamMissedBursts: { warning: 10, critical: 100 },
  UpstreamGemHecErrors: { warning: 10, critical: 100 },
  UpstreamFecUncorrectedCodeWords: { warning: 1, critical: 10 },
  DownstreamFecUncorrectedCodeWords: { warning: 1, critical: 10 },
};

export default function PONPMAnalysis() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [oltFilter, setOltFilter] = useState('all');
  const [portFilter, setPortFilter] = useState('all');
  const [expandedOlts, setExpandedOlts] = useState([]);
  const [expandedPorts, setExpandedPorts] = useState([]);
  const [issueDetailView, setIssueDetailView] = useState(null);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [hideOntStatus, setHideOntStatus] = useState({ ok: false, warning: false, critical: false });
  const [showHistoricalReports, setShowHistoricalReports] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' or 'summary'
  const [customThresholds, setCustomThresholds] = useState(() => {
    const saved = localStorage.getItem('ponPmThresholds');
    return saved ? JSON.parse(saved) : { ...DEFAULT_THRESHOLDS };
  });

  // Fetch saved reports
  const { data: savedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date'),
  });

  // Save report mutation - now saves summary only, then triggers ONT records save
  const saveReportMutation = useMutation({
    mutationFn: async (reportData) => {
      // First create the report record
      const report = await base44.entities.PONPMReport.create({
        report_name: reportData.report_name,
        upload_date: reportData.upload_date,
        file_url: reportData.file_url,
        ont_count: reportData.ont_count,
        critical_count: reportData.critical_count,
        warning_count: reportData.warning_count,
        ok_count: reportData.ok_count,
        olt_count: reportData.olt_count,
        olts: reportData.olts,
        avg_ont_rx: reportData.avg_ont_rx,
        min_ont_rx: reportData.min_ont_rx,
        max_ont_rx: reportData.max_ont_rx,
      });
      
      // Then save ONT records in batches to avoid payload size limits
      if (reportData.onts && reportData.onts.length > 0) {
        const batchSize = 500; // Send 500 ONTs per request
        const totalBatches = Math.ceil(reportData.onts.length / batchSize);
        let savedTotal = 0;
        
        toast.loading(`Saving ${reportData.onts.length} ONT records (0/${totalBatches} batches)...`, { id: 'save-onts' });
        
        try {
          for (let i = 0; i < reportData.onts.length; i += batchSize) {
            const batch = reportData.onts.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            
            toast.loading(`Saving ONT records (${batchNum}/${totalBatches} batches)...`, { id: 'save-onts' });
            
            await base44.functions.invoke('saveOntRecords', {
              report_id: report.id,
              report_date: reportData.upload_date,
              onts: batch,
            });
            
            savedTotal += batch.length;
          }
          toast.success(`Saved ${savedTotal} ONT records`, { id: 'save-onts' });
        } catch (err) {
          console.error('Failed to save ONT records:', err);
          toast.error(`Saved ${savedTotal}/${reportData.onts.length} ONT records - some failed`, { id: 'save-onts' });
        }
      }
      
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ponPmReports'] });
      toast.success('Report saved to history');
    },
    onError: (error) => {
      console.error('Save report error:', error);
      toast.error('Failed to save report to history');
    },
  });



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
        setExpandedOlts([]);
        setExpandedPorts([]);
        toast.success(`Parsed ${response.data.summary.totalOnts} ONTs successfully`, { id: 'pon-parse' });

        // Auto-save the report to database with all ONT records
        const reportName = file.name.replace('.csv', '') + ' - ' + moment().format('MM/DD/YY HH:mm');
        
        // Calculate Rx power stats
        const rxValues = response.data.onts
          .map(o => parseFloat(o.OntRxOptPwr))
          .filter(v => !isNaN(v));
        const avgRx = rxValues.length > 0 ? rxValues.reduce((a, b) => a + b, 0) / rxValues.length : null;
        const minRx = rxValues.length > 0 ? Math.min(...rxValues) : null;
        const maxRx = rxValues.length > 0 ? Math.max(...rxValues) : null;
        
        saveReportMutation.mutate({
          report_name: reportName,
          upload_date: new Date().toISOString(),
          file_url: file_url,
          ont_count: response.data.summary.totalOnts,
          critical_count: response.data.summary.criticalCount,
          warning_count: response.data.summary.warningCount,
          ok_count: response.data.summary.okCount,
          olt_count: response.data.summary.oltCount,
          olts: Object.keys(response.data.olts || {}),
          avg_ont_rx: avgRx,
          min_ont_rx: minRx,
          max_ont_rx: maxRx,
          onts: response.data.onts, // Pass all ONTs to be saved via backend function
        });
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

  const saveThresholds = () => {
    localStorage.setItem('ponPmThresholds', JSON.stringify(customThresholds));
    toast.success('Thresholds saved');
    setShowThresholdSettings(false);
  };

  const resetThresholds = () => {
    setCustomThresholds({ ...DEFAULT_THRESHOLDS });
    localStorage.removeItem('ponPmThresholds');
    toast.success('Thresholds reset to defaults');
  };

  const updateThreshold = (field, key, value) => {
    setCustomThresholds(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: parseFloat(value) || 0
      }
    }));
  };

  const exportCSV = (filterType = 'all') => {
    if (!result?.onts) return;

    let ontsToExport = filteredOnts;
    if (filterType === 'critical') {
      ontsToExport = filteredOnts.filter(ont => ont._analysis.status === 'critical');
    } else if (filterType === 'warning') {
      ontsToExport = filteredOnts.filter(ont => ont._analysis.status === 'warning');
    } else if (filterType === 'issues') {
      ontsToExport = filteredOnts.filter(ont => ont._analysis.status !== 'ok');
    }

    const headers = [
      'Status', 'OLT', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model',
      'OntRxOptPwr', 'OntTxPwr', 'OLTRXOptPwr',
      'UpstreamBipErrors', 'DownstreamBipErrors',
      'UpstreamFecUncorrected', 'DownstreamFecUncorrected',
      'Issues', 'Issue Details'
    ];

    const rows = ontsToExport.map(ont => {
      const allIssues = [...ont._analysis.issues, ...ont._analysis.warnings];
      return [
        ont._analysis.status.toUpperCase(),
        ont._oltName,
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
        allIssues.map(i => i.field).join(', '),
        allIssues.map(i => `${i.field}: ${i.value} (${i.message})`).join('; ')
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = filterType === 'all' ? '' : `-${filterType}`;
    a.download = `pon-pm-analysis${suffix}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${ontsToExport.length} ${filterType === 'all' ? '' : filterType + ' '}ONTs`);
  };

  const exportIssueReport = () => {
    if (!result?.onts) return;

    const criticalOnts = result.onts.filter(o => o._analysis.status === 'critical');
    const warningOnts = result.onts.filter(o => o._analysis.status === 'warning');

    let report = `PON PM Issue Report - ${new Date().toLocaleDateString()}\n`;
    report += `${'='.repeat(60)}\n\n`;
    report += `Summary:\n`;
    report += `  Total ONTs: ${result.summary.totalOnts}\n`;
    report += `  Critical: ${result.summary.criticalCount}\n`;
    report += `  Warnings: ${result.summary.warningCount}\n`;
    report += `  Healthy: ${result.summary.okCount}\n\n`;
    
    report += `Thresholds Used:\n`;
    report += `  ONT Rx Power: Critical < ${customThresholds.OntRxOptPwr.low} dBm, Warning < ${customThresholds.OntRxOptPwr.marginal} dBm\n`;
    report += `  OLT Rx Power: Critical < ${customThresholds.OLTRXOptPwr.low} dBm, Warning < ${customThresholds.OLTRXOptPwr.marginal} dBm\n`;
    report += `  BIP Errors: Critical >= ${customThresholds.UpstreamBipErrors.critical}, Warning >= ${customThresholds.UpstreamBipErrors.warning}\n`;
    report += `  FEC Uncorrected: Critical >= ${customThresholds.UpstreamFecUncorrectedCodeWords.critical}, Warning >= ${customThresholds.UpstreamFecUncorrectedCodeWords.warning}\n\n`;

    if (criticalOnts.length > 0) {
      report += `${'='.repeat(60)}\n`;
      report += `CRITICAL ISSUES (${criticalOnts.length})\n`;
      report += `${'='.repeat(60)}\n\n`;
      
      criticalOnts.forEach(ont => {
        report += `ONT: ${ont.OntID} | Serial: ${ont.SerialNumber}\n`;
        report += `Location: ${ont._oltName} / ${ont._port}\n`;
        report += `Model: ${ont.model || 'N/A'}\n`;
        report += `Issues:\n`;
        ont._analysis.issues.forEach(issue => {
          report += `  - ${issue.field}: ${issue.value} (Threshold: ${issue.threshold})\n`;
          report += `    ${issue.message}\n`;
        });
        report += `\n`;
      });
    }

    if (warningOnts.length > 0) {
      report += `${'='.repeat(60)}\n`;
      report += `WARNINGS (${warningOnts.length})\n`;
      report += `${'='.repeat(60)}\n\n`;
      
      warningOnts.forEach(ont => {
        report += `ONT: ${ont.OntID} | Serial: ${ont.SerialNumber}\n`;
        report += `Location: ${ont._oltName} / ${ont._port}\n`;
        report += `Model: ${ont.model || 'N/A'}\n`;
        report += `Warnings:\n`;
        ont._analysis.warnings.forEach(warn => {
          report += `  - ${warn.field}: ${warn.value} (Threshold: ${warn.threshold})\n`;
          report += `    ${warn.message}\n`;
        });
        report += `\n`;
      });
    }

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pon-pm-issue-report-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Issue report exported');
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowTrends(true)}
                  disabled={savedReports.length < 2}
                  title={savedReports.length < 2 ? 'Need at least 2 reports for trends' : 'View historical trends'}
                >
                  <History className="h-4 w-4 mr-2" />
                  Trends
                  {savedReports.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{savedReports.length}</Badge>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowHistoricalReports(true)}
                >
                  <Database className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Dialog open={showThresholdSettings} onOpenChange={setShowThresholdSettings}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Thresholds
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Analysis Thresholds
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Optical Power Thresholds */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">Optical Power (dBm)</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">ONT Rx Critical (&lt;)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={customThresholds.OntRxOptPwr.low}
                              onChange={(e) => updateThreshold('OntRxOptPwr', 'low', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">ONT Rx Warning (&lt;)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={customThresholds.OntRxOptPwr.marginal}
                              onChange={(e) => updateThreshold('OntRxOptPwr', 'marginal', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">ONT Rx High (&gt;)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={customThresholds.OntRxOptPwr.high}
                              onChange={(e) => updateThreshold('OntRxOptPwr', 'high', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">OLT Rx Critical (&lt;)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={customThresholds.OLTRXOptPwr.low}
                              onChange={(e) => updateThreshold('OLTRXOptPwr', 'low', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">OLT Rx Warning (&lt;)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={customThresholds.OLTRXOptPwr.marginal}
                              onChange={(e) => updateThreshold('OLTRXOptPwr', 'marginal', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">OLT Rx High (&gt;)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={customThresholds.OLTRXOptPwr.high}
                              onChange={(e) => updateThreshold('OLTRXOptPwr', 'high', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Error Thresholds */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">Error Counts</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">BIP Errors Warning (≥)</Label>
                            <Input
                              type="number"
                              value={customThresholds.UpstreamBipErrors.warning}
                              onChange={(e) => {
                                updateThreshold('UpstreamBipErrors', 'warning', e.target.value);
                                updateThreshold('DownstreamBipErrors', 'warning', e.target.value);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">BIP Errors Critical (≥)</Label>
                            <Input
                              type="number"
                              value={customThresholds.UpstreamBipErrors.critical}
                              onChange={(e) => {
                                updateThreshold('UpstreamBipErrors', 'critical', e.target.value);
                                updateThreshold('DownstreamBipErrors', 'critical', e.target.value);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">FEC Uncorrected Warning (≥)</Label>
                            <Input
                              type="number"
                              value={customThresholds.UpstreamFecUncorrectedCodeWords.warning}
                              onChange={(e) => {
                                updateThreshold('UpstreamFecUncorrectedCodeWords', 'warning', e.target.value);
                                updateThreshold('DownstreamFecUncorrectedCodeWords', 'warning', e.target.value);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">FEC Uncorrected Critical (≥)</Label>
                            <Input
                              type="number"
                              value={customThresholds.UpstreamFecUncorrectedCodeWords.critical}
                              onChange={(e) => {
                                updateThreshold('UpstreamFecUncorrectedCodeWords', 'critical', e.target.value);
                                updateThreshold('DownstreamFecUncorrectedCodeWords', 'critical', e.target.value);
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Missed Bursts Warning (≥)</Label>
                            <Input
                              type="number"
                              value={customThresholds.UpstreamMissedBursts.warning}
                              onChange={(e) => updateThreshold('UpstreamMissedBursts', 'warning', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Missed Bursts Critical (≥)</Label>
                            <Input
                              type="number"
                              value={customThresholds.UpstreamMissedBursts.critical}
                              onChange={(e) => updateThreshold('UpstreamMissedBursts', 'critical', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                        <Info className="h-4 w-4 inline mr-2" />
                        Note: Changes apply to exports and reports. Re-upload the file to re-analyze with new thresholds.
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={resetThresholds}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset Defaults
                      </Button>
                      <Button onClick={saveThresholds}>
                        Save Thresholds
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => exportCSV('all')}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      All Results (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportCSV('issues')}>
                      <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                      All Issues (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportCSV('critical')}>
                      <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                      Critical Only (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportCSV('warning')}>
                      <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                      Warnings Only (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportIssueReport}>
                      <FileText className="h-4 w-4 mr-2" />
                      Issue Report (TXT)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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

            {/* View Mode Toggle and OLT / Port Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Router className="h-5 w-5 text-blue-500" />
                  OLT &amp; PON Port Overview
                </h2>
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex border rounded-lg overflow-hidden">
                    <Button 
                      variant={viewMode === 'summary' ? 'default' : 'ghost'} 
                      size="sm"
                      className="rounded-none"
                      onClick={() => setViewMode('summary')}
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      Summary
                    </Button>
                    <Button 
                      variant={viewMode === 'hierarchy' ? 'default' : 'ghost'} 
                      size="sm"
                      className="rounded-none"
                      onClick={() => setViewMode('hierarchy')}
                    >
                      <Router className="h-4 w-4 mr-1" />
                      Hierarchy
                    </Button>
                  </div>
                  {viewMode === 'hierarchy' && (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              {/* OLT/Port Summary View */}
              {viewMode === 'summary' && (
                <OLTPortSummary 
                  result={result} 
                  onDrillDown={(oltName, portKey) => {
                    setViewMode('hierarchy');
                    setOltFilter(oltName);
                    setPortFilter(portKey);
                    setExpandedOlts([oltName]);
                    setExpandedPorts([`${oltName}|${portKey}`]);
                  }}
                />
              )}
              
              {/* Hierarchy View */}
              {viewMode === 'hierarchy' && Object.entries(result.olts).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([oltName, oltStats]) => {
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
                          {Object.entries(oltStats.ports).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([portKey, portStats]) => {
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
                                          <div className="font-semibold text-sm flex items-center gap-2">
                                            {portKey}
                                            {portStats.isCombo && (
                                              <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-300 text-purple-700">
                                                {portStats.techType}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>{portStats.count} ONTs</span>
                                            {/* Show LCP info if any ONT on this port has it */}
                                            {portOnts.find(o => o._lcpNumber) && (
                                              <span className="text-blue-600">
                                                • LCP: {portOnts.find(o => o._lcpNumber)?._lcpNumber}
                                              </span>
                                            )}
                                          </div>
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
                                      {/* ONT Status Filter */}
                                      <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-gray-500 font-medium">Show:</span>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={!hideOntStatus.critical}
                                            onChange={() => setHideOntStatus(prev => ({ ...prev, critical: !prev.critical }))}
                                            className="rounded border-gray-300"
                                          />
                                          <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Critical</Badge>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={!hideOntStatus.warning}
                                            onChange={() => setHideOntStatus(prev => ({ ...prev, warning: !prev.warning }))}
                                            className="rounded border-gray-300"
                                          />
                                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">Warning</Badge>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={!hideOntStatus.ok}
                                            onChange={() => setHideOntStatus(prev => ({ ...prev, ok: !prev.ok }))}
                                            className="rounded border-gray-300"
                                          />
                                          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">OK</Badge>
                                        </label>
                                      </div>
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-12">Status</TableHead>
                                              <TableHead>ONT ID</TableHead>
                                              <TableHead>LCP/Splitter</TableHead>
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
                                            {portOnts.filter(ont => !hideOntStatus[ont._analysis.status]).map((ont, idx) => (
                                              <TableRow key={idx} className={ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' : ont._analysis.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                                                <TableCell>
                                                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[ont._analysis.status]}`} />
                                                </TableCell>
                                                <TableCell className="font-mono">{ont.OntID || '-'}</TableCell>
                                                <TableCell className="text-xs">
                                                  {ont._lcpNumber ? (
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <span className="text-blue-600 font-medium">{ont._lcpNumber}/{ont._splitterNumber}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          {ont._lcpLocation && <div>{ont._lcpLocation}</div>}
                                                          {ont._lcpAddress && <div className="text-gray-400">{ont._lcpAddress}</div>}
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  ) : '-'}
                                                </TableCell>
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

        {/* Historical Data Manager */}
        {showHistoricalReports && (
          <HistoricalDataManager
            reports={savedReports}
            isLoading={loadingReports}
            onReportDeleted={() => queryClient.invalidateQueries({ queryKey: ['ponPmReports'] })}
            onClose={() => setShowHistoricalReports(false)}
          />
        )}

        {/* Historical Trends Component */}
        {showTrends && savedReports.length >= 2 && (
          <HistoricalTrends 
            reports={savedReports} 
            onClose={() => setShowTrends(false)} 
          />
        )}
      </main>
    </div>
  );
}