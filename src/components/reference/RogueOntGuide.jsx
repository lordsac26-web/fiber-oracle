import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Network, Radio, ShieldAlert, Wrench } from 'lucide-react';

const indicators = [
  'Multiple ONTs on the same PON port lose upstream or flap at the same time.',
  'Downstream light may appear normal while upstream traffic fails or ranges repeatedly.',
  'OLT logs show burst collisions, ranging failures, DBA anomalies, or repeated registration attempts.',
  'One ONT may transmit outside its assigned time slot or continuously after hardware failure.',
];

const triageSteps = [
  'Confirm blast radius: same ONT, same splitter, same PON port, same OLT card, or larger area.',
  'Check OLT alarms/logs for rogue ONU detection, burst collisions, ranging instability, or high upstream errors.',
  'Compare healthy and affected ONTs on the same PON for OLT Rx, uptime, ranging state, and GEM/HEC errors.',
  'If many ONTs are affected and feeder power is clean, isolate by splitter branch or temporarily disable suspected ONTs per approved procedure.',
  'Escalate to engineering/vendor TAC if the suspect ONT cannot be isolated remotely or the OLT card reports abnormal burst behavior.',
];

const impactLevels = [
  { level: 'Single ONT', priority: 'P3', action: 'Treat as customer-specific. Check drop, ONT power, provisioning, and connector cleanliness.' },
  { level: 'Several ONTs / same splitter', priority: 'P2', action: 'Suspect splitter branch, NAP, distribution fiber, or shared field enclosure issue.' },
  { level: 'Most/all ONTs / same PON', priority: 'P1', action: 'Suspect rogue ONT, feeder issue, OLT optics, OLT port/card, or splitter input problem.' },
  { level: 'Multiple PON ports', priority: 'P1', action: 'Escalate as OLT card, shelf, transport, power, or configuration event.' },
];

export default function RogueOntGuide() {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            Rogue ONT / Multiple ONTs Impact Guide
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">Level 2 escalation guide for distinguishing customer-specific faults from shared PON-impacting events.</p>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/70 dark:bg-gray-800/70 rounded-xl">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Common Indicators</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {indicators.map((item) => <li key={item} className="flex gap-2"><span className="text-amber-600">•</span>{item}</li>)}
            </ul>
          </div>
          <div className="p-4 bg-white/70 dark:bg-gray-800/70 rounded-xl">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Network className="h-4 w-4 text-blue-600" /> Network Path to Check</h4>
            <div className="text-sm font-mono text-gray-700 dark:text-gray-300 overflow-x-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              OLT Port → Feeder → Splitter Input → Splitter Outputs → Distribution → NAP/MST → Drop → ONT
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">The shared failure point is usually the first common element upstream of all affected ONTs.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-indigo-600" /> Triage Procedure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {triageSteps.map((step, index) => (
            <div key={step} className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <Badge className="h-6 w-6 rounded-full justify-center p-0 bg-indigo-600">{index + 1}</Badge>
              <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-rose-600" /> Impact Priority Matrix</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          {impactLevels.map((item) => (
            <div key={item.level} className="p-4 border rounded-xl bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{item.level}</h4>
                <Badge className={item.priority === 'P1' ? 'bg-red-600' : item.priority === 'P2' ? 'bg-amber-500' : 'bg-blue-500'}>{item.priority}</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.action}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}