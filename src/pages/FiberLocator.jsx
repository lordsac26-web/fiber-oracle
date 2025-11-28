import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Cable, Palette, Hash, ArrowRight, Layers, Settings2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// TIA-598 Color Code Standard
const TIA_COLORS = [
  { position: 1, color: 'Blue', hex: '#0066CC' },
  { position: 2, color: 'Orange', hex: '#FF6600' },
  { position: 3, color: 'Green', hex: '#00AA00' },
  { position: 4, color: 'Brown', hex: '#8B4513' },
  { position: 5, color: 'Slate', hex: '#708090' },
  { position: 6, color: 'White', hex: '#FFFFFF', border: true },
  { position: 7, color: 'Red', hex: '#CC0000' },
  { position: 8, color: 'Black', hex: '#000000' },
  { position: 9, color: 'Yellow', hex: '#FFCC00' },
  { position: 10, color: 'Violet', hex: '#8800AA' },
  { position: 11, color: 'Rose', hex: '#FF66AA' },
  { position: 12, color: 'Aqua', hex: '#00CCCC' },
];

// Common cable structures
const CABLE_STRUCTURES = [
  { id: '144', label: '144-fiber', tubes: 12, fibersPerTube: 12, totalFibers: 144, levels: 2 },
  { id: '288', label: '288-fiber', tubes: 24, fibersPerTube: 12, totalFibers: 288, levels: 3, unitsOf: 144 },
  { id: '432', label: '432-fiber', tubes: 36, fibersPerTube: 12, totalFibers: 432, levels: 3, unitsOf: 144 },
  { id: '576', label: '576-fiber', tubes: 48, fibersPerTube: 12, totalFibers: 576, levels: 3, unitsOf: 144 },
  { id: '864', label: '864-fiber', tubes: 72, fibersPerTube: 12, totalFibers: 864, levels: 3, unitsOf: 144 },
  { id: '1728', label: '1728-fiber', tubes: 144, fibersPerTube: 12, totalFibers: 1728, levels: 4, unitsOf: 144 },
  { id: '3456', label: '3456-fiber', tubes: 288, fibersPerTube: 12, totalFibers: 3456, levels: 4, unitsOf: 144 },
  { id: 'ribbon144', label: '144-fiber Ribbon', ribbons: 12, fibersPerRibbon: 12, totalFibers: 144, levels: 2, type: 'ribbon' },
  { id: 'ribbon288', label: '288-fiber Ribbon', ribbons: 24, fibersPerRibbon: 12, totalFibers: 288, levels: 3, type: 'ribbon', unitsOf: 144 },
  { id: 'ribbon576', label: '576-fiber Ribbon', ribbons: 48, fibersPerRibbon: 12, totalFibers: 576, levels: 3, type: 'ribbon', unitsOf: 144 },
  { id: 'ribbon864', label: '864-fiber Ribbon', ribbons: 72, fibersPerRibbon: 12, totalFibers: 864, levels: 3, type: 'ribbon', unitsOf: 144 },
  { id: 'ribbon1728', label: '1728-fiber Ribbon', ribbons: 144, fibersPerRibbon: 12, totalFibers: 1728, levels: 4, type: 'ribbon', unitsOf: 144 },
  { id: 'ribbon3456', label: '3456-fiber Ribbon', ribbons: 288, fibersPerRibbon: 12, totalFibers: 3456, levels: 4, type: 'ribbon', unitsOf: 144 },
];

