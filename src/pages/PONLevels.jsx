import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Radio, Zap, AlertTriangle, CheckCircle2, Info, XCircle, Activity, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import HiddenContentBanner from '@/components/HiddenContentBanner';

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
    thresholds: {
      pass: { max: 0, label: '0 errors', desc: 'No errors - link is healthy' },
      marginal: { max: 10, label: '1-10/day', desc: 'Occasional errors - monitor closely' },
      fail: { min: 11, label: '>10/day or sustained', desc: 'Consistent errors - action required' }
    },
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
    actions: [
      'Clean all connectors in path',
      'Check ONU Rx power level',
      'Inspect connectors with scope',
      'Check for macrobends in cable routing'
    ],
    severity: 'warning'
  },
  fec_corrected: {
    name: 'FEC Corrected Errors',
    description: 'FEC (Forward Error Correction) adds redundant data allowing the receiver to detect AND fix errors automatically. Corrected errors mean the system caught and fixed bit errors - service continues normally.',
    thresholds: {
      pass: { max: 100, label: '<100/min', desc: 'Normal operation' },
      marginal: { max: 1000, label: '100-1000/min', desc: 'Elevated - signal degrading' },
      fail: { min: 1001, label: '>1000/min', desc: 'High rate - investigate now' }
    },
    acceptable: 'Low counts (<100/min) are normal, especially on long links. FEC is doing its job. High sustained rates indicate marginal signal.',
    expected: 'Some FEC corrections are expected on any PON link. The concern is when rates increase significantly or trend upward over time.',
    symptoms: [
      'Usually transparent to end user',
      'Logged in OLT statistics',
      'May precede service issues if trending up',
      'High rates = early warning of problems'
    ],
    causes: [
      'Signal near receiver sensitivity limit',
      'Dirty or contaminated connectors',
      'Aging or degraded fiber',
      'Long distance PON links',
      'Temperature extremes'
    ],
    actions: [
      'Note: Some FEC corrections are normal',
      'Monitor trend over time',
      'Clean connectors if rate increasing',
      'Check Rx power is mid-range, not marginal'
    ],
    severity: 'marginal'
  },
  fec_uncorrectable: {
    name: 'FEC Uncorrectable Errors',
    description: 'FEC uncorrectable errors occur when the error rate exceeds FEC\'s correction capability. These errors CANNOT be fixed and result in lost data. This is a serious condition requiring immediate attention.',
    thresholds: {
      pass: { max: 0, label: '0 errors', desc: 'No uncorrectable errors' },
      marginal: { max: 0, label: 'N/A', desc: 'Any count is a problem' },
      fail: { min: 1, label: 'Any (>0)', desc: 'Immediate action required' }
    },
    acceptable: 'Zero. Any FEC uncorrectable errors indicate severe signal degradation. Service quality is impacted.',
    expected: 'A healthy link should have ZERO uncorrectable errors. Even one indicates the link is operating beyond acceptable limits.',
    symptoms: [
      'Dropped packets and timeouts',
      'Service disconnections',
      'Failed speed tests',
      'Video buffering, VoIP drops',
      'Customer complaints of intermittent service'
    ],
    causes: [
      'Rx power below sensitivity threshold',
      'Severely contaminated connectors',
      'Damaged or broken fiber',
      'Failed splitter or splice',
      'Faulty ONU transceiver',
      'Rx power too high (saturation)'
    ],
    actions: [
      'Check Rx power immediately',
      'Clean and inspect all connectors',
      'OTDR test the path',
      'Replace ONU if fiber tests good'
    ],
    severity: 'critical'
  },
  gem: {
    name: 'GEM/XGEM Errors (Encapsulation)',
    description: 'GEM (GPON) and XGEM (XGS-PON) are the data encapsulation protocols. These errors indicate frame-level problems - the data structure itself is corrupted, not just individual bits.',
    thresholds: {
      pass: { max: 0, label: '0 errors', desc: 'No encapsulation errors' },
      marginal: { max: 0, label: 'N/A', desc: 'Any count is a problem' },
      fail: { min: 1, label: 'Any (>0)', desc: 'Critical - investigate immediately' }
    },
    acceptable: 'Zero GEM/XGEM errors is expected. Any errors indicate a significant problem affecting data framing and integrity.',
    expected: 'A properly functioning PON link should have no GEM errors. Even small numbers indicate serious encapsulation/framing issues.',
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
      'Firmware bugs or version mismatch',
      'Timing/synchronization problems',
      'Rogue ONU on PON port',
      'Splitter failure',
      'Physical layer completely degraded'
    ],
    actions: [
      'Check for rogue ONU on PON',
      'Verify ONU firmware version',
      'Check all Rx power levels',
      'Replace ONU as likely hardware fault',
      'Escalate if multiple ONUs affected'
    ],
    severity: 'critical'
  },
  hec: {
    name: 'HEC Errors (Header Error Check)',
    description: 'HEC protects the GEM frame header. HEC errors mean the header is corrupted, so the entire frame is discarded. This is separate from payload errors and indicates severe signal issues.',
    thresholds: {
      pass: { max: 0, label: '0 errors', desc: 'Headers intact' },
      marginal: { max: 5, label: '1-5/hour', desc: 'Some header corruption' },
      fail: { min: 6, label: '>5/hour', desc: 'Serious - frame loss occurring' }
    },
    acceptable: 'Zero HEC errors expected. Low isolated counts may occur but sustained errors indicate problems.',
    expected: 'HEC errors should be zero. Any consistent HEC errors indicate the signal is too degraded to reliably read frame headers.',
    symptoms: [
      'Frames being discarded entirely',
      'Similar to FEC uncorrectable symptoms',
      'Service degradation or drops',
      'High retransmission rates'
    ],
    causes: [
      'Very low optical power',
      'High noise on the link',
      'Damaged fiber or connectors',
      'ONU transmitter issues'
    ],
    actions: [
      'Check Rx power levels first',
      'Clean and inspect connectors',
      'OTDR to find fault location',
      'Replace ONU if fiber is good'
    ],
    severity: 'critical'
  }
};

