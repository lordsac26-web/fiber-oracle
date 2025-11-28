import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Radio, Zap, AlertTriangle, CheckCircle2, Info, XCircle, Activity } from 'lucide-react';
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

const PON_ERRORS = {
  bip: {
    name: 'BIP Errors (Bit Interleaved Parity)',
    description: 'BIP is a parity-based error detection mechanism used in PON systems. The OLT/ONU calculates a parity value over a block of data and includes it in the transmission. The receiver recalculates and compares to detect bit errors.',
    acceptable: 'Zero BIP errors is ideal. Occasional isolated errors (<10/day) may occur. Consistent or increasing errors indicate a problem.',
    expected: 'A healthy PON link should show 0 BIP errors under normal operation. Any sustained BIP errors indicate physical layer issues.',
    symptoms: [
      'Intermittent service drops or slowdowns',
      'Packet loss reported by customers',
      'Video freezing or pixelation (IPTV)',
      'VoIP call quality issues',
      'ONU showing "degraded" status in OLT'
    ],
    causes: [
      'Dirty or damaged fiber connectors',
      'Optical power too low (check Rx levels)',
      'Optical power too high (receiver saturation)',
      'Faulty splitter or splice',
      'Macrobend in fiber cable',
      'Damaged or stressed fiber',
      'Faulty ONU/ONT transceiver',
      'Electrical interference (rare)'
    ],
    severity: 'warning'
  },
  fec: {
    name: 'FEC Errors (Forward Error Correction)',
    description: 'FEC adds redundant data to transmissions allowing the receiver to detect and correct errors without retransmission. FEC corrected errors are fixed automatically; uncorrectable errors indicate severe signal degradation.',
    acceptable: 'FEC corrected errors are acceptable in small quantities - the system is working as designed. FEC uncorrectable errors should be zero.',
    expected: 'Low levels of FEC corrected errors (<1000/hour) are normal on long links. High corrected counts suggest marginal signal. Any uncorrectable errors = problem.',
    symptoms: [
      'FEC Corrected: Usually transparent to user, logged in OLT',
      'FEC Uncorrectable: Dropped frames, timeouts, disconnections',
      'High corrected rate: Warning of degrading link',
      'Customer complaints of intermittent issues',
      'Failed speed tests despite link being "up"'
    ],
    causes: [
      'Signal approaching receiver sensitivity limit',
      'Dirty connectors (most common)',
      'Excessive splitter loss',
      'Fiber degradation or damage',
      'Connector reflectance issues (use APC)',
      'Dispersion on very long links',
      'Temperature extremes affecting components'
    ],
    severity: 'marginal'
  },
  gem: {
    name: 'GEM Errors (GPON Encapsulation Method)',
    description: 'GEM is the data encapsulation protocol for GPON. GEM errors indicate issues with the framing or encapsulation layer, often caused by synchronization problems or physical layer issues affecting frame integrity.',
    acceptable: 'Zero GEM errors is expected. Any GEM errors indicate a significant problem requiring investigation.',
    expected: 'A properly functioning PON link should have no GEM errors. Even small numbers indicate encapsulation/framing issues.',
    symptoms: [
      'Complete service outages or flapping',
      'ONU unable to register or authenticate',
      'Frequent ONU reboots or re-ranging',
      'Loss of specific services (voice, data, video)',
      'Alarm conditions on OLT port'
    ],
    causes: [
      'Severe optical signal issues',
      'ONU/ONT hardware failure',
      'Firmware bugs or incompatibility',
      'Timing/synchronization problems',
      'Rogue ONU on PON port',
      'Splitter failure',
      'Physical layer completely degraded'
    ],
    severity: 'critical'
  }
};

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
          <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="gpon" className="rounded-lg">
              <Radio className="h-4 w-4 mr-2" />
              GPON
            </TabsTrigger>
            <TabsTrigger value="xgspon" className="rounded-lg">
              <Zap className="h-4 w-4 mr-2" />
              XGS-PON
            </TabsTrigger>
            <TabsTrigger value="splitters" className="rounded-lg">
              Splitters
            </TabsTrigger>
            <TabsTrigger value="errors" className="rounded-lg">
              <Activity className="h-4 w-4 mr-2" />
              BIP/FEC/GEM
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

          <TabsContent value="errors">
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">PON Error Types</h2>
                <p className="text-sm text-gray-500">Understanding BIP, FEC, and GEM errors for troubleshooting</p>
              </div>

              {Object.entries(PON_ERRORS).map(([key, error]) => (
                <Card key={key} className={`border-0 shadow-lg ${
                  error.severity === 'critical' ? 'ring-2 ring-red-200' :
                  error.severity === 'warning' ? 'ring-2 ring-amber-200' :
                  'ring-2 ring-blue-200'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {error.severity === 'critical' ? <XCircle className="h-5 w-5 text-red-500" /> :
                           error.severity === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-500" /> :
                           <Info className="h-5 w-5 text-blue-500" />}
                          {error.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{error.description}</p>
                      </div>
                      <Badge className={
                        error.severity === 'critical' ? 'bg-red-500' :
                        error.severity === 'warning' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }>
                        {error.severity === 'critical' ? 'Critical' :
                         error.severity === 'warning' ? 'Warning' : 'Informational'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <h4 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Acceptable Levels
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{error.acceptable}</p>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          What to Expect
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{error.expected}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">How It Presents</h4>
                        <ul className="text-sm space-y-1">
                          {error.symptoms.map((symptom, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-gray-400 mt-1">•</span>
                              <span className="text-gray-600 dark:text-gray-400">{symptom}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Likely Causes</h4>
                        <ul className="text-sm space-y-1">
                          {error.causes.map((cause, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-500 mt-1">•</span>
                              <span className="text-gray-600 dark:text-gray-400">{cause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Error Troubleshooting Flow */}
              <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <CardHeader>
                  <CardTitle className="text-base">Quick Troubleshooting Flow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-indigo-600 shrink-0">1</Badge>
                      <span><strong>Check optical power levels</strong> - Ensure ONU Rx is within acceptable range (-8 to -27 dBm for GPON)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-indigo-600 shrink-0">2</Badge>
                      <span><strong>Clean all connectors</strong> - Use proper IEC cleaning procedures on OLT, splitter, and ONU</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-indigo-600 shrink-0">3</Badge>
                      <span><strong>Inspect connectors</strong> - Check for scratches, pitting, or contamination with 400x scope</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-indigo-600 shrink-0">4</Badge>
                      <span><strong>Test with OTDR</strong> - Look for high-loss events, reflections, or breaks</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge className="bg-indigo-600 shrink-0">5</Badge>
                      <span><strong>Swap ONU</strong> - If errors persist with good fiber, replace ONU to rule out hardware</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Reference */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Field Troubleshooting Quick Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
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
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">BIP Errors</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Should be 0. Any sustained errors = dirty/damaged fiber path
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">FEC Corrected</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Low counts OK. High = marginal signal. Uncorrectable = problem
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">GEM Errors</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Should be 0. Any errors = serious issue requiring investigation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}