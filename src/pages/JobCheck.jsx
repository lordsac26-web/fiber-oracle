import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  ArrowRight,
  ClipboardCheck, 
  Play,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  RotateCcw,
  Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const ISSUE_TYPES = [
  { id: 'low_signal', label: 'Low Signal / Marginal Power', icon: '📉' },
  { id: 'no_signal', label: 'No Signal / No Light', icon: '🚫' },
  { id: 'errors', label: 'BIP/FEC/GEM Errors', icon: '⚠️' },
  { id: 'intermittent', label: 'Intermittent Service', icon: '🔄' },
  { id: 'slow_speed', label: 'Slow Speed / Packet Loss', icon: '🐢' },
  { id: 'new_install', label: 'New Install / Activation', icon: '🆕' },
];

const DIAGNOSTIC_STEPS = {
  low_signal: [
    { id: 'check_power', title: 'Check ONU Rx Power', description: 'Verify power level is within acceptable range (-8 to -27 dBm for GPON)', required: true },
    { id: 'clean_onu', title: 'Clean ONU Connector', description: 'Clean the SC/APC connector at the ONU using IEC procedure', required: true },
    { id: 'inspect_onu', title: 'Inspect ONU Connector (400x)', description: 'Verify connector passes IEC 61300-3-35 inspection', required: true },
    { id: 'check_drop', title: 'Inspect Drop Cable', description: 'Check for macrobends, damage, or tight routing', required: false },
    { id: 'clean_lcp', title: 'Clean LCP/Splitter Port', description: 'If accessible, clean the splitter port connection', required: false },
    { id: 'recheck_power', title: 'Re-check Power After Cleaning', description: 'Verify power improved after cleaning steps', required: true },
  ],
  no_signal: [
    { id: 'verify_no_light', title: 'Verify No Light Present', description: 'Confirm VFL shows no light at ONU', required: true },
    { id: 'check_olt', title: 'Verify OLT Port Status', description: 'Check if OLT port is active and transmitting', required: true },
    { id: 'vfl_test', title: 'VFL Test from ONU', description: 'Trace fiber with VFL to locate break or fault', required: true },
    { id: 'check_splitter', title: 'Check Splitter Connections', description: 'Verify connections at LCP/splitter', required: true },
    { id: 'otdr_test', title: 'OTDR Test (if available)', description: 'Run OTDR to pinpoint fault location', required: false },
    { id: 'repair_splice', title: 'Repair/Re-splice as Needed', description: 'Complete necessary repairs', required: false },
  ],
  errors: [
    { id: 'check_error_counts', title: 'Document Current Error Counts', description: 'Record BIP, FEC corrected, FEC uncorrectable, GEM errors', required: true },
    { id: 'check_power_errors', title: 'Check Optical Power Levels', description: 'Verify power is not marginal or too high', required: true },
    { id: 'clean_all', title: 'Clean All Connections', description: 'Clean ONU, drop, and LCP connections', required: true },
    { id: 'inspect_all', title: 'Inspect All Connectors', description: 'Look for scratches, pitting, contamination', required: true },
    { id: 'check_bends', title: 'Check for Macrobends', description: 'Inspect routing for tight bends (<30mm radius)', required: true },
    { id: 'recheck_errors', title: 'Re-check Error Counts', description: 'Verify errors have stopped after corrections', required: true },
  ],
  intermittent: [
    { id: 'document_symptoms', title: 'Document Symptoms', description: 'Record when issues occur, frequency, duration', required: true },
    { id: 'check_power_stability', title: 'Monitor Power Stability', description: 'Watch for power fluctuations over several minutes', required: true },
    { id: 'physical_inspection', title: 'Physical Route Inspection', description: 'Look for loose connections, damaged cable, environmental factors', required: true },
    { id: 'clean_inspect', title: 'Clean & Inspect All Connections', description: 'Thorough cleaning of entire path', required: true },
    { id: 'check_onu_health', title: 'Check ONU Health', description: 'Verify ONU is not overheating or failing', required: true },
    { id: 'swap_test', title: 'Swap ONU (if needed)', description: 'Replace ONU to rule out hardware failure', required: false },
  ],
  slow_speed: [
    { id: 'speed_test', title: 'Run Speed Test', description: 'Document current speeds vs expected', required: true },
    { id: 'check_power_speed', title: 'Verify Optical Power', description: 'Confirm power is in good range', required: true },
    { id: 'check_errors_speed', title: 'Check for Errors', description: 'Review BIP/FEC counts for issues', required: true },
    { id: 'clean_path', title: 'Clean Fiber Path', description: 'Clean all accessible connections', required: true },
    { id: 'check_config', title: 'Verify Service Configuration', description: 'Confirm correct speed profile applied', required: true },
    { id: 'retest_speed', title: 'Re-run Speed Test', description: 'Verify speeds after corrections', required: true },
  ],
  new_install: [
    { id: 'verify_drop', title: 'Verify Drop Installation', description: 'Confirm drop is properly routed and secured', required: true },
    { id: 'test_continuity', title: 'Test Continuity with VFL', description: 'Verify light passes from LCP to ONU', required: true },
    { id: 'clean_new', title: 'Clean All New Connections', description: 'Clean even new connectors before mating', required: true },
    { id: 'inspect_new', title: 'Inspect All Connectors', description: 'Verify no shipping damage or contamination', required: true },
    { id: 'check_activation', title: 'Verify ONU Activation', description: 'Confirm ONU registers on OLT', required: true },
    { id: 'document_levels', title: 'Document Final Power Levels', description: 'Record Rx power for baseline', required: true },
  ],
};

