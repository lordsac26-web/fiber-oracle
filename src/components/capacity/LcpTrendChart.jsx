import React, { useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const SPLITTER_CAP = 32;
const MAX_REPORTS = 5;
const COLORS = [
  { stroke: '#3b82f6', fill: '#3b82f620' },
  { stroke: '#ef4444', fill: '#ef444420' },
  { stroke: '#f59e0b', fill: '#f59e0b20' },
  { stroke: '#10b981', fill: '#10b98120' },
  { stroke: '#8b5cf6', fill: '#8b5cf620' },
  { stroke: '#ec4899', fill: '#ec489920' },
  { stroke: '#06b6d4', fill: '#06b6d420' },
  { stroke: '#f97316', fill: '#f9731620' },
];

export default function LcpTrendChart({ open, onOpenChange, lcpName, splitters = [] }) {
  // Fetch the 5 most recent completed reports (sorted newest first, then reversed for chart)
  const { data: recentReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['recent5Reports'],
    queryFn: async () => {
      const reports = await base44.entities.PONPMReport.filter(
        { processing_status: 'completed' },
        '-upload_date',
        MAX_REPORTS
      );
      return reports.reverse(); // oldest → newest for chart
    },
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const reportIds = useMemo(() => recentReports.map(r => r.id), [recentReports]);

  const { data: historicalData = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['lcpTrend5', reportIds.join(',')],
    queryFn: async () => {
      if (reportIds.length === 0) return [];
      const res = await base44.functions.invoke('getLatestLcpOntCounts', { report_ids: reportIds });
      return res.data?.results || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: open && reportIds.length > 0,
  });

  const { chartData, splitterKeys, trendSummary } = useMemo(() => {
    if (!historicalData.length || !lcpName) return { chartData: [], splitterKeys: [], trendSummary: [] };

    const prefix = lcpName.toUpperCase() + '|';
    const keySet = new Set();
    splitters.forEach(s => keySet.add(s.key));
    historicalData.forEach(r => {
      Object.keys(r.counts).forEach(k => { if (k.startsWith(prefix)) keySet.add(k); });
    });
    const keys = [...keySet].sort();

    const sorted = [...historicalData].sort((a, b) => new Date(a.date) - new Date(b.date));

    const chart = sorted.map(r => {
      const point = { date: format(new Date(r.date), 'MMM d, yyyy') };
      keys.forEach(k => { point[k] = r.counts[k] || 0; });
      return point;
    });

    // Simple trend: compare last vs first
    const summary = keys.map(k => {
      const [, spl] = k.split('|');
      const vals = sorted.map(r => r.counts[k] || 0);
      const first = vals[0];
      const last = vals[vals.length - 1];
      const change = last - first;
      const remaining = Math.max(0, SPLITTER_CAP - last);
      const trend = change > 0 ? 'growing' : change < 0 ? 'declining' : 'flat';
      return { key: k, splitter: spl || '-', current: last, remaining, change, trend };
    }).sort((a, b) => b.change - a.change);

    return { chartData: chart, splitterKeys: keys, trendSummary: summary };
  }, [historicalData, lcpName, splitters]);

  const isLoading = loadingReports || loadingHistory;
  const hasData = chartData.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {lcpName} — Growth Trend
          </DialogTitle>
          <DialogDescription>
            Last {recentReports.length} report{recentReports.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Loading trend data…</p>
          </div>
        ) : !hasData ? (
          <div className="py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Need at least 2 completed reports for trends</p>
            <p className="text-sm text-gray-400 mt-1">Currently have {chartData.length}.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Trend Badges */}
            <div className="flex flex-wrap gap-2">
              {trendSummary.map(s => (
                <TrendBadge key={s.key} splitter={s.splitter} change={s.change} trend={s.trend} remaining={s.remaining} current={s.current} />
              ))}
            </div>

            {/* Area Chart */}
            <div className="h-[280px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    {splitterKeys.map((k, i) => (
                      <linearGradient key={k} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[i % COLORS.length].stroke} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS[i % COLORS.length].stroke} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, (max) => Math.max(max + 2, SPLITTER_CAP + 2)]}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <ReferenceLine
                    y={SPLITTER_CAP}
                    stroke="#ef4444"
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{ value: `Capacity (${SPLITTER_CAP})`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
                  />
                  {splitterKeys.map((k, i) => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={COLORS[i % COLORS.length].stroke}
                      fill={`url(#grad-${i})`}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: COLORS[i % COLORS.length].stroke }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
              {splitterKeys.map((k, i) => (
                <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length].stroke }} />
                  Splitter {k.split('|')[1] || '-'}
                </div>
              ))}
            </div>

            {/* Alert for rapid growth */}
            {trendSummary.some(s => s.change >= 3 && s.remaining <= 10) && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
                  {trendSummary.filter(s => s.change >= 3 && s.remaining <= 10).map(s => (
                    <div key={s.key}>
                      <strong>Splitter {s.splitter}</strong>: +{s.change} ONTs over {chartData.length} reports, only {s.remaining} port{s.remaining !== 1 ? 's' : ''} left
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TrendBadge({ splitter, change, trend, remaining, current }) {
  let badgeClass, icon, label, tipText;

  if (trend === 'growing') {
    const urgent = remaining <= 4;
    badgeClass = urgent ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-700 border-amber-300';
    icon = <TrendingUp className="h-3 w-3" />;
    label = `${splitter}: +${change}${urgent ? ' ⚠' : ''}`;
    tipText = `Splitter ${splitter} gained ${change} ONT${change !== 1 ? 's' : ''} over the last reports. Currently at ${current}/${SPLITTER_CAP} (${remaining} port${remaining !== 1 ? 's' : ''} left).`;
  } else if (trend === 'declining') {
    badgeClass = 'bg-green-100 text-green-700 border-green-300';
    icon = <TrendingDown className="h-3 w-3" />;
    label = `${splitter}: ${change}`;
    tipText = `Splitter ${splitter} lost ${Math.abs(change)} ONT${Math.abs(change) !== 1 ? 's' : ''} over the last reports. Currently at ${current}/${SPLITTER_CAP}.`;
  } else {
    badgeClass = '';
    icon = <Minus className="h-3 w-3" />;
    label = `${splitter}: 0`;
    tipText = `Splitter ${splitter} has had no change. Currently at ${current}/${SPLITTER_CAP}.`;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <UITooltip>
        <TooltipTrigger asChild>
          <Badge className={`text-xs gap-1 cursor-default ${badgeClass}`} variant="outline">
            {icon} {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
          {tipText}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border rounded-xl shadow-xl p-3 text-xs min-w-[140px]">
      <div className="font-medium text-gray-700 dark:text-gray-200 mb-1.5 border-b pb-1">{label}</div>
      {payload
        .filter(p => !p.dataKey.startsWith('_'))
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .map(p => {
          const [, spl] = p.dataKey.split('|');
          return (
            <div key={p.dataKey} className="flex justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {spl || '-'}
              </span>
              <span className="font-mono font-medium">{p.value}/{SPLITTER_CAP}</span>
            </div>
          );
        })}
    </div>
  );
}