import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export default function PonPmIssueTrendChart({ data }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Issue Trend Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="critical" stackId="1" stroke="#dc2626" fill="#fca5a5" name="Critical" />
            <Area type="monotone" dataKey="warning" stackId="1" stroke="#d97706" fill="#fcd34d" name="Warning" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}