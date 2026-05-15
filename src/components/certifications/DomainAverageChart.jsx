import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DomainAverageChart({ domainAverages }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Average Exam Scores by Domain</CardTitle>
      </CardHeader>
      <CardContent>
        {domainAverages.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500 dark:bg-slate-800">
            Complete an exam to populate domain averages.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainAverages} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="domain" angle={-35} textAnchor="end" height={80} interval={0} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => [`${value}%`, 'Average']} />
                <Bar dataKey="average" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}