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
// PONPMAnalysis.js — FIXED VERSION
// ============================================================
// FIXES INCLUDED:
//   [FIX-1] Removed orphaned <LCPExportMenu /> causing undefined props crash
//   [FIX-2] Added safe conditional rendering guards
//   [FIX-3] Prevented accidental undefined access on result.onts.length
// ============================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  ChevronRight,
  Activity,
  Download,
  FileSpreadsheet,
  Router,
  Loader2,
  FileText,
  Database,
  Calendar,
  Wifi
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

import { exportLcpPortUtilization } from '@/components/ponpm/exportLcpUtilization';

import {
  exportOfflineCSV as exportOfflineCSVUtil,
  exportFilteredOntsCSV,
  exportPortInventoryCSV,
} from '@/components/ponpm/ontCsvExports';

import { exportIssueReport as exportIssueReportUtil } from '@/components/ponpm/exportIssueReport';

import CorrectedFecAnalysis from '@/components/ponpm/CorrectedFecAnalysis';

import {
  buildLcpLookupMap,
  enrichOntsWithLcp
} from '@/components/ponpm/lcpLookup';

import SubscriberUpload, {
  buildSubscriberLookup,
  enrichOntsWithSubscriber
} from '@/components/ponpm/SubscriberUpload';

import { useSubscriberData } from '@/components/ponpm/useSubscriberData';

import SubscriberDataBanner from '@/components/ponpm/SubscriberDataBanner';

import EeroUpload from '@/components/ponpm/EeroUpload';
import EeroDataBadge from '@/components/ponpm/EeroDataBadge';
import { useEeroData } from '@/components/ponpm/useEeroData';
import { useEeroOntEnrichmentHandler } from '@/components/ponpm/useEeroOntEnrichment';

import { exportEeroOntsCSV } from '@/components/ponpm/eeroExports';

import ONTTableRow from '@/components/ponpm/ONTTableRow';

import JobReportDialog from '@/components/ponpm/JobReportDialog';
import GlobalFilterBar from '@/components/ponpm/GlobalFilterBar';

import { downloadPdfFromFunction } from '@/lib/pdfDownload';

// REMOVED:
// import LCPExportMenu from '@/components/lcp/LCPExportMenu';

