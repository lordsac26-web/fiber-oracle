import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Zap, TrendingUp, TrendingDown, AlertTriangle, Radio, Wifi } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import ShelfHealthPanel from './ShelfHealthPanel';

const TECH_OPTIONS = ['All', 'GPON', 'XGS-PON'];

// Keep XGS_MODELS / GPON_MODELS in lock-step with detectTechTypeFromModel in
// components/ponpm/SubscriberUpload.jsx and the backend (parsePonPm /
// loadSavedReport). When adding a new model, update all three places.
const XGS_MODELS  = ['GP1101X', 'GP4201X', 'GP4201XH', '5222XG', '5228XG'];
const GPON_MODELS = ['711GE', '717GE', '725G', '725GE', '725', '812G-1', '844G-1', '844GE-1', '803G'];

// Resolve the authoritative tech-type for an ONT using the SAME model source
// that the GlobalFilterBar uses for its model counts. This guarantees the
// "GPON / XGS-PON" chips are always in lock-step with the model filter — if
// the global filter counts 2500 ONTs with model "5222XG", every one of those
// also counts as XGS-PON here, even if backend `_techType` was never refreshed.
function resolveTech(ont) {
  // Same precedence as GlobalFilterBar.jsx line 55
  const model = ont._subscriber?.model || ont._subscriberModel || ont.subscriber_model || ont.model;
  if (model) {
    const m = String(model).toUpperCase().trim();
    if (m.replace(/\s/g, '').includes('DZS')) return 'XGS-PON';
    for (const x of XGS_MODELS)  if (m.includes(x)) return 'XGS-PON';
    for (const g of GPON_MODELS) if (m.includes(g)) return 'GPON';
  }
  // Fallback to the backend-computed _techType (covers combo-port heuristic
  // and any models we haven't enumerated above).
  if (ont._techType?.includes('XGS')) return 'XGS-PON';
  if (ont._techType?.includes('GPON')) return 'GPON';
  return null;
}

function matchesTech(ont, tech) {
  if (tech === 'All') return true;
  return resolveTech(ont) === tech;
}

// Single-pass accumulator — replaces 14+ separate filter/map/reduce calls.
// On a 7k-ONT report this cuts ~98k iterations down to ~7k.
function calcStats(onts) {
  if (!onts || onts.length === 0) return null;

  let ontRxSum = 0, ontRxCount = 0, ontRxMin = Infinity, ontRxMax = -Infinity;
  let oltRxSum = 0, oltRxCount = 0;
  let totalUsBip = 0, totalDsBip = 0;
  let totalUsFec = 0, totalDsFec = 0;
  let totalUsFecCor = 0, totalDsFecCor = 0;
  let totalUsHec = 0;
  let ontsWithErrors = 0;
  let lowPower = 0, optimalPower = 0, criticalPower = 0;

  for (const o of onts) {
    const rx = parseFloat(o.OntRxOptPwr);
    if (!isNaN(rx) && rx !== 0) {
      ontRxSum += rx; ontRxCount++;
      if (rx < ontRxMin) ontRxMin = rx;
      if (rx > ontRxMax) ontRxMax = rx;
      if (rx < -25) lowPower++;
      if (rx >= -25 && rx <= -15) optimalPower++;
      if (rx < -27) criticalPower++;
    }
    const oltRx = parseFloat(o.OLTRXOptPwr);
    if (!isNaN(oltRx) && oltRx !== 0) { oltRxSum += oltRx; oltRxCount++; }

    const usBip = parseInt(o.UpstreamBipErrors) || 0;
    const dsBip = parseInt(o.DownstreamBipErrors) || 0;
    const usFec = parseInt(o.UpstreamFecUncorrectedCodeWords) || 0;
    const dsFec = parseInt(o.DownstreamFecUncorrectedCodeWords) || 0;
    const usFecCor = parseInt(o.UpstreamFecCorrectedCodeWords) || 0;
    const dsFecCor = parseInt(o.DownstreamFecCorrectedCodeWords) || 0;
    const usHec = parseInt(o.UpstreamGemHecErrors) || 0;

    totalUsBip += usBip; totalDsBip += dsBip;
    totalUsFec += usFec; totalDsFec += dsFec;
    totalUsFecCor += usFecCor; totalDsFecCor += dsFecCor;
    totalUsHec += usHec;

    if (usBip > 0 || dsBip > 0 || usFec > 0 || dsFec > 0 || usHec > 0) ontsWithErrors++;
  }

  return {
    count: onts.length,
    avgOntRx: ontRxCount > 0 ? ontRxSum / ontRxCount : null,
    minOntRx: ontRxCount > 0 ? ontRxMin : null,
    maxOntRx: ontRxCount > 0 ? ontRxMax : null,
    avgOltRx: oltRxCount > 0 ? oltRxSum / oltRxCount : null,
    totalUsBip, totalDsBip, totalUsFec, totalDsFec,
    totalUsFecCor, totalDsFecCor, totalUsHec,
    ontsWithErrors,
    errorRate: onts.length > 0 ? (ontsWithErrors / onts.length * 100) : 0,
    lowPower, optimalPower, criticalPower,
  };
}

