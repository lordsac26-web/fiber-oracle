import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Upload, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileSearch,
  Activity,
  Target,
  Wrench,
  Info,
  Loader2,
  FlaskConical,
  HelpCircle,
  BookOpen,
  MapPin,
  FileType,
  MessageSquare,
  BarChart3,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import TraceVisualization from '@/components/otdr/TraceVisualization';
import FeedbackPanel from '@/components/otdr/FeedbackPanel';

const WIZARD_STEPS = [
  { id: 'intro', title: 'Introduction', icon: Info },
  { id: 'input', title: 'Input Data', icon: Upload },
  { id: 'events', title: 'Event Details', icon: Activity },
  { id: 'analysis', title: 'AI Analysis', icon: Zap },
  { id: 'results', title: 'Results & Actions', icon: Target },
];

const FIBER_TYPES = [
  { value: 'smf_g652', label: 'SMF G.652.D (Standard)' },
  { value: 'smf_g657a1', label: 'SMF G.657.A1 (Bend-tolerant)' },
  { value: 'smf_g657a2', label: 'SMF G.657.A2 (Enhanced bend)' },
  { value: 'smf_g657b3', label: 'SMF G.657.B3 (Extreme bend)' },
  { value: 'mmf_om3', label: 'MMF OM3' },
  { value: 'mmf_om4', label: 'MMF OM4' },
];

const WAVELENGTHS = [
  { value: '1310', label: '1310 nm' },
  { value: '1550', label: '1550 nm' },
  { value: '1625', label: '1625 nm (Live fiber)' },
  { value: '1490', label: '1490 nm (GPON DS)' },
  { value: '1577', label: '1577 nm (XGS-PON DS)' },
  { value: '850', label: '850 nm (MMF)' },
];

const OTDR_BRANDS = [
  { value: 'viavi', label: 'VIAVI / JDSU' },
  { value: 'exfo', label: 'EXFO' },
  { value: 'fluke', label: 'Fluke Networks' },
  { value: 'afl', label: 'AFL / Noyes' },
  { value: 'anritsu', label: 'Anritsu' },
  { value: 'yokogawa', label: 'Yokogawa' },
  { value: 'other', label: 'Other' },
];

