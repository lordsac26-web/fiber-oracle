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
  Wrench,
  Camera,
  Trash2,
  Mail,
  Image
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [fsanNumber, setFsanNumber] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [finalLightLevel, setFinalLightLevel] = useState('');

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotos(prev => [...prev, { url: file_url, name: file.name }]);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const generateReportContent = () => {
    const endTime = new Date();
    const duration = Math.round((endTime - jobInfo.startTime) / 60000);
    const issueLabel = ISSUE_TYPES.find(i => i.id === jobInfo.issueType)?.label || jobInfo.issueType;

    return `
FIBER OPTIC JOB REPORT
========================
Generated: ${endTime.toLocaleString()}

JOB INFORMATION
---------------
Tech Number: ${jobInfo.techNumber}
Job Number: ${jobInfo.jobNumber}
ONT FSAN: ${fsanNumber || 'N/A'}
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

LIGHT LEVEL AT COMPLETION
-------------------------
${finalLightLevel ? finalLightLevel + ' dBm' : 'Not recorded'}

RESOLUTION
----------
${resolution || 'Not specified'}

FINAL NOTES
-----------
${finalNotes || 'None'}

ATTACHED PHOTOS
---------------
${photos.length > 0 ? photos.map((p, i) => `${i + 1}. ${p.name}\n   ${p.url}`).join('\n') : 'No photos attached'}

========================
FiberTech Pro - Job Report
    `.trim();
  };

  const generateHTMLReport = () => {
    const endTime = new Date();
    const duration = Math.round((endTime - jobInfo.startTime) / 60000);
    const issueLabel = ISSUE_TYPES.find(i => i.id === jobInfo.issueType)?.label || jobInfo.issueType;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Job Report - ${jobInfo.jobNumber}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 24px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f3f4f6; padding: 16px; border-radius: 8px; }
    .info-item { }
    .info-label { font-size: 12px; color: #6b7280; }
    .info-value { font-weight: 600; }
    .step { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .step-complete { color: #059669; }
    .step-incomplete { color: #9ca3af; }
    .step-note { font-size: 12px; color: #6b7280; margin-left: 24px; }
    .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
    .photo { max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
    .resolution-box { background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #059669; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Fiber Optic Job Report</h1>
  
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Tech Number</div><div class="info-value">${jobInfo.techNumber}</div></div>
    <div class="info-item"><div class="info-label">Job Number</div><div class="info-value">${jobInfo.jobNumber}</div></div>
    <div class="info-item"><div class="info-label">ONT FSAN</div><div class="info-value">${fsanNumber || 'N/A'}</div></div>
    <div class="info-item"><div class="info-label">Issue Type</div><div class="info-value">${issueLabel}</div></div>
    <div class="info-item"><div class="info-label">Start Time</div><div class="info-value">${jobInfo.startTime.toLocaleString()}</div></div>
    <div class="info-item"><div class="info-label">Duration</div><div class="info-value">${duration} minutes</div></div>
    <div class="info-item"><div class="info-label">Light Level</div><div class="info-value">${finalLightLevel ? finalLightLevel + ' dBm' : 'N/A'}</div></div>
  </div>
  
  ${jobInfo.issueDescription ? `<p><strong>Description:</strong> ${jobInfo.issueDescription}</p>` : ''}
  
  <h2>Diagnostic Steps</h2>
  ${currentSteps.map(step => `
    <div class="step">
      <span class="${completedSteps[step.id] ? 'step-complete' : 'step-incomplete'}">${completedSteps[step.id] ? '✓' : '○'}</span>
      ${step.title} ${step.required ? '<small>(Required)</small>' : ''}
      ${stepNotes[step.id] ? `<div class="step-note">Notes: ${stepNotes[step.id]}</div>` : ''}
    </div>
  `).join('')}
  
  <h2>Resolution</h2>
  <div class="resolution-box">${resolution || 'Not specified'}</div>
  
  ${finalNotes ? `<h2>Final Notes</h2><p>${finalNotes}</p>` : ''}
  
  ${photos.length > 0 ? `
    <h2>Attached Photos</h2>
    <div class="photos">
      ${photos.map(p => `<img src="${p.url}" alt="${p.name}" class="photo" />`).join('')}
    </div>
  ` : ''}
  
  <div class="footer">
    Generated by FiberTech Pro • ${endTime.toLocaleString()}
  </div>
</body>
</html>`;
  };

  const downloadReport = () => {
    const html = generateHTMLReport();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for images to load then trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
    
    toast.success('Print dialog opened - select "Save as PDF" to download');
  };

  const sendReportEmail = async () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }
    
    setSendingEmail(true);
    try {
      const htmlContent = generateHTMLReport();
      await base44.integrations.Core.SendEmail({
        to: emailAddress,
        subject: `Fiber Job Report - ${jobInfo.jobNumber}`,
        body: htmlContent
      });
      toast.success('Report sent to ' + emailAddress);
      setShowEmailDialog(false);
      setEmailAddress('');
    } catch (error) {
      toast.error('Failed to send email');
    }
    setSendingEmail(false);
  };

  const resetJob = () => {
    setStage('setup');
    setJobInfo({ techNumber: '', jobNumber: '', issueType: '', issueDescription: '', startTime: null });
    setCompletedSteps({});
    setStepNotes({});
    setFinalNotes('');
    setResolution('');
    setFsanNumber('');
    setPhotos([]);
    setFinalLightLevel('');
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
                <Label>ONT FSAN (Optional)</Label>
                <Input
                  placeholder="e.g., ALCL12345678"
                  value={fsanNumber}
                  onChange={(e) => setFsanNumber(e.target.value)}
                  className="font-mono"
                />
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

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ONT FSAN</Label>
                    <Input
                      placeholder="e.g., ALCL12345678"
                      value={fsanNumber}
                      onChange={(e) => setFsanNumber(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Light Level at Completion (dBm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., -18.5"
                      value={finalLightLevel}
                      onChange={(e) => setFinalLightLevel(e.target.value)}
                      className="font-mono"
                    />
                  </div>
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

                {/* Photo Attachments */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Attach Photos
                  </Label>
                  
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={photo.url} 
                            alt={photo.name} 
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <div className="text-xs text-gray-500 truncate mt-1">{photo.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Image className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {uploadingPhoto ? 'Uploading...' : 'Click to add photo'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStage('diagnostics')} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Steps
              </Button>
              <Button onClick={downloadReport} disabled={!resolution} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <FileDown className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
              <Button onClick={() => setShowEmailDialog(true)} disabled={!resolution} variant="outline" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Email Report
              </Button>
            </div>

            {/* Email Dialog */}
            <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Email Job Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="recipient@example.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    The report will be sent as an HTML email including {photos.length} photo{photos.length !== 1 ? 's' : ''}.
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowEmailDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={sendReportEmail} disabled={sendingEmail} className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      {sendingEmail ? 'Sending...' : 'Send Email'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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