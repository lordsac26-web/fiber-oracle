import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * MetricDeltaCell — shows a metric's current value plus its 5- and 10-report
 * deltas. Coloring is metric-aware:
 *   - For error counters (higherIsWorse): a positive delta (more errors) is BAD (red).
 *   - For Rx power (higherIsBetter): a negative delta (power dropping) is BAD (red).
 */
function fmt(v, decimals = 0) {
  if (v == null) return '—';
  return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
}

function DeltaTag({ label, delta, points, higherIsWorse, decimals }) {
  if (delta == null) {
    return <span className="text-[10px] text-gray-300" title={`${label}: not enough history`}>{label} —</span>;
  }
  const isZero = Math.abs(delta) < (decimals ? 0.05 : 0.5);
  // "bad" = worsening trend
  const bad = higherIsWorse ? delta > 0 : delta < 0;
  const color = isZero ? 'text-gray-400' : bad ? 'text-red-600' : 'text-green-600';
  const Icon = isZero ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${color}`} title={`${label} delta over ${points} reports`}>
      <span className="text-gray-400">{label}</span>
      <Icon className="h-2.5 w-2.5" />
      {sign}{fmt(delta, decimals)}
    </span>
  );
}

export default function MetricDeltaCell({ d, higherIsWorse = true, decimals = 0 }) {
  if (!d) return <td className="px-2 py-1 text-center text-gray-300">—</td>;
  return (
    <td className="px-2 py-1 text-right align-middle">
      <div className="font-mono text-xs font-semibold">{fmt(d.current, decimals)}</div>
      <div className="flex items-center justify-end gap-2 mt-0.5">
        <DeltaTag label="5r" delta={d.delta5} points={d.points5} higherIsWorse={higherIsWorse} decimals={decimals} />
        <DeltaTag label="10r" delta={d.delta10} points={d.points10} higherIsWorse={higherIsWorse} decimals={decimals} />
      </div>
    </td>
  );
}