import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts';

// Gradient stop colors for each zone — critical → optimal → high
const ONT_RX_RANGES = [
  { min: -50, max: -30, label: '<-30 dBm',    color: '#dc2626', zone: 'Critical' },
  { min: -30, max: -27, label: '-30→-27 dBm', color: '#f97316', zone: 'Low' },
  { min: -27, max: -25, label: '-27→-25 dBm', color: '#eab308', zone: 'Marginal' },
  { min: -25, max: -20, label: '-25→-20 dBm', color: '#84cc16', zone: 'Good' },
  { min: -20, max: -15, label: '-20→-15 dBm', color: '#22c55e', zone: 'Optimal' },
  { min: -15, max: -10, label: '-15→-10 dBm', color: '#10b981', zone: 'Optimal' },
  { min: -10, max:  -8, label: '-10→-8 dBm',  color: '#eab308', zone: 'High' },
  { min:  -8, max:   0, label: '>-8 dBm',     color: '#f97316', zone: 'High' },
];

const OLT_RX_RANGES = [
  { min: -50, max: -32, label: '<-32 dBm',    color: '#dc2626', zone: 'Critical' },
  { min: -32, max: -30, label: '-32→-30 dBm', color: '#f97316', zone: 'Low' },
  { min: -30, max: -28, label: '-30→-28 dBm', color: '#eab308', zone: 'Marginal' },
  { min: -28, max: -24, label: '-28→-24 dBm', color: '#84cc16', zone: 'Good' },
  { min: -24, max: -20, label: '-24→-20 dBm', color: '#22c55e', zone: 'Optimal' },
  { min: -20, max: -15, label: '-20→-15 dBm', color: '#10b981', zone: 'Optimal' },
  { min: -15, max: -10, label: '-15→-10 dBm', color: '#14b8a6', zone: 'High' },
  { min: -10, max:   0, label: '>-10 dBm',    color: '#06b6d4', zone: 'High' },
];

const ZONE_STYLE = {
  Critical: { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300' },
  Low:      { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  Marginal: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  Good:     { bg: 'bg-lime-100 dark:bg-lime-900/30',   text: 'text-lime-700 dark:text-lime-300' },
  Optimal:  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  High:     { bg: 'bg-cyan-100 dark:bg-cyan-900/30',   text: 'text-cyan-700 dark:text-cyan-300' },
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const zoneStyle = ZONE_STYLE[d.zone] || ZONE_STYLE.Optimal;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-bold text-gray-800 dark:text-gray-100 mb-1 font-mono text-sm">{d.label}</p>
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${zoneStyle.bg} ${zoneStyle.text}`}>
        {d.zone}
      </span>
      <p className="text-gray-600 dark:text-gray-300 font-mono">
        <span className="font-bold text-gray-900 dark:text-white text-sm">{d.count.toLocaleString()}</span> ONTs
      </p>
      {d.total > 0 && (
        <p className="text-gray-400 text-[10px] mt-0.5">
          {((d.count / d.total) * 100).toFixed(1)}% of total
        </p>
      )}
    </div>
  );
}

export default function PowerDistributionChart({ onts, powerMetric = 'ont_rx', title }) {
  const { chartData, totalCount, peak } = useMemo(() => {
    if (!onts || onts.length === 0) return { chartData: [], totalCount: 0, peak: 0 };

    const dataKey = powerMetric === 'olt_rx' ? 'OLTRXOptPwr' : 'OntRxOptPwr';
    const ranges  = powerMetric === 'olt_rx' ? OLT_RX_RANGES : ONT_RX_RANGES;

    const distribution = ranges.map(r => ({ ...r, count: 0, total: 0 }));

    let total = 0;
    onts.forEach(ont => {
      const rx = parseFloat(ont[dataKey]);
      if (!isNaN(rx) && rx !== 0) {
        total++;
        for (let i = 0; i < ranges.length; i++) {
          if (rx >= ranges[i].min && rx < ranges[i].max) {
            distribution[i].count++;
            break;
          }
        }
      }
    });

    // Inject total into each row so tooltip can compute %
    distribution.forEach(d => { d.total = total; });

    const visible = distribution.filter(d => d.count > 0);
    const peak = visible.length ? Math.max(...visible.map(d => d.count)) : 0;

    return { chartData: visible, totalCount: total, peak };
  }, [onts, powerMetric]);

  const isOlt = powerMetric === 'olt_rx';
  const defaultTitle = isOlt ? 'OLT Rx Power Distribution' : 'ONT Rx Power Distribution';
  const accentColor = isOlt ? '#7c3aed' : '#2563eb';

  if (chartData.length === 0) return null;

  // Summary zone counts
  const critCount = chartData.filter(d => d.zone === 'Critical').reduce((s, d) => s + d.count, 0);
  const warnCount = chartData.filter(d => ['Low', 'Marginal'].includes(d.zone)).reduce((s, d) => s + d.count, 0);
  const goodCount = chartData.filter(d => ['Good', 'Optimal'].includes(d.zone)).reduce((s, d) => s + d.count, 0);
  const highCount = chartData.filter(d => d.zone === 'High').reduce((s, d) => s + d.count, 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {title || defaultTitle}
          </CardTitle>
          <span className="text-[10px] text-gray-400 font-mono">{totalCount.toLocaleString()} ONTs sampled</span>
        </div>
        {/* Zone summary pills */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          {critCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              ● Critical: {critCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              ● Low/Marginal: {warnCount}
            </span>
          )}
          {goodCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              ● Good/Optimal: {goodCount}
            </span>
          )}
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
              ● High: {highCount}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 pt-2">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 16, right: 12, left: -8, bottom: 48 }} barCategoryGap="18%">
            <defs>
              {chartData.map((d, i) => (
                <linearGradient key={i} id={`grad-${powerMetric}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={d.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={d.color} stopOpacity={0.55} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.6} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#6b7280' }}
              angle={-35}
              textAnchor="end"
              height={60}
              axisLine={false}
              tickLine={false}
              dy={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)', radius: 4 }} />
            {/* Reference line at peak/2 as a subtle guide */}
            {peak > 2 && (
              <ReferenceLine y={Math.round(peak / 2)} stroke="#d1d5db" strokeDasharray="4 4" strokeWidth={1} />
            )}
            <Bar dataKey="count" name="ONT Count" radius={[5, 5, 0, 0]} maxBarSize={52}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#grad-${powerMetric}-${index})`} stroke={entry.color} strokeWidth={0.5} strokeOpacity={0.4} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                style={{ fontSize: 9, fill: '#9ca3af', fontWeight: 600 }}
                formatter={v => v > 0 ? v : ''}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}