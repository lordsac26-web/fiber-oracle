import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

/**
 * Compact sparkline chart for inline display in ONT table cells.
 * Renders a miniature trend line for the last N data points.
 *
 * @param {number[]} data       - Array of numeric values (oldest → newest)
 * @param {'rx'|'fec'} type     - 'rx' for power levels (dBm), 'fec' for error counts
 * @param {number} [width=72]   - Width in pixels
 * @param {number} [height=28]  - Height in pixels
 */
export default function ONTSparkline({ data, type = 'rx', width = 72, height = 28 }) {
  // Take only the last 10 values (done before any early return to keep hook order stable)
  const trimmed = data ? data.slice(-10) : [];
  const chartData = trimmed.map((v, i) => ({ i, v }));
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  const delta = (last ?? 0) - (first ?? 0);

  // Color logic:
  // rx: degrading (more negative = worse) → delta < -1 = red, delta > 1 = green, else gray
  // fec: increasing errors = worse → delta > 0 = red, delta < 0 = green, else gray
  const strokeColor = useMemo(() => {
    if (type === 'rx') {
      if (delta < -1) return '#ef4444';
      if (delta > 1)  return '#22c55e';
      return '#94a3b8';
    } else {
      if (delta > 0)  return '#ef4444';
      if (delta < 0)  return '#22c55e';
      return '#94a3b8';
    }
  }, [type, delta]);

  // Need at least 2 points to draw a meaningful line
  if (!data || data.length < 2) {
    return <span className="text-gray-300 text-[9px]">—</span>;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    return (
      <div className="bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
        {type === 'rx' ? `${val?.toFixed(1)} dBm` : val?.toLocaleString()}
      </div>
    );
  };

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={strokeColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip content={<CustomTooltip />} />
      </LineChart>
    </ResponsiveContainer>
  );
}