export default function PONLevels() {
  const { preferences, updatePreferences } = useUserPreferences();
  const hiddenSections = preferences.hiddenSections?.pon || [];
  
  const allTabs = ['gpon', 'xgspon', 'splitters', 'errors'];
  const visibleTabs = allTabs.filter(t => !hiddenSections.includes(t));
  
  const [activeTab, setActiveTab] = useState(visibleTabs[0] || 'gpon');

  const handleShowAll = () => {
    updatePreferences({
      hiddenSections: {
        ...preferences.hiddenSections,
        pon: []
      }
    });
  };

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
        <HiddenContentBanner 
          hiddenCount={hiddenSections.length} 
          moduleId="pon" 
          onShowAll={handleShowAll}
        />

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            All power levels in dBm. Ensure ONU receive power is within the acceptable range for reliable service.
            Values outside these ranges may cause service issues or damage to equipment.
          </AlertDescription>
        </Alert>

        {visibleTabs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <EyeOff className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">All PON sections are hidden.</p>
            <Link to={createPageUrl('Settings') + '?tab=visibility'}>
              <Button variant="outline" className="mt-4">Manage Visibility</Button>
            </Link>
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl flex-wrap h-auto gap-1">
            {!hiddenSections.includes('gpon') && (
              <TabsTrigger value="gpon" className="rounded-lg">
                <Radio className="h-4 w-4 mr-2" />
                GPON
              </TabsTrigger>
            )}
            {!hiddenSections.includes('xgspon') && (
              <TabsTrigger value="xgspon" className="rounded-lg">
                <Zap className="h-4 w-4 mr-2" />
                XGS-PON
              </TabsTrigger>
            )}
            {!hiddenSections.includes('splitters') && (
              <TabsTrigger value="splitters" className="rounded-lg">
                Splitters
              </TabsTrigger>
            )}
            {!hiddenSections.includes('errors') && (
              <TabsTrigger value="errors" className="rounded-lg">
                <Activity className="h-4 w-4 mr-2" />
                BIP/FEC/GEM
              </TabsTrigger>
            )}
          </TabsList>

          {!hiddenSections.includes('gpon') && (
            <TabsContent value="gpon">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">GPON Power Levels</h2>
                <p className="text-sm text-gray-500">Per ITU-T G.984.2 specification</p>
              </div>
              {renderPowerTable(GPON_SPECS, 'gpon')}
            </TabsContent>
          )}

          {!hiddenSections.includes('xgspon') && (
            <TabsContent value="xgspon">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">XGS-PON Power Levels</h2>
                <p className="text-sm text-gray-500">Per ITU-T G.9807.1 specification</p>
              </div>
              {renderPowerTable(XGSPON_SPECS, 'xgspon')}
            </TabsContent>
          )}

          {!hiddenSections.includes('splitters') && (
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
          )}

          {!hiddenSections.includes('errors') && (
          <TabsContent value="errors">
            <div className="space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">PON Error Types</h2>
                <p className="text-sm text-gray-500">Understanding BIP, FEC, GEM, and HEC errors with pass/fail thresholds</p>
              </div>

              {/* Quick Pass/Fail Reference Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Pass/Fail Reference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left py-2 font-medium">Error Type</th>
                          <th className="text-center py-2 px-2">
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> PASS
                            </span>
                          </th>
                          <th className="text-center py-2 px-2">
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <AlertTriangle className="h-3 w-3" /> MARGINAL
                            </span>
                          </th>
                          <th className="text-center py-2 px-2">
                            <span className="inline-flex items-center gap-1 text-red-400">
                              <XCircle className="h-3 w-3" /> FAIL
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(PON_ERRORS).map(([key, error]) => (
                          <tr key={key} className="border-b border-slate-700">
                            <td className="py-2 font-medium">{error.name.split('(')[0].trim()}</td>
                            <td className="text-center py-2 px-2">
                              <span className="text-emerald-400 font-mono text-xs">{error.thresholds.pass.label}</span>
                            </td>
                            <td className="text-center py-2 px-2">
                              <span className="text-amber-400 font-mono text-xs">{error.thresholds.marginal.label}</span>
                            </td>
                            <td className="text-center py-2 px-2">
                              <span className="text-red-400 font-mono text-xs">{error.thresholds.fail.label}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-600 text-xs text-slate-400">
                    <strong>Key Rule:</strong> FEC Corrected errors are normal in low quantities. All other error types should be zero for a healthy link.
                  </div>
                </CardContent>
              </Card>

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
                    {/* Threshold Badges */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">PASS</span>
                        </div>
                        <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{error.thresholds.pass.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{error.thresholds.pass.desc}</div>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">MARGINAL</span>
                        </div>
                        <div className="font-mono font-bold text-amber-700 dark:text-amber-300">{error.thresholds.marginal.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{error.thresholds.marginal.desc}</div>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-xs font-medium text-red-700 dark:text-red-300">FAIL</span>
                        </div>
                        <div className="font-mono font-bold text-red-700 dark:text-red-300">{error.thresholds.fail.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{error.thresholds.fail.desc}</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Symptoms</h4>
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

                    {/* Recommended Actions */}
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2">Recommended Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        {error.actions.map((action, i) => (
                          <Badge key={i} variant="outline" className="bg-white dark:bg-gray-800">
                            {i + 1}. {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Error Troubleshooting Flow */}
              <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                <CardHeader>
                  <CardTitle className="text-base">General Troubleshooting Flow</CardTitle>
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
          )}
        </Tabs>
        )}

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