import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Radio, Zap, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const GPON_SPECS = {
  standard: 'ITU-T G.984',
  downstream: { wavelength: '1490nm', rate: '2.488 Gbps' },
  upstream: { wavelength: '1310nm', rate: '1.244 Gbps' },
  classes: [
    {
      class: 'Class B+',
      minOltTx: 1.5,
      maxOltTx: 5.0,
      minOnuRx: -28.0,
      maxOnuRx: -8.0,
      minOnuTx: 0.5,
      maxOnuTx: 5.0,
      minOltRx: -28.0,
      maxOltRx: -8.0,
      maxBudget: 28.0,
      splitRatio: '1:64',
      common: true
    },
    {
      class: 'Class C+',
      minOltTx: 3.0,
      maxOltTx: 7.0,
      minOnuRx: -32.0,
      maxOnuRx: -12.0,
      minOnuTx: 0.5,
      maxOnuTx: 5.0,
      minOltRx: -32.0,
      maxOltRx: -12.0,
      maxBudget: 32.0,
      splitRatio: '1:128',
      common: true
    }
  ]
};

const XGSPON_SPECS = {
  standard: 'ITU-T G.9807.1',
  downstream: { wavelength: '1577nm', rate: '9.953 Gbps' },
  upstream: { wavelength: '1270nm', rate: '9.953 Gbps' },
  classes: [
    {
      class: 'N1',
      minOltTx: 2.0,
      maxOltTx: 6.0,
      minOnuRx: -28.0,
      maxOnuRx: -9.0,
      minOnuTx: 2.0,
      maxOnuTx: 7.0,
      minOltRx: -29.5,
      maxOltRx: -9.0,
      maxBudget: 29.0,
      splitRatio: '1:64',
      common: true
    },
    {
      class: 'N2',
      minOltTx: 4.0,
      maxOltTx: 8.0,
      minOnuRx: -31.0,
      maxOnuRx: -11.0,
      minOnuTx: 2.0,
      maxOnuTx: 7.0,
      minOltRx: -31.5,
      maxOltRx: -10.0,
      maxBudget: 31.0,
      splitRatio: '1:128',
      common: false
    },
    {
      class: 'E1',
      minOltTx: 3.0,
      maxOltTx: 7.0,
      minOnuRx: -33.0,
      maxOnuRx: -10.0,
      minOnuTx: 4.0,
      maxOnuTx: 9.0,
      minOltRx: -33.5,
      maxOltRx: -10.0,
      maxBudget: 35.0,
      splitRatio: '1:256',
      common: false
    }
  ]
};

const SPLITTER_LOSS = [
  { ratio: '1:2', loss: 3.6 },
  { ratio: '1:4', loss: 7.2 },
  { ratio: '1:8', loss: 10.5 },
  { ratio: '1:16', loss: 13.8 },
  { ratio: '1:32', loss: 17.1 },
  { ratio: '1:64', loss: 20.4 },
  { ratio: '1:128', loss: 23.7 },
];

export default function PONLevels() {
  const [activeTab, setActiveTab] = useState('gpon');

  const renderPowerTable = (specs, type) => (
    <div className="space-y-6">
      {/* System Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Downstream</h4>
          <div className="text-sm space-y-1">
            <div>Wavelength: <span className="font-mono font-medium">{specs.downstream.wavelength}</span></div>
            <div>Data Rate: <span className="font-mono font-medium">{specs.downstream.rate}</span></div>
          </div>
        </div>
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
          <h4 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">Upstream</h4>
          <div className="text-sm space-y-1">
            <div>Wavelength: <span className="font-mono font-medium">{specs.upstream.wavelength}</span></div>
            <div>Data Rate: <span className="font-mono font-medium">{specs.upstream.rate}</span></div>
          </div>
        </div>
      </div>

      {/* Power Levels Table */}
      {specs.classes.map((cls) => (
        <Card key={cls.class} className={`border-0 shadow-lg ${cls.common ? 'ring-2 ring-emerald-200' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {cls.class}
                {cls.common && <Badge className="bg-emerald-500">Most Common</Badge>}
              </CardTitle>
              <div className="text-right">
                <div className="text-sm text-gray-500">Max Budget</div>
                <div className="text-xl font-bold text-indigo-600">{cls.maxBudget} dB</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead>Parameter</TableHead>
                    <TableHead className="text-center">Min (dBm)</TableHead>
                    <TableHead className="text-center">Max (dBm)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">OLT Transmit Power</TableCell>
                    <TableCell className="text-center font-mono">{cls.minOltTx.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono">{cls.maxOltTx.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">ONU/ONT Receive Sensitivity</TableCell>
                    <TableCell className="text-center font-mono">{cls.minOnuRx.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono">{cls.maxOnuRx.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">ONU/ONT Transmit Power</TableCell>
                    <TableCell className="text-center font-mono">{cls.minOnuTx.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono">{cls.maxOnuTx.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">OLT Receive Sensitivity</TableCell>
                    <TableCell className="text-center font-mono">{cls.minOltRx.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono">{cls.maxOltRx.toFixed(1)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span>Max Split: <strong>{cls.splitRatio}</strong></span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">PON Power Levels</h1>
              <p className="text-xs text-gray-500">GPON & XGS-PON Acceptable Levels</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            All power levels in dBm. Ensure ONU receive power is within the acceptable range for reliable service.
            Values outside these ranges may cause service issues or damage to equipment.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl">
            <TabsTrigger value="gpon" className="rounded-lg">
              <Radio className="h-4 w-4 mr-2" />
              GPON (G.984)
            </TabsTrigger>
            <TabsTrigger value="xgspon" className="rounded-lg">
              <Zap className="h-4 w-4 mr-2" />
              XGS-PON (G.9807.1)
            </TabsTrigger>
            <TabsTrigger value="splitters" className="rounded-lg">
              Splitter Loss
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gpon">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">GPON Power Levels</h2>
              <p className="text-sm text-gray-500">Per ITU-T G.984.2 specification</p>
            </div>
            {renderPowerTable(GPON_SPECS, 'gpon')}
          </TabsContent>

          <TabsContent value="xgspon">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">XGS-PON Power Levels</h2>
              <p className="text-sm text-gray-500">Per ITU-T G.9807.1 specification</p>
            </div>
            {renderPowerTable(XGSPON_SPECS, 'xgspon')}
          </TabsContent>

          <TabsContent value="splitters">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Optical Splitter Insertion Loss</CardTitle>
                <p className="text-sm text-gray-500">Typical values for PLC splitters</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead>Split Ratio</TableHead>
                      <TableHead className="text-center">Typical Loss (dB)</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SPLITTER_LOSS.map((s) => (
                      <TableRow key={s.ratio}>
                        <TableCell className="font-medium">{s.ratio}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">{s.loss} dB</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {s.ratio === '1:32' && 'Common for GPON deployments'}
                          {s.ratio === '1:64' && 'Max for Class B+ GPON'}
                          {s.ratio === '1:128' && 'Requires Class C+ or higher'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                  <strong>Note:</strong> Actual splitter loss may vary ±0.5 dB. Always use manufacturer specifications for precise calculations.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Reference */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Field Troubleshooting Quick Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-800 dark:text-emerald-200">Good Signal</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ONU Rx: -8 to -25 dBm (GPON)<br/>
                  ONU Rx: -9 to -26 dBm (XGS-PON)
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">Marginal</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ONU Rx: -25 to -27 dBm (GPON)<br/>
                  May experience intermittent issues
                </p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800 dark:text-red-200">Too Low / Too High</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Below -28 dBm: Signal too weak<br/>
                  Above -8 dBm: May damage receiver
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}