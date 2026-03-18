import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ArrowLeft, AlertTriangle, Activity, BarChart3, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import PonPmAnalyticsFilters from '@/components/ponpm/PonPmAnalyticsFilters';
import PonPmMetricCard from '@/components/ponpm/PonPmMetricCard';
import PonPmIssueTrendChart from '@/components/ponpm/PonPmIssueTrendChart';
import PonPmTopErrorChart from '@/components/ponpm/PonPmTopErrorChart';

function formatDateInput(date) {
  return format(date, 'yyyy-MM-dd');
}

function getPresetDates(preset) {
  const today = new Date();

  if (preset === '7d') return { start: formatDateInput(subDays(today, 6)), end: formatDateInput(today) };
  if (preset === '30d') return { start: formatDateInput(subDays(today, 29)), end: formatDateInput(today) };
  if (preset === '90d') return { start: formatDateInput(subDays(today, 89)), end: formatDateInput(today) };

  return { start: '', end: formatDateInput(today) };
}

function aggregateTopIssues(records, formatter) {
  const grouped = records.reduce((acc, record) => {
    const key = formatter(record);
    if (!acc[key]) acc[key] = { name: key, critical: 0, warning: 0 };
    if (record.status === 'critical') acc[key].critical += 1;
    if (record.status === 'warning') acc[key].warning += 1;
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({ ...item, issues: item.critical + item.warning }))
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 8);
}

