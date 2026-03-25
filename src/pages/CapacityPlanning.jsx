import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, TrendingUp, AlertTriangle, Clock, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import CapacityGrowthChart from '@/components/capacity/CapacityGrowthChart';
import CapacityProjectionTable from '@/components/capacity/CapacityProjectionTable';

const SPLITTER_CAPACITY = 32;

export default function CapacityPlanning() {
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['capacityReports'],
    queryFn: () => base44.entities.PONPMReport.list('upload_date', 100),
  });

  const { data: lcpEntries = [], isLoading: loadingLcp } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
  });

  // For each completed report, load its ONT counts per LCP/splitter
  const completedReports = useMemo(() =>
    reports.filter(r => r.processing_status === 'completed' && r.ont_count > 0),
    [reports]
  );

  const { data: allOntCounts = [], isLoading: loadingCounts } = useQuery({
    queryKey: ['capacityOntCounts', completedReports.map(r => r.id).join(',')],
    enabled: completedReports.length > 0,
    queryFn: async () => {
      // Load ONT records for each report and aggregate by LCP/splitter
      const results = [];
      for (const report of completedReports) {
        const counts = {};
        let skip = 0;
        const pageSize = 2000;
        while (true) {
          const page = await base44.entities.ONTPerformanceRecord.filter(
            { report_id: report.id }, '-created_date', pageSize, skip
          );
          if (!page.length) break;
          for (const rec of page) {
            const lcp = (rec.lcp_number || '').trim().toUpperCase();
            const sp = (rec.splitter_number || '').trim().toUpperCase();
            if (!lcp) continue;
            const key = `${lcp}|${sp}`;
            counts[key] = (counts[key] || 0) + 1;
          }
          if (page.length < pageSize) break;
          skip += pageSize;
        }
        results.push({
          reportId: report.id,
          reportName: report.report_name,
          date: report.upload_date,
          counts,
        });
      }
      return results;
    },
  });

  // Build projections
  const projections = useMemo(() => {
    if (allOntCounts.length < 1) return [];

    // Collect all unique LCP/Splitter keys
    const allKeys = new Set();
    allOntCounts.forEach(r => Object.keys(r.counts).forEach(k => allKeys.add(k)));

    // Build LCP lookup
    const lcpLookup = {};
    lcpEntries.forEach(e => {
      const key = `${(e.lcp_number || '').trim().toUpperCase()}|${(e.splitter_number || '').trim().toUpperCase()}`;
      lcpLookup[key] = e;
    });

    const rows = [];
    const sortedReports = [...allOntCounts].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const key of allKeys) {
      const [lcp, splitter] = key.split('|');
      const dataPoints = sortedReports
        .map(r => ({ date: new Date(r.date), count: r.counts[key] || 0 }))
        .filter(d => d.count > 0);

      if (dataPoints.length === 0) continue;

      const latestCount = dataPoints[dataPoints.length - 1].count;
      const remaining = Math.max(0, SPLITTER_CAPACITY - latestCount);

      // Calculate growth rate (ONTs per month) via linear regression if 2+ data points
      let growthPerMonth = 0;
      let daysToFull = null;
      let projectedFullDate = null;

      if (dataPoints.length >= 2) {
        const first = dataPoints[0];
        const last = dataPoints[dataPoints.length - 1];
        const daysDiff = (last.date - first.date) / (1000 * 60 * 60 * 24);
        if (daysDiff > 0) {
          const totalGrowth = last.count - first.count;
          const growthPerDay = totalGrowth / daysDiff;
          growthPerMonth = growthPerDay * 30;

          if (growthPerDay > 0 && remaining > 0) {
            daysToFull = Math.ceil(remaining / growthPerDay);
            projectedFullDate = new Date(last.date);
            projectedFullDate.setDate(projectedFullDate.getDate() + daysToFull);
          } else if (remaining === 0) {
            daysToFull = 0;
          }
        }
      }

      let urgency = 'low';
      if (remaining === 0) urgency = 'full';
      else if (daysToFull !== null && daysToFull <= 90) urgency = 'critical';
      else if (daysToFull !== null && daysToFull <= 180) urgency = 'warning';
      else if (remaining <= 5) urgency = 'warning';

      const lcpEntry = lcpLookup[key];

      rows.push({
        key,
        lcp,
        splitter,
        location: lcpEntry?.location || '',
        oltName: lcpEntry?.olt_name || '',
        latestCount,
        remaining,
        growthPerMonth: Math.round(growthPerMonth * 10) / 10,
        daysToFull,
        projectedFullDate,
        urgency,
        dataPoints,
      });
    }

    return rows.sort((a, b) => {
      const urgencyOrder = { full: 0, critical: 1, warning: 2, low: 3 };
      return (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4);
    });
  }, [allOntCounts, lcpEntries]);

  const filtered = useMemo(() => {
    return projections.filter(row => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        row.lcp.toLowerCase().includes(term) ||
        row.splitter.toLowerCase().includes(term) ||
        row.location.toLowerCase().includes(term) ||
        row.oltName.toLowerCase().includes(term);
      const matchesUrgency = urgencyFilter === 'all' || row.urgency === urgencyFilter;
      return matchesSearch && matchesUrgency;
    });
  }, [projections, searchTerm, urgencyFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const full = projections.filter(r => r.urgency === 'full').length;
    const critical = projections.filter(r => r.urgency === 'critical').length;
    const warning = projections.filter(r => r.urgency === 'warning').length;
    const avgGrowth = projections.length > 0
      ? projections.reduce((s, r) => s + r.growthPerMonth, 0) / projections.length
      : 0;
    return { full, critical, warning, total: projections.length, avgGrowth: Math.round(avgGrowth * 10) / 10 };
  }, [projections]);

  const isLoading = loadingReports || loadingLcp || loadingCounts;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Capacity Planning</h1>
                <p className="text-xs text-gray-500">
                  Splitter utilization projections based on {completedReports.length} historical report{completedReports.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-600">Loading capacity data...</h3>
              <p className="text-sm text-gray-500 mt-1">Analyzing {completedReports.length} reports</p>
            </CardContent>
          </Card>
        ) : completedReports.length < 1 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">Not enough data for projections</h3>
              <p className="text-sm text-gray-500 mt-1">
                Upload at least 1 PON PM report to see capacity data. 2+ reports enables growth projections.
              </p>
              <Link to={createPageUrl('PONPMAnalysis')}>
                <Button className="mt-4">Go to PON PM Analysis</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-xs text-gray-500">Tracked Splitters</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow bg-red-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.full}</div>
                  <div className="text-xs text-gray-500">At Capacity</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow bg-orange-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.critical}</div>
                  <div className="text-xs text-gray-500">Full within 90d</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow bg-amber-50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.warning}</div>
                  <div className="text-xs text-gray-500">Full within 180d</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.avgGrowth}</div>
                  <div className="text-xs text-gray-500">Avg ONTs/mo</div>
                </CardContent>
              </Card>
            </div>

            {/* Growth Chart */}
            {completedReports.length >= 2 && (
              <CapacityGrowthChart allOntCounts={allOntCounts} projections={projections} />
            )}

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by LCP, splitter, location, OLT..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgencies</SelectItem>
                  <SelectItem value="full">At Capacity</SelectItem>
                  <SelectItem value="critical">Critical (≤90d)</SelectItem>
                  <SelectItem value="warning">Warning (≤180d)</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Projection Table */}
            <CapacityProjectionTable rows={filtered} hasMultipleReports={completedReports.length >= 2} />

            {completedReports.length < 2 && (
              <Card className="border border-blue-200 bg-blue-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800">
                    <strong>Growth projections require 2+ reports.</strong> Upload another PON PM report to enable time-based capacity forecasting.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}