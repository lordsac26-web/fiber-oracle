import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  Cable,
  Zap,
  Target,
  FileText,
  Plus,
  Trash2,
  ArrowRightLeft,
  Info,
  RotateCcw
} from 'lucide-react';

// OTDR Event Types
const EVENT_TYPES = {
  connector: { label: 'Connector', icon: '🔌', maxLoss: 0.50, maxReflectance: -35 },
  fusion_splice: { label: 'Fusion Splice', icon: '⚡', maxLoss: 0.10, maxReflectance: -60 },
  mechanical_splice: { label: 'Mechanical Splice', icon: '🔧', maxLoss: 0.30, maxReflectance: -40 },
  macrobend: { label: 'Macrobend', icon: '↩️', maxLoss: 0.50, maxReflectance: null },
  end_of_fiber: { label: 'End of Fiber', icon: '🔴', maxLoss: null, maxReflectance: -14 },
  break: { label: 'Break/Fault', icon: '💥', maxLoss: null, maxReflectance: -14 }
};

// Pulse width recommendations
const PULSE_WIDTHS = [
  { value: '5ns', range: '0-2km', resolution: 'Highest', deadZone: '~1m' },
  { value: '10ns', range: '0-5km', resolution: 'High', deadZone: '~2m' },
  { value: '30ns', range: '2-15km', resolution: 'Medium', deadZone: '~5m' },
  { value: '100ns', range: '5-40km', resolution: 'Low', deadZone: '~15m' },
  { value: '275ns', range: '20-80km', resolution: 'Very Low', deadZone: '~40m' },
  { value: '1μs', range: '40-160km', resolution: 'Lowest', deadZone: '~150m' }
];

// Steps definition
const STEPS = [
  { id: 'setup', label: 'Setup', icon: Settings },
  { id: 'launch', label: 'Launch Fiber', icon: Cable },
  { id: 'trace_ab', label: 'Trace A→B', icon: Zap },
  { id: 'trace_ba', label: 'Trace B→A', icon: Zap },
  { id: 'events', label: 'Events', icon: Target },
  { id: 'results', label: 'Results', icon: FileText }
];

