import React from 'react';
import { Stage, Layer, Line, Circle, Group } from 'react-konva';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

// Fiber type specifications
const FIBER_TYPES = {
  'G.652.D': { name: 'G.652.D (Standard SMF)', minBend: 30, color: '#3b82f6' },
  'G.657.A1': { name: 'G.657.A1 (Bend-Insensitive)', minBend: 20, color: '#8b5cf6' },
  'G.657.A2': { name: 'G.657.A2 (Enhanced)', minBend: 15, color: '#ec4899' },
  'G.657.B3': { name: 'G.657.B3 (Ultra-Bend)', minBend: 7.5, color: '#10b981' },
};

export default function FiberBendVisualizer3D({ minBendRadius = 30 }) {
  const stageRef = React.useRef(null);
  const [bendRadius, setBendRadius] = React.useState(30);
  const [wavelength, setWavelength] = React.useState('1550');
  const [fiberType, setFiberType] = React.useState('G.652.D');
  const [particles, setParticles] = React.useState([]);
  const [leakageParticles, setLeakageParticles] = React.useState([]);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 300 });
  const animationRef = React.useRef(null);

  // Calculate macrobend loss based on wavelength
  const calculateLoss = (radius, wl) => {
    if (radius > 60) return 0;
    if (radius < 5) return 999; // Severe loss indicator
    
    const R = radius;
    if (wl === '1310') {
      return (8 / (R * R)) * Math.exp(-0.30 * R);
    } else {
      return (24 / (R * R)) * Math.exp(-0.20 * R);
    }
  };

  const currentLoss = calculateLoss(bendRadius, wavelength);
  const otherWavelength = wavelength === '1550' ? '1310' : '1550';
  const otherLoss = calculateLoss(bendRadius, otherWavelength);
  
  // Get current fiber specs
  const currentFiber = FIBER_TYPES[fiberType];
  const isOverBent = bendRadius < currentFiber.minBend;

  // Loss color coding
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

  // Calculate fiber curve path across full width
  const calculateFiberPath = () => {
    const width = dimensions.width;
    const height = dimensions.height;
    const centerY = height / 2;
    
    // Map bend radius (5-60mm) to visual curve height
    const maxCurveHeight = height * 0.35;
    const curveHeight = maxCurveHeight * Math.max(0, (60 - bendRadius) / 55);
    
    const points = [];
    const segments = 100;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = width * t;
      
      // Sine curve for smooth bend - peak at center
      const bendFactor = Math.sin(t * Math.PI);
      const y = centerY + bendFactor * curveHeight;
      
      points.push(x, y);
    }
    
    return points;
  };

  const fiberPath = calculateFiberPath();

  // Get point and tangent on curve
  const getPointOnCurve = (t) => {
    const index = Math.floor(t * (fiberPath.length / 2 - 1)) * 2;
    if (index >= fiberPath.length - 2) return { x: fiberPath[fiberPath.length - 2], y: fiberPath[fiberPath.length - 1], angle: 0 };
    
    const x = fiberPath[index];
    const y = fiberPath[index + 1];
    const nextX = fiberPath[index + 2] || x;
    const nextY = fiberPath[index + 3] || y;
    const angle = Math.atan2(nextY - y, nextX - x);
    
    return { x, y, angle };
  };

  // Core opacity based on loss
  const coreOpacity = Math.max(0.2, 1 - currentLoss / 5);

  // Animation loop
  React.useEffect(() => {
    const animate = () => {
      setParticles(prev => {
        // Update existing particles
        let updated = prev.map(p => ({
          ...p,
          t: p.t + 0.008, // Move along curve
        })).filter(p => p.t <= 1); // Remove particles that reached end

        // Spawn new particles
        if (Math.random() < 0.15) {
          updated.push({
            id: Math.random(),
            t: 0,
            opacity: 0.9,
          });
        }

        return updated.slice(-30); // Limit particle count
      });

      // Update leakage particles
      setLeakageParticles(prev => {
        let updated = prev.map(p => ({
          ...p,
          life: p.life - 0.015,
          offsetX: p.offsetX + p.vx,
          offsetY: p.offsetY + p.vy,
        })).filter(p => p.life > 0);

        // Spawn leakage particles if over-bent
        if (isOverBent && Math.random() < 0.1 * (1 + currentLoss / 2)) {
          const bendPoint = getPointOnCurve(0.5); // Spawn at peak bend
          updated.push({
            id: Math.random(),
            x: bendPoint.x,
            y: bendPoint.y,
            offsetX: 0,
            offsetY: 0,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 3 - 1,
            life: 1,
            size: 3 + Math.random() * 3,
          });
        }

        return updated.slice(-50);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bendRadius, isOverBent, currentLoss, dimensions]);

  // Handle resize
  React.useEffect(() => {
    const updateDimensions = () => {
      if (stageRef.current) {
        const container = stageRef.current.container();
        if (container && container.offsetParent) {
          setDimensions({
            width: container.offsetParent.clientWidth - 32,
            height: Math.min(300, window.innerWidth < 768 ? 200 : 300),
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <Card className="bg-[#0a0a12] border-cyan-500/20 overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            Fiber Bend Radius Visualizer
          </h3>
          
          {/* Loss Display */}
          <motion.div
            key={currentLoss}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`px-3 py-1 rounded-lg border ${getLossBgColor(currentLoss)}`}
          >
            <div className={`font-mono font-bold text-lg ${getLossColor(currentLoss)}`}>
              {currentLoss >= 10 ? '>> 10 dB (severe)' : `${currentLoss.toFixed(2)} dB`}
            </div>
            <div className="text-xs text-slate-400">@ {wavelength} nm</div>
          </motion.div>
        </div>

        {/* Wavelength & Fiber Type Selectors */}
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

        {/* Canvas Visualization */}
        <div className="bg-[#0a0a12] rounded-lg border border-cyan-500/30 overflow-hidden relative">
          {isOverBent && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                High loss region
              </Badge>
            </div>
          )}
          
          <Stage width={dimensions.width} height={dimensions.height} ref={stageRef}>
            <Layer>
              {/* Outer cladding (thicker, semi-transparent) */}
              <Line
                points={fiberPath}
                stroke="rgba(148, 163, 184, 0.3)"
                strokeWidth={12}
                lineCap="round"
                lineJoin="round"
                shadowBlur={5}
                shadowColor="rgba(148, 163, 184, 0.5)"
              />

              {/* Inner core (bright cyan glow) */}
              <Line
                points={fiberPath}
                stroke="#00f5ff"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                opacity={coreOpacity}
                shadowBlur={15}
                shadowColor="#00f5ff"
              />

              {/* Light particles traveling through fiber */}
              {particles.map(particle => {
                const pos = getPointOnCurve(particle.t);
                return (
                  <Circle
                    key={particle.id}
                    x={pos.x}
                    y={pos.y}
                    radius={3}
                    fill="#00f5ff"
                    opacity={particle.opacity * coreOpacity}
                    shadowBlur={10}
                    shadowColor="#00f5ff"
                  />
                );
              })}

              {/* Leakage particles (escape during bends) */}
              {leakageParticles.map(particle => (
                <Circle
                  key={particle.id}
                  x={particle.x + particle.offsetX}
                  y={particle.y + particle.offsetY}
                  radius={particle.size}
                  fill="#ff4444"
                  opacity={particle.life * 0.7}
                  shadowBlur={8}
                  shadowColor="#ff4444"
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Bend Radius Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Bend Radius</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">
                {bendRadius} mm
              </span>
              {isOverBent && (
                <Badge variant="destructive" className="text-xs">
                  Below min: {currentFiber.minBend}mm
                </Badge>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Slider
              value={[bendRadius]}
              onValueChange={(v) => setBendRadius(v[0])}
              min={5}
              max={60}
              step={1}
              className="cursor-pointer"
            />
            
            {/* Slider tick marks */}
            <div className="flex justify-between mt-1 px-1">
              {[10, 15, 20, 30, 50].map(mark => (
                <div key={mark} className="flex flex-col items-center">
                  <div className="w-px h-2 bg-slate-600" />
                  <span className="text-xs text-slate-500 mt-0.5">{mark}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>5mm (extreme)</span>
            <span className="text-cyan-400">Min safe: {currentFiber.minBend}mm</span>
            <span>60mm (gentle)</span>
          </div>
        </div>

        {/* Quick Size Reference Chart */}
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs font-semibold text-white mb-2">Quick Size Reference</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { size: 7, emoji: '✏️', label: 'Pencil', radius: '7mm' },
              { size: 15, emoji: '🪙', label: 'Quarter', radius: '15mm' },
              { size: 25, emoji: '⚪', label: 'Golf Ball', radius: '25mm' },
              { size: 40, emoji: '⚾', label: 'Baseball', radius: '40mm' },
            ].map((ref) => (
              <div 
                key={ref.size} 
                className={`text-center p-2 bg-slate-900/50 rounded-lg border transition-all cursor-pointer hover:scale-105 ${
                  Math.abs(bendRadius - ref.size) <= 5 
                    ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' 
                    : 'border-slate-700'
                }`}
                onClick={() => setBendRadius(ref.size)}
              >
                <div className="text-2xl mb-1">{ref.emoji}</div>
                <div className="text-sm font-bold font-mono text-cyan-400">{ref.radius}</div>
                <div className="text-[9px] text-slate-400">{ref.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loss comparison */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-slate-400">@ 1310 nm</div>
            <div className={`font-mono font-bold ${wavelength === '1310' ? getLossColor(currentLoss) : 'text-slate-500'}`}>
              {wavelength === '1310' 
                ? (currentLoss >= 10 ? '>> 10 dB' : `${currentLoss.toFixed(2)} dB`)
                : (otherLoss >= 10 ? '>> 10 dB' : `${otherLoss.toFixed(2)} dB`)}
            </div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded border border-slate-700">
            <div className="text-slate-400">@ 1550 nm</div>
            <div className={`font-mono font-bold ${wavelength === '1550' ? getLossColor(currentLoss) : 'text-slate-500'}`}>
              {wavelength === '1550'
                ? (currentLoss >= 10 ? '>> 10 dB' : `${currentLoss.toFixed(2)} dB`)
                : (otherLoss >= 10 ? '>> 10 dB' : `${otherLoss.toFixed(2)} dB`)}
            </div>
          </div>
        </div>

        {/* Quick Reference Safety Levels */}
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
          <div className="text-xs font-semibold text-white mb-2">Bend Radius Safety Levels</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-300">&lt;10mm: Severe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-slate-300">10-15mm: High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-slate-300">15-20mm: Moderate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-slate-300">&gt;20mm: Safe</span>
            </div>
          </div>
        </div>

        {/* Formula Explanation */}
        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-white">Macrobending Loss Formula</div>
          <div className="font-mono text-cyan-400">
            1310 nm: Loss (dB) ≈ (8 / R²) × e^(-0.30 × R)
          </div>
          <div className="font-mono text-cyan-400">
            1550 nm: Loss (dB) ≈ (24 / R²) × e^(-0.20 × R)
          </div>
          <div className="text-slate-500 leading-relaxed">
            Where R = bend radius in mm. This simplified model approximates typical single-mode fiber behavior. 
            Actual loss depends on fiber type, wavelength, coating, and exact bend profile. 
            Consult manufacturer datasheets for precise values.
          </div>
        </div>

        {/* Legend */}
        <div className="text-xs text-slate-400 space-y-1 p-2 bg-slate-900/30 rounded">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
            <span>Cyan glow = Light traveling through fiber core</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Red particles = Light leakage at tight bends</span>
          </div>
        </div>
      </div>
    </Card>
  );
}