import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Download, TrendingUp, TrendingDown, Minus,
  AlertCircle, AlertTriangle, CheckCircle2, Router,
  MapPin, FileText, Loader2, BarChart3, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadPdfFromFunction } from '@/lib/pdfDownload';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = n => (n ?? 0).toLocaleString();
const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '0.0%';

function DeltaBadge({ delta, invertColor = false }) {
  if (delta === null || delta === undefined) return null;
  const isPos = delta > 0;
  // invertColor: for "healthy" metrics, positive delta is good (green)
  const isGood = invertColor ? isPos : !isPos;
  if (delta === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      {isPos
        ? <TrendingUp className="h-3 w-3" />
        : <TrendingDown className="h-3 w-3" />}
      {isPos ? '+' : ''}{delta}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, delta, invertDelta }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            {Icon && <Icon className={`h-5 w-5 ${color}`} />}
            <DeltaBadge delta={delta} invertColor={invertDelta} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Aggregate from client-side records ───────────────────────────────────────
function aggregateRecords(records) {
  const cityMap = new Map();
  const zipMap  = new Map();
  const oltMap  = new Map();

  for (const r of records) {
    // City — try to extract from subscriber_address
    const city = r.subscriber_address?.split(',')[1]?.trim()
      || r.subscriber_address?.match(/[A-Za-z\s]{3,}/)?.[0]?.trim()
      || 'Unknown';
    if (!cityMap.has(city)) cityMap.set(city, { total: 0, critical: 0, warning: 0, ok: 0, offline: 0 });
    const c = cityMap.get(city); c.total++;
    if (r.status) c[r.status] = (c[r.status] || 0) + 1;

    // Zip
    const zip = r.subscriber_address?.match(/\b\d{5}\b/)?.[0] || 'Unknown';
    if (!zipMap.has(zip)) zipMap.set(zip, { total: 0, critical: 0, warning: 0 });
    const z = zipMap.get(zip); z.total++;
    if (r.status === 'critical') z.critical++;
    if (r.status === 'warning')  z.warning++;

    // OLT
    const olt = r.olt_name || 'Unknown';
    if (!oltMap.has(olt)) oltMap.set(olt, { total: 0, critical: 0, warning: 0, ok: 0, offline: 0, rxSum: 0, rxCount: 0 });
    const o = oltMap.get(olt); o.total++;
    if (r.status) o[r.status] = (o[r.status] || 0) + 1;
    if (r.ont_rx_power != null && !isNaN(r.ont_rx_power)) { o.rxSum += r.ont_rx_power; o.rxCount++; }
  }

  const cities = [...cityMap.entries()]
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.critical - a.critical).slice(0, 20);

  const zips = [...zipMap.entries()]
    .map(([zip, v]) => ({ zip, ...v }))
    .sort((a, b) => b.critical - a.critical).slice(0, 15);

  const olts = [...oltMap.entries()]
    .map(([olt, v]) => ({
      olt, ...v,
      avgRx: v.rxCount > 0 ? (v.rxSum / v.rxCount).toFixed(1) : null,
      healthPct: v.total > 0 ? ((v.ok / v.total) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.critical - a.critical);

  return { cities, zips, olts };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExecutiveReport() {
  const [weeksBack, setWeeksBack] = useState('1');
  const [isAdmin, setIsAdmin] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => setIsAdmin(false));
  }, []);

  // ── Determine date windows ─────────────────────────────────────────────────
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const currentStart = new Date(now.getTime() - parseInt(weeksBack) * msPerWeek).toISOString();
  const prevStart    = new Date(now.getTime() - (parseInt(weeksBack) + 1) * msPerWeek).toISOString();
  const prevEnd      = currentStart;

  const { data: currentRecs = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ['execReport-current', weeksBack],
    queryFn: async () => {
      const res = await base44.entities.ONTPerformanceRecord.filter(
        { report_date: { $gte: currentStart } }, '-report_date', 5000
      );
      // Fallback: if nothing in window, grab latest report's records
      if (res.length === 0) {
        const reports = await base44.entities.PONPMReport.list('-upload_date', 1);
        if (reports[0]) {
          return base44.entities.ONTPerformanceRecord.filter(
            { report_id: reports[0].id }, '-report_date', 5000
          );
        }
      }
      return res;
    },
    enabled: isAdmin === true,
    staleTime: 5 * 60 * 1000,
  });

  const { data: prevRecs = [], isLoading: loadingPrev } = useQuery({
    queryKey: ['execReport-prev', weeksBack],
    queryFn: () => base44.entities.ONTPerformanceRecord.filter(
      { report_date: { $gte: prevStart, $lt: prevEnd } }, '-report_date', 5000
    ),
    enabled: isAdmin === true,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingCurrent || loadingPrev;

  // ── Summary stats ──────────────────────────────────────────────────────────
  const total   = currentRecs.length;
  const crit    = currentRecs.filter(r => r.status === 'critical').length;
  const warn    = currentRecs.filter(r => r.status === 'warning').length;
  const ok      = currentRecs.filter(r => r.status === 'ok').length;
  const offline = currentRecs.filter(r => r.status === 'offline').length;

  const prevTotal = prevRecs.length;
  const prevCrit  = prevRecs.filter(r => r.status === 'critical').length;
  const prevOk    = prevRecs.filter(r => r.status === 'ok').length;

  const critDelta = prevTotal > 0 ? crit - prevCrit : null;
  const okDelta   = prevTotal > 0 ? ok   - prevOk   : null;

  const { cities, zips, olts } = useMemo(
    () => aggregateRecords(currentRecs),
    [currentRecs]
  );

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadPdfFromFunction(
        'generateExecutiveReport',
        { weeks_back: parseInt(weeksBack) },
        `FiberOracle-Executive-Report-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      toast.error('PDF generation failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mt-2">This report is for admin users only.</p>
            <Link to={createPageUrl('Home')}>
              <Button className="mt-4" variant="outline">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Executive Report
                </h1>
                <p className="text-sm text-muted-foreground">Network performance overview for management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={weeksBack} onValueChange={setWeeksBack}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 7 days</SelectItem>
                  <SelectItem value="2">Last 14 days</SelectItem>
                  <SelectItem value="4">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleDownloadPdf}
                disabled={downloading || total === 0}
                size="sm"
              >
                {downloading
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <Download className="h-4 w-4 mr-2" />}
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : total === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No ONT records found</h3>
              <p className="text-sm text-muted-foreground mt-1">Upload a PON PM report and wait for indexing to complete.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Strip */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Network Health Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard label="Total ONTs"  value={fmtNum(total)}  color="text-primary"   icon={Router}        delta={null} />
                <KpiCard label="Critical"    value={fmtNum(crit)}   color="text-red-600"   icon={AlertCircle}   delta={critDelta}  invertDelta={false} />
                <KpiCard label="Warning"     value={fmtNum(warn)}   color="text-amber-600" icon={AlertTriangle} delta={null} />
                <KpiCard label="Healthy"     value={fmtNum(ok)}     color="text-green-600" icon={CheckCircle2}  delta={okDelta}    invertDelta={true} />
                <KpiCard label="Health Rate" value={pct(ok, total)} color="text-emerald-600" sub={offline > 0 ? `${fmtNum(offline)} offline` : undefined} delta={null} />
              </div>
              {prevTotal > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Arrows show change vs prior period ({fmtNum(prevTotal)} ONTs). Critical delta: {critDelta > 0 ? '+' : ''}{critDelta ?? '—'}.
                </p>
              )}
            </div>

            {/* Issues by City */}
            {cities.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Issues by City
                </h2>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-2 font-semibold">City</th>
                          <th className="text-right px-4 py-2 font-semibold">Total</th>
                          <th className="text-right px-4 py-2 font-semibold text-red-600">Critical</th>
                          <th className="text-right px-4 py-2 font-semibold text-red-600">Crit %</th>
                          <th className="text-right px-4 py-2 font-semibold text-amber-600">Warning</th>
                          <th className="text-right px-4 py-2 font-semibold text-green-600">Healthy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cities.map((r, i) => (
                          <tr key={r.city} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                            <td className="px-4 py-2 font-medium">{r.city}</td>
                            <td className="px-4 py-2 text-right">{fmtNum(r.total)}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${r.critical > 0 ? 'text-red-600' : ''}`}>{fmtNum(r.critical)}</td>
                            <td className={`px-4 py-2 text-right ${r.critical > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{pct(r.critical, r.total)}</td>
                            <td className={`px-4 py-2 text-right ${r.warning > 0 ? 'text-amber-600' : ''}`}>{fmtNum(r.warning)}</td>
                            <td className="px-4 py-2 text-right text-green-600">{fmtNum(r.ok)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Issues by Zip */}
            {zips.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Issues by Zip Code (Top {zips.length})
                </h2>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-2 font-semibold">Zip</th>
                          <th className="text-right px-4 py-2 font-semibold">Total</th>
                          <th className="text-right px-4 py-2 font-semibold text-red-600">Critical</th>
                          <th className="text-right px-4 py-2 font-semibold text-red-600">Crit %</th>
                          <th className="text-right px-4 py-2 font-semibold text-amber-600">Warning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zips.map((r, i) => (
                          <tr key={r.zip} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                            <td className="px-4 py-2 font-mono font-medium">{r.zip}</td>
                            <td className="px-4 py-2 text-right">{fmtNum(r.total)}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${r.critical > 0 ? 'text-red-600' : ''}`}>{fmtNum(r.critical)}</td>
                            <td className={`px-4 py-2 text-right ${r.critical > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{pct(r.critical, r.total)}</td>
                            <td className={`px-4 py-2 text-right ${r.warning > 0 ? 'text-amber-600' : ''}`}>{fmtNum(r.warning)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* OLT Shelf Comparison */}
            {olts.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Router className="h-4 w-4" /> OLT Shelf Comparison
                </h2>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-2 font-semibold">OLT / Chassis</th>
                          <th className="text-right px-4 py-2 font-semibold">ONTs</th>
                          <th className="text-right px-4 py-2 font-semibold text-red-600">Critical</th>
                          <th className="text-right px-4 py-2 font-semibold text-amber-600">Warning</th>
                          <th className="text-right px-4 py-2 font-semibold">Health %</th>
                          <th className="text-right px-4 py-2 font-semibold">Avg ONT Rx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {olts.map((r, i) => {
                          const h = parseFloat(r.healthPct);
                          const hClass = h >= 90 ? 'text-green-600' : h >= 70 ? 'text-amber-600' : 'text-red-600';
                          return (
                            <tr key={r.olt} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                              <td className="px-4 py-2 font-medium">{r.olt}</td>
                              <td className="px-4 py-2 text-right">{fmtNum(r.total)}</td>
                              <td className={`px-4 py-2 text-right font-semibold ${r.critical > 0 ? 'text-red-600' : ''}`}>{fmtNum(r.critical)}</td>
                              <td className={`px-4 py-2 text-right ${r.warning > 0 ? 'text-amber-600' : ''}`}>{fmtNum(r.warning)}</td>
                              <td className={`px-4 py-2 text-right font-semibold ${hClass}`}>{r.healthPct}%</td>
                              <td className="px-4 py-2 text-right font-mono text-xs">
                                {r.avgRx ? `${r.avgRx} dBm` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Week-over-week */}
            {prevTotal > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Week-over-Week Summary
                </h2>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-2 font-semibold">Metric</th>
                          <th className="text-right px-4 py-2 font-semibold">This Period</th>
                          <th className="text-right px-4 py-2 font-semibold">Prior Period</th>
                          <th className="text-right px-4 py-2 font-semibold">Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Total ONTs',    cur: total,   prev: prevTotal, invert: false },
                          { label: 'Critical',       cur: crit,    prev: prevCrit,  invert: false },
                          { label: 'Warning',        cur: warn,    prev: prevRecs.filter(r => r.status === 'warning').length, invert: false },
                          { label: 'Healthy',        cur: ok,      prev: prevOk,    invert: true  },
                          { label: 'Offline',        cur: offline, prev: prevRecs.filter(r => r.status === 'offline').length, invert: false },
                        ].map((row, i) => {
                          const delta = row.cur - row.prev;
                          const sign = delta > 0 ? '+' : '';
                          const isGood = row.invert ? delta > 0 : delta < 0;
                          const dClass = delta === 0 ? 'text-muted-foreground'
                            : isGood ? 'text-green-600' : 'text-red-600';
                          return (
                            <tr key={row.label} className={i % 2 === 0 ? 'bg-muted/20' : ''}>
                              <td className="px-4 py-2 font-medium">{row.label}</td>
                              <td className="px-4 py-2 text-right">{fmtNum(row.cur)}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{fmtNum(row.prev)}</td>
                              <td className={`px-4 py-2 text-right font-semibold ${dClass}`}>
                                {delta === 0 ? '—' : `${sign}${delta}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}