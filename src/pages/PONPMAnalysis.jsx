import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// Table + Select components moved into sub-components (VirtualizedONTTable, AdvancedFiltersBar)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  Wifi
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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
import VirtualizedONTTable from '@/components/ponpm/VirtualizedONTTable';
import UnifiedExportMenu from '@/components/ponpm/UnifiedExportMenu';
import GlobalFilterBar from '@/components/ponpm/GlobalFilterBar';
import SummaryCardsRow from '@/components/ponpm/SummaryCardsRow';
import IssueDetailPanel from '@/components/ponpm/IssueDetailPanel';
import NetworkHealthBar from '@/components/ponpm/NetworkHealthBar';
import AdvancedFiltersBar from '@/components/ponpm/AdvancedFiltersBar';
import { readFiltersFromUrl, useFilterUrlSync } from '@/hooks/useFilterUrlSync';
import { useNewReportToast } from '@/hooks/useNewReportToast';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import FlagOntDialog from '@/components/alerts/FlagOntDialog';
import { Flag, Bell, X, ShieldAlert } from 'lucide-react';
const useLcpQuery = () => useQuery({
  queryKey: ['lcp-entries'],
  queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
  staleTime: 5 * 60 * 1000,
  gcTime: Infinity, // LCP data is static reference data — keep cached for entire session
});

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
  const { isAdmin } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);

  // Read initial filter state from URL query params (enables shareable/bookmarkable views)
  const initialFilters = useRef(readFiltersFromUrl());

  const [searchTerm, setSearchTerm] = useState(initialFilters.current.searchTerm || '');
  // Debounced copy of searchTerm — feeds the heavy filteredOnts memo so typing
  // stays smooth on 7k+ ONT reports (the input itself stays fully responsive).
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const [statusFilter, setStatusFilter] = useState(initialFilters.current.statusFilter || 'all');
  const [oltFilter, setOltFilter] = useState(initialFilters.current.oltFilter || 'all');
  const [portFilter, setPortFilter] = useState(initialFilters.current.portFilter || 'all');
  const [powerRangeFilter, setPowerRangeFilter] = useState(initialFilters.current.powerRangeFilter || 'all');
  const [sortBy, setSortBy] = useState(initialFilters.current.sortBy || 'none');
  // Global multi-select filters — apply across the entire dashboard (KPIs, charts, hierarchy, LCP summary)
  const [globalSplitters, setGlobalSplitters] = useState(initialFilters.current.splitters || []);
  const [globalOltPorts, setGlobalOltPorts] = useState(initialFilters.current.oltPorts || []);
  const [globalModels, setGlobalModels] = useState(initialFilters.current.models || []);

  // Sync filter state → URL (debounced, replaceState)
  useFilterUrlSync({
    oltFilter, portFilter, statusFilter, powerRangeFilter,
    sortBy, searchTerm,
    globalSplitters, globalOltPorts, globalModels,
  });

  const [expandedOlts, setExpandedOlts] = useState([]);
  const [expandedPorts, setExpandedPorts] = useState([]);
  const [issueDetailView, setIssueDetailView] = useState(null);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [hideOntStatus, setHideOntStatus] = useState({ ok: false, warning: false, critical: false, offline: false });
  const [showHistoricalReports, setShowHistoricalReports] = useState(false);
  const [showSubscriberDialog, setShowSubscriberDialog] = useState(false);
  const [showEeroDialog, setShowEeroDialog] = useState(false);

  const autoLoadAttemptedRef = useRef(false);
  const headerFileInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('hierarchy');
  const [selectedOntDetail, setSelectedOntDetail] = useState(null);

  // ── ONT flagging / alerts (admin only) ──
  // selectMode shows checkboxes in the hierarchy table; selectedOnts holds the
  // chosen in-memory ONT objects (keyed by serial) for a bulk flag action.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedOnts, setSelectedOnts] = useState({}); // serial -> ont
  const [flagDialogOnts, setFlagDialogOnts] = useState(null); // array when dialog open

  const selectedSerials = useMemo(() => new Set(Object.keys(selectedOnts)), [selectedOnts]);
  const selectedCount = selectedSerials.size;

  const toggleSelectOnt = useCallback((ont) => {
    if (!ont?.SerialNumber) return;
    setSelectedOnts(prev => {
      const next = { ...prev };
      if (next[ont.SerialNumber]) delete next[ont.SerialNumber];
      else next[ont.SerialNumber] = ont;
      return next;
    });
  }, []);

  const toggleSelectMany = useCallback((onts) => {
    setSelectedOnts(prev => {
      const next = { ...prev };
      const allSelected = onts.length > 0 && onts.every(o => next[o.SerialNumber]);
      onts.forEach(o => {
        if (!o.SerialNumber) return;
        if (allSelected) delete next[o.SerialNumber];
        else next[o.SerialNumber] = o;
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedOnts({}), []);


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

  // Eero data — same architecture as subscriber data, matched via
  // subscriber AccountName ↔ eero home_identifier (so subscriber data must
  // be enriched first for eero matching to work).
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
    const saved = localStorage.getItem('ponPmThresholds');
    return saved ? JSON.parse(saved) : { ...DEFAULT_THRESHOLDS };
  });

  // Track the report currently being processed in the background
  const [processingReportId, setProcessingReportId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingSavedCount, setProcessingSavedCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);

  // Global cross-session detector — picks up any report still being indexed
  // even after a page refresh or navigation. Used to (a) keep the progress
  // banner visible and (b) block new uploads while indexing is in flight.
  const { isProcessing: isAnyReportProcessing, activeReport: globalActiveReport } = useProcessingReports();

  // Real-time subscription + initial poll for background indexing progress
  useEffect(() => {
    if (!processingReportId) return;
    let cancelled = false;
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
      } else { setProcessingProgress(p ?? 0); }
    };
    // Poll once immediately in case automation already finished before subscribe
    base44.entities.PONPMReport.filter({ id: processingReportId }, null, 1)
      .then(r => r?.[0] && applyStatus(r[0].processing_status, r[0].processing_progress, r[0].processing_saved_count))
      .catch(() => {});
    const unsubscribe = base44.entities.PONPMReport.subscribe((event) => {
      if (event.id !== processingReportId || !event.data) return;
      const { processing_status, processing_progress, processing_saved_count } = event.data;
      applyStatus(processing_status, processing_progress, processing_saved_count);
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [processingReportId, queryClient]);

  const { data: savedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date'),
    staleTime: 2 * 60 * 1000,
    gcTime: Infinity, // Persist report list across navigation for 8-user concurrent access
  });
  const { data: lcpEntriesForEnrich = [] } = useLcpQuery();
  const { data: lcpOntCounts = {} } = useQuery({
    queryKey: ['lcpOntCounts'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestLcpOntCounts', {});
      return res.data?.counts || {};
    },
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity, // Keep LCP ONT counts cached across navigation
    enabled: !!result,
  });
  const lcpMapRef = useRef(new Map());
  useEffect(() => { lcpMapRef.current = buildLcpLookupMap(lcpEntriesForEnrich); }, [lcpEntriesForEnrich]);
  const enrichedRef = useRef(false);
  useEffect(() => {
    if (!result?.onts || lcpMapRef.current.size === 0) return;
    enrichOntsWithLcp(lcpMapRef.current, result.onts);
    // Always trigger a re-render to pick up optic type updates (even on saved reports
    // where _lcpNumber is already set but _opticModel may not be populated)
    if (!enrichedRef.current) {
      enrichedRef.current = true;
      setResult(prev => ({ ...prev }));
    }
  }, [result?.onts?.length, lcpEntriesForEnrich]);
  useEffect(() => { enrichedRef.current = false; }, [result?.source]);

  // Subscriber data enrichment — uses persistent hook


  // Eero enrichment — runs AFTER subscriber enrichment because eero matches
  // via ont._subscriber.account ↔ home_identifier.
  const handleEeroDataLoaded = useEeroOntEnrichmentHandler({
    result,
    setResult,
    persistEeroData,
    setEeroMatchCount,
  });

  // Auto-enrich ONTs with eero when eero records are loaded.
  useEffect(() => {
    if (!result?.onts || eeroLoading) return;
    if (!eeroRecords || eeroRecords.length === 0) return;
    const matched = enrichOntsWithEeroFromDB(result.onts);
    if (matched > 0) setResult(prev => ({ ...prev }));
  }, [result?.onts?.length, eeroLoading, eeroRecords?.length, subscriberMatchCount, enrichOntsWithEeroFromDB]);

  // Auto-enrich ONTs when result loads OR when subscriber records become available.
  // Depend on subscriberRecords.length so that if records arrive AFTER the report
  // (common on auto-load, since both queries run in parallel), we still enrich.
  useEffect(() => {
    if (!result?.onts || subscriberLoading) return;
    if (!subscriberRecords || subscriberRecords.length === 0) return;
    const matched = enrichOntsFromDB(result.onts);
    if (matched > 0) setResult(prev => ({ ...prev }));
  }, [result?.onts?.length, subscriberLoading, subscriberRecords?.length, enrichOntsFromDB]);



  // Save report metadata, then kick off async background processing for ONT records
  const saveReportMutation = useMutation({
    mutationFn: async (reportData) => {
      // Create the report summary record immediately (fast)
      const report = await base44.entities.PONPMReport.create({
        report_name: reportData.report_name,
        upload_date: reportData.upload_date,
        file_url: reportData.file_url,
        thresholds_used: reportData.thresholds_used,
        ont_count: reportData.ont_count,
        critical_count: reportData.critical_count,
        warning_count: reportData.warning_count,
        ok_count: reportData.ok_count,
        olt_count: reportData.olt_count,
        olts: reportData.olts,
        avg_ont_rx: reportData.avg_ont_rx,
        min_ont_rx: reportData.min_ont_rx,
        max_ont_rx: reportData.max_ont_rx,
        gpon_count: reportData.gpon_count ?? 0,
        xgs_count: reportData.xgs_count ?? 0,
        processing_status: 'pending',
        processing_progress: 0,
        processing_saved_count: 0,
      });

      // Background processing is handled automatically by the entity automation
      // "Process PON PM Records on Report Create" which triggers processPonPmRecords
      // when a PONPMReport is created. No need to call it directly here.

      return report;
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['ponPmReports'] });
      toast.success('Report saved — ONT records are being indexed in the background');
      // Begin real-time progress tracking via subscription
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

  // Reusable: load a saved report into the view (used by manual selection and auto-load)
  const loadSavedReport = useCallback(async (report) => {
    if (!report?.id) return;
    setIsLoading(true);
    toast.loading('Loading report...', { id: 'load-report' });
    try {
      const response = await base44.functions.invoke('loadSavedReport', { report_id: report.id });
      if (response.data?.success && response.data?.onts && response.data?.summary) {
      setResult({ ...response.data, thresholds_used: response.data.thresholds_used || report.thresholds_used || null, reportDate: report.upload_date, source: report.id });
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

  // Subscriber data enrichment — uses persistent hook
  // MUST be after loadSavedReport definition to avoid TDZ error
  const handleSubscriberDataLoaded = useCallback(async (records, fileName) => {
    await persistSubscriberData(records, fileName);
    
    // After subscriber data is saved and enriched in the database,
    // reload the current report from the DB so the frontend sees the updated
    // serial numbers and models (persisted by enrichPonPmFromSubscriber backend function).
    if (selectedReportId) {
      const currentReport = savedReports.find(r => r.id === selectedReportId);
      if (currentReport) {
        try {
          await loadSavedReport(currentReport);
        } catch (err) {
          console.error('Failed to reload report after subscriber enrichment:', err);
          // Silently fail — user can manually reload if needed
        }
      }
    } else if (result?.onts) {
      // If viewing a non-saved report (freshly parsed), enrich in-memory only
      const lookup = buildSubscriberLookup(records);
      const matched = enrichOntsWithSubscriber(lookup, result.onts);
      setSubscriberMatchCount(matched);
      setResult(prev => ({ ...prev })); // trigger re-render
    }
  }, [result, persistSubscriberData, selectedReportId, savedReports, loadSavedReport]);

  // Auto-load the most recent saved report on first visit so users land on a populated dashboard.
  // LCP enrichment + subscriber enrichment are applied automatically by existing effects below.
  useEffect(() => {
    if (autoLoadAttemptedRef.current) return;
    if (loadingReports) return;
    if (result || isLoading) return;
    autoLoadAttemptedRef.current = true;
    if (savedReports.length > 0) {
      loadSavedReport(savedReports[0]);
    }
  }, [loadingReports, savedReports, result, isLoading, loadSavedReport]);

  // Real-time toast when another user uploads a new report — click to load it
  const handleNewReportAvailable = useCallback((reportData) => {
    queryClient.invalidateQueries({ queryKey: ['ponPmReports'] });
    if (reportData?.id) loadSavedReport(reportData);
  }, [queryClient, loadSavedReport]);
  useNewReportToast(handleNewReportAvailable);

  // Accepts either a File object (from FileUploadZone) or a change event (from header dropdown input)
  const handleFileUpload = async (fileOrEvent) => {
    const file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent?.target?.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    // Guard: a previous report is still indexing in the background. Uploading
    // now causes the backend to fight itself for rate-limited DB writes,
    // which is exactly what produces the 429 timeouts the user reported.
    if (isAnyReportProcessing) {
      const name = globalActiveReport?.report_name || 'previous report';
      toast.error(
        `Indexing of "${name}" is still in progress — please wait for it to finish before uploading another report.`,
        { duration: 7000 }
      );
      return;
    }

    // Capture the file's last-modified timestamp from the OS (not the upload time)
    const fileReportDate = new Date(file.lastModified).toISOString();

    setIsLoading(true);
    toast.loading('Parsing PON PM data...', { id: 'pon-parse' });

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Parse the file — pass custom thresholds so the backend uses current alert config
      const response = await base44.functions.invoke('parsePonPm', { file_url, thresholds: customThresholds });

      if (response.data?.success) {
        // Eagerly enrich with subscriber data already in DB before setting result
        if (response.data.onts) enrichOntsFromDB(response.data.onts);
        // Attach file date to result so the header badge can display it
        setResult({ ...response.data, reportDate: fileReportDate, source: fileReportDate });
        setExpandedOlts([]);
        setExpandedPorts([]);
        setSelectedReportId(null); // Clear selection for new upload
        toast.success(`Parsed ${response.data.summary.totalOnts.toLocaleString()} ONTs successfully`, { id: 'pon-parse' });

        // Auto-save the report to database with all ONT records
        const reportName = file.name.replace('.csv', '') + ' - ' + format(new Date(), 'MM/dd/yy HH:mm');

        // Calculate Rx power stats
        const rxValues = response.data.onts
          .map(o => parseFloat(o.OntRxOptPwr))
          .filter(v => !isNaN(v));
        const avgRx = rxValues.length > 0 ? rxValues.reduce((a, b) => a + b, 0) / rxValues.length : null;
        const minRx = rxValues.length > 0 ? Math.min(...rxValues) : null;
        const maxRx = rxValues.length > 0 ? Math.max(...rxValues) : null;
        saveReportMutation.mutate({
          report_name: reportName, upload_date: fileReportDate, file_url: file_url,
          ont_count: response.data.summary.totalOnts, critical_count: response.data.summary.criticalCount,
          warning_count: response.data.summary.warningCount, ok_count: response.data.summary.okCount,
          olt_count: response.data.summary.oltCount, olts: Object.keys(response.data.olts || {}),
          avg_ont_rx: avgRx, min_ont_rx: minRx, max_ont_rx: maxRx,
          gpon_count: response.data.summary.gponCount ?? 0,
          xgs_count: response.data.summary.xgsCount ?? 0,
          thresholds_used: customThresholds,
          onts: response.data.onts,
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

  const toggleOlt = useCallback((oltName) => {
    setExpandedOlts(prev => 
      prev.includes(oltName) 
        ? prev.filter(o => o !== oltName)
        : [...prev, oltName]
    );
  }, []);

  const togglePort = useCallback((portKey) => {
    setExpandedPorts(prev => 
      prev.includes(portKey) 
        ? prev.filter(p => p !== portKey)
        : [...prev, portKey]
    );
  }, []);

  const filteredOnts = useMemo(() => {
    // Pre-build Sets for O(1) global filter checks (avoids N*M scans on large reports)
    const splitterSet = globalSplitters.length ? new Set(globalSplitters) : null;
    const oltPortSet  = globalOltPorts.length  ? new Set(globalOltPorts)  : null;
    const modelSet    = globalModels.length    ? new Set(globalModels)    : null;

    let filtered = result?.onts?.filter(ont => {
      const term = debouncedSearchTerm.toLowerCase();
      const matchesSearch = !debouncedSearchTerm || 
        ont.SerialNumber?.toLowerCase().includes(term) ||
        ont.OntID?.toString().includes(searchTerm) ||
        ont['Shelf/Slot/Port']?.toLowerCase().includes(term) ||
        ont.OLTName?.toLowerCase().includes(term) ||
        ont._subscriber?.name?.toLowerCase().includes(term) ||
        ont._subscriber?.account?.toLowerCase().includes(term) ||
        ont._subscriber?.address?.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'all' || ont._analysis.status === statusFilter;
      const matchesOlt = oltFilter === 'all' || ont._oltName === oltFilter;
      const matchesPort = portFilter === 'all' || ont._port === portFilter;
      
      let matchesPowerRange = true;
      if (powerRangeFilter !== 'all') {
        const rx = parseFloat(ont.OntRxOptPwr);
        if (!isNaN(rx)) {
          switch (powerRangeFilter) {
            case 'critical': matchesPowerRange = rx < -27; break;
            case 'warning': matchesPowerRange = rx >= -27 && rx < -25; break;
            case 'optimal': matchesPowerRange = rx >= -25 && rx <= -15; break;
            case 'high': matchesPowerRange = rx > -15; break;
          }
        } else {
          matchesPowerRange = false;
        }
      }

      // --- Global filters (additive — empty array = no restriction) ---
      let matchesGlobalSplitter = true;
      if (splitterSet) {
        const key = ont._lcpNumber
          ? (ont._splitterNumber ? `${ont._lcpNumber} / ${ont._splitterNumber}` : ont._lcpNumber)
          : null;
        matchesGlobalSplitter = key ? splitterSet.has(key) : false;
      }

      let matchesGlobalOltPort = true;
      if (oltPortSet) {
        matchesGlobalOltPort = ont._oltName && ont._port
          ? oltPortSet.has(`${ont._oltName}|${ont._port}`)
          : false;
      }

      let matchesGlobalModel = true;
      if (modelSet) {
        const m = ont._subscriber?.model || ont._subscriberModel || ont.subscriber_model || ont.model;
        matchesGlobalModel = m ? modelSet.has(m) : false;
      }

      return matchesSearch && matchesStatus && matchesOlt && matchesPort && matchesPowerRange
        && matchesGlobalSplitter && matchesGlobalOltPort && matchesGlobalModel;
    }) || [];
    
    // Apply sorting
    if (sortBy !== 'none' && filtered.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'rx-asc':
            return (parseFloat(a.OntRxOptPwr) || -999) - (parseFloat(b.OntRxOptPwr) || -999);
          case 'rx-desc':
            return (parseFloat(b.OntRxOptPwr) || -999) - (parseFloat(a.OntRxOptPwr) || -999);
          case 'errors-desc':
            return ((parseInt(b.UpstreamBipErrors) || 0) + (parseInt(b.DownstreamBipErrors) || 0)) - 
                   ((parseInt(a.UpstreamBipErrors) || 0) + (parseInt(a.DownstreamBipErrors) || 0));
          case 'serial':
            return (a.SerialNumber || '').localeCompare(b.SerialNumber || '');
          default:
            return 0;
        }
      });
    }
    
    return filtered;
  }, [result?.onts, debouncedSearchTerm, statusFilter, oltFilter, portFilter, powerRangeFilter, sortBy,
      globalSplitters, globalOltPorts, globalModels]);

  const saveThresholds = useCallback(() => {
    localStorage.setItem('ponPmThresholds', JSON.stringify(customThresholds));
    toast.success('Thresholds saved');
    setShowThresholdSettings(false);
  }, [customThresholds]);

  const resetThresholds = useCallback(() => {
    setCustomThresholds({ ...DEFAULT_THRESHOLDS });
    localStorage.removeItem('ponPmThresholds');
    toast.success('Thresholds reset to defaults');
  }, []);

  const updateThreshold = useCallback((field, key, value) => {
    setCustomThresholds(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: parseFloat(value) || 0
      }
    }));
  }, []);

  // CSV export helpers extracted to components/ponpm/ontCsvExports.js
  // Export functions consolidated into UnifiedExportMenu component

  // Memoize the _trends count so the render doesn't iterate the ONT array 3+ times
  const ontsWithTrendsCount = useMemo(() => result?.onts?.filter(o => o._trends).length ?? 0, [result?.onts]);
  const ontsDegradingCount  = useMemo(() => result?.onts?.filter(o => o._trends?.ont_rx_change < -1).length ?? 0, [result?.onts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/">
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
              <div className="flex items-center gap-2 flex-wrap">
                {/* Report date — click to choose another report or upload new */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer"
                      title="Click to switch report or upload a new one"
                      aria-label="Switch or upload PON PM report"
                    >
                      <Calendar className="h-3 w-3" />
                      {(() => {
                        const d = result.reportDate || result.upload_date || savedReports.find(r => r.id === selectedReportId)?.upload_date;
                        return d ? `Report: ${format(new Date(d), 'MMM d, yyyy h:mm a')}` : 'Saved report';
                      })()}
                      <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setShowHistoricalReports(true)}>
                       <Database className="h-4 w-4 mr-2 text-blue-500" />
                       Choose another report
                     </DropdownMenuItem>
                     {isAdmin && (
                       <DropdownMenuItem onClick={() => headerFileInputRef.current?.click()}>
                         <Upload className="h-4 w-4 mr-2 text-cyan-500" />
                         Upload new PON PM CSV
                       </DropdownMenuItem>
                     )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Subscriber data — admin can upload, all users can reload from DB */}
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 text-xs rounded-md px-2.5 py-1 font-semibold border transition-colors cursor-pointer ${
                          subscriberRecordsLoaded
                            ? 'text-indigo-700 border-indigo-300 bg-indigo-50 hover:bg-indigo-100'
                            : subscriberMeta
                              ? 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100'
                              : 'text-gray-600 border-gray-300 bg-gray-50 hover:bg-gray-100'
                        }`}
                        title="Subscriber data actions"
                        aria-label="Subscriber data actions"
                      >
                        <span>👥</span>
                        {subscriberRecordsLoaded
                          ? `Sub data: ${format(new Date(subscriberMeta.upload_date || subscriberMeta.created_date), 'MMM d, yyyy')}`
                          : subscriberMeta
                            ? 'Sub data not loaded'
                            : 'Upload subscriber data'}
                        <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem onClick={() => setShowSubscriberDialog(true)}>
                        <Upload className="h-4 w-4 mr-2 text-cyan-500" />
                        Upload new subscriber CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!subscriberMeta || subscriberLoading}
                        onClick={async () => {
                          toast.loading('Reloading subscriber data…', { id: 'sub-reload' });
                          try {
                            await loadSubscriberRecordsNow();
                            toast.success('Subscriber data reloaded', { id: 'sub-reload' });
                          } catch (e) {
                            toast.error('Failed to reload subscriber data', { id: 'sub-reload' });
                          }
                        }}
                      >
                        <Database className="h-4 w-4 mr-2 text-indigo-500" />
                        {subscriberLoading ? 'Reloading…' : 'Reload latest from database'}
                      </DropdownMenuItem>
                      {subscriberMeta && (
                        <div className="px-2 py-1.5 text-[10px] text-gray-500 border-t mt-1">
                          Latest in DB: {subscriberMeta.record_count?.toLocaleString()} records
                          <br />
                          {format(new Date(subscriberMeta.upload_date || subscriberMeta.created_date), 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Hidden controlled subscriber upload dialog (opened by badge above) */}
                {isAdmin && (
                  <SubscriberUpload
                    onDataLoaded={handleSubscriberDataLoaded}
                    subscriberCount={subscriberMatchCount}
                    subscriberMeta={subscriberMeta}
                    open={showSubscriberDialog}
                    onOpenChange={setShowSubscriberDialog}
                    hideTrigger
                  />
                )}

                {/* eero data badge — admin only for upload, all users see status */}
                {isAdmin && (
                  <>
                    <EeroDataBadge
                      eeroMeta={eeroMeta}
                      eeroRecordsLoaded={eeroRecordsLoaded}
                      eeroMatchCount={eeroMatchCount}
                      eeroLoading={eeroLoading}
                      onUploadClick={() => setShowEeroDialog(true)}
                      onLoadExistingClick={loadEeroRecordsNow}
                    />
                    <EeroUpload
                      onDataLoaded={handleEeroDataLoaded}
                      eeroMatchCount={eeroMatchCount}
                      eeroMeta={eeroMeta}
                      open={showEeroDialog}
                      onOpenChange={setShowEeroDialog}
                      hideTrigger
                    />
                  </>
                )}
                <ThresholdSettingsDialog
                  open={showThresholdSettings}
                  onOpenChange={setShowThresholdSettings}
                  thresholds={customThresholds}
                  onUpdate={updateThreshold}
                  onSave={saveThresholds}
                  onReset={resetThresholds}
                />

                <UnifiedExportMenu
                  result={result}
                  lcpEntries={lcpEntriesForEnrich}
                  lcpOntCounts={lcpOntCounts}
                  subscriberRecords={subscriberRecords}
                  eeroRecordsLoaded={eeroRecordsLoaded}
                  savedReports={savedReports}
                />
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
                    Loading Latest Report...
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Restoring last PON PM analysis with current LCP &amp; subscriber data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show in-flight indexing banner even before a report is loaded,
            so users hitting the page fresh see it too. */}
        {!result && !isLoading && globalActiveReport && (
          <ProcessingProgressBar
            status={globalActiveReport.processing_status}
            progress={globalActiveReport.processing_progress ?? 0}
            savedCount={globalActiveReport.processing_saved_count ?? 0}
            totalCount={globalActiveReport.ont_count}
            reportName={globalActiveReport.report_name}
          />
        )}

        {/* Upload Section — admin sees upload + saved reports; regular users only see saved reports */}
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
                    {isAdmin
                      ? 'Upload a new CSV export or work with previously saved reports'
                      : 'View the latest performance monitoring data'}
                  </p>
                </div>

                <div className="max-w-md mx-auto space-y-4">
                  {isAdmin && (
                    <FileUploadZone onChange={handleFileUpload} isLoading={isLoading} disabled={isAnyReportProcessing} disabledMessage={isAnyReportProcessing ? `Wait for "${globalActiveReport?.report_name || 'current report'}" to finish indexing` : null} />
                  )}

                  {savedReports.length > 0 && (
                    <>
                      {isAdmin && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or</span>
                          </div>
                        </div>
                      )}

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

                  {!isAdmin && savedReports.length === 0 && (
                    <div className="text-sm text-gray-500 py-4">
                      No reports available yet. An admin will upload the first report.
                    </div>
                  )}
                </div>

                {isAdmin && (
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
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && (
          <>
            {/* Subscriber data freshness banner */}
            <SubscriberDataBanner subscriberMeta={subscriberMeta} matchCount={subscriberMatchCount} />

            {/* Background processing progress bar — prefers locally tracked
                state (right after upload) and falls back to the global
                detector so the banner survives page refresh/navigation. */}
            <ProcessingProgressBar
              status={processingStatus || globalActiveReport?.processing_status || null}
              progress={processingStatus ? processingProgress : (globalActiveReport?.processing_progress ?? 0)}
              savedCount={processingStatus ? processingSavedCount : (globalActiveReport?.processing_saved_count ?? 0)}
              totalCount={result?.summary?.totalOnts ?? globalActiveReport?.ont_count}
              reportName={!processingStatus ? globalActiveReport?.report_name : undefined}
            />

            {/* Summary Cards */}
            <SummaryCardsRow
              summary={result.summary}
              ontsWithTrendsCount={ontsWithTrendsCount}
              eeroMatchCount={eeroMatchCount}
              issueDetailView={issueDetailView}
              setIssueDetailView={setIssueDetailView}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />

            {/* Issue Detail Panel */}
            <IssueDetailPanel
              issueDetailView={issueDetailView}
              filteredOnts={filteredOnts}
              onClose={() => setIssueDetailView(null)}
            />

            {/* Health Overview */}
            <NetworkHealthBar
              summary={result.summary}
              ontsWithTrendsCount={ontsWithTrendsCount}
              ontsDegradingCount={ontsDegradingCount}
            />

            {/* Global Filter Bar — applies to ALL charts, KPIs, hierarchy, and LCP summary */}
            <GlobalFilterBar
              onts={result.onts}
              selectedSplitters={globalSplitters}
              selectedOltPorts={globalOltPorts}
              selectedModels={globalModels}
              onSplittersChange={setGlobalSplitters}
              onOltPortsChange={setGlobalOltPorts}
              onModelsChange={setGlobalModels}
            />

            {/* Advanced Filters */}
            <AdvancedFiltersBar
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              oltFilter={oltFilter} setOltFilter={setOltFilter}
              portFilter={portFilter} setPortFilter={setPortFilter}
              powerRangeFilter={powerRangeFilter} setPowerRangeFilter={setPowerRangeFilter}
              sortBy={sortBy} setSortBy={setSortBy}
              olts={result.olts}
              onts={result.onts}
              onClearAll={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setOltFilter('all');
                setPortFilter('all');
                setPowerRangeFilter('all');
                setSortBy('none');
                setGlobalSplitters([]);
                setGlobalOltPorts([]);
                setGlobalModels([]);
              }}
            />

            {/* KPI Statistics */}
            <KPIStatistics result={result} filteredOnts={filteredOnts} subscriberRecords={subscriberRecords} previousReport={(() => {
              if (!savedReports || savedReports.length < 2) return null;
              const ci = selectedReportId ? savedReports.findIndex(r => r.id === selectedReportId) : 0;
              const prev = savedReports[ci >= 0 ? ci + 1 : 1];
              if (!prev || (prev.gpon_count == null && prev.xgs_count == null)) return null;
              return { gponCount: prev.gpon_count ?? 0, xgsCount: prev.xgs_count ?? 0 };
            })()} />

            {/* Power Distribution Charts */}
            {filteredOnts.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                <PowerDistributionChart onts={filteredOnts} powerMetric="ont_rx" title="ONT Rx Power Distribution" />
                <PowerDistributionChart onts={filteredOnts} powerMetric="olt_rx" title="OLT Rx Power Distribution" />
              </div>
            )}

            {/* LCP Summary — shown once above OLT/Port section */}
            {filteredOnts.length > 0 && (
              <LCPSummarySection
                result={{ ...result, onts: filteredOnts }}
                onPortClick={(oltName, portKey) => {
                  setViewMode('hierarchy');
                  setOltFilter(oltName);
                  setPortFilter(portKey);
                  setExpandedOlts([oltName]);
                  setExpandedPorts([`${oltName}|${portKey}`]);
                }}
              />
            )}

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
                    <Button variant={viewMode === 'hierarchy' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('hierarchy')}>
                      <Router className="h-4 w-4 mr-1" />Hierarchy
                    </Button>
                    <Button variant={viewMode === 'fec' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('fec')}>
                      <AlertTriangle className="h-4 w-4 mr-1" />FEC Corrected
                    </Button>
                  </div>
                  {isAdmin && (
                    <Link to="/Alerts">
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                        <Bell className="h-4 w-4 mr-1" />
                        Alerts
                      </Button>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/CriticalWatchlist">
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                        <ShieldAlert className="h-4 w-4 mr-1" />
                        Watchlist
                      </Button>
                    </Link>
                  )}
                  {isAdmin && viewMode === 'hierarchy' && (
                    <Button
                      variant={selectMode ? 'default' : 'outline'}
                      size="sm"
                      className={selectMode ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}
                      onClick={() => { setSelectMode(v => !v); if (selectMode) clearSelection(); }}
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      {selectMode ? 'Done' : 'Flag ONTs'}
                    </Button>
                  )}
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

              {viewMode === 'fec' && <CorrectedFecAnalysis onts={result?.onts} onSelectOnt={setSelectedOntDetail} />}
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
                                        <PortHeaderLabel portKey={portKey} portStats={portStats} portOnts={portOnts} />
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
                                      <VirtualizedONTTable
                                        portOnts={portOnts}
                                        hideOntStatus={hideOntStatus}
                                        subscriberMatchCount={subscriberMatchCount}
                                        eeroRecordsLoaded={eeroRecordsLoaded}
                                        onSelectDetail={setSelectedOntDetail}
                                        selectable={isAdmin && selectMode}
                                        selectedSerials={selectedSerials}
                                        onToggleSelect={toggleSelectOnt}
                                        onToggleSelectMany={toggleSelectMany}
                                        onFlag={isAdmin ? (ont) => setFlagDialogOnts([ont]) : undefined}
                                      />
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

            {/* New Analysis Button — admin only */}
            {isAdmin && (
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
            )}
          </>
        )}

        {/* Historical Data Manager */}
        {showHistoricalReports && (
          <HistoricalDataManager
            reports={savedReports}
            isLoading={loadingReports}
            onReportDeleted={() => queryClient.invalidateQueries({ queryKey: ['ponPmReports'] })}
            onReportSelected={async (report) => {
              setShowHistoricalReports(false);
              await loadSavedReport(report);
            }}
            onClose={() => setShowHistoricalReports(false)}
          />
        )}

      </main>
      
      {/* ONT Detail View */}
      {selectedOntDetail && (
        <ONTDetailView 
          ont={selectedOntDetail} 
          onClose={() => setSelectedOntDetail(null)}
          allOnts={result?.onts}
          thresholds={result?.thresholds_used || customThresholds}
        />
      )}

      {/* Floating selection action bar — appears when ONTs are selected in flag mode */}
      {isAdmin && selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-full shadow-2xl px-5 py-3">
          <span className="text-sm font-medium">{selectedCount} ONT{selectedCount > 1 ? 's' : ''} selected</span>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 rounded-full"
            onClick={() => setFlagDialogOnts(Object.values(selectedOnts))}
          >
            <Flag className="h-4 w-4 mr-1" />
            Flag to Alerts
          </Button>
          <button onClick={clearSelection} className="text-gray-300 hover:text-white" aria-label="Clear selection">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Flag dialog — single (row flag button) or bulk (selection bar) */}
      {isAdmin && flagDialogOnts && (
        <FlagOntDialog
          onts={flagDialogOnts}
          reportId={selectedReportId}
          open={!!flagDialogOnts}
          onOpenChange={(o) => { if (!o) setFlagDialogOnts(null); }}
          onFlagged={() => { setFlagDialogOnts(null); clearSelection(); setSelectMode(false); }}
        />
      )}

      {/* Hidden file input for header dropdown — must live outside the dropdown so it persists after dropdown unmounts */}
      <input
        ref={headerFileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) handleFileUpload(file);
        }}
      />


    </div>
  );
}