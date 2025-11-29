import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Cable, 
  Lightbulb,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  Activity,
  Server,
  Gauge,
  Search,
  Wrench,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Fiber 102',
    subtitle: 'Intermediate PON & FTTH',
    icon: Target,
    color: 'from-blue-500 to-indigo-600',
    content: (
      <div className="space-y-6 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Ready to level up? This course dives deeper into PON technologies, loss budgets, and advanced troubleshooting techniques.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="text-2xl font-bold text-blue-600">30</div>
            <div className="text-xs text-gray-500">Minutes</div>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <div className="text-2xl font-bold text-indigo-600">14</div>
            <div className="text-xs text-gray-500">Topics</div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="text-2xl font-bold text-purple-600">Pro</div>
            <div className="text-xs text-gray-500">Level</div>
          </div>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <strong>Prerequisite:</strong> Complete Fiber 101 before starting this course.
        </div>
      </div>
    )
  },
  {
    id: 'gpon-deep-dive',
    title: 'GPON Deep Dive',
    subtitle: 'ITU-T G.984 Standard',
    icon: Server,
    color: 'from-indigo-500 to-purple-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <div className="text-xl font-bold text-indigo-700 mb-3">GPON Specifications</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>Downstream:</span>
                <span className="font-mono font-bold">2.488 Gbps</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>Upstream:</span>
                <span className="font-mono font-bold">1.244 Gbps</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>DS Wavelength:</span>
                <span className="font-mono font-bold">1490 nm</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>US Wavelength:</span>
                <span className="font-mono font-bold">1310 nm</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>Max Split:</span>
                <span className="font-mono font-bold">1:128</span>
              </div>
            </div>
          </div>
          <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="text-xl font-bold text-purple-700 mb-3">GPON Classes</div>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-white dark:bg-gray-800 rounded">
                <div className="font-bold">Class B+</div>
                <div className="text-gray-600">Budget: 28 dB • Most common</div>
                <div className="text-xs text-gray-500 mt-1">OLT Tx: +1.5 to +5 dBm</div>
              </div>
              <div className="p-3 bg-white dark:bg-gray-800 rounded">
                <div className="font-bold">Class C+</div>
                <div className="text-gray-600">Budget: 32 dB • Extended reach</div>
                <div className="text-xs text-gray-500 mt-1">OLT Tx: +3 to +7 dBm</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <strong>Key Concept:</strong> GPON uses Time Division Multiple Access (TDMA) for upstream, allowing multiple ONTs to share one wavelength without collision.
        </div>
      </div>
    )
  },
  {
    id: 'xgspon',
    title: 'XGS-PON Technology',
    subtitle: 'ITU-T G.9807 - 10G Symmetric',
    icon: TrendingUp,
    color: 'from-emerald-500 to-teal-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="text-xl font-bold text-emerald-700 mb-3">XGS-PON Specifications</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>Downstream:</span>
                <span className="font-mono font-bold text-emerald-600">9.953 Gbps</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>Upstream:</span>
                <span className="font-mono font-bold text-emerald-600">9.953 Gbps</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>DS Wavelength:</span>
                <span className="font-mono font-bold">1577 nm</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>US Wavelength:</span>
                <span className="font-mono font-bold">1270 nm</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>Max Split:</span>
                <span className="font-mono font-bold">1:128</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="font-bold text-blue-700 mb-2">Coexistence with GPON</div>
              <p className="text-sm text-gray-600">XGS-PON uses different wavelengths, allowing it to run on the same fiber as GPON during migration.</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div className="font-bold text-amber-700 mb-2">N1/N2 Classes</div>
              <div className="text-sm space-y-1">
                <div><strong>N1:</strong> 29 dB budget (standard)</div>
                <div><strong>N2:</strong> 31 dB budget (extended)</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-center">
          <strong>Why XGS-PON?</strong> Symmetric speeds are essential for cloud backup, video conferencing, and enterprise applications.
        </div>
      </div>
    )
  },
  {
    id: 'wavelength-plan',
    title: 'PON Wavelength Plan',
    subtitle: 'Understanding the spectrum',
    icon: Activity,
    color: 'from-violet-500 to-purple-600',
    content: (
      <div className="space-y-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Wavelength spectrum visualization */}
            <div className="relative h-16 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 rounded-lg mb-4">
              <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-bold text-white">
                <span>1260nm</span>
                <span>1360nm</span>
                <span>1480nm</span>
                <span>1580nm</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-center">
                <div className="font-bold">1270nm</div>
                <div className="text-gray-600">XGS-PON US</div>
              </div>
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded text-center">
                <div className="font-bold">1310nm</div>
                <div className="text-gray-600">GPON US</div>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-center">
                <div className="font-bold">1490nm</div>
                <div className="text-gray-600">GPON DS</div>
              </div>
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded text-center">
                <div className="font-bold">1577nm</div>
                <div className="text-gray-600">XGS-PON DS</div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="font-bold text-orange-700 mb-2">RF Video Overlay</div>
            <p className="text-sm text-gray-600">1550nm wavelength can carry RF video (cable TV) on the same fiber using WDM technology.</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="font-bold text-green-700 mb-2">OTDR Testing</div>
            <p className="text-sm text-gray-600">Test at 1310nm and 1550nm to characterize the fiber without disrupting live traffic on PON wavelengths.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'loss-budget-calc',
    title: 'Loss Budget Calculation',
    subtitle: 'The math behind the network',
    icon: Gauge,
    color: 'from-rose-500 to-pink-600',
    content: (
      <div className="space-y-6">
        <div className="p-5 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
          <div className="font-bold text-rose-700 mb-3">Loss Budget Formula</div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg text-center font-mono text-lg">
            Total Loss = Fiber + Connectors + Splices + Splitters
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm">Fiber (10km @ 1310nm)</span>
                <span className="font-mono font-bold">3.5 dB</span>
              </div>
              <div className="text-xs text-gray-500">0.35 dB/km × 10km</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm">Connectors (4 × 0.3 dB)</span>
                <span className="font-mono font-bold">1.2 dB</span>
              </div>
              <div className="text-xs text-gray-500">Field-grade connectors</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm">Splices (2 × 0.1 dB)</span>
                <span className="font-mono font-bold">0.2 dB</span>
              </div>
              <div className="text-xs text-gray-500">Fusion splices</div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm">Splitter (1:32)</span>
                <span className="font-mono font-bold">17.5 dB</span>
              </div>
              <div className="text-xs text-gray-500">Typical insertion loss</div>
            </div>
          </div>
          <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <div className="font-bold text-indigo-700 mb-3">Budget Check</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span>Total Loss:</span>
                <span className="font-mono font-bold">22.4 dB</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Class B+ Budget:</span>
                <span className="font-mono font-bold">28 dB</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Margin:</span>
                <span className="font-mono font-bold">5.6 dB ✓</span>
              </div>
            </div>
            <div className="mt-4 p-2 bg-green-100 dark:bg-green-900/30 rounded text-center text-sm">
              <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-600" />
              Within budget - link will work!
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'splitter-cascades',
    title: 'Splitter Cascade Design',
    subtitle: 'Centralized vs Distributed',
    icon: Cable,
    color: 'from-amber-500 to-orange-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200">
            <div className="text-lg font-bold text-amber-700 mb-3">Centralized Splitting</div>
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Badge className="bg-indigo-500">OLT</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge className="bg-purple-500">1:32</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge className="bg-emerald-500">ONTs</Badge>
            </div>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Simpler to manage</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Easier troubleshooting</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span>More fiber to each home</span>
              </li>
            </ul>
          </div>
          <div className="p-5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200">
            <div className="text-lg font-bold text-orange-700 mb-3">Distributed Splitting</div>
            <div className="flex items-center gap-2 mb-4 text-sm flex-wrap">
              <Badge className="bg-indigo-500">OLT</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge className="bg-purple-500">1:4</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge className="bg-pink-500">1:8</Badge>
              <ArrowRight className="h-4 w-4" />
              <Badge className="bg-emerald-500">ONTs</Badge>
            </div>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Less fiber per home</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Flexible expansion</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span>More complex loss calc</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="font-bold mb-2">Cascade Loss Example (1:4 + 1:8 = 1:32)</div>
          <div className="text-sm">
            <span className="font-mono">7.4 dB (1:4) + 10.7 dB (1:8) = 18.1 dB</span>
            <span className="text-gray-500 ml-2">(vs 17.5 dB for single 1:32)</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'otdr-events',
    title: 'Reading OTDR Traces',
    subtitle: 'Event identification',
    icon: Activity,
    color: 'from-cyan-500 to-blue-600',
    content: (
      <div className="space-y-6">
        {/* Simplified OTDR trace visualization */}
        <div className="p-4 bg-gray-900 rounded-xl">
          <svg viewBox="0 0 400 120" className="w-full h-32">
            <line x1="20" y1="30" x2="380" y2="30" stroke="#374151" strokeWidth="1" strokeDasharray="4" />
            <line x1="20" y1="60" x2="380" y2="60" stroke="#374151" strokeWidth="1" strokeDasharray="4" />
            <line x1="20" y1="90" x2="380" y2="90" stroke="#374151" strokeWidth="1" strokeDasharray="4" />
            {/* OTDR trace line */}
            <polyline
              points="20,25 60,27 60,35 100,38 100,55 120,57 180,62 180,80 200,82 320,92 320,110"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
            />
            {/* Event markers */}
            <circle cx="60" cy="31" r="4" fill="#f59e0b" />
            <circle cx="100" cy="46" r="4" fill="#22c55e" />
            <circle cx="180" cy="71" r="4" fill="#a855f7" />
            <circle cx="320" cy="101" r="4" fill="#ef4444" />
            {/* Labels */}
            <text x="60" y="18" fill="#f59e0b" fontSize="9" textAnchor="middle">Connector</text>
            <text x="100" y="45" fill="#22c55e" fontSize="9" textAnchor="start" dx="8">Splice</text>
            <text x="180" y="68" fill="#a855f7" fontSize="9" textAnchor="start" dx="8">Splitter</text>
            <text x="320" y="98" fill="#ef4444" fontSize="9" textAnchor="end" dx="-8">End</text>
          </svg>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
            <div className="w-4 h-4 bg-amber-500 rounded-full mx-auto mb-2" />
            <div className="font-bold text-sm">Connector</div>
            <div className="text-xs text-gray-500">Reflective + Loss</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2" />
            <div className="font-bold text-sm">Splice</div>
            <div className="text-xs text-gray-500">Non-reflective loss</div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
            <div className="w-4 h-4 bg-purple-500 rounded-full mx-auto mb-2" />
            <div className="font-bold text-sm">Splitter</div>
            <div className="text-xs text-gray-500">Large loss event</div>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-2" />
            <div className="font-bold text-sm">End/Break</div>
            <div className="text-xs text-gray-500">High reflection</div>
          </div>
        </div>
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
          <strong>Pro Tip:</strong> Always test bidirectionally. A gainer in one direction may hide a true loss event.
        </div>
      </div>
    )
  },
  {
    id: 'pon-errors',
    title: 'PON Error Types',
    subtitle: 'What the counters mean',
    icon: AlertTriangle,
    color: 'from-red-500 to-rose-600',
    content: (
      <div className="space-y-6">
        <div className="grid gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-l-4 border-red-500">
            <div className="font-bold text-red-700">BIP Errors (Bit Interleaved Parity)</div>
            <p className="text-sm text-gray-600 mt-1">Indicates bit errors in transmission. High counts suggest dirty connectors, bad splices, or signal too weak.</p>
            <div className="text-xs text-gray-500 mt-2">Threshold: &lt;10 errors/15min acceptable</div>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-l-4 border-amber-500">
            <div className="font-bold text-amber-700">FEC Corrected</div>
            <p className="text-sm text-gray-600 mt-1">Forward Error Correction fixed these errors. Some is normal, but high rates indicate degrading signal.</p>
            <div className="text-xs text-gray-500 mt-2">Watch for: Increasing trend over time</div>
          </div>
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border-l-4 border-rose-500">
            <div className="font-bold text-rose-700">FEC Uncorrectable</div>
            <p className="text-sm text-gray-600 mt-1">Errors too severe to fix. Will cause packet loss and service issues. Requires immediate attention.</p>
            <div className="text-xs text-gray-500 mt-2">Threshold: Should be 0</div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-l-4 border-purple-500">
            <div className="font-bold text-purple-700">HEC/GEM Errors</div>
            <p className="text-sm text-gray-600 mt-1">Header Error Control issues. Often caused by timing problems or upstream collisions.</p>
            <div className="text-xs text-gray-500 mt-2">Check: ONT registration and ranging</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'ont-power-analysis',
    title: 'ONT Power Analysis',
    subtitle: 'Interpreting Rx levels',
    icon: Gauge,
    color: 'from-emerald-500 to-green-600',
    content: (
      <div className="space-y-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          {/* Power level gauge visualization */}
          <div className="relative h-8 bg-gradient-to-r from-red-500 via-amber-500 via-green-500 via-green-500 to-red-500 rounded-full mb-4">
            <div className="absolute inset-0 flex items-center justify-between px-4 text-[10px] font-bold text-white">
              <span>-30</span>
              <span>-27</span>
              <span>-20</span>
              <span>-10</span>
              <span>-8</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center text-xs">
            <div className="text-red-600 font-medium">Too Low</div>
            <div className="text-amber-600 font-medium">Marginal</div>
            <div className="text-green-600 font-medium">Good</div>
            <div className="text-green-600 font-medium">Good</div>
            <div className="text-red-600 font-medium">Too High</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <div className="text-2xl font-mono font-bold text-red-600">-29 dBm</div>
            <div className="text-sm text-gray-600 mt-1">Signal too weak</div>
            <div className="text-xs text-gray-500">Check: splitters, connectors, fiber</div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <div className="text-2xl font-mono font-bold text-green-600">-18 dBm</div>
            <div className="text-sm text-gray-600 mt-1">Ideal range</div>
            <div className="text-xs text-gray-500">Good margin for degradation</div>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <div className="text-2xl font-mono font-bold text-red-600">-6 dBm</div>
            <div className="text-sm text-gray-600 mt-1">Signal too strong</div>
            <div className="text-xs text-gray-500">Add attenuator or check OLT Tx</div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <strong>Target:</strong> Aim for -15 to -22 dBm at the ONT. This provides margin for aging, temperature changes, and future splices.
        </div>
      </div>
    )
  },
  {
    id: 'troubleshooting-flow',
    title: 'Systematic Troubleshooting',
    subtitle: 'The logical approach',
    icon: Search,
    color: 'from-indigo-500 to-blue-600',
    content: (
      <div className="space-y-6">
        <div className="space-y-3">
          {[
            { step: 1, title: 'Check ONT Status', desc: 'PON light solid green? Check OLT for registration.', color: 'bg-blue-500' },
            { step: 2, title: 'Measure Rx Power', desc: 'Is it within spec? Too low = loss issue. Too high = add attenuator.', color: 'bg-indigo-500' },
            { step: 3, title: 'Inspect & Clean', desc: 'Start at ONT, work back. 85% of issues are contamination.', color: 'bg-purple-500' },
            { step: 4, title: 'Check Splitter', desc: 'Verify correct port, test with known good fiber if possible.', color: 'bg-pink-500' },
            { step: 5, title: 'OTDR If Needed', desc: 'Locate fault distance, identify event type, repair.', color: 'bg-rose-500' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className={`w-8 h-8 ${item.color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
                {item.step}
              </div>
              <div>
                <div className="font-bold">{item.title}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 inline mr-2 text-amber-600" />
          <strong>Remember:</strong> Document everything! Take before/after photos and power readings.
        </div>
      </div>
    )
  },
  {
    id: 'common-issues',
    title: 'Common FTTH Issues',
    subtitle: 'What you\'ll see in the field',
    icon: Wrench,
    color: 'from-orange-500 to-amber-600',
    content: (
      <div className="space-y-4">
        <div className="grid gap-3">
          {[
            { issue: 'Intermittent Signal', cause: 'Dirty/damaged connector, loose patch', fix: 'Clean, reseat, or replace connector' },
            { issue: 'High Loss at Splice', cause: 'Poor cleave, contamination, misalignment', fix: 'Re-cleave and re-splice' },
            { issue: 'ONT Won\'t Register', cause: 'Wrong port, fiber break, OLT config', fix: 'Verify fiber path, check OLT provisioning' },
            { issue: 'Slow Speeds Only', cause: 'Marginal power, congested PON', fix: 'Check Rx level, verify split ratio' },
            { issue: 'High BIP Errors', cause: 'Signal degradation, bend loss', fix: 'Inspect fiber route for macrobends' },
          ].map((item, i) => (
            <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-orange-700">{item.issue}</div>
                  <div className="text-sm text-gray-500 mt-1">Cause: {item.cause}</div>
                </div>
              </div>
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-600" />
                <strong>Fix:</strong> {item.fix}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'best-practices',
    title: 'Field Best Practices',
    subtitle: 'Work like a pro',
    icon: Target,
    color: 'from-teal-500 to-emerald-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-bold text-teal-700">Before the Job</h4>
            <div className="space-y-2">
              {[
                'Review work order and network diagram',
                'Verify equipment and test gear calibration',
                'Check OLT port status remotely if possible',
                'Bring spare connectors and patch cables',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-teal-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-emerald-700">During the Job</h4>
            <div className="space-y-2">
              {[
                'Always inspect before connecting',
                'Document power levels at each point',
                'Take photos of all work performed',
                'Test end-to-end before closing out',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="font-bold mb-2">Documentation Checklist</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>☐ Before/after photos</div>
            <div>☐ Power readings logged</div>
            <div>☐ OTDR trace saved</div>
            <div>☐ Work order updated</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'Congratulations!',
    subtitle: 'You\'ve completed Fiber 102',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-600',
    content: (
      <div className="space-y-6 text-center">
        <div className="inline-block p-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          You now have intermediate-level knowledge of PON technologies, loss budgets, OTDR interpretation, and systematic troubleshooting!
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Link to={createPageUrl('Home')}>
            <Button className="w-full" size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Use the Tools
            </Button>
          </Link>
          <Link to={createPageUrl('Education')}>
            <Button variant="outline" className="w-full" size="lg">
              <BookOpen className="h-4 w-4 mr-2" />
              More Courses
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Keep learning, keep testing, and always document your work!
        </p>
      </div>
    )
  },
];

export default function Fiber102() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slide = SLIDES[currentSlide];
  const progress = ((currentSlide + 1) / SLIDES.length) * 100;
  
  const goNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };
  
  const goPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };
  
  const restart = () => {
    setCurrentSlide(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Education')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fiber 102</h1>
                <p className="text-xs text-gray-500">Intermediate PON & FTTH</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentSlide + 1} / {SLIDES.length}</Badge>
              <Button variant="ghost" size="sm" onClick={restart}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-1" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card className="border-0 shadow-xl overflow-hidden">
          {/* Slide Header */}
          <div className={`bg-gradient-to-r ${slide.color} p-6 text-white`}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <slide.icon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{slide.title}</h2>
                <p className="text-white/80">{slide.subtitle}</p>
              </div>
            </div>
          </div>
          
          {/* Slide Content */}
          <CardContent className="p-6 md:p-8 min-h-[400px]">
            {slide.content}
          </CardContent>
          
          {/* Navigation */}
          <div className="border-t p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <Button 
              variant="outline" 
              onClick={goPrev}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex gap-1">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentSlide 
                      ? 'bg-indigo-600 w-6' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            
            <Button 
              onClick={goNext}
              disabled={currentSlide === SLIDES.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}