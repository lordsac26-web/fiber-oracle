import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function PowerDistributionChart({ onts, powerMetric = 'ont_rx', title }) {
  const chartData = useMemo(() => {
    if (!onts || onts.length === 0) return [];

    // Data key to read from each ONT record
    const dataKey = powerMetric === 'olt_rx' ? 'OLTRXOptPwr' : 'OntRxOptPwr';

    // OLT Rx runs ~3-5 dB lower than ONT Rx on average, so shift ranges accordingly
    const ranges = powerMetric === 'olt_rx'
      ? [
          { min: -50, max: -32, label: '< -32 dBm', color: '#ef4444' },
          { min: -32, max: -30, label: '-32 to -30', color: '#f97316' },
          { min: -30, max: -28, label: '-30 to -28', color: '#eab308' },
          { min: -28, max: -24, label: '-28 to -24', color: '#84cc16' },
          { min: -24, max: -20, label: '-24 to -20', color: '#22c55e' },
          { min: -20, max: -15, label: '-20 to -15', color: '#10b981' },
          { min: -15, max: -10, label: '-15 to -10', color: '#14b8a6' },
          { min: -10, max: 0, label: '> -10 dBm', color: '#06b6d4' },
        ]
      : [
          { min: -50, max: -30, label: '< -30 dBm', color: '#ef4444' },
          { min: -30, max: -27, label: '-30 to -27', color: '#f97316' },
          { min: -27, max: -25, label: '-27 to -25', color: '#eab308' },
          { min: -25, max: -20, label: '-25 to -20', color: '#84cc16' },
          { min: -20, max: -15, label: '-20 to -15', color: '#22c55e' },
          { min: -15, max: -10, label: '-15 to -10', color: '#10b981' },
          { min: -10, max: -8, label: '-10 to -8', color: '#14b8a6' },
          { min: -8, max: 0, label: '> -8 dBm', color: '#06b6d4' },
        ];

    const distribution = ranges.map(range => ({
      range: range.label,
      count: 0,
      color: range.color,
    }));

    onts.forEach(ont => {
      const rx = parseFloat(ont[dataKey]);
      if (!isNaN(rx) && rx !== 0) {
        for (let i = 0; i < ranges.length; i++) {
          if (rx >= ranges[i].min && rx < ranges[i].max) {
            distribution[i].count++;
            break;
          }
        }
      }
    });

    return distribution.filter(d => d.count > 0);
  }, [onts, powerMetric]);

  const defaultTitle = powerMetric === 'olt_rx' ? 'OLT Rx Power Distribution' : 'ONT Rx Power Distribution';

  if (chartData.length === 0) return null;

  return (
    <Card className="border-0 shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title || defaultTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="range" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ fontSize: 12 }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Bar dataKey="count" name="ONT Count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}