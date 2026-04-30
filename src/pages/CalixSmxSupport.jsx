import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Upload, Home } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Import modular Calix components
import CalixDashboard from '@/components/calix/CalixDashboard';
import CalixOLTView from '@/components/calix/CalixOLTView';
import CalixPortView from '@/components/calix/CalixPortView';
import CalixONTDetail from '@/components/calix/CalixONTDetail';
import CalixUnifiedExport from '@/components/calix/CalixUnifiedExport';
import FileUploadZone from '@/components/ponpm/FileUploadZone';
import { useSubscriberData } from '@/components/ponpm/useSubscriberData';
import SubscriberUpload from '@/components/ponpm/SubscriberUpload';
import SubscriberDataBanner from '@/components/ponpm/SubscriberDataBanner';

/**
 * Calix SMx Support — Unified NOC Center
 *
 * Single pane of glass for all network data (LCP, splitter, subscriber, ONT performance).
 * Provides drill-down navigation from dashboard → OLT → port → ONT detail.
 * Consolidates all export functionality into a unified menu.
 */

// Navigation context for drill-down flow
const CalixNavigationContext = React.createContext();

export const useCalixNavigation = () => React.useContext(CalixNavigationContext);

export default function CalixSmxSupport() {
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation State: tracks current view (dashboard, olt, port, ont_detail)
  // ─────────────────────────────────────────────────────────────────────────────
  const [navigationStack, setNavigationStack] = useState([{ view: 'dashboard' }]);
  const currentNav = navigationStack[navigationStack.length - 1];

  const navigate = useCallback((viewConfig) => {
    setNavigationStack(prev => [...prev, viewConfig]);
  }, []);

  const goBack = useCallback(() => {
    if (navigationStack.length > 1) {
      setNavigationStack(prev => prev.slice(0, -1));
    }
  }, [navigationStack.length]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Loading: Reports, LCP, Subscriber data
  // ─────────────────────────────────────────────────────────────────────────────
  const { data: savedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date'),
  });

  const { data: lcpEntries = [] } = useQuery({
    queryKey: ['lcp-entries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
    staleTime: 5 * 60 * 1000,
  });

  const {
    subscriberMeta,
    subscriberMatchCount,
    subscriberRecords,
    setSubscriberMatchCount,
    handleSubscriberDataLoaded: persistSubscriberData,
    enrichOnts: enrichOntsFromDB,
    isLoading: subscriberLoading,
  } = useSubscriberData();

  // ─────────────────────────────────────────────────────────────────────────────
  // Data State: currently selected report and loaded ONT data
  // ─────────────────────────────────────────────────────────────────────────────
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ─────────────────────────────────────────────────────────────────────────────
  // Report Loading Handler
  // ─────────────────────────────────────────────────────────────────────────────
  const loadReport = useCallback(async (report) => {
    setIsLoadingReport(true);
    toast.loading('Loading report...', { id: 'load-report' });

    try {
      const response = await base44.functions.invoke('loadSavedReport', { report_id: report.id });

      if (response.data?.success && response.data?.onts && response.data?.summary) {
        // Enrich with subscriber data if available
        let enrichedOnts = response.data.onts;
        if (subscriberRecords.length > 0) {
          const lookup = new Map();
          subscriberRecords.forEach(rec => {
            const serial = rec.ONTSerialNo?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
            if (serial && !lookup.has(serial)) {
              lookup.set(serial, {
                subscriber_account_name: rec.AccountName || '',
                subscriber_address: rec.Address || '',
                subscriber_model: rec.ONTModel || '',
              });
            }
          });
          enrichedOnts = enrichedOnts.map(ont => ({
            ...ont,
            ...(lookup.has(ont.SerialNumber) && lookup.get(ont.SerialNumber)),
          }));
        }

        setReportData({
          ...response.data,
          onts: enrichedOnts,
          lcpMap: new Map(lcpEntries.map(e => [
            `${e.olt_name?.toUpperCase() || ''}|${e.olt_shelf}/${e.olt_slot}/${e.olt_port}`,
            e,
          ])),
        });

        setSelectedReportId(report.id);
        setNavigationStack([{ view: 'dashboard' }]);
        toast.success('Report loaded', { id: 'load-report' });
      } else {
        toast.error(response.data?.error || 'Failed to load report', { id: 'load-report' });
      }
    } catch (error) {
      console.error('Load report error:', error);
      toast.error(`Failed to load report: ${error.message}`, { id: 'load-report' });
    } finally {
      setIsLoadingReport(false);
    }
  }, [subscriberRecords, lcpEntries]);

  // ─────────────────────────────────────────────────────────────────────────────
  // File Upload Handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const fileReportDate = new Date(file.lastModified).toISOString();
    setIsLoadingReport(true);
    toast.loading('Parsing PON PM data...', { id: 'pon-parse' });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('parsePonPm', { file_url });

      if (response.data?.success) {
        const reportName = `${file.name.replace('.csv', '')} - ${new Date().toLocaleDateString()}`;

        // Create report record
        const report = await base44.entities.PONPMReport.create({
          report_name: reportName,
          upload_date: fileReportDate,
          file_url,
          ont_count: response.data.summary.totalOnts,
          critical_count: response.data.summary.criticalCount,
          warning_count: response.data.summary.warningCount,
          ok_count: response.data.summary.okCount,
          olt_count: response.data.summary.oltCount,
          olts: Object.keys(response.data.olts || {}),
          processing_status: 'pending',
        });

        queryClient.invalidateQueries({ queryKey: ['ponPmReports'] });
        await loadReport(report);
        toast.success(`Parsed ${response.data.summary.totalOnts.toLocaleString()} ONTs`, { id: 'pon-parse' });
      } else {
        toast.error(response.data?.error || 'Failed to parse file', { id: 'pon-parse' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process file', { id: 'pon-parse' });
    } finally {
      setIsLoadingReport(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Subscriber Data Handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSubscriberDataLoaded = useCallback(async (records, fileName) => {
    await persistSubscriberData(records, fileName);
    if (reportData?.onts) {
      const lookup = new Map();
      records.forEach(rec => {
        const serial = rec.ONTSerialNo?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
        if (serial && !lookup.has(serial)) {
          lookup.set(serial, {
            subscriber_account_name: rec.AccountName || '',
            subscriber_address: rec.Address || '',
            subscriber_model: rec.ONTModel || '',
          });
        }
      });
      const matched = records.length;
      setSubscriberMatchCount(matched);
      setReportData(prev => ({
        ...prev,
        onts: prev.onts.map(ont => ({
          ...ont,
          ...(lookup.has(ont.SerialNumber) && lookup.get(ont.SerialNumber)),
        })),
      }));
    }
  }, [reportData, persistSubscriberData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filter & Search Logic
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredOnts = useMemo(() => {
    if (!reportData?.onts) return [];

    return reportData.onts.filter(ont => {
      const matchesSearch = !searchTerm ||
        ont.SerialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ont.OntID?.toString().includes(searchTerm) ||
        ont['Shelf/Slot/Port']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ont.OLTName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || ont._analysis?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reportData, searchTerm, statusFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation Provider Context
  // ─────────────────────────────────────────────────────────────────────────────
  const navigationValue = {
    currentNav,
    navigate,
    goBack,
    reportData,
    filteredOnts,
    lcpEntries,
    subscriberRecords,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: Load Screen
  // ─────────────────────────────────────────────────────────────────────────────
  if (!reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link to={createPageUrl('Home')}>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Calix SMx Support
                  </h1>
                  <p className="text-xs text-gray-500">Unified NOC Center</p>
                </div>
              </div>
              <Link to={createPageUrl('PONPMAnalysis')}>
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Legacy PON PM
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {isLoadingReport && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Loading Report...
                  </h3>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoadingReport && (
            <>
              {/* Upload New File */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl">
                      <Upload className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Calix SMx Support Center
                      </h2>
                      <p className="text-gray-500 mt-2 max-w-lg mx-auto">
                        Upload CSV export or select a saved report to begin
                      </p>
                    </div>

                    <div className="max-w-md mx-auto space-y-4">
                      <FileUploadZone onChange={handleFileUpload} isLoading={isLoadingReport} />

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

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Saved Reports ({savedReports.length})
                            </label>
                            <Select onValueChange={(id) => {
                              const report = savedReports.find(r => r.id === id);
                              if (report) loadReport(report);
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a report..." />
                              </SelectTrigger>
                              <SelectContent>
                                {savedReports.map(report => (
                                  <SelectItem key={report.id} value={report.id}>
                                    {report.report_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: Report Loaded — Navigation Based View
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <CalixNavigationContext.Provider value={navigationValue}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {navigationStack.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                {navigationStack.length === 1 && (
                  <Link to={createPageUrl('Home')}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Calix SMx Support
                  </h1>
                  <p className="text-xs text-gray-500">
                    {currentNav.view === 'dashboard' && 'Network Overview'}
                    {currentNav.view === 'olt' && `OLT: ${currentNav.oltName}`}
                    {currentNav.view === 'port' && `Port: ${currentNav.oltName} / ${currentNav.portKey}`}
                    {currentNav.view === 'ont_detail' && `ONT: ${currentNav.ont?.SerialNumber}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <SubscriberUpload
                  onDataLoaded={handleSubscriberDataLoaded}
                  subscriberCount={subscriberMatchCount}
                  subscriberMeta={subscriberMeta}
                />
                {currentNav.view !== 'dashboard' && (
                  <Button variant="outline" size="sm" onClick={() => setNavigationStack([{ view: 'dashboard' }])}>
                    Back to Dashboard
                  </Button>
                )}
                {currentNav.view === 'dashboard' && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedReportId(null)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Subscriber Data Banner */}
          <SubscriberDataBanner subscriberMeta={subscriberMeta} matchCount={subscriberMatchCount} />

          {/* Search & Filter Bar (Dashboard View Only) */}
          {currentNav.view === 'dashboard' && (
            <Card className="border-0 shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Search by Serial, ONT ID, Port..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="ok">OK</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unified Export Menu (Always Visible) */}
          {reportData && (
            <CalixUnifiedExport
              reportData={reportData}
              filteredOnts={filteredOnts}
            />
          )}

          {/* View Router */}
          {currentNav.view === 'dashboard' && <CalixDashboard onNavigate={navigate} />}
          {currentNav.view === 'olt' && <CalixOLTView oltName={currentNav.oltName} onNavigate={navigate} />}
          {currentNav.view === 'port' && (
            <CalixPortView
              oltName={currentNav.oltName}
              portKey={currentNav.portKey}
              onNavigate={navigate}
            />
          )}
          {currentNav.view === 'ont_detail' && <CalixONTDetail ont={currentNav.ont} />}
        </main>
      </div>
    </CalixNavigationContext.Provider>
  );
}