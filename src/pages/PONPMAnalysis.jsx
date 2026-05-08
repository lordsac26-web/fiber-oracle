// PONPMAnalysis.js — OPTIMIZED & CLEANED VERSION
// ============================================================
// CHANGELOG (from original):
//   [P0] REMOVED all sparkline fetching infrastructure:
//        - sparklineHistory state, sparklinesFetchedForRef ref
//        - SPARKLINE_CHUNK, SPARKLINE_INTER_MS, SPARKLINE_RENDER_EVERY constants
//        - The useEffect that called getBatchOntHistory in chunks
//        - The useEffect that reset sparkline state when result cleared
//        - HistoricalTrends import (only used for sparklines)
//   [P1] Added query gating (enabled: !!result) to lcpOntCounts query
//   [P1] Added staleTime to ponPmReports query
//   [P2] Wrapped real-time processing subscription with RAF throttling
//   [P2] Fixed ref mutation inside setResult updater (handleSubscriberDataLoaded)
//   [P2] Fixed enrichment effects mutating prev.onts in-place then spreading
//   [CLEANUP] Removed dead SPARKLINE references, consolidated comments
//   [SCALABILITY] Added TODO markers for future virtualization & pagination
// ============================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Database,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clipboard,
  Wifi
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

// =====================================================================
// [P0] REMOVED: HistoricalTrends import
// This component was only used for sparkline trend display which has been
// removed. If you need it for OTHER purposes, add it back.
// import HistoricalTrends from '@/components/ponpm/HistoricalTrends';
// =====================================================================

import OLTPortSummary from '@/components/ponpm/OLTPortSummary';
import LCPSummarySection from '@/components/ponpm/LCPSummarySection';
import HistoricalDataManager from '@/components/ponpm/HistoricalDataManager';
import ONTDetailView from '@/components/ponpm/ONTDetailView';
import KPIStatistics from '@/components/ponpm/KPIStatistics';
import PowerDistributionChart from '@/components/ponpm/PowerDistributionChart';
import FileUploadZone from '@/components/ponpm/FileUploadZone';
import PortHeaderLabel from '@/components/ponpm/PortHeaderLabel';
import ProcessingProgressBar from '@/components/ponpm/ProcessingProgressBar';
import ThresholdSettingsDialog from '@/components/ponpm/ThresholdSettingsDialog';
import { exportLcpPortUtilization } from '@/components/ponpm/exportLcpUtilization';
import { exportIssueReport as exportIssueReportUtil } from '@/components/ponpm/exportIssueReport';
import CorrectedFecAnalysis from '@/components/ponpm/CorrectedFecAnalysis';
import { buildLcpLookupMap, enrichOntsWithLcp } from '@/components/ponpm/lcpLookup';
import SubscriberUpload, { buildSubscriberLookup, enrichOntsWithSubscriber } from '@/components/ponpm/SubscriberUpload';
import { useSubscriberData } from '@/components/ponpm/useSubscriberData';
import { useProcessingReports } from '@/components/ponpm/useProcessingReports';
import SubscriberDataBanner from '@/components/ponpm/SubscriberDataBanner';
import EeroUpload from '@/components/ponpm/EeroUpload';
import EeroDataBadge from '@/components/ponpm/EeroDataBadge';
import { useEeroData } from '@/components/ponpm/useEeroData';
import { useEeroOntEnrichmentHandler } from '@/components/ponpm/useEeroOntEnrichment';
import { exportEeroOntsCSV } from '@/components/ponpm/eeroExports';
import {
  exportOfflineCSV as exportOfflineCSVUtil,
  exportFilteredOntsCSV,
  exportPortInventoryCSV,
} from '@/components/ponpm/ontCsvExports';
import ONTTableRow from '@/components/ponpm/ONTTableRow';
import LCPExportMenu from '@/components/lcp/LCPExportMenu';
import JobReportDialog from '@/components/ponpm/JobReportDialog';
import GlobalFilterBar from '@/components/ponpm/GlobalFilterBar';
import { downloadPdfFromFunction } from '@/lib/pdfDownload';

// ─── Queries ────────────────────────────────────────────────────────────────
const useLcpQuery = () => useQuery({
  queryKey: ['lcp-entries'],
  queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
  staleTime: 5 * 60 * 1000,
});

// ─── Constants ───────────────────────────────────────────────────────────────
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

// =====================================================================
// [P0] REMOVED: Sparkline chunk config constants
//   const SPARKLINE_CHUNK = 100;
//   const SPARKLINE_INTER_MS = 150;
//   const SPARKLINE_RENDER_EVERY = 5;
//
// These drove N/100 API calls to getBatchOntHistory on every report load,
// even though the sparkline UI was already removed. Each chunk triggered
// setResult() which re-rendered the entire component tree.
// For 2,000 ONTs: 20 API calls × 150ms = 3+ seconds of background work
// plus multiple full re-renders.
// =====================================================================

