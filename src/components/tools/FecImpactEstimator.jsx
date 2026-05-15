import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Activity, CheckCircle2, XCircle } from 'lucide-react';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

function estimateImpact(values) {
  const fecCorrected = toNumber(values.fecCorrected);
  const fecUncorrected = toNumber(values.fecUncorrected);
  const bip = toNumber(values.bip);
  const gem = toNumber(values.gem);
  const hec = toNumber(values.hec);

  if (gem > 0 || hec > 0 || fecUncorrected > 0) {
    return {
      priority: 'P1 / Critical',
      color: 'bg-red-600',
      icon: XCircle,
      impact: 'Likely customer-impacting packet loss, service drops, registration instability, or corrupted frames.',
      action: 'Dispatch/escalate immediately. Check optical power, clean/inspect connectors, run OTDR, and isolate shared PON impact.',
    };
  }

  if (bip > 10 || fecCorrected >= 10000) {
    return {
      priority: 'P2 / High',
      color: 'bg-amber-600',
      icon: AlertTriangle,
      impact: 'High risk of micro-drops, buffering, speed test failures, and future uncorrectable errors.',
      action: 'Prioritize investigation. Compare history/peer ONTs, clean connectors, verify Rx margin, and check for bends or dirty splitter ports.',
    };
  }

  if (bip > 0 || fecCorrected >= 1000) {
    return {
      priority: 'P3 / Monitor',
      color: 'bg-blue-600',
      icon: Activity,
      impact: 'Potential early degradation. Service may still appear normal but error correction is active.',
      action: 'Monitor trend, compare to previous reports, check power margin, and schedule proactive cleanup if increasing.',
    };
  }

  if (fecCorrected > 0) {
    return {
      priority: 'P4 / Low',
      color: 'bg-emerald-600',
      icon: CheckCircle2,
      impact: 'Low corrected FEC is normally transparent to the customer.',
      action: 'No immediate action unless the count is rising or paired with weak optical power.',
    };
  }

  return {
    priority: 'Healthy',
    color: 'bg-emerald-600',
    icon: CheckCircle2,
    impact: 'No customer impact expected from these counters.',
    action: 'No action required. Continue normal monitoring.',
  };
}

export default function FecImpactEstimator() {
  const [values, setValues] = useState({ fecCorrected: '0', fecUncorrected: '0', bip: '0', gem: '0', hec: '0' });
  const result = useMemo(() => estimateImpact(values), [values]);
  const ResultIcon = result.icon;

  const updateValue = (field, value) => setValues(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-rose-600" />
        <span className="font-medium">PON FEC / Error Impact Estimator</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Counter Inputs</CardTitle>
            <p className="text-sm text-gray-500">Enter counts from the OLT/ONT performance view for the same sample window.</p>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>FEC Corrected</Label>
              <Input type="number" min="0" value={values.fecCorrected} onChange={(e) => updateValue('fecCorrected', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>FEC Uncorrected</Label>
              <Input type="number" min="0" value={values.fecUncorrected} onChange={(e) => updateValue('fecUncorrected', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>BIP Errors</Label>
              <Input type="number" min="0" value={values.bip} onChange={(e) => updateValue('bip', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>GEM / XGEM Errors</Label>
              <Input type="number" min="0" value={values.gem} onChange={(e) => updateValue('gem', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>HEC Errors</Label>
              <Input type="number" min="0" value={values.hec} onChange={(e) => updateValue('hec', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-xl text-white ${result.color}`}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-85">Recommended Priority</p>
                <h3 className="text-3xl font-bold">{result.priority}</h3>
              </div>
              <ResultIcon className="h-10 w-10" />
            </div>
            <div className="p-4 bg-white/15 rounded-xl">
              <p className="text-sm font-semibold mb-1">Likely Customer Impact</p>
              <p className="text-sm opacity-95">{result.impact}</p>
            </div>
            <div className="p-4 bg-white/15 rounded-xl">
              <p className="text-sm font-semibold mb-1">Recommended Action</p>
              <p className="text-sm opacity-95">{result.action}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md bg-gray-50 dark:bg-gray-800">
        <CardContent className="p-4 text-sm text-gray-600 dark:text-gray-400">
          <Badge variant="outline" className="mr-2">Rule of thumb</Badge>
          Corrected FEC can be normal in small amounts; uncorrected FEC, GEM, or HEC should be treated as customer-impacting until proven otherwise.
        </CardContent>
      </Card>
    </div>
  );
}