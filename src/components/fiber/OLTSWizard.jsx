import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Timer,
  Zap,
  Cable,
  RotateCcw,
  Download,
  Clock,
  Lightbulb,
  BookOpen,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STANDARD_BUDGETS, CONNECTOR_LOSS } from './FiberConstants';

const STEPS = [
  { id: 'setup', title: 'Test Setup', icon: Cable },
  { id: 'reference', title: 'Set Reference', icon: Zap },
  { id: 'measure_ab', title: 'Measure A→B', icon: ArrowRight },
  { id: 'measure_ba', title: 'Measure B→A', icon: ArrowLeft },
  { id: 'results', title: 'Results', icon: CheckCircle2 },
];

const REFERENCE_WARMUP_TIME = 5 * 60; // 5 minutes in seconds

export default function OLTSWizard({ onSaveReport }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [testData, setTestData] = useState({
    cableId: '',
    fiberNumber: '',
    wavelength: '1310nm',
    standard: '10GBASE-LR',
    testMethod: 'method_b',
    referenceSet: false,
    referenceTime: null,
    measurementAB: '',
    measurementBA: '',
    notes: ''
  });
  const [warmupRemaining, setWarmupRemaining] = useState(0);
  const [warmupStarted, setWarmupStarted] = useState(false);
  const [referenceChecklist, setReferenceChecklist] = useState({
    source_warmed: false,
    reference_cables_clean: false,
    adapters_clean: false,
    reference_zeroed: false
  });

  // Warmup timer
  useEffect(() => {
    let interval;
    if (warmupStarted && warmupRemaining > 0) {
      interval = setInterval(() => {
        setWarmupRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [warmupStarted, warmupRemaining]);

  const startWarmup = () => {
    setWarmupRemaining(REFERENCE_WARMUP_TIME);
    setWarmupStarted(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canProceedFromReference = () => {
    return Object.values(referenceChecklist).every(v => v) && 
           (warmupRemaining === 0 || !warmupStarted);
  };

  const selectedStandard = STANDARD_BUDGETS[testData.standard];
  
  const calculateResults = () => {
    const ab = parseFloat(testData.measurementAB) || 0;
    const ba = parseFloat(testData.measurementBA) || 0;
    const average = (ab + ba) / 2;
    const budget = selectedStandard?.maxLoss || 6.2;
    const margin = budget - average;
    const status = margin >= 3 ? 'pass' : margin >= 0 ? 'marginal' : 'fail';
    const difference = Math.abs(ab - ba);
    
    return {
      ab,
      ba,
      average: average.toFixed(2),
      budget,
      margin: margin.toFixed(2),
      status,
      difference: difference.toFixed(2),
      bidirectionalOK: difference <= 0.5
    };
  };

  const results = calculateResults();

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'setup':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cable/Link ID</Label>
                <Input
                  placeholder="e.g., MDF-IDF-01"
                  value={testData.cableId}
                  onChange={(e) => setTestData({...testData, cableId: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Fiber Number</Label>
                <Input
                  placeholder="e.g., F1, Strand 12"
                  value={testData.fiberNumber}
                  onChange={(e) => setTestData({...testData, fiberNumber: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Wavelength</Label>
                <Select 
                  value={testData.wavelength} 
                  onValueChange={(v) => setTestData({...testData, wavelength: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="850nm">850nm (Multimode)</SelectItem>
                    <SelectItem value="1300nm">1300nm (Multimode)</SelectItem>
                    <SelectItem value="1310nm">1310nm (Singlemode)</SelectItem>
                    <SelectItem value="1550nm">1550nm (Singlemode)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Application Standard</Label>
                <Select 
                  value={testData.standard} 
                  onValueChange={(v) => setTestData({...testData, standard: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(STANDARD_BUDGETS).map(std => (
                      <SelectItem key={std} value={std}>{std}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Test Method B (One Jumper Reference)</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This wizard uses TIA Method B which measures connector loss at both ends. 
                    Set reference with one test jumper, then measure with jumper at launch end only.
                  </p>
                </div>
              </div>
            </div>

            {selectedStandard && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h4 className="font-medium mb-2">Selected Standard: {testData.standard}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Max Loss Budget:</span> <strong>{selectedStandard.maxLoss} dB</strong></div>
                  <div><span className="text-gray-500">Wavelength:</span> {selectedStandard.wavelength}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'reference':
        return (
          <div className="space-y-6">
            {/* Warmup Timer */}
            <Card className={`border-2 ${warmupRemaining > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : warmupStarted ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer className={`h-6 w-6 ${warmupRemaining > 0 ? 'text-amber-600 animate-pulse' : warmupStarted ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <div>
                      <h4 className="font-medium">Light Source Warmup</h4>
                      <p className="text-sm text-gray-500">Required 5 minutes per TIA-526-14-C</p>
                    </div>
                  </div>
                  {!warmupStarted ? (
                    <Button onClick={startWarmup}>
                      <Clock className="h-4 w-4 mr-2" />
                      Start Timer
                    </Button>
                  ) : warmupRemaining > 0 ? (
                    <div className="text-2xl font-mono font-bold text-amber-600">
                      {formatTime(warmupRemaining)}
                    </div>
                  ) : (
                    <Badge className="bg-emerald-500">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Ready
                    </Badge>
                  )}
                </div>
                {warmupStarted && warmupRemaining > 0 && (
                  <Progress value={((REFERENCE_WARMUP_TIME - warmupRemaining) / REFERENCE_WARMUP_TIME) * 100} className="mt-3" />
                )}
              </CardContent>
            </Card>

            {/* Reference Checklist */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Reference Setup Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: 'source_warmed', label: 'Light source warmed up (5 min minimum)' },
                  { id: 'reference_cables_clean', label: 'Reference cables inspected and cleaned' },
                  { id: 'adapters_clean', label: 'Test adapters inspected and cleaned' },
                  { id: 'reference_zeroed', label: 'Reference set (0.00 dB on power meter)' },
                ].map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Checkbox
                      id={item.id}
                      checked={referenceChecklist[item.id]}
                      onCheckedChange={(checked) => 
                        setReferenceChecklist({...referenceChecklist, [item.id]: checked})
                      }
                    />
                    <Label htmlFor={item.id} className="cursor-pointer">{item.label}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Method B Instructions */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Method B Reference Procedure:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
                    <span>Connect one reference jumper from light source to power meter</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
                    <span>Set power meter reference to 0.00 dB</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
                    <span>Disconnect from power meter (leave attached to source)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">4</span>
                    <span>Connect reference jumper to near end of link under test</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        );

      case 'measure_ab':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <ArrowRight className="h-8 w-8" />
                <div>
                  <h3 className="text-xl font-bold">Measure A → B</h3>
                  <p className="text-blue-100">Light source at END A, power meter at END B</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-blue-100">Measured Loss (dB)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.45"
                    value={testData.measurementAB}
                    onChange={(e) => setTestData({...testData, measurementAB: e.target.value})}
                    className="mt-2 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-2xl font-mono"
                  />
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Measurement Instructions:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center">1</span>
                    <span>Position light source at END A with reference jumper attached</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center">2</span>
                    <span>Connect power meter directly to END B of link</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center">3</span>
                    <span>Record the loss value shown on power meter</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        );

      case 'measure_ba':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <ArrowLeft className="h-8 w-8" />
                <div>
                  <h3 className="text-xl font-bold">Measure B → A</h3>
                  <p className="text-purple-100">Light source at END B, power meter at END A</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-purple-100">Measured Loss (dB)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.52"
                    value={testData.measurementBA}
                    onChange={(e) => setTestData({...testData, measurementBA: e.target.value})}
                    className="mt-2 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-2xl font-mono"
                  />
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Swap Equipment:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center">1</span>
                    <span>Move light source + reference jumper to END B</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center">2</span>
                    <span>Move power meter to END A</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center">3</span>
                    <span>Record the loss value shown</span>
                  </li>
                </ol>
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <span>Bidirectional measurements should be within 0.5 dB of each other. Larger differences indicate a problem.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'results':
        return (
          <div className="space-y-6">
            {/* Main Result Card */}
            <Card className={`border-0 shadow-xl ${
              results.status === 'pass' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              results.status === 'marginal' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
              'bg-gradient-to-br from-red-500 to-rose-600'
            } text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium opacity-90">Test Result</span>
                  {results.status === 'pass' ? <CheckCircle2 className="h-8 w-8" /> :
                   results.status === 'marginal' ? <AlertTriangle className="h-8 w-8" /> :
                   <XCircle className="h-8 w-8" />}
                </div>
                <div className="text-5xl font-bold mb-2">
                  {results.status.toUpperCase()}
                </div>
                <div className="text-xl opacity-90">
                  Average Loss: {results.average} dB
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                    A → B Measurement
                  </h4>
                  <div className="text-3xl font-mono font-bold text-blue-600">
                    {results.ab.toFixed(2)} dB
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4 text-purple-600" />
                    B → A Measurement
                  </h4>
                  <div className="text-3xl font-mono font-bold text-purple-600">
                    {results.ba.toFixed(2)} dB
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Bidirectional Average</span>
                  <span className="font-mono font-bold">{results.average} dB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Budget ({testData.standard})</span>
                  <span className="font-mono">{results.budget} dB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span>Margin Remaining</span>
                  <span className={`font-mono font-bold ${parseFloat(results.margin) >= 3 ? 'text-emerald-600' : parseFloat(results.margin) >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {results.margin} dB
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span>A↔B Difference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{results.difference} dB</span>
                    {results.bidirectionalOK ? (
                      <Badge className="bg-emerald-500">OK</Badge>
                    ) : (
                      <Badge className="bg-amber-500">Check Link</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {!results.bidirectionalOK && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Bidirectional Variance Warning</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Difference of {results.difference} dB exceeds 0.5 dB threshold. This may indicate:
                      a dirty connector, macrobend, or connector mismatch. Inspect and clean all connectors.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">OLTS Tier-1 Test Wizard</h2>
          <p className="text-sm text-gray-500">Method B - Bidirectional with reference timer</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => index < currentStep && setCurrentStep(index)}
              className={`flex flex-col items-center gap-1 min-w-[80px] ${
                index <= currentStep ? 'text-emerald-600' : 'text-gray-400'
              }`}
              disabled={index > currentStep}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                index < currentStep ? 'bg-emerald-500 text-white' :
                index === currentStep ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 ring-2 ring-emerald-500' :
                'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}>
                {index < currentStep ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className="text-xs font-medium">{step.title}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={currentStep === 1 && !canProceedFromReference()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentStep(0)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Test
            </Button>
            <Button 
              className="bg-gradient-to-r from-emerald-600 to-teal-600"
              onClick={() => onSaveReport && onSaveReport({
                type: 'olts',
                data: { ...testData, results }
              })}
            >
              <Download className="h-4 w-4 mr-2" />
              Save Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}