export default function PONPMTrends() {
  const initialDates = getPresetDates('30d');
  const [preset, setPreset] = useState('30d');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [lcpFilter, setLcpFilter] = useState('all');
  const [splitterFilter, setSplitterFilter] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState(['critical', 'warning']);

  const { data: reports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['ponpmAnalyticsReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date', 250),
    initialData: [],
  });

  const filteredReports = useMemo(() => {
    return [...reports]
      .filter((report) => {
        const reportDate = new Date(report.upload_date);
        const afterStart = !startDate || reportDate >= new Date(`${startDate}T00:00:00Z`);
        const beforeEnd = !endDate || reportDate <= new Date(`${endDate}T23:59:59Z`);
        return afterStart && beforeEnd;
      })
      .sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));
  }, [reports, startDate, endDate]);

  const reportIdsKey = filteredReports.map((report) => report.id).join('|');

  const { data: allRecords = [], isLoading: isLoadingRecords } = useQuery({
    queryKey: ['ponpmAnalyticsRecords', reportIdsKey],
    enabled: filteredReports.length > 0,
    initialData: [],
    queryFn: async () => {
      const batches = await Promise.all(
        filteredReports.map((report) =>
          base44.entities.ONTPerformanceRecord.filter({ report_id: report.id }, '-updated_date', 10000)
        )
      );

      return filteredReports.flatMap((report, index) =>
        (batches[index] || []).map((record) => ({
          ...record,
          report_name: report.report_name,
          upload_date: report.upload_date,
        }))
      );
    },
  });

  const splitterOptions = useMemo(() => {
    return [...new Set(allRecords.map((record) => record.splitter_number).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allRecords]);

  const lcpOptions = useMemo(() => {
    return [...new Set(allRecords.map((record) => record.lcp_number).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      const matchesStatus = selectedStatuses.includes(record.status);
      const matchesLcp = lcpFilter === 'all' || record.lcp_number === lcpFilter;
      const matchesSplitter = splitterFilter === 'all' || record.splitter_number === splitterFilter;
      return matchesStatus && matchesLcp && matchesSplitter;
    });
  }, [allRecords, selectedStatuses, lcpFilter, splitterFilter]);

  const trendData = useMemo(() => {
    return filteredReports.map((report) => {
      const reportRecords = filteredRecords.filter((record) => record.report_id === report.id);
      const critical = reportRecords.filter((record) => record.status === 'critical').length;
      const warning = reportRecords.filter((record) => record.status === 'warning').length;

      return {
        label: format(new Date(report.upload_date), 'MMM d'),
        reportName: report.report_name,
        critical,
        warning,
        issues: critical + warning,
      };
    });
  }, [filteredReports, filteredRecords]);

  const topLcpData = useMemo(() => {
    return aggregateTopIssues(filteredRecords, (record) => record.lcp_number || 'Unknown LCP');
  }, [filteredRecords]);

  const topSplitterData = useMemo(() => {
    return aggregateTopIssues(
      filteredRecords,
      (record) => `${record.lcp_number || 'Unknown'} • ${record.splitter_number || 'Unknown'}`
    );
  }, [filteredRecords]);

  const summary = useMemo(() => {
    const critical = filteredRecords.filter((record) => record.status === 'critical').length;
    const warning = filteredRecords.filter((record) => record.status === 'warning').length;
    const issueLocations = new Set(filteredRecords.map((record) => `${record.lcp_number || 'unknown'}|${record.splitter_number || 'unknown'}`));

    return {
      critical,
      warning,
      total: filteredRecords.length,
      reports: filteredReports.length,
      locations: issueLocations.size,
    };
  }, [filteredRecords, filteredReports]);

  const handlePresetChange = (nextPreset) => {
    const nextDates = getPresetDates(nextPreset);
    setPreset(nextPreset);
    setStartDate(nextDates.start);
    setEndDate(nextDates.end);
  };

  const handleCustomStartDate = (value) => {
    setPreset('custom');
    setStartDate(value);
  };

  const handleCustomEndDate = (value) => {
    setPreset('custom');
    setEndDate(value);
  };

  const toggleStatus = (status) => {
    setSelectedStatuses((current) => {
      if (current.includes(status)) {
        return current.length === 1 ? current : current.filter((item) => item !== status);
      }
      return [...current, status];
    });
  };

  const isLoading = isLoadingReports || isLoadingRecords;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-20 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={createPageUrl('PONPMAnalysis')}>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Back to PON PM analysis">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">PON PM Analytics</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Performance trends, issue counts, and top error locations over time.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">{filteredReports.length} reports in scope</Badge>
            <Link to={createPageUrl('ReportManagement')}>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <PonPmAnalyticsFilters
          preset={preset}
          onPresetChange={handlePresetChange}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={handleCustomStartDate}
          onEndDateChange={handleCustomEndDate}
          lcpFilter={lcpFilter}
          onLcpChange={setLcpFilter}
          splitterFilter={splitterFilter}
          onSplitterChange={setSplitterFilter}
          lcpOptions={lcpOptions}
          splitterOptions={splitterOptions}
          selectedStatuses={selectedStatuses}
          onStatusToggle={toggleStatus}
        />

        {isLoading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-center gap-3 py-16 text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading analytics…
            </CardContent>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">No reports in this date range</h2>
              <p className="mt-2 text-sm text-slate-600">Adjust the preset or pick a wider custom range to load PON PM history.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <PonPmMetricCard title="Scoped ONTs" value={summary.total} subtitle="Matching your current filters" icon={Activity} />
              <PonPmMetricCard title="Critical ONTs" value={summary.critical} subtitle="Highest-severity issues" icon={AlertTriangle} tone="text-red-600" />
              <PonPmMetricCard title="Warning ONTs" value={summary.warning} subtitle="Needs attention" icon={AlertTriangle} tone="text-amber-600" />
              <PonPmMetricCard title="Issue Locations" value={summary.locations} subtitle="Unique LCP / splitter pairs" icon={BarChart3} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <PonPmIssueTrendChart data={trendData} />
              <Card className="border-0 shadow-sm">
                <CardContent className="flex h-full flex-col justify-center p-6">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scope Summary</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between"><span>Reports</span><span className="font-semibold tabular-nums">{summary.reports}</span></div>
                      <div className="flex items-center justify-between"><span>Critical + Warning</span><span className="font-semibold tabular-nums">{summary.critical + summary.warning}</span></div>
                      <div className="flex items-center justify-between"><span>Filtered LCPs</span><span className="font-semibold tabular-nums">{new Set(filteredRecords.map((record) => record.lcp_number).filter(Boolean)).size}</span></div>
                      <div className="flex items-center justify-between"><span>Filtered Splitters</span><span className="font-semibold tabular-nums">{new Set(filteredRecords.map((record) => record.splitter_number).filter(Boolean)).size}</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <PonPmTopErrorChart title="Top LCPs by Error Count" data={topLcpData} />
              <PonPmTopErrorChart title="Top LCP / Splitter Pairs by Error Count" data={topSplitterData} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}