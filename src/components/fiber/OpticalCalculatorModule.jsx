import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  RotateCcw,
  Zap,
  Cable,
  ArrowRightLeft,
  Activity
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS - TIA/FOA/ITU-T Standards Reference Values
// ═══════════════════════════════════════════════════════════════════════════

const FIBER_ATTENUATION = {
  'OS2 SMF': { '1310nm': 0.35, '1550nm': 0.25, '1490nm': 0.28, '1577nm': 0.24 },
  'G.657.A1': { '1310nm': 0.35, '1550nm': 0.25, '1490nm': 0.28, '1577nm': 0.24 },
  'G.657.A2': { '1310nm': 0.35, '1550nm': 0.25, '1490nm': 0.28, '1577nm': 0.24 },
  'G.657.B3': { '1310nm': 0.35, '1550nm': 0.25, '1490nm': 0.28, '1577nm': 0.24 },
  'OM3': { '850nm': 3.0, '1300nm': 1.0 },
  'OM4': { '850nm': 3.0, '1300nm': 1.0 },
  'OM5': { '850nm': 3.0, '1300nm': 1.0 },
};

const CONNECTOR_LOSS = {
  'Elite (Factory)': 0.15,
  'Standard (Field)': 0.50,
  'Typical LC/SC': 0.20,
  'MPO/MTP': 0.35,
};

const SPLICE_LOSS = {
  'Fusion': 0.10,
  'Fusion (Excellent)': 0.03,
  'Mechanical': 0.30,
};

const SPLITTER_LOSS = {
  '1:2': 3.8,
  '1:4': 7.4,
  '1:8': 10.7,
  '1:16': 14.1,
  '1:32': 17.5,
  '1:64': 20.9,
  '1:128': 24.3,
  'None': 0,
};

