import React from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

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
    ituNote: 'Optimized for access networks.'
  },
  'G.657.A2': { 
    name: 'G.657.A2 (Enhanced)', 
    minBend: 15, 
    color: '#ec4899', 
    lossFactor: 0.18,
    ituNote: 'Excellent bend performance.'
  },
  'G.657.B3': { 
    name: 'G.657.B3 (Ultra-Bend)', 
    minBend: 7.5, 
    color: '#10b981', 
    lossFactor: 0.08,
    ituNote: 'Ultra bend-insensitive for tight spaces.'
  },
};

export default function FiberBendVisualizer3D() {
  const stageRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const particlesRef = React.useRef([]);
  const leakageRef = React.useRef([]);

  // State
  const [bendRadius, setBendRadius] = React.useState(30);
  const [wavelength, setWavelength] = React.useState('1550');
  const [fiberType, setFiberType] = React.useState('G.652.D');
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 300 });

  // Derived values
  const currentFiber = FIBER_TYPES[fiberType];
  const isOverBent = bendRadius < currentFiber.minBend;

  // ITU-T inspired loss model
  const calculateLoss = (radius, wl, fiber) => {
    if (radius > 60) return 0;
    if (radius < 5) return 999;

    const R = radius;
    let baseLoss;

    if (wl === '1310') {
      baseLoss = (12 / (R * R)) * Math.exp(-0.28 * R);
    } else {
      baseLoss = (35 / (R * R)) * Math.exp(-0.22 * R);
    }

    let loss = baseLoss * fiber.lossFactor;

    // Extra penalty for 1550nm at very tight bends
    if (wl === '1550' && R < 15) loss *= 1.65;

    return Math.max(0, loss);
  };

  const currentLoss = calculateLoss(bendRadius, wavelength, currentFiber);
  const otherWavelength = wavelength === '1550' ? '1310' : '1550';
  const otherLoss = calculateLoss(bendRadius, otherWavelength, currentFiber);

  const getLossColor = (loss) => {
    if (loss < 0.1) return 'text-green-500';
    if (loss < 1) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLossBgColor = (loss) => {
    if (loss < 0.1) return 'bg-green-500/20 border-green-500';
    if (loss < 1) return 'bg-yellow-500/20 border-yellow-500';
    return 'bg-red-500/20 border-red-500';
  };

  // Fiber path calculation
  const calculateFiberPath = () => {
    const { width, height } = dimensions;
    const centerY = height / 2;
    const points = [];
    const segments = 120;
    const maxSagitta = height * 0.38;
    const sagitta = maxSagitta * Math.max(0, (60 - bendRadius) / 55);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = width * t;
      const y = centerY + Math.sin(t * Math.PI) * sagitta;
      points.push(x, y);
    }
    return points;
  };

  const fiberPath = calculateFiberPath();

  const getPointOnCurve = (t) => {
    const numPoints = fiberPath.length / 2;
    let idx = Math.floor(t * (numPoints - 1)) * 2;
    idx = Math.max(0, Math.min(idx, fiberPath.length - 2));

    const x = fiberPath[idx];
    const y = fiberPath[idx + 1];
    const nextX = fiberPath[idx + 2] ?? x;
    const nextY = fiberPath[idx + 3] ?? y;
    const angle = Math.atan2(nextY - y, nextX - x);

    return { x, y, angle };
  };

  const coreOpacity = Math.max(0.35, 1 - Math.min(currentLoss / 8, 0.85));

  // Animation Loop
  React.useEffect(() => {
    const animate = () => {
      // Signal particles
      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, t: p.t + 0.009 }))
        .filter(p => p.t <= 1.0);

      if (Math.random() < 0.22) {
        particlesRef.current.push({ id: Math.random(), t: 0 });
      }
      particlesRef.current = particlesRef.current.slice(-40);

      // Leakage particles
      if (isOverBent) {
        const spawnRate = Math.min(0.18 * (currentLoss / 3), 0.45);
        if (Math.random() < spawnRate) {
          const spawnT = 0.35 + Math.random() * 0.3;
          const pos = getPointOnCurve(spawnT);

          leakageRef.current.push({
            id: Math.random(),
            x: pos.x,
            y: pos.y,
            vx: (Math.random() - 0.5) * 3.5,
            vy: -Math.random() * 4 - 1.5,
            life: 1.0,
            size: 2.5 + Math.random() * 3,
          });
        }
      }

      leakageRef.current = leakageRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.018,
          vx: p.vx * 0.985,
          vy: p.vy * 0.985,
        }))
        .filter(p => p.life > 0)
        .slice(-60);

      if (stageRef.current) {
        stageRef.current.getStage().batchDraw();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [bendRadius, isOverBent, currentLoss]);

  // Resize handler
  React.useEffect(() => {
    const updateDimensions = () => {
      const container = stageRef.current?.container()?.parentElement;
      if (container) {
        setDimensions({
          width: Math.max(600, container.clientWidth - 32),
          height: window.innerWidth < 768 ? 220 : 300,
        });
      }
    };

    const timeout = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Card className="bg-[#0a0a12] border-cyan-500/20 overflow-hidden">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            Fiber Bend Radius Visualizer
          </h3>

          <motion.div
            key={currentLoss}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`px-4 py-2 rounded-xl border ${getLossBgColor(currentLoss)}`}
          >
            <div className={`font-mono font-bold text-xl ${getLossColor(currentLoss)}`}>
              {currentLoss >= 10 ? '>> 10 dB (Severe)' : `${currentLoss.toFixed(2)} dB`}
            </div>
            <div className="text-xs text-slate-400">@ {wavelength} nm</div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-400 mb-1 block">Wavelength</label>
            <Tabs value={wavelength} onValueChange={setWavelength}>
              <TabsList className="bg-slate-800 border border-slate-700 w-full">
                <TabsTrigger value="1310" className="flex-1">1310 nm</TabsTrigger>
                <TabsTrigger value="1550" className="flex-1">1550 nm</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-400 mb-1 block">Fiber Type</label>
            <Select value={fiberType} onValueChange={setFiberType}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIBER_TYPES).map(([key, fiber]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fiber.color }} />
                      {fiber.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Visualization */}
        <div className="relative bg-[#0a0a12] rounded-lg border border-cyan-500/30 overflow-hidden">
          {isOverBent && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
              <Badge variant="destructive" className="gap-2 animate-pulse">
                <AlertTriangle className="h-4 w-4" />
                MACROBEND LOSS REGION
              </Badge>
            </div>
          )}

          <Stage width={dimensions.width} height={dimensions.height} ref={stageRef}>
            <Layer>
              {/* Cladding */}
              <Line
                points={fiberPath}
                stroke="#475569"
                strokeWidth={14}
                lineCap="round"
                lineJoin="round"
              />

              {/* Core */}
              <Line
                points={fiberPath}
                stroke="#67e8f9"
                strokeWidth={4.5}
                lineCap="round"
                lineJoin="round"
                opacity={coreOpacity}
                shadowBlur={currentLoss > 2 ? 24 : 14}
                shadowColor={currentLoss > 1 ? "#f87171" : "#67e8f9"}
              />

              {/* Signal particles */}
              {particlesRef.current.map(p => {
                const pos = getPointOnCurve(p.t);
                return (
                  <Circle
                    key={p.id}
                    x={pos.x}
                    y={pos.y}
                    radius={2.8}
                    fill="#67e8f9"
                    opacity={0.9}
                    shadowBlur={12}
                    shadowColor="#67e8f9"
                  />
                );
              })}

              {/* Leakage particles */}
              {leakageRef.current.map(p => (
                <Circle
                  key={p.id}
                  x={p.x}
                  y={p.y}
                  radius={p.size}
                  fill="#f87171"
                  opacity={p.life * 0.85}
                  shadowBlur={10}
                  shadowColor="#f87171"
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Bend Radius</span>
            <span className="font-mono font-bold">{bendRadius} mm</span>
          </div>
          <Slider
            value={[bendRadius]}
            onValueChange={v => setBendRadius(v[0])}
            min={5}
            max={60}
            step={1}
          />
        </div>

        {/* Explanation Panel */}
        <div className="bg-slate-900/70 border border-slate-700 rounded-xl p-5">
          <Tabs defaultValue="physics" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800">
              <TabsTrigger value="physics">Physics</TabsTrigger>
              <TabsTrigger value="itu">ITU-T Specs</TabsTrigger>
              <TabsTrigger value="practical">Practical Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="physics" className="mt-4 text-sm space-y-4 text-slate-300">
              <h4 className="text-cyan-400 font-semibold">Macrobending Physics</h4>
              <p>
                When a fiber is bent, the light ray on the outside of the bend must travel faster to keep up with the inner part. 
                Beyond a critical radius, this breaks <strong>Total Internal Reflection (TIR)</strong>, causing light to radiate into the cladding.
              </p>
              <p className="text-xs bg-slate-950 p-3 rounded border border-slate-700">
                Loss follows ≈ A/R² × e^(-B×R) — longer wavelengths (1550 nm) leak more easily due to larger mode field diameter.
              </p>
            </TabsContent>

            <TabsContent value="itu" className="mt-4 text-xs">
              <div className="space-y-2">
                <div className="font-semibold">Typical ITU-T Macrobend Loss (per turn @ 1550 nm)</div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-400">
                  <div>G.652.D @ 30 mm</div><div className="text-green-400">&lt; 0.1 dB</div>
                  <div>G.657.A1 @ 10 mm</div><div className="text-green-400">&lt; 0.75 dB</div>
                  <div>G.657.B3 @ 5 mm</div><div className="text-green-400">&lt; 0.15 dB</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="practical" className="mt-4 text-sm">
              <ul className="list-disc pl-5 space-y-2">
                <li>Always respect the manufacturer’s minimum bend radius.</li>
                <li>1550 nm and 1625 nm signals are more sensitive to bends.</li>
                <li>Use G.657 fibers in FTTH drops and tight indoor routing.</li>
                <li>Macrobend loss often appears as unexplained attenuation on OTDR traces.</li>
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  );
}