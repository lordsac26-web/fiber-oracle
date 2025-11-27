import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Calculator, CheckCircle2, XCircle, AlertTriangle, Info, Download, RotateCcw } from 'lucide-react';
import { FIBER_ATTENUATION, CONNECTOR_LOSS, SPLICE_LOSS, STANDARD_BUDGETS } from './FiberConstants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function LossBudgetCalculator({ onSaveReport }) {
  const [fiberType, setFiberType] = useState('SMF');
  const [wavelength, setWavelength] = useState('1310nm');
  const [distance, setDistance] = useState(1);
  const [connectors, setConnectors] = useState(4);
  const [connectorGrade, setConnectorGrade] = useState('elite');
  const [splices, setSplices] = useState(2);
  const [spliceType, setSpliceType] = useState('fusion');
  const [selectedStandard, setSelectedStandard] = useState('10GBASE-LR');
  const [safetyMargin, setSafetyMargin] = useState(3);
  const [useCustomValues, setUseCustomValues] = useState(false);
  const [customAttenuation, setCustomAttenuation] = useState(0.35);
  const [customConnectorLoss, setCustomConnectorLoss] = useState(0.15);
  const [customSpliceLoss, setCustomSpliceLoss] = useState(0.10);

  const availableWavelengths = useMemo(() => {
    if (fiberType === 'SMF' || fiberType === 'G.657') {
      return ['1310nm', '1550nm', '1625nm'];
    }
    return ['850nm', '1300nm'];
  }, [fiberType]);

  const calculations = useMemo(() => {
    // Get attenuation value
    let attenuation;
    if (useCustomValues) {
      attenuation = customAttenuation;
    } else {
      const fiberData = FIBER_ATTENUATION[fiberType] || FIBER_ATTENUATION.SMF;
      attenuation = fiberData[wavelength] || 0.35;
    }

    // Get connector loss
    const connLoss = useCustomValues 
      ? customConnectorLoss 
      : CONNECTOR_LOSS[connectorGrade]?.smf || 0.15;

    // Get splice loss
    const spliceLoss = useCustomValues 
      ? customSpliceLoss 
      : SPLICE_LOSS[spliceType]?.smf || 0.10;

    // Calculate losses
    const fiberLoss = distance * attenuation;
    const totalConnectorLoss = connectors * connLoss;
    const totalSpliceLoss = splices * spliceLoss;
    const totalLoss = fiberLoss + totalConnectorLoss + totalSpliceLoss;
    const totalWithMargin = totalLoss + safetyMargin;

    // Get standard budget
    const standard = STANDARD_BUDGETS[selectedStandard];
    const budget = standard?.maxLoss || 6.2;
    const remaining = budget - totalWithMargin;
    const passMargin = budget - totalLoss;

    return {
      attenuation,
      connLoss,
      spliceLoss,
      fiberLoss: fiberLoss.toFixed(2),
      totalConnectorLoss: totalConnectorLoss.toFixed(2),
      totalSpliceLoss: totalSpliceLoss.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      totalWithMargin: totalWithMargin.toFixed(2),
      budget,
      remaining: remaining.toFixed(2),
      passMargin: passMargin.toFixed(2),
      status: remaining >= 0 ? 'pass' : remaining >= -1 ? 'marginal' : 'fail',
      utilizationPercent: ((totalWithMargin / budget) * 100).toFixed(1)
    };
  }, [fiberType, wavelength, distance, connectors, connectorGrade, splices, spliceType, selectedStandard, safetyMargin, useCustomValues, customAttenuation, customConnectorLoss, customSpliceLoss]);

  const resetDefaults = () => {
    setFiberType('SMF');
    setWavelength('1310nm');
    setDistance(1);
    setConnectors(4);
    setConnectorGrade('elite');
    setSplices(2);
    setSpliceType('fusion');
    setSelectedStandard('10GBASE-LR');
    setSafetyMargin(3);
    setUseCustomValues(false);
  };

  const standardInfo = STANDARD_BUDGETS[selectedStandard];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'bg-emerald-500';
      case 'marginal': return 'bg-amber-500';
      case 'fail': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-5 w-5" />;
      case 'marginal': return <AlertTriangle className="h-5 w-5" />;
      case 'fail': return <XCircle className="h-5 w-5" />;
      default: return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loss Budget Calculator</h2>
              <p className="text-sm text-gray-500">TIA-568-D / IEEE 802.3 compliant</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Standard Selection */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  Application Standard
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select the network standard to compare against</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header-datacenter" disabled className="font-semibold text-xs text-gray-500">
                      — DATACENTER / ENTERPRISE —
                    </SelectItem>
                    <SelectItem value="10GBASE-SR">10GBASE-SR (850nm, OM3/OM4)</SelectItem>
                    <SelectItem value="10GBASE-LR">10GBASE-LR (1310nm, 10km)</SelectItem>
                    <SelectItem value="10GBASE-ER">10GBASE-ER (1550nm, 40km)</SelectItem>
                    <SelectItem value="25GBASE-LR">25GBASE-LR (1310nm, 10km)</SelectItem>
                    <SelectItem value="100GBASE-SR4">100GBASE-SR4 (850nm, OM4)</SelectItem>
                    <SelectItem value="100GBASE-LR4">100GBASE-LR4 (1310nm, 10km)</SelectItem>
                    <SelectItem value="100GBASE-ER4">100GBASE-ER4 (1550nm, 40km)</SelectItem>
                    <SelectItem value="400GBASE-SR8">400GBASE-SR8 (850nm)</SelectItem>
                    <SelectItem value="400GBASE-DR4">400GBASE-DR4 (1310nm, 500m)</SelectItem>
                    <SelectItem value="400GBASE-FR4">400GBASE-FR4 (1310nm, 2km)</SelectItem>
                    <SelectItem value="400GBASE-LR4">400GBASE-LR4 (1310nm, 10km)</SelectItem>
                    <SelectItem value="400GBASE-ZR">400GBASE-ZR (1550nm, 80km)</SelectItem>
                    <SelectItem value="header-pon" disabled className="font-semibold text-xs text-gray-500">
                      — PON / FTTH —
                    </SelectItem>
                    <SelectItem value="GPON Class B+">GPON Class B+ (28 dB)</SelectItem>
                    <SelectItem value="GPON Class C+">GPON Class C+ (32 dB)</SelectItem>
                    <SelectItem value="XGS-PON N1">XGS-PON N1 (29 dB)</SelectItem>
                    <SelectItem value="XGS-PON N2">XGS-PON N2 (31 dB)</SelectItem>
                    <SelectItem value="25G-PON">25G-PON (29 dB)</SelectItem>
                    <SelectItem value="50G-PON">50G-PON (31 dB)</SelectItem>
                  </SelectContent>
                </Select>
                {standardInfo && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-gray-500">Standard:</span> {standardInfo.standard}</div>
                      <div><span className="text-gray-500">Wavelength:</span> {standardInfo.wavelength}</div>
                      <div><span className="text-gray-500">Max Loss:</span> <span className="font-semibold text-blue-600">{standardInfo.maxLoss} dB</span></div>
                      <div><span className="text-gray-500">Max Distance:</span> {typeof standardInfo.maxDistance === 'object' ? `${standardInfo.maxDistance.OM3}m (OM3)` : `${(standardInfo.maxDistance/1000).toFixed(1)}km`}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Link Parameters */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Link Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fiber Type</Label>
                    <Select value={fiberType} onValueChange={(v) => {
                      setFiberType(v);
                      // Reset wavelength if incompatible
                      if ((v === 'OM3' || v === 'OM4' || v === 'OM5') && wavelength.includes('1310')) {
                        setWavelength('850nm');
                      } else if ((v === 'SMF' || v === 'G.657') && wavelength === '850nm') {
                        setWavelength('1310nm');
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMF">OS2 Single-Mode (G.652.D)</SelectItem>
                        <SelectItem value="G.657">G.657 Bend-Insensitive SMF</SelectItem>
                        <SelectItem value="OM3">OM3 Multimode</SelectItem>
                        <SelectItem value="OM4">OM4 Multimode</SelectItem>
                        <SelectItem value="OM5">OM5 Wideband MMF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Wavelength</Label>
                    <Select value={wavelength} onValueChange={setWavelength}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                    <Label>Link Distance</Label>
                    <span className="text-sm font-medium text-blue-600">{distance} km</span>
                  </div>
                  <Slider
                    value={[distance]}
                    onValueChange={([v]) => setDistance(v)}
                    min={0.01}
                    max={100}
                    step={0.1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>10m</span>
                    <span>100km</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Connector Pairs</Label>
                      <span className="text-sm font-medium">{connectors}</span>
                    </div>
                    <Slider
                      value={[connectors]}
                      onValueChange={([v]) => setConnectors(v)}
                      min={2}
                      max={20}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Connector Grade</Label>
                    <Select value={connectorGrade} onValueChange={setConnectorGrade}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elite">Elite (≤0.15 dB) - Factory</SelectItem>
                        <SelectItem value="standard">Standard (≤0.50 dB) - Field</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Splices</Label>
                      <span className="text-sm font-medium">{splices}</span>
                    </div>
                    <Slider
                      value={[splices]}
                      onValueChange={([v]) => setSplices(v)}
                      min={0}
                      max={30}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Splice Type</Label>
                    <Select value={spliceType} onValueChange={setSpliceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fusion">Fusion (≤0.10 dB)</SelectItem>
                        <SelectItem value="mechanical">Mechanical (≤0.30 dB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Safety Margin</Label>
                    <span className="text-sm font-medium">{safetyMargin} dB</span>
                  </div>
                  <Slider
                    value={[safetyMargin]}
                    onValueChange={([v]) => setSafetyMargin(v)}
                    min={0}
                    max={6}
                    step={0.5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Override */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Custom Loss Values</CardTitle>
                  <Switch checked={useCustomValues} onCheckedChange={setUseCustomValues} />
                </div>
                <p className="text-sm text-gray-500">Override standard values with company specs</p>
              </CardHeader>
              {useCustomValues && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Attenuation (dB/km)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={customAttenuation}
                        onChange={(e) => setCustomAttenuation(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Connector (dB)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={customConnectorLoss}
                        onChange={(e) => setCustomConnectorLoss(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Splice (dB)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={customSpliceLoss}
                        onChange={(e) => setCustomSpliceLoss(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className={`border-0 shadow-xl ${getStatusColor(calculations.status)} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium opacity-90">Link Status</span>
                  {getStatusIcon(calculations.status)}
                </div>
                <div className="text-4xl font-bold mb-1">
                  {calculations.status === 'pass' ? 'PASS' : calculations.status === 'marginal' ? 'MARGINAL' : 'FAIL'}
                </div>
                <div className="text-sm opacity-90">
                  {calculations.remaining >= 0 
                    ? `${calculations.remaining} dB margin remaining`
                    : `${Math.abs(calculations.remaining)} dB over budget`}
                </div>
              </CardContent>
            </Card>

            {/* Loss Breakdown */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Loss Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <div className="font-medium">Fiber Loss</div>
                      <div className="text-xs text-gray-500">{distance}km × {calculations.attenuation} dB/km</div>
                    </div>
                    <Badge variant="outline" className="font-mono">{calculations.fiberLoss} dB</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <div className="font-medium">Connector Loss</div>
                      <div className="text-xs text-gray-500">{connectors} × {calculations.connLoss} dB</div>
                    </div>
                    <Badge variant="outline" className="font-mono">{calculations.totalConnectorLoss} dB</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <div className="font-medium">Splice Loss</div>
                      <div className="text-xs text-gray-500">{splices} × {calculations.spliceLoss} dB</div>
                    </div>
                    <Badge variant="outline" className="font-mono">{calculations.totalSpliceLoss} dB</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <div className="font-medium">Safety Margin</div>
                    </div>
                    <Badge variant="outline" className="font-mono">{safetyMargin.toFixed(2)} dB</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold">Total Loss</span>
                    <span className="text-xl font-bold text-blue-600">{calculations.totalWithMargin} dB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Budget ({selectedStandard})</span>
                    <span className="font-semibold">{calculations.budget} dB</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Budget Utilization</span>
                    <span>{calculations.utilizationPercent}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        parseFloat(calculations.utilizationPercent) <= 80 ? 'bg-emerald-500' :
                        parseFloat(calculations.utilizationPercent) <= 100 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(parseFloat(calculations.utilizationPercent), 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Reference */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 text-sm">Reference Values Used</h4>
                <div className="text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Fiber Attenuation:</span>
                    <span className="font-mono">{calculations.attenuation} dB/km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connector ({connectorGrade}):</span>
                    <span className="font-mono">{calculations.connLoss} dB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Splice ({spliceType}):</span>
                    <span className="font-mono">{calculations.spliceLoss} dB</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                  Source: TIA-568-D, IEEE 802.3
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => onSaveReport && onSaveReport({
                type: 'loss_budget',
                data: {
                  fiberType, wavelength, distance, connectors, connectorGrade, splices, spliceType,
                  selectedStandard, safetyMargin, calculations
                }
              })}
            >
              <Download className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}