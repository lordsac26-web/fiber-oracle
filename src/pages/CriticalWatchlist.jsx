import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertCircle, Loader2, RefreshCw, ShieldAlert, CheckCircle2, Download } from 'lucide-react';
import { downloadWatchlistCsv } from '@/components/watchlist/exportWatchlistCsv';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import CriticalOntRow from '@/components/watchlist/CriticalOntRow';
import ONTDetailView from '@/components/ponpm/ONTDetailView';

// Rebuild a minimal ONT-shaped object so ONTDetailView (fetches history by
// serial) works from a watchlist row.
function rowToOnt(o) {
  const c = o.current || {};
  return {
    SerialNumber: o.serial_number,
    OntID: o.ont_id,
    OLTName: o.olt_name,
    _oltName: o.olt_name,
    _port: o.port,
    'Shelf/Slot/Port': o.port,
    _lcpNumber: o.lcp_number,
    _splitterNumber: o.splitter_number,
    OntRxOptPwr: c.ont_rx_power,
    OLTRXOptPwr: c.olt_rx_power,
    _analysis: { status: 'critical', issues: [], warnings: [] },
    _subscriber: (o.subscriber_name || o.subscriber_address) ? { name: o.subscriber_name, address: o.subscriber_address } : undefined,
    report_id: o.report_id,
  };
}

export default function CriticalWatchlist() {
  const { isAdmin, checked } = useIsAdmin();
  const [reportId, setReportId] = useState(null);
  const [detailOnt, setDetailOnt] = useState(null);

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['ponPmReports'],
    queryFn: () => base44.entities.PONPMReport.list('-upload_date'),
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000,
  });

  // Default to the most recent report once the list loads.
  useEffect(() => {
    if (!reportId && reports.length > 0) setReportId(reports[0].id);
  }, [reports, reportId]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['criticalWatchlist', reportId],
    queryFn: async () => {
      const res = await base44.functions.invoke('criticalOntWatchlist', { report_id: reportId, limit: 50 });
      return res.data;
    },
    enabled: isAdmin && !!reportId,
    staleTime: 60 * 1000,
  });

  const onts = data?.onts || [];
  const selectedReport = useMemo(() => reports.find(r => r.id === reportId), [reports, reportId]);

  const handleDrill = useCallback((o) => setDetailOnt(rowToOnt(o)), []);

  const handleExport = useCallback(() => {
    if (!onts.length) return;
    const stamp = selectedReport ? format(new Date(selectedReport.upload_date), 'yyyy-MM-dd') : 'export';
    downloadWatchlistCsv(onts, `critical-ont-watchlist-${stamp}.csv`);
  }, [onts, selectedReport]);

  if (!checked) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-gray-300 mx-auto" />
            <h2 className="text-lg font-semibold">Admins only</h2>
            <p className="text-sm text-gray-500">The Critical ONT Watchlist is restricted to administrators.</p>
            <Link to="/"><Button variant="outline">Back to Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/PONPMAnalysis">
              <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" /> Critical ONT Watchlist
              </h1>
              <p className="text-xs text-gray-500">Top 50 critical ONTs with 5 &amp; 10-report error deltas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={reportId || ''} onValueChange={setReportId}>
              <SelectTrigger className="w-[260px] h-9 text-xs">
                <SelectValue placeholder={loadingReports ? 'Loading reports…' : 'Select a report'} />
              </SelectTrigger>
              <SelectContent>
                {reports.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.report_name} — {format(new Date(r.upload_date), 'MMM d, yyyy h:mm a')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={onts.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching || !reportId}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
        {/* Summary */}
        {data && (
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              <AlertCircle className="h-3 w-3 mr-1" /> {data.total_critical} critical in report
            </Badge>
            <Badge variant="outline">Showing top {data.count}</Badge>
            {selectedReport && (
              <span className="text-xs text-gray-500">
                {selectedReport.report_name} • {format(new Date(selectedReport.upload_date), 'MMM d, yyyy h:mm a')}
              </span>
            )}
          </div>
        )}

        {isLoading || (isFetching && onts.length === 0) ? (
          <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" /><p className="text-sm text-gray-500 mt-3">Computing error trends…</p></div>
        ) : onts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
              <h3 className="font-semibold">No critical ONTs</h3>
              <p className="text-sm text-gray-500">This report has no ONTs in critical status.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                  <tr className="text-[10px] uppercase text-gray-500">
                    <th className="px-2 py-2 w-8">#</th>
                    <th className="px-2 py-2 text-left">ONT</th>
                    <th className="px-2 py-2 w-14 text-center">Hist</th>
                    <th className="px-2 py-2 text-right">ONT Rx</th>
                    <th className="px-2 py-2 text-right">OLT Rx</th>
                    <th className="px-2 py-2 text-right">US BIP</th>
                    <th className="px-2 py-2 text-right">DS BIP</th>
                    <th className="px-2 py-2 text-right">US FEC U</th>
                    <th className="px-2 py-2 text-right">DS FEC U</th>
                    <th className="px-2 py-2 text-right">HEC</th>
                    <th className="px-2 py-2 text-right">MBurst</th>
                  </tr>
                </thead>
                <tbody>
                  {onts.map((o, i) => (
                    <CriticalOntRow key={o.serial_number || i} ont={o} rank={i + 1} onDrillDown={handleDrill} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 text-[10px] text-gray-400 border-t bg-gray-50 dark:bg-gray-800/50">
              Each cell shows the current value with <span className="text-gray-500 font-medium">5r</span> / <span className="text-gray-500 font-medium">10r</span> deltas (change vs. 5 and 10 reports ago).
              Red = worsening, green = improving. Ranked by severity.
            </div>
          </Card>
        )}
      </main>

      {detailOnt && (
        <ONTDetailView ont={detailOnt} onClose={() => setDetailOnt(null)} allOnts={[]} />
      )}
    </div>
  );
}