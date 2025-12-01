import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Network, 
  Cable, 
  Zap, 
  Radio, 
  Lightbulb,
  ArrowRight,
  ArrowDown,
  Circle,
  Square,
  Layers
} from 'lucide-react';

// PON Architecture Diagram
export function PONArchitectureDiagram() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-blue-600" />
          PON Network Architecture
        </CardTitle>
        <p className="text-sm text-gray-500">Passive Optical Network topology from Central Office to Customer Premises</p>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
          {/* Central Office */}
          <div className="flex items-start gap-4 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-24 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex flex-col items-center justify-center text-white shadow-lg">
                <span className="text-xs font-bold">CENTRAL</span>
                <span className="text-xs font-bold">OFFICE</span>
              </div>
              <div className="mt-2 text-center">
                <Badge className="bg-blue-600 text-white">OLT</Badge>
                <p className="text-xs text-gray-500 mt-1">Optical Line Terminal</p>
              </div>
            </div>
            
            {/* Feeder Fiber */}
            <div className="flex-1 flex flex-col items-center pt-8">
              <div className="w-full h-1 bg-yellow-500 relative">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-center">
                  <span className="font-medium">Feeder Fiber</span>
                  <br />
                  <span className="text-gray-500">1-20km typical</span>
                </div>
                <ArrowRight className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 h-4 w-4 text-yellow-600" />
              </div>
            </div>
            
            {/* Splitter Cabinet */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex flex-col items-center justify-center text-white shadow-lg">
                <Layers className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1">SPLITTER</span>
              </div>
              <div className="mt-2 text-center">
                <Badge className="bg-emerald-600 text-white">1:32</Badge>
                <p className="text-xs text-gray-500 mt-1">FDH / Cabinet</p>
              </div>
            </div>
          </div>
          
          {/* Distribution to Homes */}
          <div className="ml-[60%] space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-16 h-0.5 bg-yellow-500"></div>
                <div className="w-14 h-10 bg-gradient-to-br from-orange-400 to-rose-500 rounded flex items-center justify-center text-white text-[10px] font-bold shadow">
                  ONT {i}
                </div>
                <span className="text-xs text-gray-500">Customer {i}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-16 h-0.5 bg-yellow-500 border-dashed"></div>
              <span className="text-xs text-gray-400">... up to 128 per port</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>OLT (Active Equipment)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span>Splitter (Passive)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded"></div>
                <span>ONT (Active Equipment)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-yellow-500"></div>
                <span>Fiber Optic Cable</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Key Facts */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm">GPON Capacity</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">2.5 Gbps down / 1.25 Gbps up shared among all ONTs on a PON port</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <h4 className="font-medium text-emerald-800 dark:text-emerald-200 text-sm">XGS-PON Capacity</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">10 Gbps symmetric, can coexist with GPON on same fiber</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h4 className="font-medium text-purple-800 dark:text-purple-200 text-sm">Max Split Ratio</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">1:128 typical maximum (1:32 or 1:64 most common)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Fiber Structure Diagram
export function FiberStructureDiagram() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cable className="h-5 w-5 text-amber-600" />
          Optical Fiber Cross-Section
        </CardTitle>
        <p className="text-sm text-gray-500">Internal structure of single-mode and multi-mode fiber</p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Single-Mode Fiber */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4">
            <h4 className="font-semibold text-center mb-4">Single-Mode Fiber (SMF)</h4>
            <div className="relative mx-auto w-48 h-48">
              {/* Coating */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                {/* Cladding */}
                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  {/* Core */}
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-inner"></div>
                </div>
              </div>
              {/* Labels */}
              <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 text-xs">
                <div className="flex items-center gap-1 mb-8">
                  <div className="w-8 h-0.5 bg-yellow-500"></div>
                  <span>Coating 250μm</span>
                </div>
                <div className="flex items-center gap-1 mb-8">
                  <div className="w-8 h-0.5 bg-blue-300"></div>
                  <span>Cladding 125μm</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-red-500"></div>
                  <span>Core 9μm</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <p><strong>OS2/G.652.D:</strong> Long distance, up to 100+ km</p>
              <p className="text-xs mt-1">Yellow jacket • 1310nm & 1550nm</p>
            </div>
          </div>
          
          {/* Multi-Mode Fiber */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-xl p-4">
            <h4 className="font-semibold text-center mb-4">Multi-Mode Fiber (MMF)</h4>
            <div className="relative mx-auto w-48 h-48">
              {/* Coating */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg">
                {/* Cladding */}
                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  {/* Core - larger for MMF */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-inner"></div>
                </div>
              </div>
              {/* Labels */}
              <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 text-xs">
                <div className="flex items-center gap-1 mb-8">
                  <div className="w-8 h-0.5 bg-cyan-500"></div>
                  <span>Coating 250μm</span>
                </div>
                <div className="flex items-center gap-1 mb-8">
                  <div className="w-8 h-0.5 bg-blue-300"></div>
                  <span>Cladding 125μm</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-orange-500"></div>
                  <span>Core 50μm</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <p><strong>OM3/OM4:</strong> Data centers, up to 550m</p>
              <p className="text-xs mt-1">Aqua jacket • 850nm & 1300nm</p>
            </div>
          </div>
        </div>
        
        {/* Comparison Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 text-left">Property</th>
                <th className="p-2 text-center">SMF (OS2)</th>
                <th className="p-2 text-center">MMF (OM4)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b dark:border-gray-700">
                <td className="p-2">Core Diameter</td>
                <td className="p-2 text-center">8-10 μm</td>
                <td className="p-2 text-center">50 μm</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="p-2">Typical Distance</td>
                <td className="p-2 text-center">10-100+ km</td>
                <td className="p-2 text-center">100-550 m</td>
              </tr>
              <tr className="border-b dark:border-gray-700">
                <td className="p-2">Primary Use</td>
                <td className="p-2 text-center">Telecom, FTTH</td>
                <td className="p-2 text-center">Data Centers</td>
              </tr>
              <tr>
                <td className="p-2">Jacket Color</td>
                <td className="p-2 text-center"><Badge className="bg-yellow-400 text-yellow-900">Yellow</Badge></td>
                <td className="p-2 text-center"><Badge className="bg-cyan-400 text-cyan-900">Aqua</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Wavelength Plan Diagram
export function WavelengthPlanDiagram() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-purple-600" />
          PON Wavelength Plan
        </CardTitle>
        <p className="text-sm text-gray-500">How GPON and XGS-PON share a single fiber using different wavelengths</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Wavelength Spectrum */}
          <div className="bg-gradient-to-r from-violet-100 via-blue-100 via-green-100 via-yellow-100 to-red-100 dark:from-violet-900/30 dark:via-blue-900/30 dark:via-green-900/30 dark:via-yellow-900/30 dark:to-red-900/30 rounded-xl p-4">
            <div className="relative h-32">
              {/* Spectrum bar */}
              <div className="absolute top-8 left-0 right-0 h-8 bg-gradient-to-r from-violet-500 via-blue-500 via-green-500 via-yellow-500 via-orange-500 to-red-500 rounded-lg opacity-30"></div>
              
              {/* Wavelength markers */}
              <div className="absolute top-0 left-[10%] flex flex-col items-center">
                <div className="w-0.5 h-16 bg-blue-600"></div>
                <div className="mt-1 text-center">
                  <Badge className="bg-blue-600 text-white text-xs">1270nm</Badge>
                  <p className="text-[10px] text-gray-500 mt-1">XGS Up</p>
                </div>
              </div>
              
              <div className="absolute top-0 left-[25%] flex flex-col items-center">
                <div className="w-0.5 h-16 bg-green-600"></div>
                <div className="mt-1 text-center">
                  <Badge className="bg-green-600 text-white text-xs">1310nm</Badge>
                  <p className="text-[10px] text-gray-500 mt-1">GPON Up</p>
                </div>
              </div>
              
              <div className="absolute top-0 left-[50%] flex flex-col items-center">
                <div className="w-0.5 h-16 bg-amber-600"></div>
                <div className="mt-1 text-center">
                  <Badge className="bg-amber-600 text-white text-xs">1490nm</Badge>
                  <p className="text-[10px] text-gray-500 mt-1">GPON Down</p>
                </div>
              </div>
              
              <div className="absolute top-0 left-[65%] flex flex-col items-center">
                <div className="w-0.5 h-16 bg-orange-600"></div>
                <div className="mt-1 text-center">
                  <Badge className="bg-orange-600 text-white text-xs">1550nm</Badge>
                  <p className="text-[10px] text-gray-500 mt-1">RF Video</p>
                </div>
              </div>
              
              <div className="absolute top-0 left-[80%] flex flex-col items-center">
                <div className="w-0.5 h-16 bg-red-600"></div>
                <div className="mt-1 text-center">
                  <Badge className="bg-red-600 text-white text-xs">1577nm</Badge>
                  <p className="text-[10px] text-gray-500 mt-1">XGS Down</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Technology comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border-2 border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">GPON (ITU-T G.984)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Downstream:</span>
                  <Badge variant="outline">1490nm • 2.488 Gbps</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Upstream:</span>
                  <Badge variant="outline">1310nm • 1.244 Gbps</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Max Distance:</span>
                  <span className="font-mono">20-60 km</span>
                </div>
                <div className="flex justify-between">
                  <span>Power Budget:</span>
                  <span className="font-mono">28-32 dB</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">XGS-PON (ITU-T G.9807)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Downstream:</span>
                  <Badge variant="outline">1577nm • 10 Gbps</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Upstream:</span>
                  <Badge variant="outline">1270nm • 10 Gbps</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Max Distance:</span>
                  <span className="font-mono">20-40 km</span>
                </div>
                <div className="flex justify-between">
                  <span>Power Budget:</span>
                  <span className="font-mono">29-31 dB</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm">
            <Lightbulb className="h-4 w-4 inline mr-2 text-purple-600" />
            <strong>Coexistence:</strong> GPON and XGS-PON can operate on the same fiber simultaneously using different wavelengths, allowing gradual network upgrades without replacing infrastructure.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Connector Polish Types Diagram
export function ConnectorPolishDiagram() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-600" />
          Connector Polish Types: UPC vs APC
        </CardTitle>
        <p className="text-sm text-gray-500">Understanding the critical difference between polish types</p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* UPC */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500"></div>
              <div>
                <h4 className="font-semibold">UPC (Ultra Physical Contact)</h4>
                <Badge className="bg-blue-500 text-white">Blue Connector</Badge>
              </div>
            </div>
            
            {/* Diagram */}
            <div className="relative h-32 bg-white dark:bg-gray-800 rounded-lg mb-4 overflow-hidden">
              {/* Ferrule */}
              <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2 w-24 h-16 bg-gray-300 dark:bg-gray-600 rounded-r-lg">
                {/* Slightly curved end face */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-r from-gray-300 to-blue-300 dark:from-gray-600 dark:to-blue-600 rounded-r-full"></div>
              </div>
              {/* Fiber core */}
              <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2 w-24 h-1 bg-yellow-400"></div>
              {/* Reflection arrows */}
              <div className="absolute right-1/4 top-1/3 text-red-500 text-xs">
                <ArrowDown className="h-4 w-4 inline" />
                <span>~4% reflected</span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>End Face:</span>
                <span>Slightly curved (dome)</span>
              </div>
              <div className="flex justify-between">
                <span>Return Loss:</span>
                <Badge variant="outline">&gt;50 dB</Badge>
              </div>
              <div className="flex justify-between">
                <span>Reflectance:</span>
                <Badge variant="outline">&lt;-50 dB</Badge>
              </div>
              <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                <strong>Use for:</strong> Data networks, digital transmission, enterprise LAN
              </div>
            </div>
          </div>
          
          {/* APC */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500"></div>
              <div>
                <h4 className="font-semibold">APC (Angled Physical Contact)</h4>
                <Badge className="bg-emerald-500 text-white">Green Connector</Badge>
              </div>
            </div>
            
            {/* Diagram */}
            <div className="relative h-32 bg-white dark:bg-gray-800 rounded-lg mb-4 overflow-hidden">
              {/* Ferrule - angled */}
              <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2 -skew-x-6 w-24 h-16 bg-gray-300 dark:bg-gray-600 rounded-r-lg">
                {/* 8° angled end face */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-r from-gray-300 to-emerald-300 dark:from-gray-600 dark:to-emerald-600 skew-x-12"></div>
              </div>
              {/* Fiber core */}
              <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2 w-24 h-1 bg-yellow-400"></div>
              {/* Reflection arrows - going away */}
              <div className="absolute right-1/4 top-1/4 text-emerald-600 text-xs">
                <span>Reflections directed</span>
                <ArrowRight className="h-4 w-4 inline ml-1" />
                <span>away</span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>End Face:</span>
                <span>8° angle</span>
              </div>
              <div className="flex justify-between">
                <span>Return Loss:</span>
                <Badge variant="outline">&gt;60 dB</Badge>
              </div>
              <div className="flex justify-between">
                <span>Reflectance:</span>
                <Badge variant="outline">&lt;-60 dB</Badge>
              </div>
              <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                <strong>Use for:</strong> FTTH/PON, CATV, analog video, WDM systems
              </div>
            </div>
          </div>
        </div>
        
        {/* Warning */}
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">⚠️ Critical Warning</h4>
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>NEVER mate UPC to APC connectors!</strong> The 8° angle difference causes an air gap that results in high loss (3+ dB) and severe reflectance. This can damage equipment and cause service failures. Always match polish types: UPC↔UPC or APC↔APC.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// OTDR Trace Diagram
export function OTDRTraceDiagram() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-indigo-600" />
          Understanding OTDR Traces
        </CardTitle>
        <p className="text-sm text-gray-500">How to read and interpret OTDR trace events</p>
      </CardHeader>
      <CardContent>
        {/* Simulated OTDR Trace */}
        <div className="bg-gray-900 rounded-xl p-4 mb-4">
          <svg viewBox="0 0 800 200" className="w-full h-48">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="25" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#333" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="800" height="200" fill="url(#grid)" />
            
            {/* Trace line */}
            <path 
              d="M 50 30 L 150 35 L 150 50 L 155 35 L 300 45 L 300 55 L 305 45 L 450 55 L 455 75 L 460 55 L 600 70 L 600 140 L 605 70 L 700 100 L 700 180"
              fill="none" 
              stroke="#22c55e" 
              strokeWidth="2"
            />
            
            {/* Event markers */}
            {/* Launch connector */}
            <circle cx="150" cy="50" r="6" fill="#3b82f6" />
            <text x="150" y="75" fill="#3b82f6" fontSize="10" textAnchor="middle">Connector</text>
            <text x="150" y="87" fill="#666" fontSize="8" textAnchor="middle">0.15 dB</text>
            
            {/* Splice */}
            <circle cx="300" cy="55" r="6" fill="#a855f7" />
            <text x="300" y="75" fill="#a855f7" fontSize="10" textAnchor="middle">Splice</text>
            <text x="300" y="87" fill="#666" fontSize="8" textAnchor="middle">0.05 dB</text>
            
            {/* Bend */}
            <circle cx="455" cy="75" r="6" fill="#f59e0b" />
            <text x="455" y="95" fill="#f59e0b" fontSize="10" textAnchor="middle">Bend</text>
            <text x="455" y="107" fill="#666" fontSize="8" textAnchor="middle">0.3 dB</text>
            
            {/* End connector */}
            <circle cx="600" cy="140" r="6" fill="#ef4444" />
            <text x="600" y="160" fill="#ef4444" fontSize="10" textAnchor="middle">End</text>
            <text x="600" y="172" fill="#666" fontSize="8" textAnchor="middle">High reflect</text>
            
            {/* Noise floor */}
            <path d="M 700 100 L 750 105 L 760 98 L 770 102 L 780 100" fill="none" stroke="#666" strokeWidth="1" strokeDasharray="3"/>
            <text x="760" y="120" fill="#666" fontSize="8">Noise Floor</text>
            
            {/* Axis labels */}
            <text x="400" y="195" fill="#999" fontSize="10" textAnchor="middle">Distance (km)</text>
            <text x="15" y="100" fill="#999" fontSize="10" textAnchor="middle" transform="rotate(-90, 15, 100)">Power (dB)</text>
          </svg>
        </div>
        
        {/* Event Types Legend */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="font-medium text-sm">Reflective Event</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Connectors, mechanical splices, breaks. Shows spike + loss.</p>
          </div>
          
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="font-medium text-sm">Non-Reflective</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Fusion splices, bends. Shows loss only, no spike.</p>
          </div>
          
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="font-medium text-sm">Macrobend</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tight bend radius. Higher loss at 1550nm vs 1310nm.</p>
          </div>
          
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="font-medium text-sm">End of Fiber</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Large reflection at termination or break point.</p>
          </div>
        </div>
        
        {/* Pro Tips */}
        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2">📋 OTDR Analysis Pro Tips</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• <strong>Always test bidirectionally</strong> — splices can appear as "gainers" from one direction due to MFD differences</li>
            <li>• <strong>Use launch fiber</strong> — 150m+ to characterize the first connector (dead zone recovery)</li>
            <li>• <strong>Watch for ghosts</strong> — false events appearing at 2× the distance of a strong reflector</li>
            <li>• <strong>Compare wavelengths</strong> — macrobends show ~3× more loss at 1550nm than 1310nm</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Splitter Loss Diagram
export function SplitterLossDiagram() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-teal-600" />
          Optical Splitter Loss Values
        </CardTitle>
        <p className="text-sm text-gray-500">Insertion loss by split ratio for PON network design</p>
      </CardHeader>
      <CardContent>
        {/* Visual Diagram */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-center gap-8">
            {/* Input */}
            <div className="text-center">
              <div className="w-16 h-8 bg-yellow-400 rounded flex items-center justify-center text-xs font-bold">
                INPUT
              </div>
              <p className="text-xs text-gray-500 mt-1">0 dBm</p>
            </div>
            
            <ArrowRight className="h-6 w-6 text-gray-400" />
            
            {/* Splitter */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                <div className="text-center">
                  <Layers className="h-6 w-6 mx-auto" />
                  <span className="text-xs font-bold">1:8</span>
                </div>
              </div>
            </div>
            
            <ArrowRight className="h-6 w-6 text-gray-400" />
            
            {/* Outputs */}
            <div className="space-y-1">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-12 h-4 bg-orange-400 rounded text-[8px] text-center">OUT {i}</div>
                </div>
              ))}
              <div className="text-[8px] text-gray-500 text-center">... ×8 total</div>
              <p className="text-xs text-gray-600 mt-1">Each: -10.5 dBm</p>
            </div>
          </div>
        </div>
        
        {/* Loss Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-100 dark:bg-teal-900/30">
                <th className="p-3 text-left">Split Ratio</th>
                <th className="p-3 text-center">Theoretical Loss</th>
                <th className="p-3 text-center">Typical Measured</th>
                <th className="p-3 text-center">Max Specified</th>
                <th className="p-3 text-left">Common Use</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ratio: '1:2', theory: '3.0', typical: '3.2-3.5', max: '3.8', use: 'Tap splitter, monitoring' },
                { ratio: '1:4', theory: '6.0', typical: '6.5-7.0', max: '7.5', use: 'Distribution, MDU' },
                { ratio: '1:8', theory: '9.0', typical: '10.0-10.5', max: '11.0', use: 'FDH cabinet' },
                { ratio: '1:16', theory: '12.0', typical: '13.5-14.0', max: '14.5', use: 'MDU, high density' },
                { ratio: '1:32', theory: '15.0', typical: '17.0-17.5', max: '18.0', use: 'Standard PON deploy' },
                { ratio: '1:64', theory: '18.0', typical: '20.5-21.0', max: '22.0', use: 'High split PON' },
                { ratio: '1:128', theory: '21.0', typical: '24.0+', max: '25.0', use: 'Maximum reach' },
              ].map((row) => (
                <tr key={row.ratio} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-bold">
                    <Badge className="bg-teal-500 text-white">{row.ratio}</Badge>
                  </td>
                  <td className="p-3 text-center font-mono">{row.theory} dB</td>
                  <td className="p-3 text-center font-mono">{row.typical} dB</td>
                  <td className="p-3 text-center font-mono text-red-600">{row.max} dB</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Formula */}
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-mono">
            <strong>Theoretical Loss Formula:</strong> Loss (dB) = 10 × log₁₀(N)
            <br />
            <span className="text-gray-500">where N = number of output ports</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Main export with all diagrams in tabs
export default function GlossaryDiagrams() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="pon" className="space-y-4">
        <TabsList className="bg-white dark:bg-gray-800 p-1 shadow-lg rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="pon" className="rounded-lg">PON Architecture</TabsTrigger>
          <TabsTrigger value="fiber" className="rounded-lg">Fiber Structure</TabsTrigger>
          <TabsTrigger value="wavelength" className="rounded-lg">Wavelengths</TabsTrigger>
          <TabsTrigger value="polish" className="rounded-lg">UPC vs APC</TabsTrigger>
          <TabsTrigger value="otdr" className="rounded-lg">OTDR Traces</TabsTrigger>
          <TabsTrigger value="splitter" className="rounded-lg">Splitter Loss</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pon"><PONArchitectureDiagram /></TabsContent>
        <TabsContent value="fiber"><FiberStructureDiagram /></TabsContent>
        <TabsContent value="wavelength"><WavelengthPlanDiagram /></TabsContent>
        <TabsContent value="polish"><ConnectorPolishDiagram /></TabsContent>
        <TabsContent value="otdr"><OTDRTraceDiagram /></TabsContent>
        <TabsContent value="splitter"><SplitterLossDiagram /></TabsContent>
      </Tabs>
    </div>
  );
}