export default function OTDRWizard({ onSaveReport }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [testData, setTestData] = useState({
    // Setup
    cableId: '',
    fiberNumber: '',
    fiberType: 'SMF',
    wavelength: '1310nm',
    pulseWidth: '30ns',
    range: '10',
    launchFiberLength: '150',
    receiveFiberLength: '150',
    // Trace data
    traceAB: {
      totalLength: '',
      totalLoss: '',
      avgAttenuation: ''
    },
    traceBA: {
      totalLength: '',
      totalLoss: '',
      avgAttenuation: ''
    },
    // Events (will be populated)
    events: []
  });

  const [launchChecklist, setLaunchChecklist] = useState({
    launchConnected: false,
    receiveConnected: false,
    connectorsClean: false,
    launchVerified: false
  });

  const [newEvent, setNewEvent] = useState({
    type: 'connector',
    distance: '',
    lossAB: '',
    lossBA: '',
    reflectance: '',
    notes: ''
  });

  // Calculate averages and results
  const calculations = useMemo(() => {
    const events = testData.events.map(event => {
      const avgLoss = (parseFloat(event.lossAB || 0) + parseFloat(event.lossBA || 0)) / 2;
      const eventSpec = EVENT_TYPES[event.type];
      let status = 'pass';
      
      if (eventSpec.maxLoss && avgLoss > eventSpec.maxLoss) {
        status = avgLoss > eventSpec.maxLoss * 1.5 ? 'fail' : 'marginal';
      }
      if (eventSpec.maxReflectance && event.reflectance) {
        const refl = parseFloat(event.reflectance);
        if (refl > eventSpec.maxReflectance) {
          status = 'fail';
        }
      }
      
      return { ...event, avgLoss, status };
    });

    const totalEventsLoss = events.reduce((sum, e) => sum + (e.avgLoss || 0), 0);
    const failedEvents = events.filter(e => e.status === 'fail').length;
    const marginalEvents = events.filter(e => e.status === 'marginal').length;
    
    const avgLength = (parseFloat(testData.traceAB.totalLength || 0) + parseFloat(testData.traceBA.totalLength || 0)) / 2;
    const avgTotalLoss = (parseFloat(testData.traceAB.totalLoss || 0) + parseFloat(testData.traceBA.totalLoss || 0)) / 2;
    
    let overallStatus = 'pass';
    if (failedEvents > 0) overallStatus = 'fail';
    else if (marginalEvents > 0) overallStatus = 'marginal';

    return {
      events,
      totalEventsLoss: totalEventsLoss.toFixed(2),
      avgLength: avgLength.toFixed(1),
      avgTotalLoss: avgTotalLoss.toFixed(2),
      failedEvents,
      marginalEvents,
      passedEvents: events.length - failedEvents - marginalEvents,
      overallStatus
    };
  }, [testData]);

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Setup
        return testData.fiberType && testData.wavelength && testData.pulseWidth;
      case 1: // Launch
        return Object.values(launchChecklist).every(v => v);
      case 2: // Trace A→B
        return testData.traceAB.totalLength && testData.traceAB.totalLoss;
      case 3: // Trace B→A
        return testData.traceBA.totalLength && testData.traceBA.totalLoss;
      case 4: // Events
        return true; // Can proceed even with no events
      default:
        return true;
    }
  };

  const addEvent = () => {
    if (!newEvent.distance) return;
    setTestData(prev => ({
      ...prev,
      events: [...prev.events, { ...newEvent, id: Date.now() }]
    }));
    setNewEvent({
      type: 'connector',
      distance: '',
      lossAB: '',
      lossBA: '',
      reflectance: '',
      notes: ''
    });
  };

  const removeEvent = (id) => {
    setTestData(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== id)
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'bg-emerald-500 text-white';
      case 'marginal': return 'bg-amber-500 text-white';
      case 'fail': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Setup
        return (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Test Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cable ID</Label>
                    <Input
                      placeholder="e.g., FO-001"
                      value={testData.cableId}
                      onChange={(e) => setTestData({...testData, cableId: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fiber Number</Label>
                    <Input
                      placeholder="e.g., 1"
                      value={testData.fiberNumber}
                      onChange={(e) => setTestData({...testData, fiberNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fiber Type</Label>
                    <Select value={testData.fiberType} onValueChange={(v) => setTestData({...testData, fiberType: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMF">OS2 Single-Mode</SelectItem>
                        <SelectItem value="G.657">G.657 Bend-Insensitive</SelectItem>
                        <SelectItem value="OM3">OM3 Multimode</SelectItem>
                        <SelectItem value="OM4">OM4 Multimode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Wavelength</Label>
                    <Select value={testData.wavelength} onValueChange={(v) => setTestData({...testData, wavelength: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {testData.fiberType.includes('OM') ? (
                          <>
                            <SelectItem value="850nm">850nm</SelectItem>
                            <SelectItem value="1300nm">1300nm</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="1310nm">1310nm</SelectItem>
                            <SelectItem value="1550nm">1550nm</SelectItem>
                            <SelectItem value="1625nm">1625nm</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pulse Width</Label>
                    <Select value={testData.pulseWidth} onValueChange={(v) => setTestData({...testData, pulseWidth: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PULSE_WIDTHS.map(pw => (
                          <SelectItem key={pw.value} value={pw.value}>
                            {pw.value} ({pw.range})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Range (km)</Label>
                    <Input
                      type="number"
                      value={testData.range}
                      onChange={(e) => setTestData({...testData, range: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pulse Width Reference */}
            <Card className="border-0 shadow-lg bg-blue-50 dark:bg-blue-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Pulse Width Selection Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {PULSE_WIDTHS.map(pw => (
                    <div 
                      key={pw.value} 
                      className={`p-2 rounded-lg ${testData.pulseWidth === pw.value ? 'bg-blue-200 dark:bg-blue-800' : 'bg-white dark:bg-gray-800'}`}
                    >
                      <div className="font-semibold">{pw.value}</div>
                      <div className="text-gray-500">Range: {pw.range}</div>
                      <div className="text-gray-500">Dead Zone: {pw.deadZone}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 1: // Launch Fiber
        return (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Launch & Receive Fiber Setup</CardTitle>
                <p className="text-sm text-gray-500">
                  Launch and receive fibers allow the OTDR to characterize the first and last connectors of the link under test.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Launch Fiber Length (m)</Label>
                    <Input
                      type="number"
                      placeholder="150"
                      value={testData.launchFiberLength}
                      onChange={(e) => setTestData({...testData, launchFiberLength: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Receive Fiber Length (m)</Label>
                    <Input
                      type="number"
                      placeholder="150"
                      value={testData.receiveFiberLength}
                      onChange={(e) => setTestData({...testData, receiveFiberLength: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                  <strong>Recommended:</strong> Use launch/receive fibers at least 150m long to ensure the first connector is beyond the OTDR's dead zone.
                </div>

                <div className="space-y-3 pt-4">
                  <h4 className="font-medium">Pre-Test Checklist</h4>
                  
                  {[
                    { key: 'connectorsClean', label: 'All connectors inspected and cleaned (IEC 61300-3-35)' },
                    { key: 'launchConnected', label: 'Launch fiber connected to OTDR and first connector of link' },
                    { key: 'receiveConnected', label: 'Receive fiber connected to far end of link' },
                    { key: 'launchVerified', label: 'Launch fiber verified good (no defects in trace)' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Checkbox
                        checked={launchChecklist[item.key]}
                        onCheckedChange={(checked) => setLaunchChecklist({...launchChecklist, [item.key]: checked})}
                      />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Visual Diagram */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="px-3 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg font-medium">OTDR</div>
                  <div className="w-16 h-1 bg-blue-400"></div>
                  <div className="px-2 py-1 bg-blue-50 dark:bg-blue-950 rounded text-xs">Launch<br/>{testData.launchFiberLength}m</div>
                  <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600"></div>
                  <div className="flex-1 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 relative">
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-gray-500">Link Under Test</span>
                  </div>
                  <div className="w-4 h-4 rounded-full bg-yellow-400 border-2 border-yellow-600"></div>
                  <div className="px-2 py-1 bg-blue-50 dark:bg-blue-950 rounded text-xs">Receive<br/>{testData.receiveFiberLength}m</div>
                </div>
                <div className="text-center text-xs text-gray-500 mt-4">
                  Yellow circles = connectors being tested
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2: // Trace A→B
      case 3: // Trace B→A
        const direction = currentStep === 2 ? 'AB' : 'BA';
        const traceKey = currentStep === 2 ? 'traceAB' : 'traceBA';
        const traceData = testData[traceKey];
        
        return (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  {currentStep === 2 ? 'Trace A → B (Forward)' : 'Trace B → A (Reverse)'}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {currentStep === 2 
                    ? 'Run OTDR from the A-end (near end) towards B-end (far end)'
                    : 'Swap OTDR to B-end and run trace back towards A-end'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <h4 className="font-medium mb-2">Run the OTDR trace now</h4>
                  <ol className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                    <li>1. Verify settings: {testData.wavelength}, {testData.pulseWidth}, {testData.range}km range</li>
                    <li>2. Start acquisition and wait for trace to complete</li>
                    <li>3. Verify trace quality (clean backscatter, visible events)</li>
                    <li>4. Record the values below from OTDR display</li>
                  </ol>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Length (km)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="e.g., 2.456"
                      value={traceData.totalLength}
                      onChange={(e) => setTestData({
                        ...testData,
                        [traceKey]: {...traceData, totalLength: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Loss (dB)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1.85"
                      value={traceData.totalLoss}
                      onChange={(e) => setTestData({
                        ...testData,
                        [traceKey]: {...traceData, totalLoss: e.target.value}
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avg Attenuation (dB/km)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="e.g., 0.35"
                      value={traceData.avgAttenuation}
                      onChange={(e) => setTestData({
                        ...testData,
                        [traceKey]: {...traceData, avgAttenuation: e.target.value}
                      })}
                    />
                  </div>
                </div>

                {currentStep === 3 && testData.traceAB.totalLength && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-gray-500">A→B Length:</span>
                        <span className="ml-2 font-mono">{testData.traceAB.totalLength} km</span>
                      </div>
                      <div>
                        <span className="text-gray-500">A→B Loss:</span>
                        <span className="ml-2 font-mono">{testData.traceAB.totalLoss} dB</span>
                      </div>
                      <div>
                        <span className="text-gray-500">A→B Atten:</span>
                        <span className="ml-2 font-mono">{testData.traceAB.avgAttenuation} dB/km</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 4: // Events
        return (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Event Table</CardTitle>
                <p className="text-sm text-gray-500">
                  Enter each event detected on the OTDR trace with loss values from both directions.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Event Form */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm">Add Event</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    <Select value={newEvent.type} onValueChange={(v) => setNewEvent({...newEvent, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EVENT_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Distance (km)"
                      value={newEvent.distance}
                      onChange={(e) => setNewEvent({...newEvent, distance: e.target.value})}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Loss A→B (dB)"
                      value={newEvent.lossAB}
                      onChange={(e) => setNewEvent({...newEvent, lossAB: e.target.value})}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Loss B→A (dB)"
                      value={newEvent.lossBA}
                      onChange={(e) => setNewEvent({...newEvent, lossBA: e.target.value})}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Refl (dB)"
                      value={newEvent.reflectance}
                      onChange={(e) => setNewEvent({...newEvent, reflectance: e.target.value})}
                    />
                    <Button onClick={addEvent} disabled={!newEvent.distance}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Events List */}
                {testData.events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No events added yet. Add events from your OTDR trace above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500 px-2">
                      <span>Type</span>
                      <span>Distance</span>
                      <span>Loss A→B</span>
                      <span>Loss B→A</span>
                      <span>Avg Loss</span>
                      <span>Reflectance</span>
                      <span>Status</span>
                    </div>
                    {calculations.events.map((event) => (
                      <div 
                        key={event.id} 
                        className={`grid grid-cols-7 gap-2 items-center p-2 rounded-lg text-sm ${
                          event.status === 'fail' ? 'bg-red-50 dark:bg-red-900/20' :
                          event.status === 'marginal' ? 'bg-amber-50 dark:bg-amber-900/20' :
                          'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <span>{EVENT_TYPES[event.type]?.icon} {EVENT_TYPES[event.type]?.label}</span>
                        <span className="font-mono">{event.distance} km</span>
                        <span className="font-mono">{event.lossAB || '-'} dB</span>
                        <span className="font-mono">{event.lossBA || '-'} dB</span>
                        <span className="font-mono font-semibold">{event.avgLoss?.toFixed(2)} dB</span>
                        <span className="font-mono">{event.reflectance || '-'} dB</span>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(event.status)}>
                            {event.status.toUpperCase()}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEvent(event.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Event Thresholds Reference */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Event Thresholds (TIA-568-D)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><strong>Connector:</strong> ≤0.50 dB, &lt;-35 dB refl</div>
                    <div><strong>Fusion Splice:</strong> ≤0.10 dB</div>
                    <div><strong>Mech Splice:</strong> ≤0.30 dB, &lt;-40 dB refl</div>
                    <div><strong>Macrobend:</strong> ≤0.50 dB (investigate)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5: // Results
        return (
          <div className="space-y-6">
            {/* Overall Status */}
            <Card className={`border-0 shadow-xl ${getStatusColor(calculations.overallStatus)}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg opacity-90">OTDR Tier-2 Test Result</div>
                    <div className="text-4xl font-bold mt-1">
                      {calculations.overallStatus.toUpperCase()}
                    </div>
                  </div>
                  {getStatusIcon(calculations.overallStatus)}
                </div>
              </CardContent>
            </Card>

            {/* Summary Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{calculations.avgLength}</div>
                  <div className="text-sm text-gray-500">Total Length (km)</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{calculations.avgTotalLoss}</div>
                  <div className="text-sm text-gray-500">Total Loss (dB avg)</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-600">{calculations.events.length}</div>
                  <div className="text-sm text-gray-500">Events Characterized</div>
                </CardContent>
              </Card>
            </div>

            {/* Event Summary */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Event Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-600">{calculations.passedEvents}</div>
                    <div className="text-sm text-gray-500">Passed</div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-600">{calculations.marginalEvents}</div>
                    <div className="text-sm text-gray-500">Marginal</div>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{calculations.failedEvents}</div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </div>
                </div>

                {calculations.events.length > 0 && (
                  <div className="space-y-2">
                    {calculations.events.map((event) => (
                      <div 
                        key={event.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          event.status === 'fail' ? 'bg-red-50 dark:bg-red-900/20' :
                          event.status === 'marginal' ? 'bg-amber-50 dark:bg-amber-900/20' :
                          'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span>{EVENT_TYPES[event.type]?.icon}</span>
                          <div>
                            <div className="font-medium">{EVENT_TYPES[event.type]?.label}</div>
                            <div className="text-xs text-gray-500">{event.distance} km</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-semibold">{event.avgLoss?.toFixed(2)} dB</div>
                          <Badge className={getStatusColor(event.status)} variant="outline">
                            {event.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trace Comparison */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Bidirectional Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-3">A → B Trace</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Length:</span>
                        <span className="font-mono">{testData.traceAB.totalLength} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Loss:</span>
                        <span className="font-mono">{testData.traceAB.totalLoss} dB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Attenuation:</span>
                        <span className="font-mono">{testData.traceAB.avgAttenuation} dB/km</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-3">B → A Trace</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Length:</span>
                        <span className="font-mono">{testData.traceBA.totalLength} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Loss:</span>
                        <span className="font-mono">{testData.traceBA.totalLoss} dB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Attenuation:</span>
                        <span className="font-mono">{testData.traceBA.avgAttenuation} dB/km</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Info */}
            <Card className="border-0 shadow-lg bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Cable ID:</span>
                    <span className="ml-2 font-medium">{testData.cableId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fiber:</span>
                    <span className="ml-2 font-medium">{testData.fiberNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium">{testData.fiberType}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Wavelength:</span>
                    <span className="ml-2 font-medium">{testData.wavelength}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
              onClick={() => onSaveReport && onSaveReport({
                type: 'otdr',
                data: { ...testData, calculations }
              })}
            >
              Save OTDR Report
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">OTDR Tier-2 Wizard</h2>
            <p className="text-sm text-gray-500">Bidirectional trace analysis</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setCurrentStep(0);
          setTestData({
            cableId: '', fiberNumber: '', fiberType: 'SMF', wavelength: '1310nm',
            pulseWidth: '30ns', range: '10', launchFiberLength: '150', receiveFiberLength: '150',
            traceAB: { totalLength: '', totalLoss: '', avgAttenuation: '' },
            traceBA: { totalLength: '', totalLoss: '', avgAttenuation: '' },
            events: []
          });
          setLaunchChecklist({ launchConnected: false, receiveConnected: false, connectorsClean: false, launchVerified: false });
        }}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div 
              className={`flex flex-col items-center cursor-pointer ${index <= currentStep ? 'text-indigo-600' : 'text-gray-400'}`}
              onClick={() => index < currentStep && setCurrentStep(index)}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                index < currentStep ? 'bg-indigo-600 text-white' :
                index === currentStep ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {index < currentStep ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className="text-xs mt-1 hidden md:block">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded ${index < currentStep ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
            onClick={() => onSaveReport && onSaveReport({
              type: 'otdr',
              data: { ...testData, calculations }
            })}
          >
            Complete Test
          </Button>
        )}
      </div>
    </div>
  );
}