const PON_CLASSES = {
  // GPON - ITU-T G.984.2
  'GPON B+': { 
    oltTxMin: 1.5, oltTxMax: 5.0, 
    ontRxMin: -28, ontRxMax: -8, 
    budget: 28, 
    standard: 'ITU-T G.984.2',
    wavelengthDS: '1490nm', wavelengthUS: '1310nm'
  },
  'GPON C+': { 
    oltTxMin: 3.0, oltTxMax: 7.0, 
    ontRxMin: -32, ontRxMax: -8, 
    budget: 32, 
    standard: 'ITU-T G.984.2 Amd.2',
    wavelengthDS: '1490nm', wavelengthUS: '1310nm'
  },
  // XGS-PON - ITU-T G.9807.1
  'XGS-PON N1': { 
    oltTxMin: 2.0, oltTxMax: 7.0, 
    ontRxMin: -28, ontRxMax: -1, 
    budget: 29, 
    standard: 'ITU-T G.9807.1',
    wavelengthDS: '1577nm', wavelengthUS: '1270nm'
  },
  'XGS-PON N2': { 
    oltTxMin: 4.0, oltTxMax: 9.0, 
    ontRxMin: -29, ontRxMax: -1, 
    budget: 31, 
    standard: 'ITU-T G.9807.1',
    wavelengthDS: '1577nm', wavelengthUS: '1270nm'
  },
  'XGS-PON E1': { 
    oltTxMin: 2.0, oltTxMax: 7.0, 
    ontRxMin: -31, ontRxMax: -1, 
    budget: 33, 
    standard: 'ITU-T G.9807.1',
    wavelengthDS: '1577nm', wavelengthUS: '1270nm'
  },
  // 25G/50G PON - ITU-T G.9804.3
  '25G-PON PR10': { 
    oltTxMin: 2.0, oltTxMax: 7.0, 
    ontRxMin: -26, ontRxMax: 1, 
    budget: 29, 
    standard: 'ITU-T G.9804.3',
    wavelengthDS: '1358nm', wavelengthUS: '1270nm'
  },
  '50G-PON PR10': { 
    oltTxMin: 4.0, oltTxMax: 9.0, 
    ontRxMin: -24, ontRxMax: 2, 
    budget: 29, 
    standard: 'ITU-T G.9804.3',
    wavelengthDS: '1340nm', wavelengthUS: '1280nm'
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// LINK LOSS CALCULATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function LinkLossCalculator() {
  const [fiberType, setFiberType] = useState('OS2 SMF');
  const [wavelength, setWavelength] = useState('1310nm');
  const [distance, setDistance] = useState(5);
  const [connectors, setConnectors] = useState(4);
  const [connectorType, setConnectorType] = useState('Elite (Factory)');
  const [splices, setSplices] = useState(2);
  const [spliceType, setSpliceType] = useState('Fusion');
  const [splitterRatio, setSplitterRatio] = useState('1:32');
  const [safetyMargin, setSafetyMargin] = useState(3);

  const availableWavelengths = useMemo(() => {
    return Object.keys(FIBER_ATTENUATION[fiberType] || {});
  }, [fiberType]);

  const calculations = useMemo(() => {
    const attenuation = FIBER_ATTENUATION[fiberType]?.[wavelength] || 0.35;
    const connLoss = CONNECTOR_LOSS[connectorType] || 0.15;
    const spliceLoss = SPLICE_LOSS[spliceType] || 0.10;
    const splitterLoss = SPLITTER_LOSS[splitterRatio] || 0;

    const fiberLoss = distance * attenuation;
    const totalConnectorLoss = connectors * connLoss;
    const totalSpliceLoss = splices * spliceLoss;
    const totalLoss = fiberLoss + totalConnectorLoss + totalSpliceLoss + splitterLoss;
    const totalWithMargin = totalLoss + safetyMargin;

    return {
      attenuation,
      connLoss,
      spliceLoss,
      splitterLoss,
      fiberLoss,
      totalConnectorLoss,
      totalSpliceLoss,
      totalLoss,
      totalWithMargin,
    };
  }, [fiberType, wavelength, distance, connectors, connectorType, splices, spliceType, splitterRatio, safetyMargin]);

  const resetDefaults = () => {
    setFiberType('OS2 SMF');
    setWavelength('1310nm');
    setDistance(5);
    setConnectors(4);
    setConnectorType('Elite (Factory)');
    setSplices(2);
    setSpliceType('Fusion');
    setSplitterRatio('1:32');
    setSafetyMargin(3);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cable className="h-5 w-5 text-blue-600" />
          <span className="font-medium">TIA-568-D / FOA Reference Method</span>
        </div>
        <Button variant="outline" size="sm" onClick={resetDefaults}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Link Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fiber Type</Label>
                <Select value={fiberType} onValueChange={(v) => {
                  setFiberType(v);
                  const wls = Object.keys(FIBER_ATTENUATION[v] || {});
                  if (!wls.includes(wavelength)) setWavelength(wls[0] || '1310nm');
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(FIBER_ATTENUATION).map(ft => (
                      <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Wavelength</Label>
                <Select value={wavelength} onValueChange={setWavelength}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableWavelengths.map(wl => (
                      <SelectItem key={wl} value={wl}>{wl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Fiber Length</Label>
                <span className="text-sm font-mono font-semibold text-blue-600">{distance} km</span>
              </div>
              <Slider value={[distance]} onValueChange={([v]) => setDistance(v)} min={0.1} max={50} step={0.1} />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Connectors</Label>
                  <span className="text-sm font-semibold">{connectors}</span>
                </div>
                <Slider value={[connectors]} onValueChange={([v]) => setConnectors(v)} min={2} max={20} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Connector Grade</Label>
                <Select value={connectorType} onValueChange={setConnectorType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CONNECTOR_LOSS).map(ct => (
                      <SelectItem key={ct} value={ct}>{ct} (≤{CONNECTOR_LOSS[ct]} dB)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Splices</Label>
                  <span className="text-sm font-semibold">{splices}</span>
                </div>
                <Slider value={[splices]} onValueChange={([v]) => setSplices(v)} min={0} max={20} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Splice Type</Label>
                <Select value={spliceType} onValueChange={setSpliceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(SPLICE_LOSS).map(st => (
                      <SelectItem key={st} value={st}>{st} (≤{SPLICE_LOSS[st]} dB)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Splitter Ratio</Label>
                <Select value={splitterRatio} onValueChange={setSplitterRatio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPLITTER_LOSS).map(([ratio, loss]) => (
                      <SelectItem key={ratio} value={ratio}>{ratio} {loss > 0 ? `(${loss} dB)` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Safety Margin</Label>
                  <span className="text-sm font-semibold">{safetyMargin} dB</span>
                </div>
                <Slider value={[safetyMargin]} onValueChange={([v]) => setSafetyMargin(v)} min={0} max={6} step={0.5} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Loss Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <div>
                  <span className="font-medium">Fiber Loss</span>
                  <p className="text-xs text-gray-500">{distance} km × {calculations.attenuation} dB/km</p>
                </div>
                <Badge variant="outline" className="font-mono">{calculations.fiberLoss.toFixed(2)} dB</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <div>
                  <span className="font-medium">Connector Loss</span>
                  <p className="text-xs text-gray-500">{connectors} × {calculations.connLoss} dB</p>
                </div>
                <Badge variant="outline" className="font-mono">{calculations.totalConnectorLoss.toFixed(2)} dB</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <div>
                  <span className="font-medium">Splice Loss</span>
                  <p className="text-xs text-gray-500">{splices} × {calculations.spliceLoss} dB</p>
                </div>
                <Badge variant="outline" className="font-mono">{calculations.totalSpliceLoss.toFixed(2)} dB</Badge>
              </div>
              {calculations.splitterLoss > 0 && (
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <div>
                    <span className="font-medium">Splitter Loss</span>
                    <p className="text-xs text-gray-500">{splitterRatio}</p>
                  </div>
                  <Badge variant="outline" className="font-mono">{calculations.splitterLoss.toFixed(2)} dB</Badge>
                </div>
              )}
              <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <span className="font-medium">Safety Margin</span>
                <Badge variant="outline" className="font-mono">{safetyMargin.toFixed(2)} dB</Badge>
              </div>
            </div>

            <Separator />

            <div className="p-4 bg-blue-600 text-white rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total Link Loss</span>
                <span className="text-2xl font-bold">{calculations.totalWithMargin.toFixed(2)} dB</span>
              </div>
              <p className="text-sm text-blue-100 mt-1">
                ({calculations.totalLoss.toFixed(2)} dB + {safetyMargin} dB margin)
              </p>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
              <strong>Standards:</strong> TIA-568-D.3, TIA-526-14-C, FOA Reference Method (1-Jumper)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PON POWER LEVEL CALCULATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PONPowerCalculator() {
  const [ponClass, setPonClass] = useState('GPON C+');
  const [oltTxPower, setOltTxPower] = useState(5);
  const [distance, setDistance] = useState(10);
  const [splitterRatio, setSplitterRatio] = useState('1:32');
  const [connectors, setConnectors] = useState(4);
  const [splices, setSplices] = useState(2);

  const classInfo = PON_CLASSES[ponClass];

  const calculations = useMemo(() => {
    const fiberAttenuation = 0.35; // dB/km @ 1310nm (worst case)
    const connLoss = 0.15; // Elite grade
    const spliceLoss = 0.10; // Fusion
    const splitterLoss = SPLITTER_LOSS[splitterRatio] || 0;

    const fiberLoss = distance * fiberAttenuation;
    const totalConnLoss = connectors * connLoss;
    const totalSpliceLoss = splices * spliceLoss;
    const totalLoss = fiberLoss + totalConnLoss + totalSpliceLoss + splitterLoss;

    const expectedRx = oltTxPower - totalLoss;
    
    let status = 'good';
    let statusColor = 'bg-emerald-500';
    let statusText = 'Good';

    if (expectedRx < classInfo.ontRxMin) {
      status = 'low';
      statusColor = 'bg-red-500';
      statusText = 'Too Low';
    } else if (expectedRx > classInfo.ontRxMax) {
      status = 'high';
      statusColor = 'bg-amber-500';
      statusText = 'Too High';
    } else if (expectedRx < classInfo.ontRxMin + 3) {
      status = 'marginal';
      statusColor = 'bg-amber-500';
      statusText = 'Marginal';
    }

    const margin = expectedRx - classInfo.ontRxMin;

    return {
      fiberLoss,
      totalConnLoss,
      totalSpliceLoss,
      splitterLoss,
      totalLoss,
      expectedRx,
      status,
      statusColor,
      statusText,
      margin,
    };
  }, [ponClass, oltTxPower, distance, splitterRatio, connectors, splices, classInfo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-emerald-600" />
        <span className="font-medium">ITU-T G.984 / G.9807 / G.9804</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Network Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>PON Class</Label>
              <Select value={ponClass} onValueChange={setPonClass}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="header-gpon" disabled className="font-bold text-xs text-gray-500">— GPON —</SelectItem>
                  <SelectItem value="GPON B+">GPON Class B+ (28 dB)</SelectItem>
                  <SelectItem value="GPON C+">GPON Class C+ (32 dB)</SelectItem>
                  <SelectItem value="header-xgs" disabled className="font-bold text-xs text-gray-500">— XGS-PON —</SelectItem>
                  <SelectItem value="XGS-PON N1">XGS-PON N1 (29 dB)</SelectItem>
                  <SelectItem value="XGS-PON N2">XGS-PON N2 (31 dB)</SelectItem>
                  <SelectItem value="XGS-PON E1">XGS-PON E1 (33 dB)</SelectItem>
                  <SelectItem value="header-ng" disabled className="font-bold text-xs text-gray-500">— Next-Gen PON —</SelectItem>
                  <SelectItem value="25G-PON PR10">25G-PON PR10 (29 dB)</SelectItem>
                  <SelectItem value="50G-PON PR10">50G-PON PR10 (29 dB)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {classInfo && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Standard:</span>
                  <span className="font-medium">{classInfo.standard}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">OLT Tx Range:</span>
                  <span className="font-mono">+{classInfo.oltTxMin} to +{classInfo.oltTxMax} dBm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ONT Rx Range:</span>
                  <span className="font-mono">{classInfo.ontRxMin} to {classInfo.ontRxMax} dBm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Budget:</span>
                  <span className="font-bold text-blue-600">{classInfo.budget} dB</span>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>OLT Tx Power</Label>
                <span className="text-sm font-mono font-semibold text-emerald-600">+{oltTxPower} dBm</span>
              </div>
              <Slider 
                value={[oltTxPower]} 
                onValueChange={([v]) => setOltTxPower(v)} 
                min={classInfo?.oltTxMin || 0} 
                max={classInfo?.oltTxMax || 10} 
                step={0.5} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Distance</Label>
                <span className="text-sm font-mono font-semibold">{distance} km</span>
              </div>
              <Slider value={[distance]} onValueChange={([v]) => setDistance(v)} min={0.5} max={40} step={0.5} />
            </div>

            <div className="space-y-2">
              <Label>Splitter Ratio</Label>
              <Select value={splitterRatio} onValueChange={setSplitterRatio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SPLITTER_LOSS).filter(([k]) => k !== 'None').map(([ratio, loss]) => (
                    <SelectItem key={ratio} value={ratio}>{ratio} ({loss} dB)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Connectors</Label>
                  <span className="text-sm font-semibold">{connectors}</span>
                </div>
                <Slider value={[connectors]} onValueChange={([v]) => setConnectors(v)} min={2} max={10} step={1} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Splices</Label>
                  <span className="text-sm font-semibold">{splices}</span>
                </div>
                <Slider value={[splices]} onValueChange={([v]) => setSplices(v)} min={0} max={10} step={1} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card className={`border-0 shadow-xl ${calculations.statusColor} text-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg opacity-90">Expected ONT Rx Power</span>
                {calculations.status === 'good' ? <CheckCircle2 className="h-6 w-6" /> : 
                 calculations.status === 'low' ? <XCircle className="h-6 w-6" /> : 
                 <AlertTriangle className="h-6 w-6" />}
              </div>
              <div className="text-4xl font-bold">
                {calculations.expectedRx.toFixed(1)} dBm
              </div>
              <div className="text-sm opacity-90 mt-1">
                Status: {calculations.statusText} • Margin: {calculations.margin.toFixed(1)} dB
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Loss Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">OLT Tx Power</span>
                <span className="font-mono">+{oltTxPower.toFixed(1)} dBm</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Fiber Loss ({distance} km)</span>
                <span className="font-mono text-red-600">-{calculations.fiberLoss.toFixed(2)} dB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Connector Loss ({connectors}×)</span>
                <span className="font-mono text-red-600">-{calculations.totalConnLoss.toFixed(2)} dB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Splice Loss ({splices}×)</span>
                <span className="font-mono text-red-600">-{calculations.totalSpliceLoss.toFixed(2)} dB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Splitter Loss ({splitterRatio})</span>
                <span className="font-mono text-red-600">-{calculations.splitterLoss.toFixed(2)} dB</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Loss</span>
                <span className="font-mono text-blue-600">{calculations.totalLoss.toFixed(2)} dB</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <CardContent className="p-4 text-xs text-gray-600 dark:text-gray-400">
              <strong>Acceptable Range ({ponClass}):</strong><br />
              {classInfo?.ontRxMin} dBm to {classInfo?.ontRxMax} dBm<br />
              <strong>Recommendation:</strong> Target -15 to -22 dBm for optimal margin.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// dBm / LINEAR POWER CONVERTER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PowerConverter() {
  const [dbmValue, setDbmValue] = useState('0');
  const [mwValue, setMwValue] = useState('1');
  const [dbValue, setDbValue] = useState('3');
  const [ratio, setRatio] = useState('2');

  // dBm to mW: mW = 10^(dBm/10)
  const dbmToMw = (dbm) => {
    const val = parseFloat(dbm);
    if (isNaN(val)) return '';
    return Math.pow(10, val / 10).toExponential(4);
  };

  // mW to dBm: dBm = 10 * log10(mW)
  const mwToDbm = (mw) => {
    const val = parseFloat(mw);
    if (isNaN(val) || val <= 0) return '';
    return (10 * Math.log10(val)).toFixed(3);
  };

  // dB to linear ratio: ratio = 10^(dB/10)
  const dbToRatio = (db) => {
    const val = parseFloat(db);
    if (isNaN(val)) return '';
    return Math.pow(10, val / 10).toFixed(4);
  };

  // linear ratio to dB: dB = 10 * log10(ratio)
  const ratioToDb = (r) => {
    const val = parseFloat(r);
    if (isNaN(val) || val <= 0) return '';
    return (10 * Math.log10(val)).toFixed(3);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-purple-600" />
        <span className="font-medium">Power & Ratio Conversions</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* dBm <-> mW */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              dBm ↔ Milliwatts (mW)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>dBm (decibel-milliwatts)</Label>
              <Input 
                type="number" 
                value={dbmValue} 
                onChange={(e) => setDbmValue(e.target.value)}
                placeholder="Enter dBm value"
              />
              <p className="text-xs text-gray-500">Reference: 0 dBm = 1 mW</p>
            </div>
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                = {dbmToMw(dbmValue) || '—'} mW
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Milliwatts (mW)</Label>
              <Input 
                type="number" 
                value={mwValue} 
                onChange={(e) => setMwValue(e.target.value)}
                placeholder="Enter mW value"
                step="0.001"
              />
            </div>
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                = {mwToDbm(mwValue) || '—'} dBm
              </Badge>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
              <strong>Formulas:</strong><br />
              mW = 10<sup>(dBm/10)</sup><br />
              dBm = 10 × log<sub>10</sub>(mW)
            </div>
          </CardContent>
        </Card>

        {/* dB <-> Linear Ratio */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              dB ↔ Linear Ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>dB (decibels)</Label>
              <Input 
                type="number" 
                value={dbValue} 
                onChange={(e) => setDbValue(e.target.value)}
                placeholder="Enter dB value"
              />
              <p className="text-xs text-gray-500">Loss/Gain relative measurement</p>
            </div>
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                = {dbToRatio(dbValue) || '—'} : 1 ratio
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Linear Ratio</Label>
              <Input 
                type="number" 
                value={ratio} 
                onChange={(e) => setRatio(e.target.value)}
                placeholder="Enter ratio"
                step="0.1"
              />
            </div>
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                = {ratioToDb(ratio) || '—'} dB
              </Badge>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded text-xs">
              <strong>Formulas:</strong><br />
              Ratio = 10<sup>(dB/10)</sup><br />
              dB = 10 × log<sub>10</sub>(Ratio)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Reference */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { db: 3, note: '2× power' },
              { db: 6, note: '4× power' },
              { db: 10, note: '10× power' },
              { db: 20, note: '100× power' },
              { db: -3, note: '½ power' },
              { db: -10, note: '1/10 power' },
            ].map(({ db, note }) => (
              <div key={db} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <div className="font-mono font-bold text-lg">{db > 0 ? '+' : ''}{db} dB</div>
                <div className="text-xs text-gray-500">{note}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN OPTICAL CALCULATOR MODULE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useUserPreferences } from '@/components/UserPreferencesContext';
import HiddenContentBanner from '@/components/HiddenContentBanner';

export default function OpticalCalculatorModule() {
  const { preferences, updatePreferences } = useUserPreferences();
  const hiddenSections = preferences.hiddenSections?.opticalcalc || [];

  const sections = [
    { id: 'linkloss', name: 'Link Loss', icon: Cable },
    { id: 'ponpower', name: 'PON Power', icon: Zap },
    { id: 'converter', name: 'dB Converter', icon: ArrowRightLeft },
  ];

  const visibleSections = sections.filter(s => !hiddenSections.includes(s.id));
  const hiddenCount = hiddenSections.length;

  const handleShowAll = () => {
    updatePreferences({
      hiddenSections: {
        ...preferences.hiddenSections,
        opticalcalc: []
      }
    });
  };

  // Get first visible section as default
  const defaultTab = visibleSections.length > 0 ? visibleSections[0].id : 'linkloss';

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fiber Optical Calculator</h2>
            <p className="text-sm text-gray-500">TIA-568-D, ITU-T G.984/G.9807, FOA Standards</p>
          </div>
        </div>

        <HiddenContentBanner 
          hiddenCount={hiddenCount} 
          moduleId="opticalcalc" 
          onShowAll={handleShowAll}
        />

        {visibleSections.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-gray-500">All sections in this module are hidden.</p>
          </div>
        ) : (
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl">
              {!hiddenSections.includes('linkloss') && (
                <TabsTrigger value="linkloss" className="rounded-lg">
                  <Cable className="h-4 w-4 mr-2" />
                  Link Loss
                </TabsTrigger>
              )}
              {!hiddenSections.includes('ponpower') && (
                <TabsTrigger value="ponpower" className="rounded-lg">
                  <Zap className="h-4 w-4 mr-2" />
                  PON Power
                </TabsTrigger>
              )}
              {!hiddenSections.includes('converter') && (
                <TabsTrigger value="converter" className="rounded-lg">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  dB Converter
                </TabsTrigger>
              )}
            </TabsList>

            {!hiddenSections.includes('linkloss') && (
              <TabsContent value="linkloss">
                <LinkLossCalculator />
              </TabsContent>
            )}

            {!hiddenSections.includes('ponpower') && (
              <TabsContent value="ponpower">
                <PONPowerCalculator />
              </TabsContent>
            )}

            {!hiddenSections.includes('converter') && (
              <TabsContent value="converter">
                <PowerConverter />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </TooltipProvider>
  );
}