import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SPLITTER_LOSS = {
  '1:2': 3.5,
  '1:4': 7.0,
  '1:8': 10.5,
  '1:16': 14.0,
  '1:32': 17.5,
  '1:64': 21.0,
  '1:128': 24.5,
};

const GPON_SPECS = {
  classes: {
    'B+': { minTx: 1.5, maxTx: 5.0, minRx: -28.0, maxRx: -8.0 },
    'C+': { minTx: 3.0, maxTx: 7.0, minRx: -32.0, maxRx: -8.0 },
    'C++': { minTx: 3.0, maxTx: 7.0, minRx: -35.0, maxRx: -8.0 },
  },
  wavelength: { downstream: 1490, upstream: 1310 }
};

const XGSPON_SPECS = {
  classes: {
    'N1': { minTx: 4.0, maxTx: 8.0, minRx: -28.0, maxRx: -9.0 },
    'N2': { minTx: 6.0, maxTx: 10.0, minRx: -29.0, maxRx: -9.0 },
    'E1': { minTx: 6.0, maxTx: 10.0, minRx: -31.0, maxRx: -9.0 },
    'E2': { minTx: 6.0, maxTx: 10.0, minRx: -33.0, maxRx: -9.0 },
  },
  wavelength: { downstream: 1577, upstream: 1270 }
};

export default function PowerLevelCalc() {
  const [activeTab, setActiveTab] = useState('gpon');
  const [oltTx, setOltTx] = useState('');
  const [splitterRatio, setSplitterRatio] = useState('1:32');
  const [fiberLength, setFiberLength] = useState('');
  const [connectors, setConnectors] = useState('4');
  const [splices, setSplices] = useState('2');
  const [ponClass, setPonClass] = useState('C+');
  const [xgsClass, setXgsClass] = useState('N1');

  const specs = activeTab === 'gpon' ? GPON_SPECS : XGSPON_SPECS;
  const selectedClass = activeTab === 'gpon' ? ponClass : xgsClass;
  const classSpecs = activeTab === 'gpon' ? GPON_SPECS.classes[ponClass] : XGSPON_SPECS.classes[xgsClass];

  const calculate = () => {
    if (!oltTx) return null;

    const txPower = parseFloat(oltTx);
    const splitterLoss = SPLITTER_LOSS[splitterRatio] || 0;
    const fiberLoss = (parseFloat(fiberLength) || 0) * 0.35 / 1000; // 0.35 dB/km for SMF
    const connectorLoss = (parseInt(connectors) || 0) * 0.3;
    const spliceLoss = (parseInt(splices) || 0) * 0.1;

    const totalLoss = splitterLoss + fiberLoss + connectorLoss + spliceLoss;
    const expectedRx = txPower - totalLoss;

    const minAcceptable = classSpecs.minRx;
    const maxAcceptable = classSpecs.maxRx;

    let status = 'good';
    if (expectedRx < minAcceptable) status = 'low';
    else if (expectedRx > maxAcceptable) status = 'high';
    else if (expectedRx < minAcceptable + 3) status = 'marginal';

    return {
      expectedRx: expectedRx.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      splitterLoss: splitterLoss.toFixed(1),
      fiberLoss: fiberLoss.toFixed(2),
      connectorLoss: connectorLoss.toFixed(2),
      spliceLoss: spliceLoss.toFixed(2),
      minAcceptable,
      maxAcceptable,
      status,
      margin: (expectedRx - minAcceptable).toFixed(2)
    };
  };

  const result = calculate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Power Level Calculator</h1>
              <p className="text-xs text-gray-500">GPON & XGS-PON ONT Rx Estimator</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-gray-800 shadow-lg">
            <TabsTrigger value="gpon" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              GPON (2.5G/1.25G)
            </TabsTrigger>
            <TabsTrigger value="xgspon" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
              XGS-PON (10G/10G)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gpon" className="space-y-4 mt-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>OLT Class</Label>
                    <Select value={ponClass} onValueChange={setPonClass}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B+">Class B+ (28 dB budget)</SelectItem>
                        <SelectItem value="C+">Class C+ (32 dB budget)</SelectItem>
                        <SelectItem value="C++">Class C++ (35 dB budget)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>OLT Tx Power (dBm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 4.5"
                      value={oltTx}
                      onChange={(e) => setOltTx(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="xgspon" className="space-y-4 mt-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>OLT Class</Label>
                    <Select value={xgsClass} onValueChange={setXgsClass}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N1">Class N1 (29 dB budget)</SelectItem>
                        <SelectItem value="N2">Class N2 (31 dB budget)</SelectItem>
                        <SelectItem value="E1">Class E1 (33 dB budget)</SelectItem>
                        <SelectItem value="E2">Class E2 (35 dB budget)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>OLT Tx Power (dBm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 7.0"
                      value={oltTx}
                      onChange={(e) => setOltTx(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Common Inputs */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Link Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Splitter Ratio</Label>
                <Select value={splitterRatio} onValueChange={setSplitterRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(SPLITTER_LOSS).map(ratio => (
                      <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fiber Length (m)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 5000"
                  value={fiberLength}
                  onChange={(e) => setFiberLength(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Connectors</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={connectors}
                  onChange={(e) => setConnectors(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Splices</Label>
                <Input
                  type="number"
                  placeholder="2"
                  value={splices}
                  onChange={(e) => setSplices(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className={`border-0 shadow-lg ${
            result.status === 'good' ? 'ring-2 ring-emerald-200' :
            result.status === 'marginal' ? 'ring-2 ring-amber-200' :
            'ring-2 ring-red-200'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Expected ONT Rx Power</span>
                {result.status === 'good' && <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" />Good</Badge>}
                {result.status === 'marginal' && <Badge className="bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" />Marginal</Badge>}
                {result.status === 'low' && <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Too Low</Badge>}
                {result.status === 'high' && <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Too High</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="text-4xl font-bold font-mono text-gray-900 dark:text-white">
                  {result.expectedRx} dBm
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Margin: {result.margin} dB above minimum
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-gray-500">Acceptable Range</div>
                  <div className="font-mono font-semibold">{result.minAcceptable} to {result.maxAcceptable} dBm</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-gray-500">Total Loss</div>
                  <div className="font-mono font-semibold">{result.totalLoss} dB</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Loss Breakdown</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="text-blue-600">Splitter</div>
                    <div className="font-mono font-semibold">{result.splitterLoss} dB</div>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <div className="text-purple-600">Fiber</div>
                    <div className="font-mono font-semibold">{result.fiberLoss} dB</div>
                  </div>
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                    <div className="text-amber-600">Connectors</div>
                    <div className="font-mono font-semibold">{result.connectorLoss} dB</div>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                    <div className="text-emerald-600">Splices</div>
                    <div className="font-mono font-semibold">{result.spliceLoss} dB</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Reference */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Quick Reference - {activeTab === 'gpon' ? 'GPON' : 'XGS-PON'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.entries(activeTab === 'gpon' ? GPON_SPECS.classes : XGSPON_SPECS.classes).map(([cls, spec]) => (
                <div key={cls} className={`p-3 rounded-lg ${(activeTab === 'gpon' ? ponClass : xgsClass) === cls ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-300' : 'bg-white dark:bg-gray-700'}`}>
                  <div className="font-semibold">Class {cls}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    <div>Tx: {spec.minTx} to {spec.maxTx}</div>
                    <div>Rx: {spec.minRx} to {spec.maxRx}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}