import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Cable, Palette, Hash, ArrowRight, Layers, Settings2, Info, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import HiddenContentBanner from '@/components/HiddenContentBanner';

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
  const { preferences, updatePreferences } = useUserPreferences();
  const hiddenSections = preferences.hiddenSections?.fiberlocator || [];

  const handleShowAll = () => {
    updatePreferences({
      hiddenSections: {
        ...preferences.hiddenSections,
        fiberlocator: []
      }
    });
  };

  // Map section IDs to modes
  const isLooseTubeHidden = hiddenSections.includes('loosetube');
  const isRibbonHidden = hiddenSections.includes('ribbon');
  
  const [mode, setMode] = useState(!isLooseTubeHidden ? 'standard' : (!isRibbonHidden ? 'highcount' : 'standard'));
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
          <div className="flex items-center justify-between">
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
            <Badge variant="outline" className="hidden sm:flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Up to 3456 fibers
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <HiddenContentBanner 
          hiddenCount={hiddenSections.length} 
          moduleId="fiberlocator" 
          onShowAll={handleShowAll}
        />

        {/* Mode Selector */}
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="standard" className="text-sm">
              <Cable className="h-4 w-4 mr-2" />
              Standard (1-144)
            </TabsTrigger>
            <TabsTrigger value="highcount" className="text-sm">
              <Layers className="h-4 w-4 mr-2" />
              High-Count (144+)
            </TabsTrigger>
          </TabsList>

          {/* Standard Mode */}
          <TabsContent value="standard" className="space-y-6 mt-6">
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
                  <ColorSelector 
                    label="Binder / Tube Color" 
                    value={binderColor} 
                    onChange={(v) => handleColorChange('binder', v)}
                    placeholder="Select binder color"
                  />
                  <ColorSelector 
                    label="Fiber / Ribbon Color" 
                    value={fiberColor} 
                    onChange={(v) => handleColorChange('fiber', v)}
                    placeholder="Select fiber color"
                  />
                </div>

                {/* Result from Colors */}
                {fiberNumber && binderColor && fiberColor && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
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
                    <Input
                      type="number"
                      min="1"
                      max="144"
                      placeholder="Enter fiber number..."
                      className="flex-1 h-12"
                      onChange={(e) => handleFiberNumberChange(e.target.value)}
                    />
                    <Button variant="outline" onClick={reset}>Reset</Button>
                  </div>
                </div>

                {fiberNumber && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
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
          </TabsContent>

          {/* High-Count Mode */}
          <TabsContent value="highcount" className="space-y-6 mt-6">
            {/* Cable Structure Selection */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-purple-600" />
                  Cable Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Cable Type</Label>
                    <Select value={cableStructure} onValueChange={(v) => { setCableStructure(v); resetHighCount(); }}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header-loose" disabled className="font-semibold text-gray-500">
                          Loose Tube Cables
                        </SelectItem>
                        {CABLE_STRUCTURES.filter(s => !s.type).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label} ({s.tubes} tubes × {s.fibersPerTube} fibers)
                          </SelectItem>
                        ))}
                        <SelectItem value="header-ribbon" disabled className="font-semibold text-gray-500 mt-2">
                          Ribbon Cables
                        </SelectItem>
                        {CABLE_STRUCTURES.filter(s => s.type === 'ribbon').map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label} ({s.ribbons} ribbons × {s.fibersPerRibbon} fibers)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedStructure && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Cable Structure</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedStructure.totalFibers} total fibers • 
                        {selectedStructure.unitsOf 
                          ? ` ${getUnitsCount()} units of ${selectedStructure.unitsOf} fibers each`
                          : ` ${selectedStructure.tubes || selectedStructure.ribbons} ${selectedStructure.type === 'ribbon' ? 'ribbons' : 'tubes'} × 12 fibers`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* High-Count Color Selection */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-indigo-600" />
                  Find Fiber by Color
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Unit/Binder (for 288+ cables) */}
                  {selectedStructure?.unitsOf && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Unit / Binder #</Label>
                      <Select value={unitNumber} onValueChange={(v) => handleHcColorChange('unit', v)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select unit">
                            {unitNumber && `Unit ${unitNumber}`}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: getUnitsCount() }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              Unit {i + 1} (Fibers {i * selectedStructure.unitsOf + 1}-{(i + 1) * selectedStructure.unitsOf})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <ColorSelector 
                    label={selectedStructure?.type === 'ribbon' ? 'Ribbon Color' : 'Tube Color'}
                    value={tubeColor} 
                    onChange={(v) => handleHcColorChange('tube', v)}
                    placeholder={`Select ${selectedStructure?.type === 'ribbon' ? 'ribbon' : 'tube'} color`}
                  />
                  <ColorSelector 
                    label="Fiber Color" 
                    value={hcFiberColor} 
                    onChange={(v) => handleHcColorChange('fiber', v)}
                    placeholder="Select fiber color"
                  />
                </div>

                {/* Result */}
                {hcResult && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {selectedStructure?.unitsOf && (
                        <>
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-lg mx-auto mb-1 border-2 border-purple-300 bg-purple-100 flex items-center justify-center">
                              <span className="font-bold text-purple-700">{hcResult.unit}</span>
                            </div>
                            <span className="text-xs text-gray-500">Unit</span>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-400" />
                        </>
                      )}
                      <div className="text-center">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                          style={{ backgroundColor: hcResult.tube?.hex }}
                        />
                        <span className="text-xs text-gray-500">{selectedStructure?.type === 'ribbon' ? 'Ribbon' : 'Tube'}</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                      <div className="text-center">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                          style={{ backgroundColor: hcResult.fiber?.hex }}
                        />
                        <span className="text-xs text-gray-500">Fiber</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                      <div className="text-center">
                        <div className="text-4xl font-bold text-indigo-600">#{hcResult.fiberNumber}</div>
                        <span className="text-xs text-gray-500">Fiber Number</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* High-Count Fiber Number Lookup */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-emerald-600" />
                  Find Colors by Fiber Number
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Enter Fiber Number (1-{selectedStructure?.totalFibers || 144})
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={selectedStructure?.totalFibers || 144}
                      placeholder="Enter fiber number..."
                      className="flex-1 h-12"
                      value={hcFiberNumber || ''}
                      onChange={(e) => handleHcFiberNumberChange(e.target.value)}
                    />
                    <Button variant="outline" onClick={resetHighCount}>Reset</Button>
                  </div>
                </div>

                {hcResult && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-emerald-600">#{hcResult.fiberNumber}</div>
                        <span className="text-xs text-gray-500">Fiber Number</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                      {selectedStructure?.unitsOf && (
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-lg mx-auto mb-1 border-2 border-purple-300 bg-purple-100 flex items-center justify-center">
                            <span className="font-bold text-purple-700">{hcResult.unit}</span>
                          </div>
                          <span className="text-xs text-gray-500">Unit</span>
                        </div>
                      )}
                      <div className="text-center">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                          style={{ backgroundColor: hcResult.tube?.hex }}
                        />
                        <span className="text-xs text-gray-500">{hcResult.tube?.color}</span>
                      </div>
                      <span className="text-gray-400">+</span>
                      <div className="text-center">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
                          style={{ backgroundColor: hcResult.fiber?.hex }}
                        />
                        <span className="text-xs text-gray-500">{hcResult.fiber?.color}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                <strong>144-Fiber Formula:</strong> Fiber # = (Tube Position - 1) × 12 + Fiber Position
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
                <strong>High-Count Formula:</strong> Fiber # = (Unit - 1) × 144 + (Tube Position - 1) × 12 + Fiber Position
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}