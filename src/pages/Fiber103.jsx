import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Cable, 
  Target,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  Activity,
  Server,
  Gauge,
  Search,
  Wrench,
  Eye,
  Radio,
  Thermometer,
  RefreshCw,
  XCircle,
  FileSearch,
  Layers,
  GitBranch,
  Clock,
  BarChart3,
  Stethoscope
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Fiber 103',
    subtitle: 'Advanced Troubleshooting Mastery',
    icon: Target,
    color: 'from-purple-500 to-indigo-600',
    content: (
      <div className="space-y-6 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Master advanced diagnostic techniques for complex FTTH and PON issues. This course is for experienced technicians ready to tackle the toughest problems.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="text-2xl font-bold text-purple-600">45</div>
            <div className="text-xs text-gray-500">Minutes</div>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <div className="text-2xl font-bold text-indigo-600">16</div>
            <div className="text-xs text-gray-500">Topics</div>
          </div>
          <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
            <div className="text-2xl font-bold text-violet-600">Expert</div>
            <div className="text-xs text-gray-500">Level</div>
          </div>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <strong>Prerequisites:</strong> Complete Fiber 101 and Fiber 102 before this course.
        </div>
      </div>
    )
  },
  {
    id: 'otdr-advanced',
    title: 'Advanced OTDR Trace Analysis',
    subtitle: 'Beyond basic event identification',
    icon: Activity,
    color: 'from-cyan-500 to-blue-600',
    content: (
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-300">
          Complex OTDR analysis requires understanding trace artifacts, measurement limitations, and advanced interpretation techniques.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
            <div className="font-bold text-cyan-700 mb-2">Dead Zones</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>Event Dead Zone:</span><span className="font-mono">0.8-8m</span></div>
              <div className="flex justify-between"><span>Attenuation Dead Zone:</span><span className="font-mono">3-25m</span></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Use shorter pulse widths for closely spaced events, but accept reduced dynamic range.</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="font-bold text-blue-700 mb-2">Pulse Width Selection</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>Short (5-30ns):</span><span>High resolution</span></div>
              <div className="flex justify-between"><span>Medium (100-275ns):</span><span>Balanced</span></div>
              <div className="flex justify-between"><span>Long (1-20μs):</span><span>Long range</span></div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="font-bold mb-2">Key Analysis Techniques:</div>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> Use LSA (Least Squares Approximation) for accurate loss measurement</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> Enable 2-point slope for precise segment attenuation</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> Use auto-analysis + manual verification for best results</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'ghost-events',
    title: 'Ghost Events & Artifacts',
    subtitle: 'Identifying what\'s real vs what\'s not',
    icon: Eye,
    color: 'from-violet-500 to-purple-600',
    content: (
      <div className="space-y-6">
        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
          <div className="font-bold text-violet-700 mb-3">Ghost Event Characteristics</div>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <span>Appears at exactly 2× the distance of a real reflective event</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <span>Caused by double reflection between high-reflectance connectors</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <span>Disappears when source connector is cleaned or reflectance reduced</span>
            </li>
          </ul>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200">
            <div className="font-bold text-red-700 mb-2">❌ Ghost Indicators</div>
            <ul className="text-sm space-y-1">
              <li>• Event at 2× known connector distance</li>
              <li>• No physical component at location</li>
              <li>• Lower amplitude than source reflection</li>
              <li>• Moves when launch cord changes</li>
            </ul>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200">
            <div className="font-bold text-green-700 mb-2">✓ How to Eliminate</div>
            <ul className="text-sm space-y-1">
              <li>• Clean launch cord connector</li>
              <li>• Use APC launch cord (lower reflectance)</li>
              <li>• Add mandrel wrap at source</li>
              <li>• Use shorter pulse width</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
          <strong>Pro Tip:</strong> If you're unsure if an event is a ghost, change the launch cord. Ghosts will move; real events won't.
        </div>
      </div>
    )
  },
  {
    id: 'bidirectional-analysis',
    title: 'Bidirectional OTDR Analysis',
    subtitle: 'The truth is in the average',
    icon: GitBranch,
    color: 'from-indigo-500 to-blue-600',
    content: (
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-300">
          Unidirectional OTDR measurements can show "gainers" or incorrect loss values. Bidirectional averaging reveals true splice loss.
        </p>
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
          <div className="font-bold text-indigo-700 mb-3">Why Gainers Occur</div>
          <p className="text-sm text-gray-600 mb-3">When light travels from a fiber with lower backscatter to higher backscatter, the splice appears as a "gain" because more light scatters back.</p>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg font-mono text-center">
            True Loss = (A→B Loss + B→A Loss) ÷ 2
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="font-bold mb-2">Direction A→B</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                <span>Splice 1:</span>
                <span className="font-mono text-green-600">+0.05 dB (gainer)</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-700 rounded">
                <span>Splice 2:</span>
                <span className="font-mono">0.08 dB</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="font-bold mb-2">Direction B→A</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-white dark:bg-gray-700 rounded">
                <span>Splice 1:</span>
                <span className="font-mono">0.15 dB</span>
              </div>
              <div className="flex justify-between p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                <span>Splice 2:</span>
                <span className="font-mono text-green-600">+0.02 dB (gainer)</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="font-bold text-green-700 mb-2">True Values (Averaged)</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Splice 1: (+0.05 + 0.15) ÷ 2 = <strong>0.05 dB</strong></div>
            <div>Splice 2: (0.08 + -0.02) ÷ 2 = <strong>0.03 dB</strong></div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'pon-diagnostics-deep',
    title: 'Deep PON Diagnostics',
    subtitle: 'OLT/ONT communication analysis',
    icon: Server,
    color: 'from-emerald-500 to-teal-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="font-bold text-emerald-700 mb-2">ONT States</div>
            <div className="text-sm space-y-2">
              <div className="p-2 bg-white dark:bg-gray-800 rounded"><strong>O1:</strong> Initial state - no signal</div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded"><strong>O2-O3:</strong> Standby - searching for OLT</div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded"><strong>O4:</strong> Ranging - measuring distance</div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded"><strong>O5:</strong> Operational - fully working</div>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded"><strong>O6-O7:</strong> Emergency/popup states</div>
            </div>
          </div>
          <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
            <div className="font-bold text-teal-700 mb-2">Registration Failures</div>
            <div className="text-sm space-y-2">
              <div className="p-2 bg-white dark:bg-gray-800 rounded">
                <strong>LOSI:</strong> Loss of Signal - no light reaching ONT
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded">
                <strong>LOFI:</strong> Loss of Frame - signal present but can't sync
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded">
                <strong>LOAMI:</strong> Loss of PLOAM - management message lost
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded">
                <strong>Deactivate:</strong> OLT intentionally disabled ONT
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <strong>Troubleshooting Flow:</strong>
          <div className="text-sm mt-2">
            Check ONT state → Verify provisioning → Measure Rx power → Check for alarms → Analyze error counters → Test with known-good ONT
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'error-counters',
    title: 'PON Error Counter Analysis',
    subtitle: 'What the numbers mean',
    icon: BarChart3,
    color: 'from-rose-500 to-pink-600',
    content: (
      <div className="space-y-6">
        <div className="grid gap-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border-l-4 border-rose-500">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-rose-700">BIP Errors</div>
                <p className="text-sm text-gray-600 mt-1">Bit Interleaved Parity - indicates bit errors in transmission</p>
              </div>
              <Badge className="bg-rose-500">Critical if &gt;100/15min</Badge>
            </div>
            <div className="mt-3 text-sm">
              <strong>Causes:</strong> Low power, dirty connectors, macrobends, failing laser
            </div>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-l-4 border-amber-500">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-amber-700">FEC Corrected</div>
                <p className="text-sm text-gray-600 mt-1">Errors fixed by Forward Error Correction</p>
              </div>
              <Badge className="bg-amber-500">Monitor trend</Badge>
            </div>
            <div className="mt-3 text-sm">
              <strong>Note:</strong> Some is normal. Watch for increasing trends indicating degradation.
            </div>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-l-4 border-red-600">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-red-700">FEC Uncorrectable</div>
                <p className="text-sm text-gray-600 mt-1">Errors too severe for FEC to fix</p>
              </div>
              <Badge className="bg-red-600">Must be 0</Badge>
            </div>
            <div className="mt-3 text-sm">
              <strong>Action:</strong> Immediate investigation required - causes packet loss
            </div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-purple-700">HEC/GEM Errors</div>
                <p className="text-sm text-gray-600 mt-1">Header Error Control or GEM frame errors</p>
              </div>
              <Badge className="bg-purple-500">Check timing</Badge>
            </div>
            <div className="mt-3 text-sm">
              <strong>Causes:</strong> Ranging issues, collision, timing drift, failing ONT
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'wavelength-issues',
    title: 'Wavelength-Specific Issues',
    subtitle: 'When λ matters',
    icon: Radio,
    color: 'from-indigo-500 to-violet-600',
    content: (
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-300">
          Different wavelengths behave differently in fiber. Understanding this is crucial for advanced troubleshooting.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <div className="font-bold text-indigo-700 mb-2">Bend Sensitivity</div>
            <div className="text-sm space-y-2">
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>1310nm:</span>
                <span className="text-green-600">Less sensitive</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>1490nm (GPON DS):</span>
                <span className="text-amber-600">Moderate</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>1550nm:</span>
                <span className="text-red-600">Most sensitive</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>1577nm (XGS DS):</span>
                <span className="text-red-600">Very sensitive</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
            <div className="font-bold text-violet-700 mb-2">Diagnostic Implications</div>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>If 1550nm loss &gt;&gt; 1310nm loss = macrobend</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>If both wavelengths show equal loss = connector/splice</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>XGS-PON more affected by bends than GPON</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <strong>RF Video Overlay (1550nm):</strong> If RF video drops but data works, check for macrobends - video wavelength is most bend-sensitive.
        </div>
      </div>
    )
  },
  {
    id: 'intermittent-faults',
    title: 'Hunting Intermittent Faults',
    subtitle: 'The hardest problems to solve',
    icon: RefreshCw,
    color: 'from-amber-500 to-orange-600',
    content: (
      <div className="space-y-6">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <div className="font-bold text-amber-700 mb-3">Intermittent Fault Categories</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-center">
              <Thermometer className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <div className="font-bold text-sm">Thermal</div>
              <div className="text-xs text-gray-500">Temperature changes</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-center">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="font-bold text-sm">Mechanical</div>
              <div className="text-xs text-gray-500">Movement/vibration</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <div className="font-bold text-sm">Time-Based</div>
              <div className="text-xs text-gray-500">Load or schedule</div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="font-bold mb-2">Thermal Intermittents</div>
            <ul className="text-sm space-y-1">
              <li>• Log temperature alongside error counters</li>
              <li>• Check outdoor enclosures for seal integrity</li>
              <li>• Mechanical splices are more thermal-sensitive</li>
              <li>• Index gel viscosity changes with temperature</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="font-bold mb-2">Mechanical Intermittents</div>
            <ul className="text-sm space-y-1">
              <li>• Use real-time power meter while flexing cables</li>
              <li>• Check for cracked ferrules with 400x scope</li>
              <li>• Verify connector fully seated (audible click)</li>
              <li>• Look for damaged cable under floor tiles/risers</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'systematic-approach',
    title: 'Systematic Fault Isolation',
    subtitle: 'Divide and conquer methodology',
    icon: Search,
    color: 'from-blue-500 to-indigo-600',
    content: (
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-300">
          Complex problems require systematic isolation. Follow this methodology to efficiently pinpoint fault location.
        </p>
        <div className="space-y-3">
          {[
            { step: 1, title: 'Gather Information', desc: 'Document symptoms, timeline, affected services, recent changes', color: 'bg-blue-500' },
            { step: 2, title: 'Establish Baseline', desc: 'What should the readings be? Compare to documentation/history', color: 'bg-indigo-500' },
            { step: 3, title: 'Divide the Link', desc: 'Test at midpoint - which half contains the fault?', color: 'bg-purple-500' },
            { step: 4, title: 'Continue Dividing', desc: 'Keep halving until fault location is isolated', color: 'bg-pink-500' },
            { step: 5, title: 'Root Cause Analysis', desc: 'Identify why it failed, not just what failed', color: 'bg-rose-500' },
            { step: 6, title: 'Document & Prevent', desc: 'Update records, implement preventive measures', color: 'bg-red-500' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
      </div>
    )
  },
  {
    id: 'splitter-failures',
    title: 'Splitter Failure Analysis',
    subtitle: 'Diagnosing passive device issues',
    icon: Layers,
    color: 'from-teal-500 to-cyan-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
            <div className="font-bold text-teal-700 mb-2">Splitter Failure Modes</div>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Complete failure - no output on any port</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span>Partial failure - some ports affected</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span>High insertion loss - gradual degradation</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span>Wavelength-dependent loss - affects some λ more</span>
              </li>
            </ul>
          </div>
          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
            <div className="font-bold text-cyan-700 mb-2">Diagnostic Steps</div>
            <ol className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-600">1.</span>
                <span>Measure input power to splitter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-600">2.</span>
                <span>Measure each output port</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-600">3.</span>
                <span>Calculate actual vs expected loss</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-600">4.</span>
                <span>Check uniformity across ports (±1.5 dB typical)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-cyan-600">5.</span>
                <span>Test at multiple wavelengths if possible</span>
              </li>
            </ol>
          </div>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <strong>Warning Signs:</strong> If multiple customers on the same splitter report issues simultaneously, suspect the splitter or upstream fiber.
        </div>
      </div>
    )
  },
  {
    id: 'connector-advanced',
    title: 'Advanced Connector Diagnostics',
    subtitle: 'Beyond pass/fail inspection',
    icon: Eye,
    color: 'from-purple-500 to-pink-600',
    content: (
      <div className="space-y-6">
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <div className="font-bold text-purple-700 mb-3">IEC 61300-3-35 Zones</div>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold">Core</div>
              <div className="text-xs text-gray-500">0-25μm</div>
              <div className="text-xs text-red-600">No defects</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold">Cladding</div>
              <div className="text-xs text-gray-500">25-120μm</div>
              <div className="text-xs text-amber-600">Limited</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold">Adhesive</div>
              <div className="text-xs text-gray-500">120-130μm</div>
              <div className="text-xs text-amber-600">Limited</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold">Contact</div>
              <div className="text-xs text-gray-500">130-250μm</div>
              <div className="text-xs text-green-600">Acceptable</div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="font-bold mb-2">Scratch Analysis</div>
            <ul className="text-sm space-y-1">
              <li>• Radial scratches: usually from poor cleaning technique</li>
              <li>• Concentric rings: polishing issue</li>
              <li>• Deep gouges in core: requires re-termination</li>
              <li>• Edge chipping: connector damage, replace</li>
            </ul>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="font-bold mb-2">Contamination Types</div>
            <ul className="text-sm space-y-1">
              <li>• Dust particles: dry cleaning usually effective</li>
              <li>• Oil/fingerprints: wet cleaning required</li>
              <li>• Epoxy residue: may need re-polishing</li>
              <li>• Burnt residue: replace connector</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'test-equipment',
    title: 'Test Equipment Mastery',
    subtitle: 'Calibration and advanced usage',
    icon: Gauge,
    color: 'from-orange-500 to-red-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <div className="font-bold text-orange-700 mb-2">Calibration Best Practices</div>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Annual factory calibration (minimum)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Daily reference cord check before testing</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Keep calibration certificates current</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Document reference values for trending</span>
              </li>
            </ul>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <div className="font-bold text-red-700 mb-2">Common Errors</div>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Not zeroing/referencing before test</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Using wrong reference method</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Dirty reference cords</span>
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <span>Wrong wavelength selected</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <strong>OTDR Reference Methods:</strong>
          <div className="text-sm mt-2 grid grid-cols-3 gap-2">
            <div className="p-2 bg-white dark:bg-gray-800 rounded text-center">
              <div className="font-bold">1-Jumper</div>
              <div className="text-xs">Includes launch connector</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded text-center">
              <div className="font-bold">2-Jumper</div>
              <div className="text-xs">Most accurate</div>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded text-center">
              <div className="font-bold">3-Jumper</div>
              <div className="text-xs">TIA-526-14 compliant</div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'documentation-practices',
    title: 'Documentation Excellence',
    subtitle: 'If it\'s not documented, it didn\'t happen',
    icon: FileSearch,
    color: 'from-slate-500 to-gray-600',
    content: (
      <div className="space-y-6">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/20 rounded-xl">
          <div className="font-bold text-slate-700 mb-3">Critical Documentation Elements</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-medium text-sm">Before Work:</div>
              <ul className="text-sm space-y-1 pl-4">
                <li>☐ Initial power readings</li>
                <li>☐ OTDR baseline trace</li>
                <li>☐ Photos of existing conditions</li>
                <li>☐ Error counter snapshot</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-sm">After Work:</div>
              <ul className="text-sm space-y-1 pl-4">
                <li>☐ Final power readings</li>
                <li>☐ New OTDR trace</li>
                <li>☐ Photos of completed work</li>
                <li>☐ Updated network diagram</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="font-bold mb-2">Troubleshooting Log Format</div>
          <div className="text-sm space-y-2 font-mono bg-white dark:bg-gray-900 p-3 rounded">
            <div>Date/Time: ___________</div>
            <div>Ticket #: ___________</div>
            <div>Symptom: ___________</div>
            <div>Tests Performed: ___________</div>
            <div>Findings: ___________</div>
            <div>Resolution: ___________</div>
            <div>Root Cause: ___________</div>
            <div>Preventive Action: ___________</div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
          <strong>Pro Tip:</strong> Take photos of everything. Storage is cheap; truck rolls are expensive.
        </div>
      </div>
    )
  },
  {
    id: 'fiber-doctor-intro',
    title: 'Using Fiber Doctor',
    subtitle: 'Your diagnostic partner',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    content: (
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-gray-300">
          The Fiber Doctor tool in Fiber Oracle guides you through symptom-based troubleshooting with expert decision trees.
        </p>
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
          <div className="font-bold text-rose-700 mb-3">Fiber Doctor Capabilities</div>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Symptom-based diagnostic flowcharts</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Probable causes ranked by likelihood</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Step-by-step recommended actions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Required tools for each diagnosis</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>PON-specific reference values</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Visual reference images for comparison</span>
            </li>
          </ul>
        </div>
        <Link to={createPageUrl('FiberDoctor')}>
          <Button className="w-full" size="lg">
            <Stethoscope className="h-4 w-4 mr-2" />
            Launch Fiber Doctor
          </Button>
        </Link>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'Congratulations!',
    subtitle: 'You\'ve completed Fiber 103',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-600',
    content: (
      <div className="space-y-6 text-center">
        <div className="inline-block p-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          You've mastered advanced troubleshooting techniques! You now have expert-level knowledge of OTDR analysis, PON diagnostics, and systematic fault isolation.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Link to={createPageUrl('FiberDoctor')}>
            <Button className="w-full" size="lg">
              <Stethoscope className="h-4 w-4 mr-2" />
              Fiber Doctor
            </Button>
          </Link>
          <Link to={createPageUrl('Education')}>
            <Button variant="outline" className="w-full" size="lg">
              <BookOpen className="h-4 w-4 mr-2" />
              Education Hub
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          "When you need to know, ask the Oracle."
        </p>
      </div>
    )
  },
];

export default function Fiber103() {
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
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fiber 103</h1>
                <p className="text-xs text-gray-500">Advanced Troubleshooting</p>
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
          
          <CardContent className="p-6 md:p-8 min-h-[400px]">
            {slide.content}
          </CardContent>
          
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
                      ? 'bg-purple-600 w-6' 
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