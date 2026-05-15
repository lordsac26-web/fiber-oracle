import React from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PerformanceTrendChart({ trendData }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Assessment Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {trendData.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500 dark:bg-slate-800">
            Exam history will appear here after your first attempt.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="attempt" tickFormatter={(value) => `#${value}`} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name === 'score' ? 'Score' : name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload ? `${payload[0].payload.course} • Attempt ${payload[0].payload.attempt}` : 'Attempt'}
                />
                <ReferenceLine y={70} stroke="#94a3b8" strokeDasharray="4 4" label="Min Pass" />
                <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}