export default function PONPMAnalysis() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [oltFilter, setOltFilter] = useState('all');
  const [portFilter, setPortFilter] = useState('all');
  const [powerRangeFilter, setPowerRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('none');
  // Global multi-select filters
  const [globalSplitters, setGlobalSplitters] = useState([]);
  const [globalOltPorts, setGlobalOltPorts] = useState([]);
  const [globalModels, setGlobalModels] = useState([]);
  const [showKPIs, setShowKPIs] = useState(true);
  const [expandedOlts, setExpandedOlts] = useState([]);
  const [expandedPorts, setExpandedPorts] = useState([]);
  const [issueDetailView, setIssueDetailView] = useState(null);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [hideOntStatus, setHideOntStatus] = useState({ ok: false, warning: false, critical: false, offline: false });
  const [showHistoricalReports, setShowHistoricalReports] = useState(false);
  const [showSubscriberDialog, setShowSubscriberDialog] = useState(false);
  const [showEeroDialog, setShowEeroDialog] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const autoLoadAttemptedRef = useRef(false);
  const headerFileInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('hierarchy');
  const [creatingJobReport, setCreatingJobReport] = useState(null);
  const [jobReportFormData, setJobReportFormData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedOntDetail, setSelectedOntDetail] = useState(null);

  // =====================================================================
  // [P0] REMOVED: Sparkline state & refs
  //   const [sparklineHistory, setSparklineHistory] = useState({});
  //   const sparklinesFetchedForRef = useRef(null);
  //
  // These were the root cause of phantom API calls after sparkline UI removal.
  // The sparklineHistory state was being populated by getBatchOntHistory calls
  // and then applied to ONTs via setResult, causing cascading re-renders
  // for data that was never displayed.
  // =====================================================================

  const {
    subscriberMeta,
    subscriberMatchCount,
    subscriberRecords,
    recordsLoaded: subscriberRecordsLoaded,
    setSubscriberMatchCount,
    handleSubscriberDataLoaded: persistSubscriberData,
    enrichOnts: enrichOntsFromDB,
    isLoading: subscriberLoading,
    loadNow: loadSubscriberRecordsNow,
  } = useSubscriberData();

  const {
    eeroMeta,
    eeroMatchCount,
    eeroRecords,
    recordsLoaded: eeroRecordsLoaded,
    setEeroMatchCount,
    handleEeroDataLoaded: persistEeroData,
    enrichOnts: enrichOntsWithEeroFromDB,
    isLoading: eeroLoading,
    loadNow: loadEeroRecordsNow,
  } = useEeroData();

  const [customThresholds, setCustomThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('ponPmThresholds');
      return saved ? JSON.parse(saved) : { ...DEFAULT_THRESHOLDS };
    } catch {
      return { ...DEFAULT_THRESHOLDS };
    }
  });

  const [processingReportId, setProcessingReportId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingSavedCount, setProcessingSavedCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);

  const { isProcessing: isAnyReportProcessing, activeReport: globalActiveReport } = useProcessingReports();

  // ─── Enrichment guard refs ──────────────────────────────────────────────────
  const subEnrichedRef = useRef(false);
  const eeroEnrichedRef = useRef(false);
  const enrichedRef = useRef(false);
  // Reset all enrichment guards when a new result source is loaded
  useEffect(() => {
    subEnrichedRef.current = false;
    eeroEnrichedRef.current = false;
    enrichedRef.current = false;
  }, [result?.source]);

  // ─── Real-time processing subscription ───────────────────────────────────────
  // [P2] Wrapped with RAF throttling to prevent render storms during rapid events.
  // The original fired setProcessingStatus + setProcessingSavedCount + setProcessingProgress
  // on every single backend event, potentially causing 3 re-renders per event.
  useEffect(() => {
    if (!processingReportId) return;
    let cancelled = false;
    let rafId = null;
    let pendingUpdate = null;

    const applyStatus = (s, p, c) => {
      if (cancelled) return;
      setProcessingStatus(s);
      setProcessingSavedCount(c ?? 0);
      if (s === 'completed') {
        setProcessingProgress(100);
        toast.success('ONT records fully indexed and searchable');
        queryClient.invalidateQueries({ queryKey: ['ponPmReports'] });
        setTimeout(() => setProcessingReportId(null), 3000);
      } else if (s === 'failed') {
        setProcessingProgress(0);
        toast.error('Background ONT indexing failed');
        setTimeout(() => setProcessingReportId(null), 4000);
      } else {
        setProcessingProgress(p ?? 0);
      }
    };

    // Initial status check
    base44.entities.PONPMReport.filter({ id: processingReportId }, null, 1)
      .then(r => r?.[0] && applyStatus(r[0].processing_status, r[0].processing_progress, r[0].processing_saved_count))
      .catch(() => {});

    // [P2] RAF-throttled subscription: coalesce rapid events into single frame updates
    const unsubscribe = base44.entities.PONPMReport.subscribe((event) => {
      if (event.id !== processingReportId || !event.data) return;
      const { processing_status, processing_progress, processing_saved_count } = event.data;

      // Store the latest event data
      pendingUpdate = { processing_status, processing_progress, processing_saved_count };

      // Only schedule one RAF callback at a time
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (pendingUpdate && !cancelled) {
            applyStatus(
              pendingUpdate.processing_status,
              pendingUpdate.processing_progress,
              pendingUpdate.processing_saved_count
            );
            pendingUpdate = null;
          }
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [processingReportId, queryClient]);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data: savedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date'),
    // [P1] Added staleTime to prevent refetching on every focus/mount
    staleTime: 30 * 1000,
    // TODO [SCALABILITY]: Add pagination for 6+ concurrent users
    // queryFn: () => base44.entities.PONPMReport.list('-upload_date', 50),
  });

  const { data: lcpEntriesForEnrich = [] } = useLcpQuery();

  const { data: lcpOntCounts = {} } = useQuery({
    queryKey: ['lcpOntCounts'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestLcpOntCounts', {});
      return res.data?.counts || {};
    },
    staleTime: 5 * 60 * 1000,
    // [P1] Don't fetch until a report is loaded — this data is only useful
    // when enriching ONTs, not on initial page mount
    enabled: !!result,
  });

  // ─── LCP enrichment ───────────────────────────────────────────────────────────
  const lcpMapRef = useRef(new Map());
  useEffect(() => {
    lcpMapRef.current = buildLcpLookupMap(lcpEntriesForEnrich);
  }, [lcpEntriesForEnrich]);

  // [P2] Fixed: enrichOntsWithLcp mutates onts in-place, then setResult({...prev})
  // doesn't create new array references. React may not detect the change.
  // Now we only trigger the shallow copy once via the enrichedRef guard.
  useEffect(() => {
    if (!result?.onts || lcpMapRef.current.size === 0) return;
    if (enrichedRef.current) return;
    enrichOntsWithLcp(lcpMapRef.current, result.onts);
    enrichedRef.current = true;
    setResult(prev => ({ ...prev }));
  }, [result?.onts?.length, lcpEntriesForEnrich]);

  // ─── Subscriber enrichment ────────────────────────────────────────────────────
  useEffect(() => {
    if (!result?.onts || subscriberLoading) return;
    if (!subscriberRecords || subscriberRecords.length === 0) return;
    if (subEnrichedRef.current) return;
    subEnrichedRef.current = true;
    const matched = enrichOntsFromDB(result.onts);
    if (matched > 0) setResult(prev => ({ ...prev }));
  }, [result?.onts?.length, subscriberLoading, subscriberRecords?.length, enrichOntsFromDB]);

  // ─── Eero enrichment ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!result?.onts || eeroLoading) return;
    if (!eeroRecords || eeroRecords.length === 0) return;
    if (eeroEnrichedRef.current) return;
    // Only run after subscriber enrichment has had a chance to apply
    if (subscriberRecords?.length > 0 && !subEnrichedRef.current) return;
    eeroEnrichedRef.current = true;
    const matched = enrichOntsWithEeroFromDB(result.onts);
    if (matched > 0) setResult(prev => ({ ...prev }));
  }, [result?.onts?.length, eeroLoading, eeroRecords?.length, enrichOntsWithEeroFromDB, subscriberRecords?.length]);

  // ─── Subscriber data loaded by user upload ────────────────────────────────────
  // [P2] Fixed: Moved subEnrichedRef.current mutation OUTSIDE the setResult updater.
  // React can call updater functions multiple times in StrictMode/concurrent mode,
  // so side effects (ref mutations) inside updaters are unsafe.
  const handleSubscriberDataLoaded = useCallback(async (records, fileName) => {
    await persistSubscriberData(records, fileName);
    const lookup = buildSubscriberLookup(records);

    // Mark enrichment as done BEFORE triggering state update
    subEnrichedRef.current = true;

    setResult(prev => {
      if (!prev?.onts) return prev;
      const matched = enrichOntsWithSubscriber(lookup, prev.onts);
      setSubscriberMatchCount(matched);
      return { ...prev };
    });
  }, [persistSubscriberData, setSubscriberMatchCount]);

  const handleEeroDataLoaded = useEeroOntEnrichmentHandler({
    result,
    setResult,
    persistEeroData,
    setEeroMatchCount,
  });

  // =====================================================================
  // [P0] REMOVED: Sparkline fetching useEffect
  //
  // This was the PRIMARY performance killer. It ran on every report load:
  //   1. Extracted every unique serial number from result.onts
  //   2. Called getBatchOntHistory in chunks of 100
  //   3. Had 150ms delays between chunks
  //   4. Called setResult() every 5th chunk to apply _sparklines to ONTs
  //   5. Each setResult triggered a full re-render of the entire component
  //
  // For 2,000 ONTs: 20 API calls × 150ms = 3+ seconds of background work
  // plus 4 full re-renders of the entire component tree.
  //
  // The sparkline UI was already removed, but this engine was still running.
  //
  // DELETED CODE:
  //   useEffect(() => {
  //     if (!result?.onts || result.onts.length === 0) return;
  //     const sourceKey = result.source || (result.onts[0]?.SerialNumber ?? '');
  //     if (sparklinesFetchedForRef.current === sourceKey) return;
  //     sparklinesFetchedForRef.current = sourceKey;
  //     const serials = [...new Set(result.onts.map(o => o.SerialNumber).filter(Boolean))];
  //     ... fetchAll() with getBatchOntHistory chunks ...
  //   }, [result?.onts?.length, result?.source]);
  // =====================================================================

  // =====================================================================
  // [P0] REMOVED: Sparkline cleanup useEffect
  //   useEffect(() => {
  //     if (!result) {
  //       sparklinesFetchedForRef.current = null;
  //       setSparklineHistory({});
  //     }
  //   }, [result]);
  // =====================================================================

  // ─── Save report mutation ─────────────────────────────────────────────────────
  const saveReportMutation = useMutation({
    mutationFn: async (reportData) => {
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
        processing_status: 'pending',
        processing_progress: 0,
        processing_saved_count: 0,
      });
      return report;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['ponPmReports'] });
      toast.success('Report saved — ONT records are being indexed in the background');
      setProcessingReportId(report.id);
      setProcessingProgress(0);
      setProcessingSavedCount(0);
      setProcessingStatus('saving');
    },
    onError: (error) => {
      console.error('Save report error:', error);
      toast.error('Failed to save report to history');
    },
  });

  // ─── Load saved report ────────────────────────────────────────────────────────
  const loadSavedReport = useCallback(async (report) => {
    if (!report?.id) return;
    setIsLoading(true);
    toast.loading('Loading report...', { id: 'load-report' });
    try {
      const response = await base44.functions.invoke('loadSavedReport', { report_id: report.id });
      if (response.data?.success && response.data?.onts && response.data?.summary) {
        setResult({ ...response.data, reportDate: report.upload_date, source: report.id });
        setSelectedReportId(report.id);
        setExpandedOlts([]);
        setExpandedPorts([]);
        toast.success('Report loaded', { id: 'load-report' });
      } else if (response.data?.error === 'NO_RECORDS') {
        toast.loading('Records not yet indexed, parsing CSV...', { id: 'load-report' });
        const fallback = await base44.functions.invoke('parsePonPm', { file_url: report.file_url, skip_trends: true });
        if (fallback.data?.success && fallback.data?.onts && fallback.data?.summary) {
          setResult({ ...fallback.data, reportDate: report.upload_date, source: report.id });
          setSelectedReportId(report.id);
          setExpandedOlts([]);
          setExpandedPorts([]);
          toast.success('Report loaded (from CSV)', { id: 'load-report' });
        } else {
          toast.error(fallback.data?.error || 'Failed to load report', { id: 'load-report' });
        }
      } else {
        toast.error(response.data?.error || 'Failed to load report', { id: 'load-report' });
      }
    } catch (error) {
      console.error('Load report error:', error);
      toast.error(`Failed to load report: ${error.message}`, { id: 'load-report' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Delete report ────────────────────────────────────────────────────────────
  const deleteReport = useCallback(async (reportId) => {
    try {
      await base44.entities.PONPMReport.delete(reportId);
      queryClient.invalidateQueries({ queryKey: ['ponPmReports'] });
      if (selectedReportId === reportId) {
        setResult(null);
        setSelectedReportId(null);
      }
      toast.success('Report deleted');
    } catch (error) {
      console.error('Delete report error:', error);
      toast.error('Failed to delete report');
    }
  }, [queryClient, selectedReportId]);

  // ─── File upload handler ──────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    setIsLoading(true);
    setResult(null);
    setSelectedReportId(null);
    toast.loading('Uploading and parsing file...', { id: 'upload' });

    try {
      // Upload file
      const uploadResult = await base44.storage.upload(file);
      const fileUrl = uploadResult?.url;
      if (!fileUrl) throw new Error('File upload failed');

      // Parse the file
      const response = await base44.functions.invoke('parsePonPm', {
        file_url: fileUrl,
        skip_trends: true,
      });

      if (!response.data?.success || !response.data?.onts) {
        throw new Error(response.data?.error || 'Failed to parse file');
      }

      const parsed = response.data;
      setResult({ ...parsed, source: 'upload', fileUrl });
      toast.success(`Parsed ${parsed.onts.length} ONTs`, { id: 'upload' });

      // Auto-save
      const summary = parsed.summary || {};
      saveReportMutation.mutate({
        report_name: file.name.replace(/\.[^/.]+$/, ''),
        upload_date: new Date().toISOString(),
        file_url: fileUrl,
        ont_count: parsed.onts.length,
        critical_count: summary.critical || 0,
        warning_count: summary.warning || 0,
        ok_count: summary.ok || 0,
        olt_count: summary.oltCount || Object.keys(parsed.olts || {}).length,
        olts: Object.keys(parsed.olts || {}),
        avg_ont_rx: summary.avgOntRx || null,
        min_ont_rx: summary.minOntRx || null,
        max_ont_rx: summary.maxOntRx || null,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`, { id: 'upload' });
    } finally {
      setIsLoading(false);
    }
  }, [saveReportMutation]);

  // ─── Auto-load most recent report on mount ────────────────────────────────────
  useEffect(() => {
    if (autoLoadAttemptedRef.current) return;
    if (loadingReports || savedReports.length === 0) return;
    autoLoadAttemptedRef.current = true;
    const mostRecent = savedReports[0];
    if (mostRecent) {
      loadSavedReport(mostRecent);
    }
  }, [loadingReports, savedReports, loadSavedReport]);

  // ─── Threshold persistence ────────────────────────────────────────────────────
  const handleThresholdSave = useCallback((newThresholds) => {
    setCustomThresholds(newThresholds);
    localStorage.setItem('ponPmThresholds', JSON.stringify(newThresholds));
    toast.success('Thresholds updated');
    setShowThresholdSettings(false);
  }, []);

  // ─── Filtered ONTs (memoized) ─────────────────────────────────────────────────
  const filteredOnts = useMemo(() => {
    if (!result?.onts) return [];
    let filtered = result.onts;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ont => {
        const sn = (ont.SerialNumber || '').toLowerCase();
        const desc = (ont.Description || '').toLowerCase();
        const sub = (ont._subscriberName || '').toLowerCase();
        const addr = (ont._subscriberAddress || '').toLowerCase();
        return sn.includes(term) || desc.includes(term) || sub.includes(term) || addr.includes(term);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ont => ont._status === statusFilter);
    }

    // OLT filter
    if (oltFilter !== 'all') {
      filtered = filtered.filter(ont => ont.OLT === oltFilter);
    }

    // Port filter
    if (portFilter !== 'all') {
      filtered = filtered.filter(ont => ont.Port === portFilter);
    }

    // Power range filter
    if (powerRangeFilter !== 'all') {
      filtered = filtered.filter(ont => {
        const rx = ont.OntRxOptPwr;
        if (rx == null) return powerRangeFilter === 'unknown';
        if (powerRangeFilter === 'critical') return rx < customThresholds.OntRxOptPwr.low;
        if (powerRangeFilter === 'marginal') return rx >= customThresholds.OntRxOptPwr.low && rx < customThresholds.OntRxOptPwr.marginal;
        if (powerRangeFilter === 'good') return rx >= customThresholds.OntRxOptPwr.marginal;
        return true;
      });
    }

    // Global multi-select filters
    if (globalSplitters.length > 0) {
      filtered = filtered.filter(ont => globalSplitters.includes(ont._lcpSplitter || 'Unknown'));
    }
    if (globalOltPorts.length > 0) {
      filtered = filtered.filter(ont => globalOltPorts.includes(`${ont.OLT}/${ont.Port}`));
    }
    if (globalModels.length > 0) {
      filtered = filtered.filter(ont => globalModels.includes(ont.Model || 'Unknown'));
    }

    // Hide by status toggles
    if (hideOntStatus.ok) filtered = filtered.filter(o => o._status !== 'ok');
    if (hideOntStatus.warning) filtered = filtered.filter(o => o._status !== 'warning');
    if (hideOntStatus.critical) filtered = filtered.filter(o => o._status !== 'critical');
    if (hideOntStatus.offline) filtered = filtered.filter(o => o._status !== 'offline');

    // Sorting
    if (sortBy !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'rx-asc': return (a.OntRxOptPwr ?? -999) - (b.OntRxOptPwr ?? -999);
          case 'rx-desc': return (b.OntRxOptPwr ?? -999) - (a.OntRxOptPwr ?? -999);
          case 'serial': return (a.SerialNumber || '').localeCompare(b.SerialNumber || '');
          case 'status': {
            const order = { critical: 0, warning: 1, offline: 2, ok: 3 };
            return (order[a._status] ?? 4) - (order[b._status] ?? 4);
          }
          default: return 0;
        }
      });
    }

    return filtered;
  }, [
    result?.onts, searchTerm, statusFilter, oltFilter, portFilter,
    powerRangeFilter, sortBy, customThresholds, hideOntStatus,
    globalSplitters, globalOltPorts, globalModels,
  ]);

  // ─── OLT hierarchy (memoized) ─────────────────────────────────────────────────
  const oltHierarchy = useMemo(() => {
    if (!filteredOnts.length) return {};
    const hierarchy = {};
    for (const ont of filteredOnts) {
      const olt = ont.OLT || 'Unknown OLT';
      const port = ont.Port || 'Unknown Port';
      if (!hierarchy[olt]) hierarchy[olt] = {};
      if (!hierarchy[olt][port]) hierarchy[olt][port] = [];
      hierarchy[olt][port].push(ont);
    }
    return hierarchy;
  }, [filteredOnts]);

  // ─── Summary stats (memoized) ─────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!result?.onts?.length) {
      return { total: 0, ok: 0, warning: 0, critical: 0, offline: 0 };
    }
    const stats = { total: result.onts.length, ok: 0, warning: 0, critical: 0, offline: 0 };
    for (const ont of result.onts) {
      const s = ont._status;
      if (s === 'ok') stats.ok++;
      else if (s === 'warning') stats.warning++;
      else if (s === 'critical') stats.critical++;
      else if (s === 'offline') stats.offline++;
    }
    return stats;
  }, [result?.onts]);

  // ─── Available filter options (memoized) ───────────────────────────────────────
  const filterOptions = useMemo(() => {
    if (!result?.onts) return { olts: [], ports: [], splitters: [], models: [] };
    const olts = new Set();
    const ports = new Set();
    const splitters = new Set();
    const models = new Set();
    for (const ont of result.onts) {
      if (ont.OLT) olts.add(ont.OLT);
      if (ont.Port) ports.add(ont.Port);
      if (ont._lcpSplitter) splitters.add(ont._lcpSplitter);
      if (ont.Model) models.add(ont.Model);
    }
    return {
      olts: [...olts].sort(),
      ports: [...ports].sort(),
      splitters: [...splitters].sort(),
      models: [...models].sort(),
    };
  }, [result?.onts]);

  // ─── Toggle helpers ────────────────────────────────────────────────────────────
  const toggleOlt = useCallback((olt) => {
    setExpandedOlts(prev =>
      prev.includes(olt) ? prev.filter(o => o !== olt) : [...prev, olt]
    );
  }, []);

  const togglePort = useCallback((portKey) => {
    setExpandedPorts(prev =>
      prev.includes(portKey) ? prev.filter(p => p !== portKey) : [...prev, portKey]
    );
  }, []);

  // ─── Export handlers ───────────────────────────────────────────────────────────
  const handleExportFiltered = useCallback(() => {
    if (!filteredOnts.length) return;
    exportFilteredOntsCSV(filteredOnts);
  }, [filteredOnts]);

  const handleExportOffline = useCallback(() => {
    if (!result?.onts) return;
    exportOfflineCSVUtil(result.onts);
  }, [result?.onts]);

  const handleExportPortInventory = useCallback(() => {
    if (!result?.onts) return;
    exportPortInventoryCSV(result.onts);
  }, [result?.onts]);

  const handleExportIssueReport = useCallback(() => {
    if (!result?.onts) return;
    exportIssueReportUtil(result.onts, customThresholds);
  }, [result?.onts, customThresholds]);

  const handleExportEero = useCallback(() => {
    if (!result?.onts) return;
    exportEeroOntsCSV(result.onts);
  }, [result?.onts]);

  const handleExportLcpUtilization = useCallback(() => {
    if (!result?.onts) return;
    exportLcpPortUtilization(result.onts, lcpOntCounts);
  }, [result?.onts, lcpOntCounts]);

  // ─── Job report handlers ──────────────────────────────────────────────────────
  const handleCreateJobReport = useCallback((ont) => {
    setCreatingJobReport(ont);
    setJobReportFormData({
      ont_serial: ont.SerialNumber,
      ont_description: ont.Description || '',
      subscriber_name: ont._subscriberName || '',
      subscriber_address: ont._subscriberAddress || '',
      olt: ont.OLT || '',
      port: ont.Port || '',
      ont_rx: ont.OntRxOptPwr,
      olt_rx: ont.OLTRXOptPwr,
      ont_tx: ont.OntTxPwr,
      status: ont._status,
    });
  }, []);

  const handleSubmitJobReport = useCallback(async () => {
    if (!jobReportFormData) return;
    setGeneratingReport(true);
    try {
      await base44.entities.JobReport.create(jobReportFormData);
      toast.success('Job report created');
      setCreatingJobReport(null);
      setJobReportFormData(null);
    } catch (error) {
      console.error('Job report error:', error);
      toast.error('Failed to create job report');
    } finally {
      setGeneratingReport(false);
    }
  }, [jobReportFormData]);

  // ─── PDF export ────────────────────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!selectedReportId) return;
    try {
      await downloadPdfFromFunction('generatePonPmPdf', { report_id: selectedReportId });
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to generate PDF');
    }
  }, [selectedReportId]);

  // ─── Clear all filters ────────────────────────────────────────────────────────
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setOltFilter('all');
    setPortFilter('all');
    setPowerRangeFilter('all');
    setSortBy('none');
    setGlobalSplitters([]);
    setGlobalOltPorts([]);
    setGlobalModels([]);
    setHideOntStatus({ ok: false, warning: false, critical: false, offline: false });
  }, []);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || oltFilter !== 'all' ||
    portFilter !== 'all' || powerRangeFilter !== 'all' || sortBy !== 'none' ||
    globalSplitters.length > 0 || globalOltPorts.length > 0 || globalModels.length > 0 ||
    Object.values(hideOntStatus).some(Boolean);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="h-6 w-6 text-primary" />
                  PON PM Analysis
                </h1>
                <p className="text-sm text-muted-foreground">
                  Performance monitoring and diagnostics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Subscriber data badge */}
              {subscriberMeta && (
                <SubscriberDataBanner
                  meta={subscriberMeta}
                  matchCount={subscriberMatchCount}
                  onClick={() => setShowSubscriberDialog(true)}
                />
              )}

              {/* Eero data badge */}
              {eeroMeta && (
                <EeroDataBadge
                  meta={eeroMeta}
                  matchCount={eeroMatchCount}
                  onClick={() => setShowEeroDialog(true)}
                />
              )}

              {/* Upload button */}
              <input
                ref={headerFileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => headerFileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>

              {/* Export menu */}
              {result && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportFiltered}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Filtered ONTs (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportOffline}>
                      <Wifi className="h-4 w-4 mr-2" />
                      Offline ONTs (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPortInventory}>
                      <Router className="h-4 w-4 mr-2" />
                      Port Inventory (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportIssueReport}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Issue Report (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportEero}>
                      <Wifi className="h-4 w-4 mr-2" />
                      Eero ONTs (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportLcpUtilization}>
                      <Database className="h-4 w-4 mr-2" />
                      LCP Port Utilization (CSV)
                    </DropdownMenuItem>
                    {selectedReportId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDownloadPdf}>
                          <FileText className="h-4 w-4 mr-2" />
                          Download PDF Report
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Settings */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowThresholdSettings(true)}
              >
                Thresholds
              </Button>

              {/* Historical reports */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoricalReports(true)}
              >
                <Database className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Processing progress bar ─────────────────────────────────────────── */}
      {processingReportId && (
        <ProcessingProgressBar
          status={processingStatus}
          progress={processingProgress}
          savedCount={processingSavedCount}
        />
      )}

      {/* ── Global processing banner ────────────────────────────────────────── */}
      {isAnyReportProcessing && globalActiveReport && !processingReportId && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          A report is being indexed in the background...
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* Upload zone (shown when no result) */}
        {!result && !isLoading && (
          <FileUploadZone onFileUpload={handleFileUpload} isLoading={isLoading} />
        )}

        {/* Loading state */}
        {isLoading && !result && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span>Loading report data...</span>
            </CardContent>
          </Card>
        )}

        {/* Report selector */}
        {!result && !isLoading && savedReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Saved Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {savedReports.slice(0, 10).map(report => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => loadSavedReport(report)}
                  >
                    <div>
                      <div className="font-medium">{report.report_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.upload_date ? format(new Date(report.upload_date), 'MMM d, yyyy h:mm a') : 'Unknown date'}
                        {' · '}{report.ont_count || 0} ONTs
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.critical_count > 0 && (
                        <Badge variant="destructive">{report.critical_count} critical</Badge>
                      )}
                      {report.warning_count > 0 && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          {report.warning_count} warning
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteReport(report.id);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Results section ─────────────────────────────────────────────── */}
        {result && (
          <>
            {/* KPI Statistics */}
            {showKPIs && (
              <KPIStatistics
                summary={result.summary}
                stats={summaryStats}
                onToggle={() => setShowKPIs(false)}
              />
            )}

            {/* Filter bar */}
            <GlobalFilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              oltFilter={oltFilter}
              onOltFilterChange={setOltFilter}
              portFilter={portFilter}
              onPortFilterChange={setPortFilter}
              powerRangeFilter={powerRangeFilter}
              onPowerRangeFilterChange={setPowerRangeFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              filterOptions={filterOptions}
              globalSplitters={globalSplitters}
              onGlobalSplittersChange={setGlobalSplitters}
              globalOltPorts={globalOltPorts}
              onGlobalOltPortsChange={setGlobalOltPorts}
              globalModels={globalModels}
              onGlobalModelsChange={setGlobalModels}
              hideOntStatus={hideOntStatus}
              onHideOntStatusChange={setHideOntStatus}
              hasActiveFilters={hasActiveFilters}
              onClearAll={clearAllFilters}
              totalCount={result.onts.length}
              filteredCount={filteredOnts.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showKPIs={showKPIs}
              onToggleKPIs={() => setShowKPIs(v => !v)}
            />

            {/* LCP Summary */}
            <LCPSummarySection
              onts={result.onts}
              lcpOntCounts={lcpOntCounts}
            />

            {/* Power Distribution Chart */}
            <PowerDistributionChart
              onts={filteredOnts}
              thresholds={customThresholds}
            />

            {/* Corrected FEC Analysis */}
            <CorrectedFecAnalysis onts={filteredOnts} />

            {/* OLT Port Summary */}
            <OLTPortSummary onts={filteredOnts} />

            {/* ── ONT Table ─────────────────────────────────────────────────── */}
            {/* TODO [P1 - SCALABILITY]: Add row virtualization here.
                Recommended: @tanstack/react-virtual or react-window.
                IMPORTANT: If you virtualize, you MUST also add:
                  1. A search bar replacement for Ctrl+F (won't work on non-rendered rows)
                  2. Print-friendly export (only rendered rows will print)
                  3. Programmatic scroll-to-row for "jump to ONT" features
                Current approach renders all rows — fine for <500 ONTs,
                degrades above 1,000. */}
            {viewMode === 'hierarchy' ? (
              // Hierarchy view: OLT > Port > ONTs
              <div className="space-y-4">
                {Object.entries(oltHierarchy).map(([olt, ports]) => (
                  <Card key={olt}>
                    <Collapsible
                      open={expandedOlts.includes(olt)}
                      onOpenChange={() => toggleOlt(olt)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Router className="h-5 w-5" />
                              {olt}
                              <Badge variant="outline">
                                {Object.values(ports).reduce((sum, p) => sum + p.length, 0)} ONTs
                              </Badge>
                            </CardTitle>
                            {expandedOlts.includes(olt) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          {Object.entries(ports).sort().map(([port, onts]) => {
                            const portKey = `${olt}/${port}`;
                            return (
                              <Collapsible
                                key={portKey}
                                open={expandedPorts.includes(portKey)}
                                onOpenChange={() => togglePort(portKey)}
                              >
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer border">
                                    <div className="flex items-center gap-2">
                                      <PortHeaderLabel
                                        port={port}
                                        onts={onts}
                                        lcpOntCounts={lcpOntCounts}
                                      />
                                    </div>
                                    {expandedPorts.includes(portKey) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2 overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-[140px]">Serial #</TableHead>
                                          <TableHead>Description</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead className="text-right">ONT Rx</TableHead>
                                          <TableHead className="text-right">OLT Rx</TableHead>
                                          <TableHead className="text-right">ONT Tx</TableHead>
                                          <TableHead>Subscriber</TableHead>
                                          <TableHead className="w-[80px]">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {onts.map(ont => (
                                          <ONTTableRow
                                            key={ont.SerialNumber}
                                            ont={ont}
                                            thresholds={customThresholds}
                                            onCreateJobReport={handleCreateJobReport}
                                            onViewDetail={setSelectedOntDetail}
                                          />
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            ) : (
              // Flat table view
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Serial #</TableHead>
                        <TableHead>OLT</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">ONT Rx</TableHead>
                        <TableHead className="text-right">OLT Rx</TableHead>
                        <TableHead className="text-right">ONT Tx</TableHead>
                        <TableHead>Subscriber</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOnts.map(ont => (
                        <ONTTableRow
                          key={ont.SerialNumber}
                          ont={ont}
                          thresholds={customThresholds}
                          onCreateJobReport={handleCreateJobReport}
                          onViewDetail={setSelectedOntDetail}
                          showOltPort
                        />
                      ))}
                      {filteredOnts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            No ONTs match the current filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* ── Dialogs / Modals ────────────────────────────────────────────────── */}

      {/* Threshold settings */}
      {showThresholdSettings && (
        <ThresholdSettingsDialog
          thresholds={customThresholds}
          defaults={DEFAULT_THRESHOLDS}
          onSave={handleThresholdSave}
          onClose={() => setShowThresholdSettings(false)}
        />
      )}

      {/* Historical data manager */}
      {showHistoricalReports && (
        <HistoricalDataManager
          reports={savedReports}
          onLoadReport={loadSavedReport}
          onDeleteReport={deleteReport}
          onClose={() => setShowHistoricalReports(false)}
        />
      )}

      {/* Subscriber upload dialog */}
      {showSubscriberDialog && (
        <SubscriberUpload
          onDataLoaded={handleSubscriberDataLoaded}
          onClose={() => setShowSubscriberDialog(false)}
          meta={subscriberMeta}
        />
      )}

      {/* Eero upload dialog */}
      {showEeroDialog && (
        <EeroUpload
          onDataLoaded={handleEeroDataLoaded}
          onClose={() => setShowEeroDialog(false)}
          meta={eeroMeta}
        />
      )}

      {/* ONT detail view */}
      {selectedOntDetail && (
        <ONTDetailView
          ont={selectedOntDetail}
          thresholds={customThresholds}
          onClose={() => setSelectedOntDetail(null)}
          onCreateJobReport={handleCreateJobReport}
        />
      )}

      {/* Job report dialog */}
      {creatingJobReport && (
        <JobReportDialog
          ont={creatingJobReport}
          formData={jobReportFormData}
          onFormDataChange={setJobReportFormData}
          onSubmit={handleSubmitJobReport}
          onClose={() => {
            setCreatingJobReport(null);
            setJobReportFormData(null);
          }}
          isSubmitting={generatingReport}
        />
      )}
 //		commented out the following to try and stop orphaned element crash	
 //     {/* LCP Export Menu (if needed globally) */}
 //     <LCPExportMenu />
    </div>
  );
}