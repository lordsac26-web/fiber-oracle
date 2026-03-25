import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const SPLITTER_CAPACITY = 32;

export default function CapacityGrowthChart({ allOntCounts, projections }) {
  const [chartView, setChartView] = useState('top_growing');

  const chartData = useMemo(() => {
    if (chartView === 'aggregate') {
      // Show total ONTs across all splitters over time
      const sorted = [...allOntCounts].sort((a, b) => new Date(a.date) - new Date(b.date));
      return sorted.map(r => ({
        date: format(new Date(r.date), 'MMM d'),
        fullDate: r.date,
        total: Object.values(r.counts).reduce((s, c) => s + c, 0),
        splitters: Object.keys(r.counts).length,
      }));
    }

    // Show top 5 fastest growing splitters
    const topGrowing = projections
      .filter(p => p.growthPerMonth > 0)
      .sort((a, b) => b.growthPerMonth - a.growthPerMonth)
      .slice(0, 5);

    if (topGrowing.length === 0) return [];

    const sorted = [...allOntCounts].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map(r => {
      const point = { date: format(new Date(r.date), 'MMM d'), fullDate: r.date };
      topGrowing.forEach(p => {
        point[p.key] = r.counts[p.key] || 0;
      });
      return point;
    });
  }, [allOntCounts, projections, chartView]);

  const topKeys = useMemo(() => {
    if (chartView === 'aggregate') return [];
    return projections
      .filter(p => p.growthPerMonth > 0)
      .sort((a, b) => b.growthPerMonth - a.growthPerMonth)
      .slice(0, 5);
  }, [projections, chartView]);

  const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            ONT Growth Over Time
          </CardTitle>
          <Select value={chartView} onValueChange={setChartView}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top_growing">Top 5 Growing</SelectItem>
              <SelectItem value="aggregate">Total Network</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length < 2 ? (
          <p className="text-sm text-gray-500 text-center py-8">Need more data points for chart</p>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                {chartView === 'aggregate' ? (
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Total ONTs" />
                ) : (
                  <>
                    <ReferenceLine y={SPLITTER_CAPACITY} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '32 (Full)', position: 'right', fontSize: 11, fill: '#ef4444' }} />
                    {topKeys.map((p, i) => (
                      <Line
                        key={p.key}
                        type="monotone"
                        dataKey={p.key}
                        stroke={colors[i]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={`${p.lcp}/${p.splitter}`}
                      />
                    ))}
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}