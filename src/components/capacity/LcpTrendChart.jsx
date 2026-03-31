import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const SPLITTER_CAP = 32;
const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function LcpTrendChart({ open, onOpenChange, lcpName, splitters = [] }) {
  // Fetch all completed reports
  const { data: completedReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['completedReports'],
    queryFn: () => base44.entities.PONPMReport.filter(
      { processing_status: 'completed' },
      'upload_date',
      100
    ),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  // Fetch historical counts across all completed reports
  const reportIds = useMemo(() => completedReports.map(r => r.id), [completedReports]);

  const { data: historicalData = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['lcpTrendData', reportIds.join(',')],
    queryFn: async () => {
      if (reportIds.length === 0) return [];
      const res = await base44.functions.invoke('getLatestLcpOntCounts', { report_ids: reportIds });
      return res.data?.results || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: open && reportIds.length > 0,
  });

  // Build chart data for this LCP's splitters
  const { chartData, splitterKeys, growthStats } = useMemo(() => {
    if (!historicalData.length || !lcpName) return { chartData: [], splitterKeys: [], growthStats: [] };

    // Find all splitter keys for this LCP
    const prefix = lcpName.toUpperCase() + '|';
    const keySet = new Set();

    // From current splitters prop
    splitters.forEach(s => keySet.add(s.key));

    // Also from historical data
    historicalData.forEach(report => {
      Object.keys(report.counts).forEach(k => {
        if (k.startsWith(prefix)) keySet.add(k);
      });
    });

    const keys = [...keySet].sort();

    // Build time-series sorted by date
    const sorted = [...historicalData].sort((a, b) => new Date(a.date) - new Date(b.date));

    const chart = sorted.map(report => {
      const point = {
        date: format(new Date(report.date), 'MMM d'),
        fullDate: report.date,
        reportName: report.reportName,
      };
      keys.forEach(k => {
        point[k] = report.counts[k] || 0;
      });
      // Aggregate total for this LCP
      point._total = keys.reduce((s, k) => s + (report.counts[k] || 0), 0);
      return point;
    });

    // Compute growth stats per splitter
    const stats = keys.map(k => {
      const [, spl] = k.split('|');
      const dataPoints = sorted.map(r => r.counts[k] || 0);
      const first = dataPoints[0] || 0;
      const last = dataPoints[dataPoints.length - 1] || 0;
      const change = last - first;
      const current = last;
      const remaining = Math.max(0, SPLITTER_CAP - current);

      // Growth per month (if we have date range)
      let growthPerMonth = 0;
      if (sorted.length >= 2) {
        const firstDate = new Date(sorted[0].date);
        const lastDate = new Date(sorted[sorted.length - 1].date);
        const days = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
        if (days > 0) growthPerMonth = (change / days) * 30;
      }

      return {
        key: k,
        splitter: spl || '-',
        current,
        remaining,
        change,
        growthPerMonth: Math.round(growthPerMonth * 10) / 10,
        dataPoints,
      };
    });

    // Sort by growth rate descending (fastest growing first)
    stats.sort((a, b) => b.growthPerMonth - a.growthPerMonth);

    return { chartData: chart, splitterKeys: keys, growthStats: stats };
  }, [historicalData, lcpName, splitters]);

  const isLoading = loadingReports || loadingHistory;
  const hasEnoughData = chartData.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Trend Analysis — {lcpName}
          </DialogTitle>
          <DialogDescription>
            Historical ONT count per splitter across {completedReports.length} PON PM report{completedReports.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Loading historical data...</p>
          </div>
        ) : !hasEnoughData ? (
          <div className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Not enough data for trend analysis</p>
            <p className="text-sm text-gray-500 mt-1">
              Need at least 2 completed PON PM reports. Currently have {chartData.length}.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chart */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ONTs per Splitter Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 text-xs max-w-[250px]">
                              <div className="font-semibold mb-1">{label}</div>
                              {payload
                                .filter(p => !p.dataKey.startsWith('_'))
                                .sort((a, b) => (b.value || 0) - (a.value || 0))
                                .map(p => {
                                  const [, spl] = p.dataKey.split('|');
                                  return (
                                    <div key={p.dataKey} className="flex justify-between gap-4">
                                      <span style={{ color: p.color }}>{spl || '-'}</span>
                                      <span className="font-mono">{p.value}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine
                        y={SPLITTER_CAP}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label={{ value: 'Capacity (32)', position: 'right', fontSize: 10, fill: '#ef4444' }}
                      />
                      {splitterKeys.map((k, i) => (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={k}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={k.split('|')[1] || '-'}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
                  {splitterKeys.map((k, i) => (
                    <div key={k} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{k.split('|')[1] || '-'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Growth Table */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Growth Rate by Splitter</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead>Splitter</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Total Change</TableHead>
                        <TableHead className="text-right">Growth/mo</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {growthStats.map(row => (
                        <TableRow
                          key={row.key}
                          className={
                            row.remaining <= 4 && row.growthPerMonth > 0 ? 'bg-red-50 dark:bg-red-900/10' :
                            row.remaining <= 10 && row.growthPerMonth > 1 ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                          }
                        >
                          <TableCell className="font-mono text-sm">{row.splitter}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{row.current}/{SPLITTER_CAP}</TableCell>
                          <TableCell className={`text-right font-mono text-sm font-semibold ${
                            row.remaining === 0 ? 'text-red-600' :
                            row.remaining <= 4 ? 'text-orange-600' :
                            row.remaining <= 10 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {row.remaining}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${
                            row.change > 0 ? 'text-red-600' : row.change < 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {row.change > 0 ? `+${row.change}` : row.change}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${
                            row.growthPerMonth > 2 ? 'text-red-600 font-bold' :
                            row.growthPerMonth > 0.5 ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            {row.growthPerMonth > 0 ? `+${row.growthPerMonth}` : row.growthPerMonth}
                          </TableCell>
                          <TableCell>
                            <GrowthIndicator growth={row.growthPerMonth} remaining={row.remaining} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Rapid Growth Alerts */}
            {growthStats.some(s => s.growthPerMonth > 1 && s.remaining <= 10) && (
              <Card className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Rapid Growth Detected</div>
                      <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                        {growthStats
                          .filter(s => s.growthPerMonth > 1 && s.remaining <= 10)
                          .map(s => (
                            <div key={s.key}>
                              <strong>{s.splitter}</strong>: Growing at {s.growthPerMonth} ONTs/mo with only {s.remaining} port{s.remaining !== 1 ? 's' : ''} remaining
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GrowthIndicator({ growth, remaining }) {
  if (growth > 2 && remaining <= 10) {
    return <Badge className="bg-red-600 text-white text-[10px]"><TrendingUp className="h-3 w-3 mr-0.5" />Rapid</Badge>;
  }
  if (growth > 0.5) {
    return <Badge className="bg-amber-400 text-amber-900 text-[10px]"><TrendingUp className="h-3 w-3 mr-0.5" />Growing</Badge>;
  }
  if (growth > 0) {
    return <Badge className="bg-blue-100 text-blue-700 text-[10px]"><TrendingUp className="h-3 w-3 mr-0.5" />Slow</Badge>;
  }
  if (growth < 0) {
    return <Badge className="bg-green-100 text-green-700 text-[10px]"><TrendingDown className="h-3 w-3 mr-0.5" />Declining</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] text-gray-500"><Minus className="h-3 w-3 mr-0.5" />Flat</Badge>;
}