export default function OTDRAnalysis() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedEventForFeedback, setSelectedEventForFeedback] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [sorFileData, setSorFileData] = useState(null);
  
  // Form data
  const [traceData, setTraceData] = useState({
    inputMethod: 'manual', // 'manual', 'upload', or 'sor'
    uploadedFile: null,
    fileUrl: null,
    
    // Test setup
    otdrBrand: '',
    fiberType: 'smf_g652',
    wavelength: '1310',
    pulseWidth: '',
    totalLength: '',
    totalLoss: '',
    
    // Events (manual entry)
    events: [
      { distance: '', loss: '', reflectance: '', type: 'unknown', notes: '' }
    ],
    
    // Additional context
    additionalNotes: '',
    symptom: '',
  });

  const updateTraceData = (field, value) => {
    setTraceData(prev => ({ ...prev, [field]: value }));
  };

  const addEvent = () => {
    setTraceData(prev => ({
      ...prev,
      events: [...prev.events, { distance: '', loss: '', reflectance: '', type: 'unknown', notes: '' }]
    }));
  };

  const updateEvent = (index, field, value) => {
    setTraceData(prev => {
      const newEvents = [...prev.events];
      newEvents[index] = { ...newEvents[index], [field]: value };
      return { ...prev, events: newEvents };
    });
  };

  const removeEvent = (index) => {
    setTraceData(prev => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const isSorFile = file.name.toLowerCase().endsWith('.sor');
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateTraceData('uploadedFile', file.name);
      updateTraceData('fileUrl', file_url);
      
      if (isSorFile) {
        updateTraceData('inputMethod', 'sor');
        setSorFileData({ fileName: file.name, url: file_url });
        toast.success('.SOR file uploaded - AI will extract trace data');
      } else {
        toast.success('File uploaded successfully');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  const handleEventClick = (event, index, analysis) => {
    setSelectedEventForFeedback(analysis);
  };

  const handleFeedbackSubmit = (feedback) => {
    setFeedbackHistory(prev => [...prev, feedback]);
    // In a real implementation, this would be sent to a database for model improvement
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Pre-calculate expected values for faster AI context
    const fiberAttenuation = {
      'smf_g652': { '1310': 0.35, '1550': 0.25, '1625': 0.25 },
      'smf_g657a1': { '1310': 0.35, '1550': 0.25, '1625': 0.25 },
      'smf_g657a2': { '1310': 0.35, '1550': 0.25, '1625': 0.25 },
      'smf_g657b3': { '1310': 0.35, '1550': 0.25, '1625': 0.25 },
      'mmf_om3': { '850': 3.0, '1300': 1.0 },
      'mmf_om4': { '850': 3.0, '1300': 1.0 },
    };
    
    const expectedAtten = fiberAttenuation[traceData.fiberType]?.[traceData.wavelength] || 0.35;
    const totalLength = parseFloat(traceData.totalLength) || 0;
    const totalLoss = parseFloat(traceData.totalLoss) || 0;
    const expectedFiberLoss = totalLength * expectedAtten;
    const excessLoss = totalLoss - expectedFiberLoss;
    
    // Format events concisely for faster processing
    const eventsFormatted = traceData.events
      .filter(e => e.distance || e.loss || e.reflectance)
      .map((e, i) => `E${i+1}:${e.distance}m/${e.loss}dB/${e.reflectance}dB/${e.type}${e.notes ? '/' + e.notes : ''}`)
      .join('|');
    
    try {
      const prompt = `EXPERT OTDR FIBER ANALYST - Analyze trace data against TIA-568-D/IEC 61300/ITU-T standards.

=== QUICK REFERENCE THRESHOLDS ===
Attenuation: SMF 0.35dB/km@1310, 0.25dB/km@1550 | MMF 3.0dB/km@850
Connectors: Elite≤0.15dB, Standard≤0.50dB | Reflectance: UPC<-50dB, APC<-60dB, Dirty>-35dB
Splices: Fusion≤0.10dB, Mechanical≤0.30dB

=== IMPAIRMENT SIGNATURES (KEY DIFFERENTIATORS) ===
MACROBEND: Non-reflective, 1550nm loss >>1310nm loss (ratio>2:1), localized
MICROBEND: Non-reflective, slight wavelength sensitivity, often distributed over distance
DIRTY CONNECTOR: Reflectance >-35dB WITH loss 0.3-1.5dB, localized
CRACKED CONNECTOR: Very high reflectance >-20dB, high loss >1dB
POOR FUSION SPLICE: Non-reflective, 0.1-0.3dB, may show "gainer" in reverse direction
MECHANICAL SPLICE: Non-reflective OR slight reflectance, 0.2-0.5dB typical
GHOST EVENT: Distance = 2× real reflective event distance, no physical cause
FIBER BREAK: Very high reflectance spike, total signal loss after

=== TRACE DATA ===
OTDR: ${traceData.otdrBrand || 'Unknown'} | Fiber: ${traceData.fiberType} | λ: ${traceData.wavelength}nm | Pulse: ${traceData.pulseWidth || 'N/A'}ns
Length: ${totalLength}km | Total Loss: ${totalLoss}dB | Expected Fiber Loss: ${expectedFiberLoss.toFixed(2)}dB | Excess: ${excessLoss.toFixed(2)}dB

EVENTS: ${eventsFormatted || 'None entered'}

SYMPTOM: ${traceData.symptom || 'None'} | NOTES: ${traceData.additionalNotes || 'None'}
${sorFileData ? `\nSOR FILE: ${sorFileData.fileName} - Extract all event data from this standard OTDR file.` : ''}

=== ANALYSIS REQUIREMENTS ===
1. Status: pass (within spec) / marginal (within 1dB of limit) / fail (exceeds spec)
2. Per-event: Identify type, severity, confidence% (based on how well data matches signature), distinguish similar impairments
3. Ghost detection: Flag any event at 2× distance of reflective event
4. Actions: Prioritize by dB improvement potential
5. Be CONCISE but ACCURATE`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: traceData.fileUrl ? [traceData.fileUrl] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["pass", "marginal", "fail"] },
                summary: { type: "string" },
                total_excess_loss: { type: "number" },
                standards_compliance: { type: "string" },
                overall_confidence: { type: "number" },
                calculated_fiber_loss: { type: "number" },
                calculated_event_loss: { type: "number" }
              }
            },
            events_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event_number: { type: "number" },
                  distance: { type: "string" },
                  measured_loss: { type: "number" },
                  measured_reflectance: { type: "number" },
                  identified_type: { type: "string" },
                  impairment_category: { type: "string", enum: ["connector", "splice", "macrobend", "microbend", "break", "end", "splitter", "ghost", "unknown"] },
                  severity: { type: "string", enum: ["critical", "warning", "info", "ok"] },
                  confidence_score: { type: "number" },
                  description: { type: "string" },
                  distinguishing_factors: { type: "array", items: { type: "string" } },
                  differential_diagnosis: { type: "string" },
                  probable_causes: { type: "array", items: { type: "string" } },
                  troubleshooting_steps: { type: "array", items: { type: "string" } },
                  expected_improvement_db: { type: "number" },
                  is_artifact: { type: "boolean" }
                }
              }
            },
            priority_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "number" },
                  action: { type: "string" },
                  location: { type: "string" },
                  expected_improvement: { type: "string" },
                  expected_improvement_db: { type: "number" },
                  confidence: { type: "number" },
                  effort_level: { type: "string", enum: ["quick", "moderate", "significant"] }
                }
              }
            },
            tools_needed: { type: "array", items: { type: "string" } },
            additional_recommendations: { type: "array", items: { type: "string" } },
            ghost_events_detected: { type: "array", items: { type: "string" } },
            wavelength_comparison_note: { type: "string" },
            sor_file_extracted_data: {
              type: "object",
              properties: {
                total_events: { type: "number" },
                fiber_length: { type: "string" },
                test_wavelength: { type: "string" },
                average_loss: { type: "string" }
              }
            }
          }
        }
      });

      setAnalysisResult(result);
      setCurrentStep(4); // Go to results
    } catch (error) {
      toast.error('Analysis failed. Please try again.');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const goNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      if (currentStep === 3) {
        runAnalysis();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Introduction
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-xl">
                <FileSearch className="h-10 w-10 text-white" />
              </div>
              <div>
                <Badge className="bg-amber-500 mb-2">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  Beta Feature
                </Badge>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI OTDR Trace Analysis
                </h2>
                <p className="text-gray-500 mt-2 max-w-lg mx-auto">
                  Upload your OTDR trace file or manually enter event data, and our AI will analyze it against industry standards to identify impairments and guide troubleshooting.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    What This Tool Does
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Analyzes OTDR events against TIA/IEC standards</li>
                    <li>• Identifies connectors, splices, bends, and breaks</li>
                    <li>• Detects ghost events and artifacts</li>
                    <li>• Provides step-by-step troubleshooting</li>
                    <li>• Prioritizes actions by impact</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-amber-600" />
                    How to Use
                  </h3>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>1. Enter your OTDR test parameters</li>
                    <li>2. Input events from your trace (or upload)</li>
                    <li>3. Describe any symptoms you're seeing</li>
                    <li>4. Let the AI analyze and provide guidance</li>
                    <li>5. Follow the prioritized action plan</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Standards Referenced:</strong> TIA-568-D, TIA-526-14-C, IEC 61300-3-35, ITU-T G.652/G.657, and vendor-specific guidelines from VIAVI, EXFO, Fluke, and AFL.
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Input Data
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-3 md:space-y-4">
                <h3 className="font-semibold text-sm md:text-base">Test Setup</h3>
                
                <div className="space-y-2">
                  <Label>OTDR Brand/Model</Label>
                  <Select value={traceData.otdrBrand} onValueChange={(v) => updateTraceData('otdrBrand', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select OTDR brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {OTDR_BRANDS.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fiber Type</Label>
                  <Select value={traceData.fiberType} onValueChange={(v) => updateTraceData('fiberType', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIBER_TYPES.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Test Wavelength</Label>
                  <Select value={traceData.wavelength} onValueChange={(v) => updateTraceData('wavelength', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAVELENGTHS.map(w => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pulse Width (ns)</Label>
                  <Input
                    type="text"
                    placeholder="e.g., 100"
                    value={traceData.pulseWidth}
                    onChange={(e) => updateTraceData('pulseWidth', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <h3 className="font-semibold text-sm md:text-base">Link Summary</h3>
                
                <div className="space-y-2">
                  <Label>Total Fiber Length (km)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2.5"
                    value={traceData.totalLength}
                    onChange={(e) => updateTraceData('totalLength', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Link Loss (dB)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 3.5"
                    value={traceData.totalLoss}
                    onChange={(e) => updateTraceData('totalLoss', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reported Symptom (optional)</Label>
                  <Select value={traceData.symptom} onValueChange={(v) => updateTraceData('symptom', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select symptom if applicable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_signal">No signal / Total loss</SelectItem>
                      <SelectItem value="high_loss">High loss</SelectItem>
                      <SelectItem value="intermittent">Intermittent connection</SelectItem>
                      <SelectItem value="slow_speed">Slow speeds</SelectItem>
                      <SelectItem value="high_ber">High bit error rate</SelectItem>
                      <SelectItem value="routine">Routine test / No issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
                  <Label className="mb-2 block">Upload OTDR Trace</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".sor,.pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                  </div>
                  {traceData.uploadedFile && (
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {traceData.uploadedFile}
                      </p>
                      {sorFileData && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <FileType className="h-3 w-3" />
                          .SOR file detected - Full trace data will be extracted
                        </p>
                      )}
                    </div>
                  )}
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      <strong>.SOR files</strong> provide the richest data for AI analysis
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">Accepts .sor (recommended), .pdf, or image files</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Event Details
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm md:text-base">OTDR Events</h3>
                <p className="text-xs md:text-sm text-gray-500">Enter events from your OTDR trace</p>
              </div>
              <Button variant="outline" size="sm" onClick={addEvent} className="text-xs md:text-sm h-8">
                Add Event
              </Button>
            </div>

            <div className="space-y-3 md:space-y-4">
              {traceData.events.map((event, index) => (
                <Card key={index} className="border shadow-sm">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <Badge variant="outline" className="text-xs">Event {index + 1}</Badge>
                      {traceData.events.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeEvent(index)} className="text-red-500 h-7 text-xs">
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] md:text-xs">Distance (m)</Label>
                        <Input
                          type="number"
                          placeholder="150"
                          value={event.distance}
                          onChange={(e) => updateEvent(index, 'distance', e.target.value)}
                          className="h-8 md:h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] md:text-xs">Loss (dB)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.35"
                          value={event.loss}
                          onChange={(e) => updateEvent(index, 'loss', e.target.value)}
                          className="h-8 md:h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] md:text-xs">Reflectance (dB)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="-45"
                          value={event.reflectance}
                          onChange={(e) => updateEvent(index, 'reflectance', e.target.value)}
                          className="h-8 md:h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] md:text-xs">Event Type</Label>
                        <Select value={event.type} onValueChange={(v) => updateEvent(index, 'type', v)}>
                          <SelectTrigger className="h-8 md:h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unknown">Unknown</SelectItem>
                            <SelectItem value="connector">Connector</SelectItem>
                            <SelectItem value="splice">Splice</SelectItem>
                            <SelectItem value="bend">Bend/Stress</SelectItem>
                            <SelectItem value="end">End of Fiber</SelectItem>
                            <SelectItem value="anomaly">Anomaly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-2 md:mt-3">
                      <Label className="text-[10px] md:text-xs">Notes (optional)</Label>
                      <Input
                        placeholder="Any observations"
                        value={event.notes}
                        onChange={(e) => updateEvent(index, 'notes', e.target.value)}
                        className="h-8 md:h-9 text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any other observations, recent changes, or context that might help with analysis..."
                value={traceData.additionalNotes}
                onChange={(e) => updateTraceData('additionalNotes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 3: // Analysis (loading state)
        return (
          <div className="text-center space-y-6 py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Analyzing OTDR Trace...</h3>
              <p className="text-gray-500 mt-2">
                Comparing against TIA-568-D, IEC 61300-3-35, and vendor specifications
              </p>
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Parsing event data
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                Identifying impairment types
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="h-4 w-4" />
                Generating troubleshooting steps
              </div>
            </div>
          </div>
        );

      case 4: // Results
        if (!analysisResult) {
          return (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Analysis Results</h3>
              <p className="text-gray-500">Please go back and run the analysis again.</p>
            </div>
          );
        }

        const statusColors = {
          pass: 'bg-green-500',
          marginal: 'bg-amber-500',
          fail: 'bg-red-500'
        };

        const severityColors = {
          critical: 'bg-red-100 border-red-300 text-red-800',
          warning: 'bg-amber-100 border-amber-300 text-amber-800',
          info: 'bg-blue-100 border-blue-300 text-blue-800',
          ok: 'bg-green-100 border-green-300 text-green-800'
        };

        const getConfidenceColor = (score) => {
          if (score >= 85) return 'text-green-600 bg-green-100';
          if (score >= 70) return 'text-amber-600 bg-amber-100';
          return 'text-red-600 bg-red-100';
        };

        return (
          <div className="space-y-6">
            {/* Interactive Trace Visualization */}
            <TraceVisualization
              events={traceData.events}
              totalLength={traceData.totalLength}
              totalLoss={traceData.totalLoss}
              analysisResult={analysisResult}
              onEventClick={handleEventClick}
            />

            {/* Overall Assessment */}
            <Card className={`border-2 ${analysisResult.overall_assessment?.status === 'pass' ? 'border-green-300' : analysisResult.overall_assessment?.status === 'marginal' ? 'border-amber-300' : 'border-red-300'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Overall Assessment</h3>
                  <div className="flex items-center gap-2">
                    {analysisResult.overall_assessment?.overall_confidence && (
                      <Badge variant="outline" className={getConfidenceColor(analysisResult.overall_assessment.overall_confidence)}>
                        {analysisResult.overall_assessment.overall_confidence}% confidence
                      </Badge>
                    )}
                    <Badge className={statusColors[analysisResult.overall_assessment?.status] || 'bg-gray-500'}>
                      {analysisResult.overall_assessment?.status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300">{analysisResult.overall_assessment?.summary}</p>
                {analysisResult.overall_assessment?.standards_compliance && (
                  <p className="text-sm text-gray-500 mt-2">
                    <strong>Standards:</strong> {analysisResult.overall_assessment.standards_compliance}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* SOR File Extracted Data */}
            {analysisResult.sor_file_extracted_data?.total_events && (
              <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <FileType className="h-4 w-4 text-purple-600" />
                    .SOR File Data Extracted
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-gray-500 text-xs">Total Events</div>
                      <div className="font-semibold">{analysisResult.sor_file_extracted_data.total_events}</div>
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-gray-500 text-xs">Fiber Length</div>
                      <div className="font-semibold">{analysisResult.sor_file_extracted_data.fiber_length}</div>
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-gray-500 text-xs">Wavelength</div>
                      <div className="font-semibold">{analysisResult.sor_file_extracted_data.test_wavelength}</div>
                    </div>
                    <div className="p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-gray-500 text-xs">Avg Loss</div>
                      <div className="font-semibold">{analysisResult.sor_file_extracted_data.average_loss}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Priority Actions */}
            {analysisResult.priority_actions?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Priority Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysisResult.priority_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {action.priority}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{action.action}</span>
                          {action.effort_level && (
                            <Badge variant="outline" className={`text-xs ${
                              action.effort_level === 'quick' ? 'border-green-300 text-green-700' :
                              action.effort_level === 'moderate' ? 'border-amber-300 text-amber-700' :
                              'border-red-300 text-red-700'
                            }`}>
                              {action.effort_level}
                            </Badge>
                          )}
                        </div>
                        {action.location && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {action.location}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {action.expected_improvement && (
                            <div className="text-sm text-green-600">
                              Expected: {action.expected_improvement}
                            </div>
                          )}
                          {action.expected_improvement_db && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              ~{action.expected_improvement_db} dB
                            </Badge>
                          )}
                          {action.confidence && (
                            <span className="text-xs text-gray-400">{action.confidence}% confident</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Event Analysis with Tabs */}
            {analysisResult.events_analysis?.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-500" />
                        Event Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analysisResult.events_analysis.filter(e => !e.is_artifact).map((event, i) => (
                        <div 
                          key={i} 
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${severityColors[event.severity]} ${selectedEventForFeedback?.event_number === event.event_number ? 'ring-2 ring-purple-500' : ''}`}
                          onClick={() => setSelectedEventForFeedback(event)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">
                              Event {event.event_number}: {event.identified_type}
                            </div>
                            <div className="flex items-center gap-2">
                              {event.confidence_score && (
                                <Badge variant="outline" className={getConfidenceColor(event.confidence_score)}>
                                  {event.confidence_score}%
                                </Badge>
                              )}
                              <Badge variant="outline">{event.distance}</Badge>
                            </div>
                          </div>
                          
                          {/* Impairment Category */}
                          {event.impairment_category && (
                            <Badge className="mb-2 text-xs" variant="secondary">
                              {event.impairment_category}
                            </Badge>
                          )}
                          
                          <p className="text-sm mb-3">{event.description}</p>

                          {/* Distinguishing Factors */}
                          {event.distinguishing_factors?.length > 0 && (
                            <div className="mb-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                                <Eye className="h-3 w-3 inline mr-1" />
                                Why this diagnosis:
                              </div>
                              <ul className="text-xs space-y-1">
                                {event.distinguishing_factors.map((factor, j) => (
                                  <li key={j} className="flex items-start gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                                    <span>{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {event.probable_causes?.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Probable Causes:</div>
                              <ul className="text-sm space-y-1">
                                {event.probable_causes.map((cause, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span>•</span>
                                    <span>{cause}</span>
                                  </li>
                                  ))}
                                  </ul>
                                  </div>
                                  )}

                                  {/* Differential Diagnosis */}
                                  {event.differential_diagnosis && (
                                  <div className="mb-3 p-2 bg-purple-50/50 dark:bg-purple-900/20 rounded text-xs">
                                  <span className="font-semibold text-purple-700 dark:text-purple-300">Differential: </span>
                                  <span className="text-purple-600 dark:text-purple-400">{event.differential_diagnosis}</span>
                                  </div>
                                  )}

                                  {event.troubleshooting_steps?.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold uppercase text-gray-500 mb-1">Troubleshooting Steps:</div>
                              <ol className="text-sm space-y-1">
                                {event.troubleshooting_steps.map((step, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="font-bold">{j + 1}.</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Feedback Panel */}
                <div className="space-y-4">
                  <FeedbackPanel 
                    eventAnalysis={selectedEventForFeedback}
                    onFeedbackSubmit={handleFeedbackSubmit}
                  />
                  
                  {feedbackHistory.length > 0 && (
                    <Card className="border-dashed">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Feedback Submitted ({feedbackHistory.length})
                        </h4>
                        <div className="text-xs text-gray-500">
                          Your feedback helps improve AI accuracy for all technicians.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Wavelength Comparison Note */}
            {analysisResult.wavelength_comparison_note && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold flex items-center gap-2 mb-2 text-purple-800 dark:text-purple-200">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  Wavelength Analysis
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {analysisResult.wavelength_comparison_note}
                </p>
              </div>
            )}

            {/* Ghost Events */}
            {analysisResult.ghost_events_detected?.length > 0 && (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-gray-500" />
                    Artifacts/Ghost Events Detected
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {analysisResult.ghost_events_detected.map((ghost, i) => (
                      <li key={i}>• {ghost}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tools Needed */}
            {analysisResult.tools_needed?.length > 0 && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <h4 className="font-semibold flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-200">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  Tools Needed
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.tools_needed.map((tool, i) => (
                    <Badge key={i} variant="outline" className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-emerald-300 dark:border-emerald-700">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Recommendations */}
            {analysisResult.additional_recommendations?.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Additional Recommendations
                </h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.additional_recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(0)} className="flex-1 text-sm h-9 md:h-10">
                New Analysis
              </Button>
              <Link to={createPageUrl('FiberDoctor')} className="flex-1">
                <Button variant="outline" className="w-full text-sm h-9 md:h-10">
                  Fiber Doctor
                </Button>
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">OTDR Analysis</h1>
                  <Badge className="bg-amber-500 text-xs">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    Beta
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">AI-Powered Trace Diagnostics</p>
              </div>
            </div>
            <Badge variant="outline">{currentStep + 1} / {WIZARD_STEPS.length}</Badge>
          </div>
          <Progress value={progress} className="mt-3 h-1" />
        </div>
      </header>

      {/* Step Indicators */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="flex justify-between">
          {WIZARD_STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => i < currentStep && setCurrentStep(i)}
              disabled={i > currentStep}
              className={`flex flex-col items-center gap-0.5 md:gap-1 ${
                i <= currentStep ? 'text-purple-600' : 'text-gray-400'
              } ${i < currentStep ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ${
                i < currentStep ? 'bg-purple-600 text-white' :
                i === currentStep ? 'bg-purple-100 text-purple-600 ring-2 ring-purple-600' :
                'bg-gray-200 text-gray-400'
              }`}>
                {i < currentStep ? (
                  <CheckCircle2 className="h-3 w-3 md:h-5 md:w-5" />
                ) : (
                  <step.icon className="h-3 w-3 md:h-4 md:w-4" />
                )}
              </div>
              <span className="text-[9px] md:text-xs hidden sm:block">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-3 md:px-4 pb-8">
        <Card className="border-0 shadow-xl">
          <CardContent className="p-4 md:p-6 lg:p-8">
            {renderStepContent()}
          </CardContent>
          
          {currentStep !== 4 && !isAnalyzing && (
            <div className="border-t p-3 md:p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <Button 
                variant="outline" 
                onClick={goPrev}
                disabled={currentStep === 0}
                className="h-9 text-sm"
              >
                <ChevronLeft className="h-4 w-4 mr-0.5 md:mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Back</span>
              </Button>
              
              <Button onClick={goNext} className="h-9 text-sm">
                {currentStep === 3 ? (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Analyze
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-0.5 md:ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}