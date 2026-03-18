import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function PonPmMetricCard({ title, value, subtitle, icon: Icon, tone = 'text-slate-900' }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${tone}`}>{value}</p>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {Icon ? (
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}