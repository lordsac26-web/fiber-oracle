import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Circle, AlertTriangle, CheckCircle2, Info, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import HiddenContentBanner from '@/components/HiddenContentBanner';

const CABLE_TYPES = {
  indoor: [
    { name: 'Simplex/Zipcord (3mm)', minBend: 30, loadedBend: 50, fiber: 'SMF/MMF' },
    { name: 'Distribution (6-12F)', minBend: 50, loadedBend: 100, fiber: 'SMF/MMF' },
    { name: 'Breakout (4-24F)', minBend: 75, loadedBend: 150, fiber: 'SMF/MMF' },
    { name: 'Ribbon (12-288F)', minBend: 100, loadedBend: 200, fiber: 'SMF' },
  ],
  outdoor: [
    { name: 'Loose Tube (6-288F)', minBend: 100, loadedBend: 200, fiber: 'SMF' },
    { name: 'Armored Loose Tube', minBend: 150, loadedBend: 300, fiber: 'SMF' },
    { name: 'ADSS (24-144F)', minBend: 200, loadedBend: 400, fiber: 'SMF' },
    { name: 'Figure-8 Self-Support', minBend: 200, loadedBend: 400, fiber: 'SMF' },
    { name: 'Direct Buried', minBend: 150, loadedBend: 300, fiber: 'SMF' },
  ],
  drop: [
    { name: 'Flat Drop (1-2F)', minBend: 15, loadedBend: 30, fiber: 'G.657.A1' },
    { name: 'Round Drop (1-4F)', minBend: 20, loadedBend: 40, fiber: 'G.657.A1' },
    { name: 'Toneable Drop', minBend: 25, loadedBend: 50, fiber: 'G.657.A1' },
    { name: 'Hardened Drop', minBend: 25, loadedBend: 50, fiber: 'G.657.A2' },
    { name: 'Bend-Insensitive', minBend: 7.5, loadedBend: 15, fiber: 'G.657.B3' },
  ],
  patchcord: [
    { name: 'Standard Patch (3mm)', minBend: 30, loadedBend: 50, fiber: 'G.652.D' },
    { name: 'Bend-Insensitive Patch', minBend: 10, loadedBend: 20, fiber: 'G.657.A1' },
    { name: 'Ultra-Bend Patch', minBend: 5, loadedBend: 10, fiber: 'G.657.B3' },
    { name: 'Armored Patch', minBend: 50, loadedBend: 100, fiber: 'G.652.D' },
  ],
};

const FIBER_SPECS = [
  { type: 'G.652.D', name: 'Standard SMF', minBend: 30, macrobendRadius: 30, notes: 'Standard single-mode, avoid tight bends' },
  { type: 'G.657.A1', name: 'Bend-Insensitive A1', minBend: 10, macrobendRadius: 10, notes: 'Good for indoor/FTTH, 10mm radius OK' },
  { type: 'G.657.A2', name: 'Bend-Insensitive A2', minBend: 7.5, macrobendRadius: 7.5, notes: 'Better bend tolerance, 7.5mm radius OK' },
  { type: 'G.657.B3', name: 'Ultra-Bend B3', minBend: 5, macrobendRadius: 5, notes: 'Best bend tolerance, 5mm radius OK, MDU ideal' },
];