export default function JobCheck() {
  const [stage, setStage] = useState('setup'); // setup, diagnostics, summary
  const [jobInfo, setJobInfo] = useState({
    techNumber: '',
    jobNumber: '',
    issueType: '',
    issueDescription: '',
    startTime: null,
  });
  const [completedSteps, setCompletedSteps] = useState({});
  const [stepNotes, setStepNotes] = useState({});
  const [finalNotes, setFinalNotes] = useState('');
  const [resolution, setResolution] = useState('');

  const startJob = () => {
    if (!jobInfo.techNumber || !jobInfo.jobNumber || !jobInfo.issueType) {
      toast.error('Please fill in Tech #, Job #, and Issue Type');
      return;
    }
    setJobInfo({ ...jobInfo, startTime: new Date() });
    setStage('diagnostics');
  };

  const toggleStep = (stepId) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const updateStepNote = (stepId, note) => {
    setStepNotes(prev => ({
      ...prev,
      [stepId]: note
    }));
  };

  const currentSteps = DIAGNOSTIC_STEPS[jobInfo.issueType] || [];
  const requiredSteps = currentSteps.filter(s => s.required);
  const completedRequired = requiredSteps.filter(s => completedSteps[s.id]).length;
  const canComplete = completedRequired === requiredSteps.length;

  const generatePDF = () => {
    const endTime = new Date();
    const duration = Math.round((endTime - jobInfo.startTime) / 60000);
    const issueLabel = ISSUE_TYPES.find(i => i.id === jobInfo.issueType)?.label || jobInfo.issueType;

    const content = `
FIBER OPTIC JOB REPORT
========================
Generated: ${endTime.toLocaleString()}

JOB INFORMATION
---------------
Tech Number: ${jobInfo.techNumber}
Job Number: ${jobInfo.jobNumber}
Issue Type: ${issueLabel}
Description: ${jobInfo.issueDescription || 'N/A'}

Start Time: ${jobInfo.startTime.toLocaleString()}
End Time: ${endTime.toLocaleString()}
Duration: ${duration} minutes

DIAGNOSTIC STEPS COMPLETED
--------------------------
${currentSteps.map(step => {
  const completed = completedSteps[step.id] ? '✓' : '○';
  const note = stepNotes[step.id] ? `\n   Notes: ${stepNotes[step.id]}` : '';
  return `${completed} ${step.title}${step.required ? ' (Required)' : ''}${note}`;
}).join('\n')}

RESOLUTION
----------
${resolution || 'Not specified'}

FINAL NOTES
-----------
${finalNotes || 'None'}

========================
FiberTech Pro - Job Report
    `.trim();

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Job_${jobInfo.jobNumber}_${endTime.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Job report downloaded');
  };

  const resetJob = () => {
    setStage('setup');
    setJobInfo({ techNumber: '', jobNumber: '', issueType: '', issueDescription: '', startTime: null });
    setCompletedSteps({});
    setStepNotes({});
    setFinalNotes('');
    setResolution('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Job Check</h1>
                <p className="text-xs text-gray-500">Guided Diagnostic Workflow</p>
              </div>
            </div>
            {stage !== 'setup' && (
              <Badge variant="outline" className="font-mono">
                Job #{jobInfo.jobNumber}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Setup Stage */}
        {stage === 'setup' && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                Start New Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tech Number *</Label>
                  <Input
                    placeholder="e.g., T-1234"
                    value={jobInfo.techNumber}
                    onChange={(e) => setJobInfo({ ...jobInfo, techNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job Number *</Label>
                  <Input
                    placeholder="e.g., WO-567890"
                    value={jobInfo.jobNumber}
                    onChange={(e) => setJobInfo({ ...jobInfo, jobNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Issue Type *</Label>
                <Select value={jobInfo.issueType} onValueChange={(v) => setJobInfo({ ...jobInfo, issueType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the issue type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((issue) => (
                      <SelectItem key={issue.id} value={issue.id}>
                        <span className="mr-2">{issue.icon}</span>
                        {issue.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Additional Description (Optional)</Label>
                <Textarea
                  placeholder="Describe the issue in more detail..."
                  value={jobInfo.issueDescription}
                  onChange={(e) => setJobInfo({ ...jobInfo, issueDescription: e.target.value })}
                />
              </div>

              <Button onClick={startJob} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Start Diagnostic Workflow
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Diagnostics Stage */}
        {stage === 'diagnostics' && (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <div>
                <div className="text-sm text-gray-500">Progress</div>
                <div className="font-semibold">{completedRequired} of {requiredSteps.length} required steps</div>
              </div>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all"
                  style={{ width: `${(completedRequired / requiredSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {currentSteps.map((step, index) => (
                <Card key={step.id} className={`border-0 shadow-lg transition-all ${completedSteps[step.id] ? 'ring-2 ring-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleStep(step.id)}
                        className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          completedSteps[step.id] 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {completedSteps[step.id] && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{index + 1}. {step.title}</span>
                          {step.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{step.description}</p>
                        <Input
                          placeholder="Add notes for this step..."
                          value={stepNotes[step.id] || ''}
                          onChange={(e) => updateStepNote(step.id, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Complete Button */}
            <Button 
              onClick={() => setStage('summary')} 
              disabled={!canComplete}
              className="w-full" 
              size="lg"
            >
              {canComplete ? (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Complete Job
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Complete Required Steps First
                </>
              )}
            </Button>
          </>
        )}

        {/* Summary Stage */}
        {stage === 'summary' && (
          <>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-emerald-600" />
                  Job Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500">Tech #</div>
                    <div className="font-medium">{jobInfo.techNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Job #</div>
                    <div className="font-medium">{jobInfo.jobNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Issue Type</div>
                    <div className="font-medium">{ISSUE_TYPES.find(i => i.id === jobInfo.issueType)?.label}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Steps Completed</div>
                    <div className="font-medium">{Object.values(completedSteps).filter(Boolean).length} / {currentSteps.length}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Resolution *</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resolution..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resolved">Issue Resolved - Service Restored</SelectItem>
                      <SelectItem value="partial">Partially Resolved - Follow-up Needed</SelectItem>
                      <SelectItem value="escalate">Escalate - Requires Additional Resources</SelectItem>
                      <SelectItem value="no_issue">No Issue Found - Customer Education</SelectItem>
                      <SelectItem value="reschedule">Reschedule - Access/Equipment Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Final Notes</Label>
                  <Textarea
                    placeholder="Add any final notes about the job..."
                    value={finalNotes}
                    onChange={(e) => setFinalNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStage('diagnostics')} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Steps
              </Button>
              <Button onClick={generatePDF} disabled={!resolution} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <FileDown className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            <Button variant="ghost" onClick={resetJob} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Start New Job
            </Button>
          </>
        )}
      </main>
    </div>
  );
}