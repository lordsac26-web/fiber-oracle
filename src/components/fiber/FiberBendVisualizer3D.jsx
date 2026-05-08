import React from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';
// ... other imports

const FIBER_TYPES = {
  'G.652.D': { 
    name: 'G.652.D (Standard SMF)', 
    minBend: 30, 
    color: '#3b82f6', 
    lossFactor: 1.0,
    ituNote: 'Standard single-mode fiber. High bend sensitivity.'
  },
  'G.657.A1': { 
    name: 'G.657.A1 (Bend-Insensitive)', 
    minBend: 20, 
    color: '#8b5cf6', 
    lossFactor: 0.35,
    ituNote: 'Optimized for access networks. Good bend performance.'
  },
  'G.657.A2': { 
    name: 'G.657.A2 (Enhanced)', 
    minBend: 15, 
    color: '#ec4899', 
    lossFactor: 0.18,
    ituNote: 'Excellent bend performance at 7.5–10 mm.'
  },
  'G.657.B3': { 
    name: 'G.657.B3 (Ultra-Bend)', 
    minBend: 7.5, 
    color: '#10b981', 
    lossFactor: 0.08,
    ituNote: 'Ultra bend-insensitive. Ideal for tight indoor routing.'
  },
};

// Improved ITU-T inspired loss model
const calculateLoss = (radius, wl, fiber) => {
  if (radius > 60) return 0;
  if (radius < 5) return 999;

  // Base Marcuse-inspired model (exponential decay)
  let baseLoss;
  const R = radius;
  
  if (wl === '1310') {
    baseLoss = (12 / (R * R)) * Math.exp(-0.28 * R);
  } else { // 1550 nm (higher sensitivity)
    baseLoss = (35 / (R * R)) * Math.exp(-0.22 * R);
  }

  // Apply fiber-type scaling + wavelength adjustment for 1625 nm behavior
  let adjusted = baseLoss * fiber.lossFactor;
  
  // Extra penalty for longer wavelengths and very tight bends
  if (wl === '1550' && R < 15) {
    adjusted *= 1.6;
  }

  return Math.max(0, adjusted);
};

export default function FiberBendVisualizer() {
  // ... existing state and refs ...

  const currentFiber = FIBER_TYPES[fiberType];
  const isOverBent = bendRadius < currentFiber.minBend;
  const currentLoss = calculateLoss(bendRadius, wavelength, currentFiber);
  const otherWavelength = wavelength === '1550' ? '1310' : '1550';
  const otherLoss = calculateLoss(bendRadius, otherWavelength, currentFiber);

  // ... keep your existing calculateFiberPath, getPointOnCurve, animation, etc. ...

  return (
    <Card className="bg-[#0a0a12] border-cyan-500/20 overflow-hidden">
      <div className="p-4 space-y-6">
        {/* Header + Controls (keep as before) */}

        {/* Visualization Canvas (keep as before with improvements) */}

        {/* Bend Radius Slider + References (keep) */}

        {/* === NEW EXPLANATION PANEL === */}
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-5">
          <Tabs defaultValue="physics" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800">
              <TabsTrigger value="physics">Physics of Macrobends</TabsTrigger>
              <TabsTrigger value="itu">ITU-T Specs</TabsTrigger>
              <TabsTrigger value="practical">Practical Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="physics" className="mt-4 space-y-4 text-sm">
              <div className="prose prose-invert text-slate-300">
                <h4 className="text-cyan-400">What are Macrobends?</h4>
                <p>
                  <strong>Macrobending</strong> occurs when an optical fiber is bent with a radius of curvature large enough to be visible (typically &gt;5 mm), but small enough to cause light to escape the core.
                </p>
                
                <h4 className="text-cyan-400 mt-4">The Physics Behind It</h4>
                <p>
                  In straight fiber, light propagates via <strong>Total Internal Reflection (TIR)</strong> at the core-cladding interface. When the fiber is bent:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The mode field shifts outward due to centrifugal force analogy in the curved wavefront.</li>
                  <li>Part of the evanescent field extends further into the cladding.</li>
                  <li>Beyond a critical radius, the phase velocity required for TIR cannot be maintained → light radiates away as cladding/radiation modes.</li>
                  <li>Higher-order modes leak first; longer wavelengths (1550 nm vs 1310 nm) are more sensitive because their mode field diameter is larger.</li>
                </ul>
                
                <div className="text-xs bg-slate-950 p-3 rounded mt-3 border border-slate-700">
                  Loss ≈ A / R² × exp(-B × R)  (Marcuse approximation)<br/>
                  Where R = bend radius, and constants A/B depend on wavelength, core-cladding Δn, and mode field diameter.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="itu" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-white mb-2">Typical ITU-T Macrobend Limits (per turn)</div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>G.652.D @ 1550 nm (30 mm)</span><span className="text-green-400">&lt;0.1 dB</span></div>
                    <div className="flex justify-between"><span>G.657.A1 @ 1550 nm (10 mm)</span><span className="text-green-400">&lt;0.75 dB</span></div>
                    <div className="flex justify-between"><span>G.657.A2 @ 1550 nm (7.5 mm)</span><span className="text-green-400">&lt;0.5 dB</span></div>
                    <div className="flex justify-between"><span>G.657.B3 @ 1550 nm (5 mm)</span><span className="text-green-400">&lt;0.15 dB</span></div>
                  </div>
                </div>
                <div className="text-slate-400 text-[10px] leading-relaxed">
                  Note: Real loss is specified for a defined number of turns at particular wavelengths (often 1550 &amp; 1625 nm). 
                  Your current simulation shows <span className="text-cyan-400 font-mono">{currentLoss.toFixed(2)} dB</span> loss at the selected radius and wavelength for a representative bend segment.
                  {currentFiber.ituNote}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="practical" className="mt-4 text-sm text-slate-300 space-y-3">
              <ul className="space-y-3">
                <li><strong>Always respect the fiber's minimum bend radius</strong> — especially during installation and cable management.</li>
                <li>Tighter bends are more problematic at 1550/1625 nm (common for high-speed data) than at 1310 nm.</li>
                <li>Use G.657 fibers for FTTH, indoor, and tight routing scenarios.</li>
                <li>Excessive macrobend loss appears as increased attenuation without obvious connector or splice issues — a common troubleshooting gotcha.</li>
              </ul>
              <div className="p-3 bg-amber-950/50 border border-amber-500/30 rounded text-amber-300 text-xs">
                <strong>Pro Tip for Techs:</strong> When OTDR testing shows unexplained loss peaks, visually inspect for tight bends or pinch points first.
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Legend + Formula (keep/enhance as needed) */}
      </div>
    </Card>
  );
}