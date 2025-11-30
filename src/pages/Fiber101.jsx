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
  Play,
  RotateCcw,
  Home
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Fiber 101',
    subtitle: 'Foundations of Fiber Optics & FTTH',
    icon: Zap,
    color: 'from-green-500 to-emerald-600',
    content: (
      <div className="space-y-6 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-300">
          This guide will teach you the essentials of fiber optic technology and FTTH (Fiber to the Home) networks—from the central office to the customer's ONT.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <div className="text-2xl font-bold text-green-600">20</div>
            <div className="text-xs text-gray-500">Minutes</div>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="text-2xl font-bold text-emerald-600">15</div>
            <div className="text-xs text-gray-500">Topics</div>
          </div>
          <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
            <div className="text-2xl font-bold text-teal-600">∞</div>
            <div className="text-xs text-gray-500">Knowledge</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'what-is-fiber',
    title: 'What is Fiber Optic Cable?',
    subtitle: 'Light-speed data transmission',
    icon: Lightbulb,
    color: 'from-amber-500 to-orange-600',
    content: (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            {/* Fiber cross-section diagram */}
            <div className="w-48 h-48 rounded-full border-8 border-blue-200 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-8 border-cyan-300 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse"></div>
              </div>
            </div>
            <div className="absolute -right-20 top-8 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-200 rounded"></div> Jacket</div>
              <div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 bg-cyan-300 rounded"></div> Cladding</div>
              <div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 bg-orange-400 rounded"></div> Core</div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <div className="font-bold text-orange-700">Core</div>
            <div className="text-sm text-gray-600">Where light travels (9μm SMF)</div>
          </div>
          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
            <div className="font-bold text-cyan-700">Cladding</div>
            <div className="text-sm text-gray-600">Reflects light back (125μm)</div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="font-bold text-blue-700">Jacket</div>
            <div className="text-sm text-gray-600">Protection layer</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'fiber-types',
    title: 'Single-Mode vs Multi-Mode',
    subtitle: 'Know your fiber types',
    icon: Cable,
    color: 'from-yellow-500 to-amber-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-400"></div>
              <div>
                <div className="font-bold text-lg">Single-Mode (SMF)</div>
                <div className="text-sm text-gray-500">Yellow Jacket</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 9μm core</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Long distance (up to 100km+)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 1310nm / 1550nm wavelengths</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Used for: FTTH, Telecom, PON</li>
            </ul>
          </div>
          <div className="p-6 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border-2 border-cyan-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-400"></div>
              <div>
                <div className="font-bold text-lg">Multi-Mode (MMF)</div>
                <div className="text-sm text-gray-500">Aqua/Orange Jacket</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 50μm or 62.5μm core</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Short distance (up to 550m)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 850nm / 1300nm wavelengths</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Used for: Data centers, LANs</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <strong>Pro Tip:</strong> In FTTH/PON work, you'll almost always use <span className="text-yellow-600 font-bold">Single-Mode (Yellow)</span> fiber.
        </div>
      </div>
    )
  },
  {
    id: 'color-code',
    title: 'The 12-Fiber Color Code',
    subtitle: 'TIA-598 Standard Colors',
    icon: Target,
    color: 'from-purple-500 to-pink-600',
    content: (
      <div className="space-y-6">
        <p className="text-center text-gray-600 dark:text-gray-300">
          Memorize these 12 colors—they repeat for tubes and fibers!
        </p>
        <div className="grid grid-cols-6 gap-3 max-w-lg mx-auto">
          {[
            { pos: 1, color: 'Blue', hex: '#0066CC' },
            { pos: 2, color: 'Orange', hex: '#FF6600' },
            { pos: 3, color: 'Green', hex: '#00AA00' },
            { pos: 4, color: 'Brown', hex: '#8B4513' },
            { pos: 5, color: 'Slate', hex: '#708090' },
            { pos: 6, color: 'White', hex: '#FFFFFF', border: true },
            { pos: 7, color: 'Red', hex: '#CC0000' },
            { pos: 8, color: 'Black', hex: '#000000' },
            { pos: 9, color: 'Yellow', hex: '#FFCC00' },
            { pos: 10, color: 'Violet', hex: '#8800AA' },
            { pos: 11, color: 'Rose', hex: '#FF66AA' },
            { pos: 12, color: 'Aqua', hex: '#00CCCC' },
          ].map(c => (
            <div key={c.pos} className="text-center">
              <div 
                className={`w-12 h-12 rounded-full mx-auto mb-1 ${c.border ? 'border-2 border-gray-400' : 'border border-gray-300'}`}
                style={{ backgroundColor: c.hex }}
              />
              <div className="text-xs font-bold">{c.pos}</div>
              <div className="text-[10px] text-gray-500">{c.color}</div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <strong>Memory Trick:</strong> "Blue-Orange-Green-Brown-Slate-White" then "Red-Black-Yellow-Violet-Rose-Aqua"
        </div>
      </div>
    )
  },
  {
    id: 'connectors',
    title: 'Common Connectors',
    subtitle: 'LC, SC, and the polishes',
    icon: Zap,
    color: 'from-emerald-500 to-teal-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border">
            <div className="text-2xl font-bold text-emerald-600 mb-2">LC Connector</div>
            <div className="text-sm text-gray-500 mb-3">Lucent Connector • 1.25mm ferrule</div>
            <ul className="text-sm space-y-1">
              <li>• Most common in data centers</li>
              <li>• Small form factor (SFP compatible)</li>
              <li>• Push-pull latch mechanism</li>
            </ul>
          </div>
          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border">
            <div className="text-2xl font-bold text-blue-600 mb-2">SC Connector</div>
            <div className="text-sm text-gray-500 mb-3">Subscriber Connector • 2.5mm ferrule</div>
            <ul className="text-sm space-y-1">
              <li>• Standard for FTTH/PON</li>
              <li>• Snap-in push-pull design</li>
              <li>• Very reliable connection</li>
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 mx-auto mb-2"></div>
            <div className="font-bold">UPC (Blue)</div>
            <div className="text-xs text-gray-600">Ultra Physical Contact</div>
            <div className="text-xs mt-1">Return Loss: &gt;50 dB</div>
          </div>
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl text-center">
            <div className="w-8 h-8 rounded-full bg-green-500 mx-auto mb-2"></div>
            <div className="font-bold">APC (Green)</div>
            <div className="text-xs text-gray-600">Angled Physical Contact</div>
            <div className="text-xs mt-1">Return Loss: &gt;60 dB</div>
          </div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center text-sm">
          <AlertTriangle className="h-4 w-4 inline mr-1 text-red-500" />
          <strong>Never mix UPC and APC!</strong> Green to green, blue to blue only.
        </div>
      </div>
    )
  },
  {
    id: 'ftth-overview',
    title: 'What is FTTH?',
    subtitle: 'Fiber to the Home explained',
    icon: Cable,
    color: 'from-teal-500 to-cyan-600',
    content: (
      <div className="space-y-6">
        <p className="text-center text-gray-600 dark:text-gray-300">
          FTTH (Fiber to the Home) delivers fiber optic connectivity directly to residential customers, providing the fastest and most reliable internet service available.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-center">
            <div className="text-3xl font-bold text-teal-600 mb-1">1-10 Gbps</div>
            <div className="text-sm text-gray-600">Typical Speeds</div>
          </div>
          <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl text-center">
            <div className="text-3xl font-bold text-cyan-600 mb-1">20+ km</div>
            <div className="text-sm text-gray-600">Max Distance</div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">99.9%</div>
            <div className="text-sm text-gray-600">Reliability</div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="font-bold mb-2">FTTH Advantages over Copper:</div>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> No electromagnetic interference</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Much longer distances</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Symmetric upload/download</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Future-proof bandwidth</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'pon-network',
    title: 'The PON Network',
    subtitle: 'From OLT to ONT',
    icon: Cable,
    color: 'from-indigo-500 to-purple-600',
    content: (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
          {[
            { label: 'OLT', desc: 'Central Office', color: 'bg-indigo-500' },
            { label: '→', desc: '', isArrow: true },
            { label: 'Feeder', desc: 'Fiber Run', color: 'bg-blue-400' },
            { label: '→', desc: '', isArrow: true },
            { label: 'Splitter', desc: '1:32 typical', color: 'bg-purple-500' },
            { label: '→', desc: '', isArrow: true },
            { label: 'Drop', desc: 'To home', color: 'bg-pink-500' },
            { label: '→', desc: '', isArrow: true },
            { label: 'ONT', desc: 'Customer', color: 'bg-emerald-500' },
          ].map((item, i) => (
            item.isArrow ? (
              <ArrowRight key={i} className="h-6 w-6 text-gray-400 flex-shrink-0" />
            ) : (
              <div key={i} className="text-center flex-shrink-0">
                <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center text-white font-bold text-xs`}>
                  {item.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">{item.desc}</div>
              </div>
            )
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="font-bold text-indigo-700 mb-1">OLT (Optical Line Terminal)</div>
            <p className="text-gray-600">Located at the central office. Sends data downstream and receives upstream.</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="font-bold text-emerald-700 mb-1">ONT (Optical Network Terminal)</div>
            <p className="text-gray-600">Located at customer premises. Converts fiber to Ethernet/voice.</p>
          </div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="font-bold text-purple-700 mb-1">Splitter</div>
          <p className="text-sm text-gray-600">Passive device that splits the optical signal. A 1:32 splitter serves 32 customers from one OLT port with ~17.5 dB loss.</p>
        </div>
      </div>
    )
  },
  {
    id: 'gpon-basics',
    title: 'GPON Basics',
    subtitle: 'The most common PON technology',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600',
    content: (
      <div className="space-y-6">
        <p className="text-center text-gray-600 dark:text-gray-300">
          GPON (Gigabit Passive Optical Network) is the most widely deployed FTTH technology worldwide.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="font-bold text-blue-700 mb-2">Downstream</div>
            <div className="text-2xl font-mono font-bold">2.488 Gbps</div>
            <div className="text-sm text-gray-500 mt-1">Wavelength: 1490 nm</div>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <div className="font-bold text-indigo-700 mb-2">Upstream</div>
            <div className="text-2xl font-mono font-bold">1.244 Gbps</div>
            <div className="text-sm text-gray-500 mt-1">Wavelength: 1310 nm</div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="font-bold mb-2">Key GPON Facts:</div>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> Up to 128 ONTs per OLT port (typically 32-64)</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> Maximum reach of 20 km (60 km with extended optics)</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> Bandwidth shared among all users on a PON</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> Uses TDMA for upstream traffic management</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'xgspon-intro',
    title: 'XGS-PON Introduction',
    subtitle: '10G Symmetric - The next generation',
    icon: Target,
    color: 'from-emerald-500 to-teal-600',
    content: (
      <div className="space-y-6">
        <p className="text-center text-gray-600 dark:text-gray-300">
          XGS-PON delivers 10 Gbps symmetric speeds for demanding applications like business services and multi-gig residential.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="font-bold text-emerald-700 mb-2">Downstream</div>
            <div className="text-2xl font-mono font-bold text-emerald-600">9.953 Gbps</div>
            <div className="text-sm text-gray-500 mt-1">Wavelength: 1577 nm</div>
          </div>
          <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
            <div className="font-bold text-teal-700 mb-2">Upstream</div>
            <div className="text-2xl font-mono font-bold text-teal-600">9.953 Gbps</div>
            <div className="text-sm text-gray-500 mt-1">Wavelength: 1270 nm</div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="font-bold text-blue-700 mb-2">GPON vs XGS-PON Coexistence</div>
          <p className="text-sm text-gray-600">XGS-PON uses different wavelengths than GPON, allowing both to run on the same fiber infrastructure during migration. This is called "combo PON" deployment.</p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-center">
          <strong>Coming Up:</strong> Learn more about XGS-PON in Fiber 102!
        </div>
      </div>
    )
  },
  {
    id: 'power-levels',
    title: 'Understanding Power Levels',
    subtitle: 'dB and dBm explained simply',
    icon: Zap,
    color: 'from-rose-500 to-red-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
            <div className="text-xl font-bold text-rose-700 mb-2">dBm</div>
            <p className="text-sm text-gray-600 mb-3">Absolute power level (referenced to 1 milliwatt)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>OLT Tx Power:</span>
                <span className="font-mono font-bold">+3 to +7 dBm</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>ONT Rx (Good):</span>
                <span className="font-mono font-bold text-green-600">-8 to -25 dBm</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>ONT Rx (Low):</span>
                <span className="font-mono font-bold text-red-600">&lt; -27 dBm</span>
              </div>
            </div>
          </div>
          <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="text-xl font-bold text-blue-700 mb-2">dB</div>
            <p className="text-sm text-gray-600 mb-3">Relative measurement (loss or gain)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>SMF Loss:</span>
                <span className="font-mono font-bold">0.35 dB/km @1310nm</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>Connector:</span>
                <span className="font-mono font-bold">0.15 - 0.50 dB</span>
              </div>
              <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span>1:32 Splitter:</span>
                <span className="font-mono font-bold">~17.5 dB</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
          <strong>Quick Math:</strong> If OLT sends +5 dBm and total loss is 25 dB, ONT receives <span className="font-mono font-bold">-20 dBm</span>
        </div>
      </div>
    )
  },
  {
    id: 'cleaning',
    title: 'Clean, Clean, Clean!',
    subtitle: 'The #1 rule of fiber',
    icon: Sparkles,
    color: 'from-cyan-500 to-blue-600',
    content: (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-block p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <p className="text-lg font-bold text-gray-800 dark:text-white">
            85% of fiber problems are caused by contamination!
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <div className="font-bold text-emerald-700 mb-2">✓ Always Do</div>
            <ul className="text-sm space-y-1">
              <li>• Inspect before connecting</li>
              <li>• Clean with proper tools</li>
              <li>• Use dust caps when not in use</li>
              <li>• Dry clean first, wet clean if needed</li>
            </ul>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <div className="font-bold text-red-700 mb-2">✗ Never Do</div>
            <ul className="text-sm space-y-1">
              <li>• Touch the ferrule end face</li>
              <li>• Blow on connectors (moisture!)</li>
              <li>• Use household cleaners</li>
              <li>• Skip inspection after cleaning</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="font-bold mb-2">Cleaning Steps:</div>
          <div className="flex items-center gap-2 text-sm">
            <Badge>1</Badge> Inspect with scope →
            <Badge>2</Badge> Dry clean →
            <Badge>3</Badge> Re-inspect →
            <Badge>4</Badge> Wet clean if needed →
            <Badge>5</Badge> Final inspection
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'testing',
    title: 'Basic Testing',
    subtitle: 'OLTS and OTDR overview',
    icon: Target,
    color: 'from-orange-500 to-amber-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200">
            <div className="text-xl font-bold text-orange-700 mb-2">OLTS (Tier 1)</div>
            <p className="text-sm text-gray-600 mb-3">Optical Loss Test Set</p>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Measures total end-to-end loss</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Quick pass/fail certification</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Uses light source + power meter</span>
              </li>
            </ul>
          </div>
          <div className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200">
            <div className="text-xl font-bold text-purple-700 mb-2">OTDR (Tier 2)</div>
            <p className="text-sm text-gray-600 mb-3">Optical Time Domain Reflectometer</p>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Shows events along the fiber</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Locates faults and splices</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Measures distance to events</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-center">
          <strong>Remember:</strong> OLTS tells you IF there's a problem. OTDR tells you WHERE the problem is.
        </div>
      </div>
    )
  },
  {
    id: 'safety',
    title: 'Safety First!',
    subtitle: 'Protect yourself and others',
    icon: AlertTriangle,
    color: 'from-red-500 to-rose-600',
    content: (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-300">
            <div className="text-xl font-bold text-red-700 mb-3">⚠️ Eye Safety</div>
            <ul className="text-sm space-y-2">
              <li>• <strong>Never</strong> look into a fiber end</li>
              <li>• <strong>Never</strong> look into laser sources</li>
              <li>• IR light (1310/1550nm) is invisible but dangerous</li>
              <li>• Use proper viewing equipment only</li>
            </ul>
          </div>
          <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-300">
            <div className="text-xl font-bold text-amber-700 mb-3">🔍 Fiber Shards</div>
            <ul className="text-sm space-y-2">
              <li>• Glass fiber is extremely sharp</li>
              <li>• Use a fiber trash container</li>
              <li>• Never touch face while working</li>
              <li>• Wear safety glasses when cleaving</li>
            </ul>
          </div>
        </div>
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <div className="font-bold mb-2">Best Practices:</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Work in well-lit areas
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Keep work area clean
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Dispose of scraps properly
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Use dust caps always
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'app-tour',
    title: 'Using FiberTech Pro',
    subtitle: 'Your essential tools',
    icon: Zap,
    color: 'from-blue-500 to-indigo-600',
    content: (
      <div className="space-y-4">
        <p className="text-center text-gray-600 dark:text-gray-300">
          FiberTech Pro has everything you need in the field:
        </p>
        <div className="grid gap-3">
          {[
            { name: 'Power Level Calculator', desc: 'Estimate ONT Rx power from OLT', icon: '⚡' },
            { name: 'Fiber Locator', desc: 'Find fiber # by tube/fiber color', icon: '🎯' },
            { name: 'Loss Budget Calculator', desc: 'Calculate total link loss', icon: '🧮' },
            { name: 'Splitter Loss Reference', desc: 'Quick splitter loss lookup', icon: '📊' },
            { name: 'Cleaning & Inspection', desc: 'Step-by-step procedures', icon: '✨' },
            { name: 'Reference Tables', desc: 'All specs in one place', icon: '📚' },
          ].map((tool, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow border">
              <div className="text-2xl">{tool.icon}</div>
              <div>
                <div className="font-medium">{tool.name}</div>
                <div className="text-sm text-gray-500">{tool.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    subtitle: 'Foundations complete',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-600',
    content: (
      <div className="space-y-6 text-center">
        <div className="inline-block p-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          You've completed Fiber 101! You now understand the fundamentals of fiber optics, FTTH architecture, and PON technology.
        </p>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4">
          <p className="text-amber-800 dark:text-amber-200 font-medium">Ready for Certification?</p>
          <p className="text-sm text-amber-700 dark:text-amber-300">Review the study guide and take the exam to earn your Fiber 101 certificate!</p>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Link to={createPageUrl('CertificationExam') + '?course=fiber101'}>
            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600" size="lg">
              <Target className="h-4 w-4 mr-2" />
              Take Exam
            </Button>
          </Link>
          <Link to={createPageUrl('Fiber102')}>
            <Button variant="outline" className="w-full" size="lg">
              <BookOpen className="h-4 w-4 mr-2" />
              Continue to 102
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Or review the <Link to={createPageUrl('StudyGuide') + '?course=fiber101'} className="text-blue-600 underline">study guide</Link> first.
        </p>
      </div>
    )
  },
];

export default function Fiber101() {
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
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Fiber 101</h1>
                <p className="text-xs text-gray-500">Foundations of Fiber Optics</p>
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