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
  Calendar,
  TrendingUp,
  TrendingDown,
  Clipboard,
  Sparkles
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
import ReportForm from '@/components/jobreports/ReportForm';
import ONTDetailView from '@/components/ponpm/ONTDetailView';

const STATUS_COLORS = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  ok: 'bg-green-500',
  offline: 'bg-purple-500',
  info: 'bg-blue-500',
};

const STATUS_BADGES = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
  offline: 'bg-purple-100 text-purple-800 border-purple-300',
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
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [oltFilter, setOltFilter] = useState('all');
  const [portFilter, setPortFilter] = useState('all');
  const [expandedOlts, setExpandedOlts] = useState([]);
  const [expandedPorts, setExpandedPorts] = useState([]);
  const [issueDetailView, setIssueDetailView] = useState(null);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [hideOntStatus, setHideOntStatus] = useState({ ok: false, warning: false, critical: false, offline: false });
  const [showHistoricalReports, setShowHistoricalReports] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' or 'summary'
  const [creatingJobReport, setCreatingJobReport] = useState(null);
  const [jobReportFormData, setJobReportFormData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedOntDetail, setSelectedOntDetail] = useState(null);
  const [customThresholds, setCustomThresholds] = useState(() => {
    const saved = localStorage.getItem('ponPmThresholds');
    return saved ? JSON.parse(saved) : { ...DEFAULT_THRESHOLDS };
  });



  // Fetch saved reports
  const { data: savedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date'),
  });

  // Save report mutation - saves summary, then ONT records via backend
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
      
      // Save all ONT records via backend (handles large datasets up to 50k+)
      if (reportData.onts && reportData.onts.length > 0) {
        toast.loading(`Saving ${reportData.onts.length.toLocaleString()} ONT records for trends...`, { id: 'save-onts' });
        
        try {
          // Send all ONTs to backend - it handles batching internally
          const saveResponse = await base44.functions.invoke('saveOntRecords', {
            report_id: report.id,
            report_date: reportData.upload_date,
            onts: reportData.onts,
          });
          
          console.log('ONT records saved:', saveResponse.data);
          toast.success(`Saved ${saveResponse.data?.savedCount || reportData.onts.length} ONT records for historical analysis`, { id: 'save-onts' });
        } catch (err) {
          console.error('Failed to save ONT records:', err);
          toast.error(`Failed to save ONT records: ${err.message}`, { id: 'save-onts' });
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
        setSelectedReportId(null); // Clear selection for new upload
        toast.success(`Parsed ${response.data.summary.totalOnts.toLocaleString()} ONTs successfully`, { id: 'pon-parse' });

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
          onts: response.data.onts, // All ONTs - backend handles large datasets
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

    let ontsToExport = result.onts;
    if (filterType === 'critical') {
      ontsToExport = result.onts.filter(ont => ont._analysis.status === 'critical');
    } else if (filterType === 'warning') {
      ontsToExport = result.onts.filter(ont => ont._analysis.status === 'warning');
    } else if (filterType === 'issues') {
      ontsToExport = result.onts.filter(ont => ont._analysis.status !== 'ok');
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

  const exportCriticalPDF = async () => {
    if (!result?.onts) return;

    const criticalOnts = result.onts.filter(o => o._analysis.status === 'critical');
    if (criticalOnts.length === 0) {
      toast.error('No critical issues to export');
      return;
    }

    toast.loading('Generating critical issues PDF...', { id: 'critical-pdf' });

    try {
      const response = await base44.functions.invoke('generatePonPmPDF', {
        reportData: { ...result, onts: criticalOnts },
        criticalOnly: true
      }, { responseType: 'arraybuffer' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pon-pm-critical-issues-${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success(`Exported ${criticalOnts.length} critical issues to PDF`, { id: 'critical-pdf' });
    } catch (error) {
      console.error('Critical PDF export error:', error);
      toast.error('Failed to generate critical issues PDF', { id: 'critical-pdf' });
    }
  };

  const exportPDF = async () => {
    if (!result?.onts) return;

    toast.loading('Generating PDF report...', { id: 'pdf-export' });

    try {
      const response = await base44.functions.invoke('generatePonPmPDF', {
        reportData: result
      }, { responseType: 'arraybuffer' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pon-pm-report-${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('PDF report generated', { id: 'pdf-export' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-export' });
    }
  };

  const createJobReportForONT = async (ont) => {
    setCreatingJobReport(ont);
    setGeneratingReport(true);
    
    try {
      // Build comprehensive issue summary
      const issues = [];
      if (ont._analysis?.issues) {
        ont._analysis.issues.forEach(issue => {
          issues.push(`${issue.field}: ${issue.message} (${issue.value})`);
        });
      }
      if (ont._analysis?.warnings) {
        ont._analysis.warnings.forEach(warning => {
          issues.push(`${warning.field}: ${warning.message} (${warning.value})`);
        });
      }
      
      // Build trend summary
      const trends = [];
      const trendDetails = [];
      if (ont._trends) {
        if (ont._trends.ont_rx_change !== null && ont._trends.ont_rx_change !== undefined) {
          const change = ont._trends.ont_rx_change;
          trends.push(`ONT Rx changed by ${change > 0 ? '+' : ''}${change.toFixed(1)} dB since ${moment(ont._trends.previous_date).format('MMM D')}`);
          trendDetails.push(`ONT Rx Power: ${change.toFixed(1)} dB change over ${ont._trends.days_since_last} days ${change < -1 ? '(DEGRADING)' : change > 1 ? '(IMPROVING)' : '(STABLE)'}`);
        }
        if (ont._trends.olt_rx_change !== null && ont._trends.olt_rx_change !== undefined) {
          const change = ont._trends.olt_rx_change;
          trendDetails.push(`OLT Rx Power: ${change > 0 ? '+' : ''}${change.toFixed(1)} dB change ${change < -1 ? '(DEGRADING)' : change > 1 ? '(IMPROVING)' : '(STABLE)'}`);
        }
        if (ont._trends.us_bip_change !== 0) {
          trends.push(`Upstream BIP errors ${ont._trends.us_bip_change > 0 ? 'increased' : 'decreased'} by ${Math.abs(ont._trends.us_bip_change)}`);
          trendDetails.push(`US BIP Errors: ${ont._trends.us_bip_change > 0 ? '+' : ''}${ont._trends.us_bip_change} ${ont._trends.us_bip_change > 100 ? '(SIGNIFICANT INCREASE)' : ''}`);
        }
        if (ont._trends.ds_bip_change !== 0) {
          trends.push(`Downstream BIP errors ${ont._trends.ds_bip_change > 0 ? 'increased' : 'decreased'} by ${Math.abs(ont._trends.ds_bip_change)}`);
          trendDetails.push(`DS BIP Errors: ${ont._trends.ds_bip_change > 0 ? '+' : ''}${ont._trends.ds_bip_change} ${ont._trends.ds_bip_change > 100 ? '(SIGNIFICANT INCREASE)' : ''}`);
        }
        if (ont._trends.us_fec_change !== 0) {
          trends.push(`Upstream FEC uncorrected ${ont._trends.us_fec_change > 0 ? 'increased' : 'decreased'} by ${Math.abs(ont._trends.us_fec_change)}`);
          trendDetails.push(`US FEC Uncorrected: ${ont._trends.us_fec_change > 0 ? '+' : ''}${ont._trends.us_fec_change} ${ont._trends.us_fec_change > 10 ? '(SIGNIFICANT INCREASE)' : ''}`);
        }
        if (ont._trends.ds_fec_change !== 0) {
          trends.push(`Downstream FEC uncorrected ${ont._trends.ds_fec_change > 0 ? 'increased' : 'decreased'} by ${Math.abs(ont._trends.ds_fec_change)}`);
          trendDetails.push(`DS FEC Uncorrected: ${ont._trends.ds_fec_change > 0 ? '+' : ''}${ont._trends.ds_fec_change} ${ont._trends.ds_fec_change > 10 ? '(SIGNIFICANT INCREASE)' : ''}`);
        }
      }
      
      // Use AI to generate smart diagnosis and recommendations
      const aiPrompt = `You are a fiber optic technician creating a job report for an ONT with the following data:

Serial Number (FSAN): ${ont.SerialNumber}
ONT ID: ${ont.OntID || 'Unknown'}
Model: ${ont.model || 'Unknown'}
OLT: ${ont._oltName}
Port: ${ont._port}
Location: ${ont._lcpLocation || ont._lcpNumber ? `LCP ${ont._lcpNumber}${ont._splitterNumber ? ' / Splitter ' + ont._splitterNumber : ''}` : 'Unknown'}
Address: ${ont._lcpAddress || 'Unknown'}

Current Power Levels:
- ONT Rx: ${ont.OntRxOptPwr} dBm
- OLT Rx: ${ont.OLTRXOptPwr} dBm
- ONT Tx: ${ont.OntTxPwr || 'N/A'} dBm

Issues Detected:
${issues.length > 0 ? issues.join('\n') : 'No critical issues detected'}

${trends.length > 0 ? `Performance Trends:\n${trends.join('\n')}` : ''}

Error Counts:
- Upstream BIP Errors: ${ont.UpstreamBipErrors || 0}
- Downstream BIP Errors: ${ont.DownstreamBipErrors || 0}
- Upstream FEC Uncorrected: ${ont.UpstreamFecUncorrectedCodeWords || 0}
- Downstream FEC Uncorrected: ${ont.DownstreamFecUncorrectedCodeWords || 0}

Based on this data, generate:
1. A professional diagnosis of the issues
2. Recommended actions to resolve them
3. Equipment that should be used
4. Expected outcomes

Be specific, technical, and actionable.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            diagnosis: { type: "string" },
            recommended_actions: { type: "array", items: { type: "string" } },
            equipment_needed: { type: "array", items: { type: "string" } },
            expected_outcome: { type: "string" },
            suggested_status: { type: "string", enum: ["in_progress", "needs_followup", "completed"] }
          }
        }
      });
      
      // Pre-fill form data with historical trends
      const trendSummary = trendDetails.length > 0 
        ? `\n\nHISTORICAL PERFORMANCE TRENDS (Last ${ont._trends?.days_since_last || 0} days):\n${trendDetails.map(t => `- ${t}`).join('\n')}`
        : '';
      
      const formData = {
        job_number: `WO-PON-${ont.SerialNumber?.substring(0, 8)}-${Date.now().toString().slice(-4)}`,
        technician_name: '',
        location: ont._lcpAddress || ont._lcpLocation || `${ont._oltName} / ${ont._port}`,
        start_power_level: ont.OntRxOptPwr,
        end_power_level: '',
        status: aiResponse.suggested_status || 'in_progress',
        notes: `DIAGNOSIS:\n${aiResponse.diagnosis}\n\nRECOMMENDED ACTIONS:\n${aiResponse.recommended_actions?.map((a, i) => `${i + 1}. ${a}`).join('\n') || 'None'}\n\nEXPECTED OUTCOME:\n${aiResponse.expected_outcome}${trendSummary}\n\nONT DETAILS:\n- FSAN: ${ont.SerialNumber}\n- ONT ID: ${ont.OntID || 'Unknown'}\n- Model: ${ont.model || 'Unknown'}\n- OLT: ${ont._oltName} / ${ont._port}\n- LCP: ${ont._lcpNumber || 'Unknown'}${ont._splitterNumber ? ' / Splitter ' + ont._splitterNumber : ''}`,
        equipment_used: aiResponse.equipment_needed || [],
        diagnosis_used: true,
        diagnosis_result: aiResponse.diagnosis,
        fiber_info: {
          fsan: ont.SerialNumber,
          ont_id: ont.OntID,
          model: ont.model,
          olt: ont._oltName,
          port: ont._port,
          lcp: ont._lcpNumber,
          splitter: ont._splitterNumber
        },
        photo_urls: [],
        historical_trends: trendDetails.length > 0 ? trendDetails : null
      };
      
      setJobReportFormData(formData);
      toast.success('Job report pre-filled with AI analysis');
    } catch (error) {
      console.error('Failed to generate job report:', error);
      toast.error('Failed to generate AI analysis');
      
      // Fallback to basic data
      const basicFormData = {
        job_number: `WO-PON-${ont.SerialNumber?.substring(0, 8)}-${Date.now().toString().slice(-4)}`,
        technician_name: '',
        location: ont._lcpAddress || ont._lcpLocation || `${ont._oltName} / ${ont._port}`,
        start_power_level: ont.OntRxOptPwr,
        end_power_level: '',
        status: 'in_progress',
        notes: `ONT Analysis Job\n\nFSAN: ${ont.SerialNumber}\nONT ID: ${ont.OntID || 'Unknown'}\nModel: ${ont.model || 'Unknown'}\nOLT: ${ont._oltName} / ${ont._port}\nLCP: ${ont._lcpNumber || 'Unknown'}\n\nCurrent ONT Rx: ${ont.OntRxOptPwr} dBm\n\nIssues detected:\n${ont._analysis?.issues?.map(i => `- ${i.message}`).join('\n') || 'None'}`,
        equipment_used: [],
        diagnosis_used: false,
        fiber_info: {
          fsan: ont.SerialNumber,
          ont_id: ont.OntID,
          model: ont.model,
          olt: ont._oltName,
          port: ont._port,
          lcp: ont._lcpNumber
        },
        photo_urls: []
      };
      setJobReportFormData(basicFormData);
    } finally {
      setGeneratingReport(false);
    }
  };
  
  const handleJobReportSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...jobReportFormData,
        start_power_level: jobReportFormData.start_power_level ? parseFloat(jobReportFormData.start_power_level) : null,
        end_power_level: jobReportFormData.end_power_level ? parseFloat(jobReportFormData.end_power_level) : null,
        power_improvement: jobReportFormData.start_power_level && jobReportFormData.end_power_level 
          ? (parseFloat(jobReportFormData.end_power_level) - parseFloat(jobReportFormData.start_power_level)).toFixed(2)
          : null
      };
      
      const report = await base44.entities.JobReport.create(data);
      
      // Generate and download PDF
      const response = await base44.functions.invoke('generatePDF', { 
        type: 'jobReport',
        data: report
      }, { responseType: 'arraybuffer' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JobReport-${report.job_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Job report created and PDF downloaded');
      setCreatingJobReport(null);
      setJobReportFormData(null);
    } catch (error) {
      console.error('Failed to create job report:', error);
      toast.error('Failed to create job report');
    }
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
                  {selectedReportId && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      Viewing saved report
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTrends(true)}
                    disabled={savedReports.length < 1}
                    title={savedReports.length < 1 ? 'Need at least 1 report for trends' : 'View historical trends'}
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
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => exportPDF()}>
                      <FileText className="h-4 w-4 mr-2 text-red-500" />
                      Full Issue Report (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportCriticalPDF}>
                      <FileText className="h-4 w-4 mr-2 text-red-600" />
                      Critical Issues Only (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportIssueReport}>
                      <FileText className="h-4 w-4 mr-2" />
                      Issue Report (TXT)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Loading State */}
        {isLoading && !result && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Loading Report...
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Parsing PON PM data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Section */}
        {!result && !isLoading && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl">
                  <FileSpreadsheet className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    PON PM Analysis
                  </h2>
                  <p className="text-gray-500 mt-2 max-w-lg mx-auto">
                    Upload a new CSV export or work with previously saved reports
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-4">
                  <label className="block">
                    <div className="border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-blue-50/50">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="h-10 w-10 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-gray-400">CSV files only</span>
                      </div>
                    </div>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {savedReports.length > 0 && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or</span>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowHistoricalReports(true)}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Load Saved Report ({savedReports.length})
                      </Button>
                    </>
                  )}
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {result.summary.totalOnts}
                  </div>
                  <div className="text-xs text-gray-500">Total ONTs</div>
                  {result.onts?.filter(o => o._trends).length > 0 && (
                    <Badge variant="outline" className="text-[10px] mt-1 bg-blue-50 text-blue-700 border-blue-300">
                      <TrendingUp className="h-2 w-2 mr-1" />
                      {result.onts.filter(o => o._trends).length} with trends
                    </Badge>
                  )}
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
                  <div className="text-xs text-gray-500">Critical</div>
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
                className={`border-0 shadow cursor-pointer transition-all hover:ring-2 hover:ring-purple-300 ${statusFilter === 'offline' ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => { setStatusFilter(statusFilter === 'offline' ? 'all' : 'offline'); setIssueDetailView(null); }}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.summary.offlineCount || 0}
                  </div>
                  <div className="text-xs text-gray-500">Offline</div>
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
                  <div 
                    className="bg-purple-500 transition-all" 
                    style={{ width: `${((result.summary.offlineCount || 0) / result.summary.totalOnts) * 100}%` }}
                  />
                </div>
                {result.onts?.filter(o => o._trends).length > 0 && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                    <span className="text-gray-500">Trend Data Available:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
                        {result.onts.filter(o => o._trends).length} ONTs tracked
                      </Badge>
                      {result.onts.filter(o => o._trends?.ont_rx_change < -1).length > 0 && (
                        <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">
                          <TrendingDown className="h-2 w-2 mr-1" />
                          {result.onts.filter(o => o._trends?.ont_rx_change < -1).length} degrading
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
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
                      <SelectItem value="offline">Offline</SelectItem>
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
                const oltOnts = filteredOnts.filter(o => o._oltName === oltName);
                if (oltOnts.length === 0) return null; // Hide OLT if no matching ONTs
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
                            if (portOnts.length === 0) return null; // Hide port if no matching ONTs
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
                                            checked={!hideOntStatus.offline}
                                            onChange={() => setHideOntStatus(prev => ({ ...prev, offline: !prev.offline }))}
                                            className="rounded border-gray-300"
                                          />
                                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">Offline</Badge>
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
                                              <TableHead className="text-right">US FEC</TableHead>
                                              <TableHead className="text-right">DS FEC</TableHead>
                                              <TableHead>Issues</TableHead>
                                              <TableHead></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {portOnts.filter(ont => !hideOntStatus[ont._analysis.status]).map((ont, idx) => (
                                              <TableRow key={idx} className={
                                                ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' : 
                                                ont._analysis.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' : 
                                                ont._analysis.status === 'offline' ? 'bg-purple-50 dark:bg-purple-900/10' : 
                                                ''
                                              }>
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
                                                <TableCell className="text-right font-mono text-xs">
                                                  <div className="flex flex-col items-end gap-0.5">
                                                    <span className={
                                                      parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' :
                                                      parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' : ''
                                                    }>
                                                      {ont.OntRxOptPwr || '-'}
                                                    </span>
                                                    {ont._trends?.ont_rx_change !== null && ont._trends?.ont_rx_change !== undefined && (
                                                      <span className={`text-[9px] flex items-center gap-0.5 ${
                                                        ont._trends.ont_rx_change < -1 ? 'text-red-600' :
                                                        ont._trends.ont_rx_change > 1 ? 'text-green-600' :
                                                        'text-gray-500'
                                                      }`}>
                                                        {ont._trends.ont_rx_change < -0.1 ? '↓' : ont._trends.ont_rx_change > 0.1 ? '↑' : '→'}
                                                        {Math.abs(ont._trends.ont_rx_change).toFixed(1)}dB
                                                      </span>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                  <div className="flex flex-col items-end gap-0.5">
                                                    <span className={
                                                      parseFloat(ont.OLTRXOptPwr) < -30 ? 'text-red-600 font-bold' :
                                                      parseFloat(ont.OLTRXOptPwr) < -28 ? 'text-amber-600' : ''
                                                    }>
                                                      {ont.OLTRXOptPwr || '-'}
                                                    </span>
                                                    {ont._trends?.olt_rx_change !== null && ont._trends?.olt_rx_change !== undefined && (
                                                      <span className={`text-[9px] flex items-center gap-0.5 ${
                                                        ont._trends.olt_rx_change < -1 ? 'text-red-600' :
                                                        ont._trends.olt_rx_change > 1 ? 'text-green-600' :
                                                        'text-gray-500'
                                                      }`}>
                                                        {ont._trends.olt_rx_change < -0.1 ? '↓' : ont._trends.olt_rx_change > 0.1 ? '↑' : '→'}
                                                        {Math.abs(ont._trends.olt_rx_change).toFixed(1)}dB
                                                      </span>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                  <div className="flex flex-col items-end gap-0.5">
                                                    <span className={parseInt(ont.UpstreamBipErrors) > 100 ? 'text-amber-600' : ''}>
                                                      {ont.UpstreamBipErrors || '0'}
                                                    </span>
                                                    {ont._trends && ont._trends.us_bip_change !== null && ont._trends.us_bip_change !== 0 && (
                                                      <span className={`text-[9px] ${ont._trends.us_bip_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {ont._trends.us_bip_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.us_bip_change)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                  <div className="flex flex-col items-end gap-0.5">
                                                    <span className={parseInt(ont.DownstreamBipErrors) > 100 ? 'text-amber-600' : ''}>
                                                      {ont.DownstreamBipErrors || '0'}
                                                    </span>
                                                    {ont._trends && ont._trends.ds_bip_change !== null && ont._trends.ds_bip_change !== 0 && (
                                                      <span className={`text-[9px] ${ont._trends.ds_bip_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {ont._trends.ds_bip_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.ds_bip_change)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                  <div className="flex flex-col items-end gap-0.5">
                                                    <span className={parseInt(ont.UpstreamFecUncorrectedCodeWords) > 10 ? 'text-amber-600' : ''}>
                                                      {ont.UpstreamFecUncorrectedCodeWords || '0'}
                                                    </span>
                                                    {ont._trends && ont._trends.us_fec_change !== null && ont._trends.us_fec_change !== 0 && (
                                                      <span className={`text-[9px] ${ont._trends.us_fec_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {ont._trends.us_fec_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.us_fec_change)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                  <div className="flex flex-col items-end gap-0.5">
                                                    <span className={parseInt(ont.DownstreamFecUncorrectedCodeWords) > 10 ? 'text-amber-600' : ''}>
                                                      {ont.DownstreamFecUncorrectedCodeWords || '0'}
                                                    </span>
                                                    {ont._trends && ont._trends.ds_fec_change !== null && ont._trends.ds_fec_change !== 0 && (
                                                      <span className={`text-[9px] ${ont._trends.ds_fec_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {ont._trends.ds_fec_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.ds_fec_change)}
                                                      </span>
                                                    )}
                                                  </div>
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
                                                <TableCell>
                                                  <div className="flex gap-1">
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={(e) => { e.stopPropagation(); setSelectedOntDetail(ont); }}
                                                      className="text-xs h-7 gap-1"
                                                    >
                                                      <Activity className="h-3 w-3" />
                                                      Details
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={(e) => { e.stopPropagation(); createJobReportForONT(ont); }}
                                                      className="text-xs h-7 gap-1"
                                                    >
                                                      <Clipboard className="h-3 w-3" />
                                                      Job
                                                    </Button>
                                                  </div>
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
                onClick={() => {
                  setResult(null);
                  setSelectedReportId(null);
                }}
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
            onReportSelected={async (report) => {
              // Close dialog immediately so loading state is visible
              setShowHistoricalReports(false);
              setIsLoading(true);
              toast.loading('Loading report...', { id: 'load-report' });
              try {
                // Re-parse the saved file to get full analysis (doesn't save to sessionStorage anymore)
                const response = await base44.functions.invoke('parsePonPm', { file_url: report.file_url });
                
                if (response.data?.success && response.data?.onts && response.data?.summary) {
                  setResult(response.data);
                  setSelectedReportId(report.id);
                  setExpandedOlts([]);
                  setExpandedPorts([]);
                  setIsLoading(false);
                  toast.success('Report loaded', { id: 'load-report' });
                } else {
                  toast.error(response.data?.error || 'Failed to parse report', { id: 'load-report' });
                  setIsLoading(false);
                }
              } catch (error) {
                console.error('Load report error:', error);
                toast.error(`Failed to load report: ${error.message}`, { id: 'load-report' });
                setIsLoading(false);
              }
            }}
            onClose={() => setShowHistoricalReports(false)}
          />
        )}

        {/* Historical Trends Component */}
        {showTrends && savedReports.length >= 1 && (
          <HistoricalTrends 
            reports={savedReports} 
            onClose={() => setShowTrends(false)} 
          />
        )}
      </main>
      
      {/* ONT Detail View */}
      {selectedOntDetail && (
        <ONTDetailView 
          ont={selectedOntDetail} 
          onClose={() => setSelectedOntDetail(null)} 
        />
      )}

      {/* Job Report Creation Dialog */}
      <Dialog open={!!creatingJobReport} onOpenChange={(open) => {
        if (!open) {
          setCreatingJobReport(null);
          setJobReportFormData(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Create Job Report - AI Pre-filled
            </DialogTitle>
          </DialogHeader>
          {generatingReport ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-500">AI is analyzing ONT data and generating report...</p>
            </div>
          ) : jobReportFormData ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <Sparkles className="h-4 w-4 inline mr-1" />
                  This report has been pre-filled with AI-generated diagnosis and recommendations based on ONT performance data. Review and adjust as needed.
                </p>
              </div>
              <ReportForm
                formData={jobReportFormData}
                setFormData={setJobReportFormData}
                onSubmit={handleJobReportSubmit}
                onCancel={() => {
                  setCreatingJobReport(null);
                  setJobReportFormData(null);
                }}
                isEditing={false}
                isSubmitting={false}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}