// Custom tooltip for the error bar chart
const ErrorBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>{p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

// Gauge-style Rx power bar
function RxPowerBar({ value, min = -35, max = -5, label }) {
  if (value === null) return null;
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const color = value < -27 ? '#ef4444' : value < -25 ? '#f59e0b' : value > -8 ? '#f59e0b' : '#22c55e';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{value.toFixed(2)} dBm</span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
        {/* Zones */}
        <div className="absolute inset-0 flex">
          <div className="h-full bg-red-200 dark:bg-red-900/40" style={{ width: `${((- 27 - min) / (max - min)) * 100}%` }} />
          <div className="h-full bg-amber-200 dark:bg-amber-900/40" style={{ width: `${((-25 - (-27)) / (max - min)) * 100}%` }} />
          <div className="h-full bg-green-200 dark:bg-green-900/40" style={{ width: `${((-8 - (-25)) / (max - min)) * 100}%` }} />
          <div className="h-full bg-amber-200 dark:bg-amber-900/40 flex-1" />
        </div>
        {/* Value marker */}
        <div
          className="absolute top-0 h-full w-1.5 rounded-full shadow"
          style={{ left: `calc(${pct}% - 3px)`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-400">
        <span>{min}</span>
        <span className="text-red-400">-27</span>
        <span className="text-amber-400">-25</span>
        <span className="text-green-400">-8</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function KPIStatistics({ result, filteredOnts, previousReport, subscriberRecords = [] }) {
  const [techFilter, setTechFilter] = useState('All');

  // Displayed technology inventory counts come from the active subscriber CSV,
  // which is the authoritative source for GPON/XGS-PON totals. If subscriber
  // records are not loaded yet, fall back to the currently loaded PON PM rows.
  const techCounts = useMemo(() => {
    let gpon = 0, xgs = 0;

    if (subscriberRecords?.length > 0) {
      for (const sub of subscriberRecords) {
        const rangedRaw = String(sub.ONTRanged ?? '').trim().toLowerCase();
        const isRanged = rangedRaw === 'true' || rangedRaw === 'yes' || rangedRaw === '1';
        if (!isRanged) continue;

        const t = resolveTech({ model: sub.ONTModel });
        if (t === 'GPON') gpon++;
        else if (t === 'XGS-PON') xgs++;
      }
      return { GPON: gpon, 'XGS-PON': xgs, unknown: 0 };
    }

    if (!filteredOnts) return { GPON: 0, 'XGS-PON': 0, unknown: 0 };
    for (const o of filteredOnts) {
      const t = resolveTech(o);
      if (t === 'GPON') gpon++;
      else if (t === 'XGS-PON') xgs++;
    }
    return { GPON: gpon, 'XGS-PON': xgs, unknown: filteredOnts.length - gpon - xgs };
  }, [filteredOnts, subscriberRecords]);

  // Stats for selected tech
  const stats = useMemo(() => {
    if (!filteredOnts) return null;
    const subset = filteredOnts.filter(o => matchesTech(o, techFilter));
    return calcStats(subset);
  }, [filteredOnts, techFilter]);

  // Previous report deltas (GPON/XGS count change)
  const gponDelta = previousReport ? techCounts.GPON - (previousReport.gponCount ?? null) : null;
  const xgsDelta  = previousReport ? techCounts['XGS-PON'] - (previousReport.xgsCount ?? null) : null;

  if (!stats) return null;

  // Chart 1: Critical error counters (small values — share a common scale)
  const criticalErrorData = [
    { name: 'US BIP',   value: stats.totalUsBip,  fill: '#ef4444' },
    { name: 'DS BIP',   value: stats.totalDsBip,  fill: '#f97316' },
    { name: 'US FEC U', value: stats.totalUsFec,  fill: '#dc2626' },
    { name: 'DS FEC U', value: stats.totalDsFec,  fill: '#ea580c' },
    { name: 'HEC',      value: stats.totalUsHec,  fill: '#8b5cf6' },
  ];

  // Chart 2: FEC Corrected (often orders of magnitude larger — needs its own scale)
  const fecCorrectedData = [
    { name: 'US FEC C', value: stats.totalUsFecCor, fill: '#3b82f6' },
    { name: 'DS FEC C', value: stats.totalDsFecCor, fill: '#6366f1' },
  ];

  // Power distribution for radar
  const radarData = [
    { subject: 'Optimal', value: stats.optimalPower, fullMark: stats.count },
    { subject: 'Low Pwr', value: stats.lowPower, fullMark: stats.count },
    { subject: 'Critical', value: stats.criticalPower, fullMark: stats.count },
    { subject: 'Errors', value: stats.ontsWithErrors, fullMark: stats.count },
    { subject: 'Online', value: stats.count - (filteredOnts?.filter(o => matchesTech(o, techFilter) && o._analysis?.status === 'offline').length || 0), fullMark: stats.count },
  ];

  const techColor = techFilter === 'GPON' ? 'blue' : techFilter === 'XGS-PON' ? 'purple' : 'indigo';
  const techColorClasses = {
    blue:   { bg: 'bg-blue-600',   ring: 'ring-blue-400',   light: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-300',   stroke: '#3b82f6' },
    purple: { bg: 'bg-purple-600', ring: 'ring-purple-400', light: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', stroke: '#7c3aed' },
    indigo: { bg: 'bg-indigo-600', ring: 'ring-indigo-400', light: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', stroke: '#4f46e5' },
  }[techColor];

  return (
    <div className="space-y-4">
      {/* Tech Filter Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Technology:</span>
        {TECH_OPTIONS.map(opt => {
          const count = opt === 'All' ? filteredOnts?.length : techCounts[opt];
          const isActive = techFilter === opt;
          return (
            <button
              key={opt}
              onClick={() => setTechFilter(opt)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? opt === 'GPON'    ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : opt === 'XGS-PON' ? 'bg-purple-600 text-white border-purple-600 shadow'
                  : 'bg-indigo-600 text-white border-indigo-600 shadow'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {opt === 'GPON' && <Radio className="h-3 w-3" />}
              {opt === 'XGS-PON' && <Wifi className="h-3 w-3" />}
              {opt}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0 text-[10px] ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                  {count}
                </span>
              )}
              {opt !== 'All' && previousReport && (
                opt === 'GPON' && gponDelta !== null && gponDelta !== 0 ? (
                  <span className={`text-[9px] ${gponDelta > 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {gponDelta > 0 ? '+' : ''}{gponDelta}
                  </span>
                ) : opt === 'XGS-PON' && xgsDelta !== null && xgsDelta !== 0 ? (
                  <span className={`text-[9px] ${xgsDelta > 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {xgsDelta > 0 ? '+' : ''}{xgsDelta}
                  </span>
                ) : null
              )}
            </button>
          );
        })}
        {techFilter !== 'All' && (
          <span className="text-[10px] text-gray-400 ml-1">
            Showing stats for {techFilter} only ({stats.count} ONTs)
          </span>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <Badge variant="outline" className="text-[10px]">Avg ONT Rx</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {stats.avgOntRx !== null ? stats.avgOntRx.toFixed(2) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mb-2">dBm</div>
            {stats.avgOntRx !== null && (
              <RxPowerBar value={stats.avgOntRx} label="Avg" />
            )}
            <div className="text-[10px] text-gray-500 mt-1">
              Range: {stats.minOntRx?.toFixed(1)} → {stats.maxOntRx?.toFixed(1)} dBm
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <Badge variant="outline" className="text-[10px]">Avg OLT Rx</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {stats.avgOltRx !== null ? stats.avgOltRx.toFixed(2) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mb-2">dBm</div>
            {stats.avgOltRx !== null && (
              <RxPowerBar value={stats.avgOltRx} label="Avg" min={-35} max={-5} />
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Badge variant="outline" className="text-[10px]">Error Rate</Badge>
            </div>
            <div className={`text-2xl font-bold font-mono ${stats.errorRate > 10 ? 'text-red-600' : stats.errorRate > 5 ? 'text-amber-500' : 'text-green-600'}`}>
              {stats.errorRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">ONTs with errors</div>
            <div className="text-[10px] text-gray-400 mt-1">{stats.ontsWithErrors} / {stats.count}</div>
            {/* Mini progress bar */}
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${stats.errorRate > 10 ? 'bg-red-500' : stats.errorRate > 5 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, stats.errorRate)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <Badge variant="outline" className="text-[10px]">Power Zones</Badge>
            </div>
            <div className="space-y-1.5 mt-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-600">Optimal</span>
                <span className="font-mono font-bold text-green-600">{stats.optimalPower}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-600">Low (&lt;-25)</span>
                <span className="font-mono font-bold text-amber-600">{stats.lowPower}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-600">Critical (&lt;-27)</span>
                <span className="font-mono font-bold text-red-600">{stats.criticalPower}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row — 3 columns: critical errors | FEC corrected | radar */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Chart 1: Critical Errors (BIP, FEC Uncorrected, HEC) */}
        <Card className="border-0 shadow">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm">
              Critical Errors
              {techFilter !== 'All' && <span className="text-xs font-normal text-gray-500 ml-2">— {techFilter}</span>}
            </CardTitle>
            <p className="text-[10px] text-gray-400">BIP · FEC Uncorrected · HEC</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={criticalErrorData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip content={<ErrorBarTooltip />} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {criticalErrorData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-1 mt-2 px-1">
              {criticalErrorData.map(d => (
                <div key={d.name} className="text-center">
                  <div className="text-[10px] font-bold" style={{ color: d.fill }}>{d.value.toLocaleString()}</div>
                  <div className="text-[9px] text-gray-400">{d.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: FEC Corrected (separate scale — often much larger) */}
        <Card className="border-0 shadow">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm">
              FEC Corrected
              {techFilter !== 'All' && <span className="text-xs font-normal text-gray-500 ml-2">— {techFilter}</span>}
            </CardTitle>
            <p className="text-[10px] text-gray-400">Corrected codewords — own scale</p>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={fecCorrectedData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => {
                  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
                  if (v >= 1000) return `${(v/1000).toFixed(0)}k`;
                  return v;
                }} />
                <Tooltip content={<ErrorBarTooltip />} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {fecCorrectedData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2 px-1">
              {fecCorrectedData.map(d => (
                <div key={d.name} className="text-center">
                  <div className="text-[10px] font-bold" style={{ color: d.fill }}>
                    {d.value >= 1_000_000 ? `${(d.value/1_000_000).toFixed(2)}M` : d.value.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-gray-400">{d.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Per-shelf health breakdown */}
        <ShelfHealthPanel filteredOnts={filteredOnts} techFilter={techFilter} />
      </div>
    </div>
  );
}