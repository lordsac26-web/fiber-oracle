import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export default function PonPmTopErrorChart({ title, data }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} stroke="#64748b" />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" radius={[0, 4, 4, 0]} />
            <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="Warning" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}