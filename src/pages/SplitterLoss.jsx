import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GitBranch, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SPLITTER_DATA = [
  { ratio: '1:2', loss: 3.5, ports: 2, icon: '◐' },
  { ratio: '1:4', loss: 7.0, ports: 4, icon: '◔' },
  { ratio: '1:8', loss: 10.5, ports: 8, icon: '◕' },
  { ratio: '1:16', loss: 14.0, ports: 16, icon: '●' },
  { ratio: '1:32', loss: 17.5, ports: 32, icon: '⬤' },
  { ratio: '1:64', loss: 21.0, ports: 64, icon: '◉' },
  { ratio: '1:128', loss: 24.5, ports: 128, icon: '◎' },
];

const CASCADE_EXAMPLES = [
  { name: '1:4 + 1:8', ratios: ['1:4', '1:8'], totalSplit: 32, totalLoss: 17.5 },
  { name: '1:4 + 1:16', ratios: ['1:4', '1:16'], totalSplit: 64, totalLoss: 21.0 },
  { name: '1:8 + 1:8', ratios: ['1:8', '1:8'], totalSplit: 64, totalLoss: 21.0 },
  { name: '1:4 + 1:32', ratios: ['1:4', '1:32'], totalSplit: 128, totalLoss: 24.5 },
];

export default function SplitterLoss() {
  const [selectedSplitter, setSelectedSplitter] = useState(null);

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
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Splitter Loss Reference</h1>
              <p className="text-xs text-gray-500">Tap any ratio for details</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Tap Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SPLITTER_DATA.map((splitter) => (
            <button
              key={splitter.ratio}
              onClick={() => setSelectedSplitter(selectedSplitter?.ratio === splitter.ratio ? null : splitter)}
              className={`p-4 rounded-xl text-center transition-all ${
                selectedSplitter?.ratio === splitter.ratio
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                  : 'bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl hover:scale-102'
              }`}
            >
              <div className="text-2xl mb-1">{splitter.icon}</div>
              <div className="text-xl font-bold">{splitter.ratio}</div>
              <div className={`text-2xl font-mono font-bold mt-2 ${
                selectedSplitter?.ratio === splitter.ratio ? 'text-white' : 'text-blue-600'
              }`}>
                {splitter.loss} dB
              </div>
              <div className={`text-xs mt-1 ${
                selectedSplitter?.ratio === splitter.ratio ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {splitter.ports} ports
              </div>
            </button>
          ))}
        </div>

        {/* Selected Detail */}
        {selectedSplitter && (
          <Card className="border-0 shadow-lg ring-2 ring-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-blue-600" />
                {selectedSplitter.ratio} Splitter Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="text-sm text-gray-500">Insertion Loss</div>
                  <div className="text-2xl font-bold font-mono text-blue-600">{selectedSplitter.loss} dB</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <div className="text-sm text-gray-500">Output Ports</div>
                  <div className="text-2xl font-bold font-mono text-purple-600">{selectedSplitter.ports}</div>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <div className="text-sm text-gray-500">Per Port Power</div>
                  <div className="text-2xl font-bold font-mono text-emerald-600">1/{selectedSplitter.ports}</div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Calculation:</strong> Loss = 10 × log₁₀({selectedSplitter.ports}) + connector losses ≈ {selectedSplitter.loss} dB typical
                  </div>
                </div>
              </div>

              {/* Visual representation */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="text-sm font-medium mb-3">Signal Distribution</div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">IN</div>
                  <div className="flex-1 h-1 bg-blue-300"></div>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {selectedSplitter.ratio}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    {Array.from({ length: Math.min(selectedSplitter.ports, 8) }).map((_, i) => (
                      <div key={i} className="h-0.5 bg-purple-300 rounded"></div>
                    ))}
                    {selectedSplitter.ports > 8 && <div className="text-xs text-gray-400 text-center">+{selectedSplitter.ports - 8} more</div>}
                  </div>
                  <div className="flex flex-col gap-1">
                    {Array.from({ length: Math.min(selectedSplitter.ports, 8) }).map((_, i) => (
                      <div key={i} className="w-4 h-2 bg-purple-400 rounded text-[6px] text-white flex items-center justify-center"></div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cascade Examples */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Common Cascade Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {CASCADE_EXAMPLES.map((cascade) => (
                <div key={cascade.name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    {cascade.ratios.map((r, i) => (
                      <React.Fragment key={r}>
                        <Badge variant="outline">{r}</Badge>
                        {i < cascade.ratios.length - 1 && <span className="text-gray-400">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-500">Total Split</div>
                      <div className="font-semibold">1:{cascade.totalSplit}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Loss</div>
                      <div className="font-mono font-semibold text-blue-600">{cascade.totalLoss} dB</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Lookup Table */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Full Reference Table</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 font-medium">Ratio</th>
                    <th className="text-center py-2 font-medium">Ports</th>
                    <th className="text-center py-2 font-medium">Loss (dB)</th>
                    <th className="text-center py-2 font-medium">Power/Port</th>
                  </tr>
                </thead>
                <tbody>
                  {SPLITTER_DATA.map((s) => (
                    <tr key={s.ratio} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 font-semibold">{s.ratio}</td>
                      <td className="py-2 text-center">{s.ports}</td>
                      <td className="py-2 text-center font-mono text-blue-600">{s.loss}</td>
                      <td className="py-2 text-center text-gray-500">{(100 / s.ports).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <strong>Note:</strong> Values are typical insertion loss including connector losses. Actual values may vary ±0.5 dB by manufacturer.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}