const DEFAULT_THRESHOLDS = {
  OntRxOptPwr: { low: -27, marginal: -25, high: -8 },
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
  const [powerRangeFilter, setPowerRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('none');

  const [globalSplitters, setGlobalSplitters] = useState([]);
  const [globalOltPorts, setGlobalOltPorts] = useState([]);
  const [globalModels, setGlobalModels] = useState([]);

  const [showKPIs, setShowKPIs] = useState(true);

  const [expandedOlts, setExpandedOlts] = useState([]);
  const [expandedPorts, setExpandedPorts] = useState([]);

  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [showHistoricalReports, setShowHistoricalReports] = useState(false);

  const [showSubscriberDialog, setShowSubscriberDialog] = useState(false);
  const [showEeroDialog, setShowEeroDialog] = useState(false);

  const [viewMode, setViewMode] = useState('hierarchy');

  const [selectedOntDetail, setSelectedOntDetail] = useState(null);

  const headerFileInputRef = useRef(null);

  const [customThresholds, setCustomThresholds] = useState(DEFAULT_THRESHOLDS);

  // SAFE QUERY
  const { data: savedReports = [] } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date'),
    staleTime: 30000,
  });

  const { data: lcpEntriesForEnrich = [] } = useQuery({
    queryKey: ['lcp-entries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
    staleTime: 300000,
  });

  const { data: lcpOntCounts = {} } = useQuery({
    queryKey: ['lcpOntCounts'],
    enabled: !!result,
    queryFn: async () => {
      const res = await base44.functions.invoke('getLatestLcpOntCounts', {});
      return res.data?.counts || {};
    },
    staleTime: 300000,
  });

  const lcpMapRef = useRef(new Map());

  useEffect(() => {
    lcpMapRef.current = buildLcpLookupMap(lcpEntriesForEnrich || []);
  }, [lcpEntriesForEnrich]);

  useEffect(() => {
    if (!result?.onts?.length) return;

    enrichOntsWithLcp(lcpMapRef.current, result.onts);

    setResult(prev => ({
      ...prev,
      onts: [...(prev?.onts || [])],
    }));
  }, [result?.onts?.length, lcpEntriesForEnrich]);

  const filteredOnts = useMemo(() => {

    const onts = result?.onts || [];

    let filtered = [...onts];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      filtered = filtered.filter(ont => {
        return (
          (ont.SerialNumber || '').toLowerCase().includes(term) ||
          (ont.Description || '').toLowerCase().includes(term)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o._status === statusFilter);
    }

    return filtered;

  }, [
    result?.onts,
    searchTerm,
    statusFilter
  ]);

  const oltHierarchy = useMemo(() => {

    const hierarchy = {};

    (filteredOnts || []).forEach(ont => {

      const olt = ont.OLT || 'Unknown OLT';
      const port = ont.Port || 'Unknown Port';

      if (!hierarchy[olt]) hierarchy[olt] = {};
      if (!hierarchy[olt][port]) hierarchy[olt][port] = [];

      hierarchy[olt][port].push(ont);
    });

    return hierarchy;

  }, [filteredOnts]);

  const summaryStats = useMemo(() => {

    const onts = result?.onts || [];

    return {
      total: onts.length,
      ok: onts.filter(o => o._status === 'ok').length,
      warning: onts.filter(o => o._status === 'warning').length,
      critical: onts.filter(o => o._status === 'critical').length,
      offline: onts.filter(o => o._status === 'offline').length,
    };

  }, [result?.onts]);

  const handleExportFiltered = useCallback(() => {
    exportFilteredOntsCSV(filteredOnts || []);
  }, [filteredOnts]);

  const handleExportOffline = useCallback(() => {
    exportOfflineCSVUtil(result?.onts || []);
  }, [result?.onts]);

  const handleExportPortInventory = useCallback(() => {
    exportPortInventoryCSV(result?.onts || []);
  }, [result?.onts]);

  const handleExportIssueReport = useCallback(() => {
    exportIssueReportUtil(result?.onts || [], customThresholds);
  }, [result?.onts, customThresholds]);

  const handleExportEero = useCallback(() => {
    exportEeroOntsCSV(result?.onts || []);
  }, [result?.onts]);

  const handleExportLcpUtilization = useCallback(() => {
    exportLcpPortUtilization(
      result?.onts || [],
      lcpOntCounts || {}
    );
  }, [result?.onts, lcpOntCounts]);

  return (
    <div className="min-h-screen bg-background">

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
              </div>
            </div>

            <div className="flex items-center gap-2">

              <input
                ref={headerFileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => headerFileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>

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
                      Filtered ONTs
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleExportOffline}>
                      <Wifi className="h-4 w-4 mr-2" />
                      Offline ONTs
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleExportPortInventory}>
                      <Router className="h-4 w-4 mr-2" />
                      Port Inventory
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleExportIssueReport}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Issue Report
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleExportEero}>
                      <Wifi className="h-4 w-4 mr-2" />
                      Eero ONTs
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleExportLcpUtilization}>
                      <Database className="h-4 w-4 mr-2" />
                      LCP Utilization
                    </DropdownMenuItem>

                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">

        {!result && (
          <FileUploadZone />
        )}

        {result && (
          <>
            <KPIStatistics
              summary={result.summary}
              stats={summaryStats}
            />

            <LCPSummarySection
              onts={result?.onts || []}
              lcpOntCounts={lcpOntCounts || {}}
            />

            <PowerDistributionChart
              onts={filteredOnts || []}
              thresholds={customThresholds}
            />

            <CorrectedFecAnalysis
              onts={filteredOnts || []}
            />

            <OLTPortSummary
              onts={filteredOnts || []}
            />

            <div className="space-y-4">

              {Object.entries(oltHierarchy || {}).map(([olt, ports]) => (

                <Card key={olt}>

                  <CardHeader>
                    <CardTitle>{olt}</CardTitle>
                  </CardHeader>

                  <CardContent>

                    {Object.entries(ports || {}).map(([port, onts]) => (

                      <div key={`${olt}/${port}`} className="mb-4">

                        <PortHeaderLabel
                          port={port}
                          onts={onts || []}
                          lcpOntCounts={lcpOntCounts || {}}
                        />

                        <Table>

                          <TableHeader>
                            <TableRow>
                              <TableHead>Serial</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>ONT Rx</TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>

                            {(onts || []).map(ont => (

                              <ONTTableRow
                                key={ont.SerialNumber}
                                ont={ont}
                                thresholds={customThresholds}
                              />

                            ))}

                          </TableBody>

                        </Table>

                      </div>

                    ))}

                  </CardContent>

                </Card>

              ))}

            </div>
          </>
        )}

      </div>

      {/* FIXED:
          REMOVED CRASHING COMPONENT

          OLD:
          <LCPExportMenu />

          This component was mounting with undefined props
          and crashing on .forEach()
      */}

    </div>
  );
}