export default function FiberLocator() {
  const [mode, setMode] = useState('standard'); // 'standard' or 'highcount'
  const [cableStructure, setCableStructure] = useState('144');
  
  // Standard mode state
  const [binderColor, setBinderColor] = useState('');
  const [fiberColor, setFiberColor] = useState('');
  const [fiberNumber, setFiberNumber] = useState(null);
  
  // High-count mode state
  const [unitNumber, setUnitNumber] = useState('');
  const [tubeColor, setTubeColor] = useState('');
  const [hcFiberColor, setHcFiberColor] = useState('');
  const [hcFiberNumber, setHcFiberNumber] = useState(null);
  const [hcResult, setHcResult] = useState(null);

  const selectedStructure = CABLE_STRUCTURES.find(s => s.id === cableStructure);

  // Standard mode: Calculate fiber number from colors
  const calculateFiberNumber = (binder, fiber) => {
    if (!binder || !fiber) return null;
    const binderPos = TIA_COLORS.find(c => c.color === binder)?.position || 0;
    const fiberPos = TIA_COLORS.find(c => c.color === fiber)?.position || 0;
    return (binderPos - 1) * 12 + fiberPos;
  };

  // Standard mode: Calculate colors from fiber number
  const calculateColors = (num) => {
    if (!num || num < 1 || num > 144) return { binder: null, fiber: null };
    const binderPos = Math.ceil(num / 12);
    const fiberPos = num % 12 || 12;
    return {
      binder: TIA_COLORS.find(c => c.position === binderPos),
      fiber: TIA_COLORS.find(c => c.position === fiberPos)
    };
  };

  // High-count mode: Calculate fiber number from unit/tube/fiber colors
  const calculateHighCountFiber = (unit, tube, fiber) => {
    if (!tube || !fiber) return null;
    
    const tubePos = TIA_COLORS.find(c => c.color === tube)?.position || 0;
    const fiberPos = TIA_COLORS.find(c => c.color === fiber)?.position || 0;
    const unitNum = parseInt(unit) || 1;
    
    if (selectedStructure?.unitsOf) {
      // Multi-unit cable (288+)
      const fibersPerUnit = selectedStructure.unitsOf;
      return ((unitNum - 1) * fibersPerUnit) + ((tubePos - 1) * 12) + fiberPos;
    } else {
      // Single unit cable (144)
      return ((tubePos - 1) * 12) + fiberPos;
    }
  };

  // High-count mode: Calculate colors from fiber number
  const calculateHighCountColors = (num) => {
    if (!num || num < 1) return null;
    
    const structure = selectedStructure;
    if (!structure || num > structure.totalFibers) return null;
    
    let unitNum = 1;
    let tubePos, fiberPos;
    
    if (structure.unitsOf) {
      // Multi-unit cable
      unitNum = Math.ceil(num / structure.unitsOf);
      const fiberInUnit = ((num - 1) % structure.unitsOf) + 1;
      tubePos = Math.ceil(fiberInUnit / 12);
      fiberPos = ((fiberInUnit - 1) % 12) + 1;
    } else {
      // Single unit cable (144)
      tubePos = Math.ceil(num / 12);
      fiberPos = ((num - 1) % 12) + 1;
    }
    
    return {
      unit: unitNum,
      tube: TIA_COLORS.find(c => c.position === tubePos),
      fiber: TIA_COLORS.find(c => c.position === fiberPos),
      fiberNumber: num
    };
  };

  const handleColorChange = (type, value) => {
    if (type === 'binder') {
      setBinderColor(value);
      const newFiberNum = calculateFiberNumber(value, fiberColor);
      setFiberNumber(newFiberNum);
    } else {
      setFiberColor(value);
      const newFiberNum = calculateFiberNumber(binderColor, value);
      setFiberNumber(newFiberNum);
    }
  };

  const handleFiberNumberChange = (num) => {
    const parsedNum = parseInt(num);
    if (parsedNum >= 1 && parsedNum <= 144) {
      setFiberNumber(parsedNum);
      const colors = calculateColors(parsedNum);
      if (colors.binder) setBinderColor(colors.binder.color);
      if (colors.fiber) setFiberColor(colors.fiber.color);
    } else {
      setFiberNumber(null);
      setBinderColor('');
      setFiberColor('');
    }
  };

  const handleHcColorChange = (type, value) => {
    if (type === 'unit') {
      setUnitNumber(value);
    } else if (type === 'tube') {
      setTubeColor(value);
    } else {
      setHcFiberColor(value);
    }
    
    // Recalculate with new values
    const newUnit = type === 'unit' ? value : unitNumber;
    const newTube = type === 'tube' ? value : tubeColor;
    const newFiber = type === 'fiber' ? value : hcFiberColor;
    
    const result = calculateHighCountFiber(newUnit, newTube, newFiber);
    if (result) {
      setHcFiberNumber(result);
      setHcResult(calculateHighCountColors(result));
    }
  };

  const handleHcFiberNumberChange = (num) => {
    const parsedNum = parseInt(num);
    const maxFiber = selectedStructure?.totalFibers || 144;
    
    if (parsedNum >= 1 && parsedNum <= maxFiber) {
      setHcFiberNumber(parsedNum);
      const result = calculateHighCountColors(parsedNum);
      setHcResult(result);
      if (result) {
        setUnitNumber(result.unit.toString());
        setTubeColor(result.tube?.color || '');
        setHcFiberColor(result.fiber?.color || '');
      }
    } else {
      setHcFiberNumber(null);
      setHcResult(null);
    }
  };

  const getColorData = (colorName) => TIA_COLORS.find(c => c.color === colorName);

  const reset = () => {
    setBinderColor('');
    setFiberColor('');
    setFiberNumber(null);
  };

  const resetHighCount = () => {
    setUnitNumber('');
    setTubeColor('');
    setHcFiberColor('');
    setHcFiberNumber(null);
    setHcResult(null);
  };

  const getUnitsCount = () => {
    if (!selectedStructure?.unitsOf) return 1;
    return Math.ceil(selectedStructure.totalFibers / selectedStructure.unitsOf);
  };

  const ColorSelector = ({ label, value, onChange, placeholder }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12">
          <SelectValue placeholder={placeholder}>
            {value && (
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded-full border border-gray-300"
                  style={{ backgroundColor: getColorData(value)?.hex }}
                />
                <span>{value}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TIA_COLORS.map((c) => (
            <SelectItem key={c.position} value={c.color}>
              <div className="flex items-center gap-2">
                <div 
                  className={`w-5 h-5 rounded-full ${c.border ? 'border-2 border-gray-400' : 'border border-gray-300'}`}
                  style={{ backgroundColor: c.hex }}
                />
                <span>{c.position}. {c.color}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

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
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fiber Locator</h1>
              <p className="text-xs text-gray-500">TIA-598 Color Code Calculator</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Color Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              Find Fiber by Color
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Binder/Tube Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Binder / Tube Color</Label>
                <Select value={binderColor} onValueChange={(v) => handleColorChange('binder', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select binder color">
                      {binderColor && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full border border-gray-300"
                            style={{ backgroundColor: getColorData(binderColor)?.hex }}
                          />
                          <span>{binderColor}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIA_COLORS.map((c) => (
                      <SelectItem key={c.position} value={c.color}>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-5 h-5 rounded-full ${c.border ? 'border-2 border-gray-400' : 'border border-gray-300'}`}
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.position}. {c.color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fiber Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fiber / Ribbon Color</Label>
                <Select value={fiberColor} onValueChange={(v) => handleColorChange('fiber', v)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select fiber color">
                      {fiberColor && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full border border-gray-300"
                            style={{ backgroundColor: getColorData(fiberColor)?.hex }}
                          />
                          <span>{fiberColor}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIA_COLORS.map((c) => (
                      <SelectItem key={c.position} value={c.color}>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-5 h-5 rounded-full ${c.border ? 'border-2 border-gray-400' : 'border border-gray-300'}`}
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.position}. {c.color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Result from Colors */}
            {fiberNumber && binderColor && fiberColor && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                      style={{ backgroundColor: getColorData(binderColor)?.hex }}
                    />
                    <span className="text-xs text-gray-500">Binder</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                      style={{ backgroundColor: getColorData(fiberColor)?.hex }}
                    />
                    <span className="text-xs text-gray-500">Fiber</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                  <div className="text-center">
                    <div className="text-4xl font-bold text-indigo-600">#{fiberNumber}</div>
                    <span className="text-xs text-gray-500">Fiber Number</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fiber Number Lookup */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-emerald-600" />
              Find Colors by Fiber Number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Enter Fiber Number (1-144)</Label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="144"
                  placeholder="Enter fiber number..."
                  className="flex-1 h-12 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  onChange={(e) => handleFiberNumberChange(e.target.value)}
                />
                <Button variant="outline" onClick={reset}>Reset</Button>
              </div>
            </div>

            {fiberNumber && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-600">#{fiberNumber}</div>
                    <span className="text-xs text-gray-500">Fiber Number</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                      style={{ backgroundColor: getColorData(binderColor)?.hex }}
                    />
                    <span className="text-xs text-gray-500">{binderColor || 'Binder'}</span>
                  </div>
                  <span className="text-gray-400">+</span>
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                      style={{ backgroundColor: getColorData(fiberColor)?.hex }}
                    />
                    <span className="text-xs text-gray-500">{fiberColor || 'Fiber'}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Reference */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cable className="h-5 w-5 text-amber-600" />
              TIA-598 Color Sequence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
              {TIA_COLORS.map((c) => (
                <div key={c.position} className="text-center">
                  <div 
                    className={`w-10 h-10 rounded-full mx-auto mb-1 ${c.border ? 'border-2 border-gray-400' : 'border border-gray-300'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="text-xs font-medium">{c.position}</div>
                  <div className="text-[10px] text-gray-500 truncate">{c.color}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
              <strong>Formula:</strong> Fiber # = (Binder Position - 1) × 12 + Fiber Position
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}