export default function BendRadius() {
  const { preferences, updatePreferences } = useUserPreferences();
  const hiddenSections = preferences.hiddenSections?.bendradius || [];
  
  const allTabs = ['drop', 'indoor', 'outdoor', 'patchcord'];
  const visibleTabs = allTabs.filter(t => !hiddenSections.includes(t));
  
  const [activeTab, setActiveTab] = useState(visibleTabs[0] || 'drop');
  const [selectedCable, setSelectedCable] = useState(null);

  const handleShowAll = () => {
    updatePreferences({
      hiddenSections: {
        ...preferences.hiddenSections,
        bendradius: []
      }
    });
  };

  const renderSizeVisual = (radiusMm) => {
    // Common object comparisons
    if (radiusMm <= 10) return { object: 'Pencil', emoji: '✏️', desc: 'About the width of a pencil' };
    if (radiusMm <= 20) return { object: 'Quarter (US)', emoji: '🪙', desc: 'About the size of a quarter' };
    if (radiusMm <= 40) return { object: 'Golf Ball', emoji: '⚪', desc: 'About the size of a golf ball' };
    if (radiusMm <= 75) return { object: 'Tennis Ball', emoji: '🎾', desc: 'About the size of a tennis ball' };
    if (radiusMm <= 100) return { object: 'Baseball', emoji: '⚾', desc: 'About the size of a baseball' };
    if (radiusMm <= 150) return { object: 'Softball', emoji: '🥎', desc: 'About the size of a softball' };
    return { object: 'Grapefruit', emoji: '🍊', desc: 'About the size of a grapefruit' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Macrobend Radius Guide</h1>
              <p className="text-xs text-gray-500">Minimum bend radius by cable type</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <HiddenContentBanner 
          hiddenCount={hiddenSections.length} 
          moduleId="bendradius" 
          onShowAll={handleShowAll}
        />

        {/* Warning Banner */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-200">Macrobends Cause Signal Loss</div>
              <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Bending fiber below minimum radius causes light to escape the core, resulting in increased attenuation and potential permanent damage.
              </div>
            </div>
          </div>
        </div>

        {/* Cable Type Tabs */}
        {visibleTabs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <EyeOff className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">All cable type sections are hidden.</p>
            <Link to={createPageUrl('Settings') + '?tab=visibility'}>
              <Button variant="outline" className="mt-4">Manage Visibility</Button>
            </Link>
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full grid-cols-${visibleTabs.length} bg-white dark:bg-gray-800 shadow-lg`}>
            {!hiddenSections.includes('drop') && <TabsTrigger value="drop" className="text-xs md:text-sm">Drop</TabsTrigger>}
            {!hiddenSections.includes('indoor') && <TabsTrigger value="indoor" className="text-xs md:text-sm">Indoor</TabsTrigger>}
            {!hiddenSections.includes('outdoor') && <TabsTrigger value="outdoor" className="text-xs md:text-sm">Outdoor</TabsTrigger>}
            {!hiddenSections.includes('patchcord') && <TabsTrigger value="patchcord" className="text-xs md:text-sm">Patch</TabsTrigger>}
          </TabsList>

          {Object.entries(CABLE_TYPES).filter(([type]) => !hiddenSections.includes(type)).map(([type, cables]) => (
            <TabsContent key={type} value={type} className="mt-4 space-y-3">
              {cables.map((cable) => {
                const visual = renderSizeVisual(cable.minBend);
                const isSelected = selectedCable?.name === cable.name;
                
                return (
                  <button
                    key={cable.name}
                    onClick={() => setSelectedCable(isSelected ? null : cable)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{cable.name}</div>
                        <div className={`text-sm ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                          Fiber: {cable.fiber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{visual.emoji}</span>
                          <div>
                            <div className={`text-2xl font-bold font-mono ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                              {cable.minBend}mm
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                              min radius
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-blue-400/30 space-y-4">
                        {/* Visual Bend Radius Diagram */}
                        <div className="flex justify-center">
                          <svg width="200" height="120" viewBox="0 0 200 120" className="drop-shadow-lg">
                            {/* Cable path showing bend */}
                            <path
                              d={`M 20 100 L 20 ${60 - Math.min(cable.minBend / 5, 30)} Q 20 20 ${50 + Math.min(cable.minBend / 3, 40)} 20 L 180 20`}
                              fill="none"
                              stroke="rgba(255,255,255,0.9)"
                              strokeWidth="8"
                              strokeLinecap="round"
                            />
                            {/* Inner cable core */}
                            <path
                              d={`M 20 100 L 20 ${60 - Math.min(cable.minBend / 5, 30)} Q 20 20 ${50 + Math.min(cable.minBend / 3, 40)} 20 L 180 20`}
                              fill="none"
                              stroke="#fbbf24"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            {/* Radius arc indicator */}
                            <path
                              d={`M 20 ${60 - Math.min(cable.minBend / 5, 30)} A ${20 + Math.min(cable.minBend / 5, 25)} ${20 + Math.min(cable.minBend / 5, 25)} 0 0 1 ${50 + Math.min(cable.minBend / 3, 40)} 20`}
                              fill="none"
                              stroke="rgba(255,255,255,0.4)"
                              strokeWidth="1"
                              strokeDasharray="4 2"
                            />
                            {/* Radius dimension line */}
                            <line x1="20" y1="45" x2={40 + Math.min(cable.minBend / 4, 30)} y2="20" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeDasharray="3 3" />
                            <circle cx={30 + Math.min(cable.minBend / 6, 15)} cy="32" r="12" fill="rgba(255,255,255,0.15)" />
                            <text x={30 + Math.min(cable.minBend / 6, 15)} y="36" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">R</text>
                            {/* Label */}
                            <text x="100" y="60" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">
                              Min Radius: {cable.minBend}mm
                            </text>
                            {/* Good/Bad indicators */}
                            <circle cx="170" cy="70" r="8" fill="#22c55e" />
                            <text x="170" y="74" textAnchor="middle" fill="white" fontSize="10">✓</text>
                            <text x="170" y="90" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9">OK</text>
                          </svg>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-blue-100 text-xs">Unloaded (no tension)</div>
                            <div className="font-mono font-bold text-xl">{cable.minBend}mm</div>
                          </div>
                          <div>
                            <div className="text-blue-100 text-xs">Under Load (pulling)</div>
                            <div className="font-mono font-bold text-xl">{cable.loadedBend}mm</div>
                          </div>
                        </div>

                        {/* Size comparison visual */}
                        <div className="flex items-center justify-center gap-3 p-3 bg-blue-500/30 rounded-lg">
                          <span className="text-3xl">{visual.emoji}</span>
                          <div className="text-sm text-blue-100">
                            <span className="font-medium">{visual.object}</span> — {visual.desc}
                          </div>
                        </div>

                        {/* Danger zone visual */}
                        <div className="flex items-center gap-3 p-2 bg-red-500/20 rounded-lg text-sm">
                          <svg width="40" height="30" viewBox="0 0 40 30">
                            <path d="M 5 25 L 5 10 Q 5 5 15 5 L 35 5" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
                            <text x="10" y="18" fill="#fca5a5" fontSize="8">⚠</text>
                          </svg>
                          <span className="text-red-200">Tighter than {cable.minBend}mm = signal loss & damage</span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
        )}

        {/* Fiber Type Reference */}
        {visibleTabs.length > 0 && (
        <>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Fiber Type Bend Tolerance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {FIBER_SPECS.map((fiber) => (
                <div key={fiber.type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{fiber.type}</Badge>
                      <span className="font-medium">{fiber.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{fiber.notes}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-blue-600">{fiber.minBend}mm</div>
                    <div className="text-xs text-gray-400">min radius</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visual Size Guide */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Quick Size Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { size: 5, object: '✏️ Pencil', label: '5mm' },
                { size: 10, object: '🪙 Quarter', label: '10mm' },
                { size: 30, object: '⚾ Baseball', label: '30mm' },
                { size: 100, object: '🥎 Softball', label: '100mm' },
              ].map((ref) => (
                <div key={ref.size} className="text-center p-4 bg-white dark:bg-gray-700 rounded-xl">
                  <div className="text-3xl mb-2">{ref.object.split(' ')[0]}</div>
                  <div className="text-xl font-bold font-mono text-blue-600">{ref.label}</div>
                  <div className="text-xs text-gray-500">{ref.object.split(' ')[1]}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Always use bend-limiting boots on connectors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Use G.657.A1/A2 fiber for indoor/FTTH installations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Double the minimum radius when cable is under tension</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>Route cables in smooth arcs, avoid sharp corners</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>Never kink or crush fiber cable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">✗</span>
                <span>Avoid cable ties that pinch the cable</span>
              </li>
            </ul>
          </CardContent>
        </Card>
        </>
        )}
      </main>
    </div>
  );
}