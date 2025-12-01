import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Droplets, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  Wind,
  CircleDot,
  ClipboardCheck,
  Timer,
  Eye
} from 'lucide-react';
import { CLEANING_PROCEDURES, INSPECTION_ZONES } from './FiberConstants';

const CLEANING_CHECKLIST = {
  dry_clean: {
    title: "Dry Cleaning (First Attempt)",
    icon: Wind,
    color: "blue",
    steps: [
      { id: 'dc1', text: "Select appropriate dry cleaning tool (lint-free wipe, cleaning card, or dry swab)" },
      { id: 'dc2', text: "For SC/LC: Use push-type cleaner or lint-free wipe" },
      { id: 'dc3', text: "Wipe in ONE direction only - never back and forth" },
      { id: 'dc4', text: "Use fresh/clean section for each swipe" },
      { id: 'dc5', text: "Inspect with 400x scope after cleaning" },
      { id: 'dc6', text: "Core zone must be free of particles >1μm" },
    ]
  },
  wet_dry_clean: {
    title: "Wet/Dry Cleaning",
    icon: Droplets,
    color: "emerald",
    steps: [
      { id: 'wd1', text: "Use only 99%+ IPA or approved fiber optic cleaning solvent" },
      { id: 'wd2', text: "Apply small amount of solvent to lint-free wipe or swab" },
      { id: 'wd3', text: "Clean end-face with wet portion using light pressure" },
      { id: 'wd4', text: "IMMEDIATELY follow with dry portion - do not let solvent evaporate" },
      { id: 'wd5', text: "Inspect with 400x scope" },
      { id: 'wd6', text: "Repeat if residue remains (max 3 attempts)" },
      { id: 'wd7', text: "If still contaminated after 3 attempts, connector may be damaged" },
    ]
  },
  adapter_clean: {
    title: "Bulkhead Adapter Cleaning",
    icon: CircleDot,
    color: "purple",
    steps: [
      { id: 'ac1', text: "Remove both connectors from adapter" },
      { id: 'ac2', text: "Use appropriate adapter cleaning tool or swab" },
      { id: 'ac3', text: "Insert cleaning tool and rotate 2-3 times" },
      { id: 'ac4', text: "Pull straight out - do not rotate while removing" },
      { id: 'ac5', text: "Use compressed air (fiber-safe only) if debris visible" },
      { id: 'ac6', text: "Clean both sides of adapter" },
      { id: 'ac7', text: "Re-clean connector end-faces before mating" },
    ]
  },
  mpo_mtp_clean: {
    title: "MPO/MTP Cleaning",
    icon: Sparkles,
    color: "orange",
    steps: [
      { id: 'mp1', text: "Use MPO-specific cleaning tool (push-type cleaner)" },
      { id: 'mp2', text: "Verify cleaning ribbon width matches connector (12F, 24F)" },
      { id: 'mp3', text: "Align guide pins with cleaner slots" },
      { id: 'mp4', text: "Push cleaner against end-face with firm pressure" },
      { id: 'mp5', text: "Advance to fresh cleaning ribbon section" },
      { id: 'mp6', text: "Repeat 2-3 times" },
      { id: 'mp7', text: "Inspect ALL fibers with scope - all must pass" },
      { id: 'mp8', text: "Clean guide pins with separate swab if contaminated" },
    ]
  }
};

export default function CleaningModule() {
  const [activeTab, setActiveTab] = useState('dry_clean');
  const [completedSteps, setCompletedSteps] = useState({});


  const toggleStep = (stepId) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const procedure = CLEANING_CHECKLIST[activeTab];
  const completedCount = procedure.steps.filter(s => completedSteps[s.id]).length;
  const progress = (completedCount / procedure.steps.length) * 100;

  const resetChecklist = () => {
    const newState = {};
    procedure.steps.forEach(s => { newState[s.id] = false; });
    setCompletedSteps(prev => {
      Object.keys(prev).forEach(key => {
        if (!key.startsWith(activeTab.substring(0, 2))) {
          newState[key] = prev[key];
        }
      });
      return newState;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cleaning & Inspection</h2>
          <p className="text-sm text-gray-500">IEC 61300-3-35 compliant procedures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Cleaning Procedures */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto gap-1 bg-gray-100 dark:bg-gray-800 p-1">
                  <TabsTrigger value="dry_clean" className="text-xs py-2">
                    <Wind className="h-3 w-3 mr-1" />
                    Dry
                  </TabsTrigger>
                  <TabsTrigger value="wet_dry_clean" className="text-xs py-2">
                    <Droplets className="h-3 w-3 mr-1" />
                    Wet/Dry
                  </TabsTrigger>
                  <TabsTrigger value="adapter_clean" className="text-xs py-2">
                    <CircleDot className="h-3 w-3 mr-1" />
                    Adapter
                  </TabsTrigger>
                  <TabsTrigger value="mpo_mtp_clean" className="text-xs py-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    MPO/MTP
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <procedure.icon className={`h-5 w-5 text-${procedure.color}-600`} />
                  <h3 className="font-semibold">{procedure.title}</h3>
                </div>
                <Badge variant="outline">
                  {completedCount}/{procedure.steps.length} steps
                </Badge>
              </div>

              <Progress value={progress} className="mb-6" />

              <div className="space-y-3">
                {procedure.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                      completedSteps[step.id] 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-gray-50 dark:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <Checkbox
                      id={step.id}
                      checked={completedSteps[step.id] || false}
                      onCheckedChange={() => toggleStep(step.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={step.id} 
                        className={`cursor-pointer ${completedSteps[step.id] ? 'line-through text-gray-400' : ''}`}
                      >
                        <span className="text-sm font-medium text-gray-500 mr-2">{index + 1}.</span>
                        {step.text}
                      </Label>
                    </div>
                    {completedSteps[step.id] && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={resetChecklist} className="flex-1">
                  Reset Checklist
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600"
                  disabled={completedCount < procedure.steps.length}
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Impairment Quick Reference */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Impairment → Cleaning Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(CLEANING_PROCEDURES).map(([key, proc]) => (
                  <div 
                    key={key}
                    className={`p-4 rounded-xl border-2 ${
                      proc.severity === 'Low' ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20' :
                      proc.severity === 'Medium' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20' :
                      proc.severity === 'High' ? 'border-orange-200 bg-orange-50 dark:bg-orange-900/20' :
                      'border-red-200 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                      <Badge className={
                        proc.severity === 'Low' ? 'bg-blue-500' :
                        proc.severity === 'Medium' ? 'bg-amber-500' :
                        proc.severity === 'High' ? 'bg-orange-500' :
                        'bg-red-500'
                      }>
                        {proc.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>Method:</strong> {proc.method}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Inspection Zones */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Inspection Zones (IEC 61300-3-35)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Single-Mode (SMF)</h4>
                  <div className="space-y-2">
                    {Object.entries(INSPECTION_ZONES.smf).map(([zone, info]) => (
                      <div key={zone} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600 dark:text-gray-400">{zone}:</span>
                        <span className="font-mono">{info.diameter}μm</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Multi-Mode (MMF)</h4>
                  <div className="space-y-2">
                    {Object.entries(INSPECTION_ZONES.mmf).map(([zone, info]) => (
                      <div key={zone} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600 dark:text-gray-400">{zone}:</span>
                        <span className="font-mono">{info.diameter}μm</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200">
                    Core zone must be completely free of defects. Any scratches or contamination in core = FAIL
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timer */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Timer className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Quick Reference</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">IPA evaporation:</span>
                  <span>2-3 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Wait after wet clean:</span>
                  <span>5 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max cleaning attempts:</span>
                  <span>3 times</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}