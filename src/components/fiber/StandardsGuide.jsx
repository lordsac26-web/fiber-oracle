import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function StandardsGuide() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Industry Standards Guide</h2>
          <p className="text-sm text-gray-500">Complete reference for fiber optic testing and installation standards</p>
        </div>
      </div>

      <Tabs defaultValue="tia" className="space-y-6">
        <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="tia" className="rounded-lg">TIA-568</TabsTrigger>
          <TabsTrigger value="tia526" className="rounded-lg">TIA-526</TabsTrigger>
          <TabsTrigger value="iec" className="rounded-lg">IEC 61300-3-35</TabsTrigger>
          <TabsTrigger value="ieee" className="rounded-lg">IEEE 802.3</TabsTrigger>
          <TabsTrigger value="itut" className="rounded-lg">ITU-T</TabsTrigger>
        </TabsList>

        {/* TIA-568 */}
        <TabsContent value="tia" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                TIA-568-D Commercial Building Cabling Standard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">TIA-568-D.1</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Multimode fiber requirements (OM1, OM2, OM3, OM4, OM5)
                  </p>
                  <ul className="text-xs space-y-1 mt-2 text-gray-600 dark:text-gray-400">
                    <li>• Core diameter: 50μm or 62.5μm</li>
                    <li>• Bandwidth-length product specifications</li>
                    <li>• Attenuation limits per wavelength</li>
                  </ul>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">TIA-568-D.3</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Single-mode fiber requirements (OS2, G.657)
                  </p>
                  <ul className="text-xs space-y-1 mt-2 text-gray-600 dark:text-gray-400">
                    <li>• Core diameter: 8-10μm</li>
                    <li>• Max attenuation: 0.35 dB/km @1310nm</li>
                    <li>• Max attenuation: 0.25 dB/km @1550nm</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">Connector Grade Requirements (TIA-568-D)</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-amber-100 dark:bg-amber-900/40">
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-center">Max Loss (dB)</TableHead>
                      <TableHead>Application</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Grade A (Elite)</TableCell>
                      <TableCell className="text-center font-mono">≤ 0.15</TableCell>
                      <TableCell className="text-sm">Factory-terminated, high-density</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Grade B (Standard)</TableCell>
                      <TableCell className="text-center font-mono">≤ 0.50</TableCell>
                      <TableCell className="text-sm">Field-terminated, general use</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">Key Requirements</h4>
                <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Maximum link loss calculated per formula in Annex B</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Fiber attenuation limits for all wavelengths specified</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Splice and connector loss limits defined</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIA-526 */}
        <TabsContent value="tia526" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                TIA-526-14-C Optical Test Procedures
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">Tier 1 - OLTS Testing (Insertion Loss)</h4>
                <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <Badge className="bg-emerald-600 shrink-0">Method A</Badge>
                    <span>Unidirectional - Light source one end, meter other. Faster but less accurate.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="bg-emerald-600 shrink-0">Method B</Badge>
                    <span><strong>Recommended</strong> - Bidirectional measurements, average results. More accurate for link loss.</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Tier 2 - OTDR Testing (Characterization)</h4>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• Launch and receive cable requirements (150m+ recommended)</li>
                  <li>• Splice/event characterization to pinpoint losses</li>
                  <li>• Bidirectional averaging to account for backscatter difference</li>
                  <li>• Length and loss verification for each section</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Reference Methods (Critical for Accuracy)
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  <strong>1-Jumper (1-Cord) Method (Recommended):</strong> Set reference with launch cord connected to both source and meter, then measure link with the same launch cord. This captures both end connectors under test.
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>2-Jumper Method:</strong> Less accurate - requires subtracting reference jumper loss. Can accumulate errors.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IEC 61300-3-35 */}
        <TabsContent value="iec" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                IEC 61300-3-35 Connector End Face Inspection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3">Inspection Zones (Mandatory)</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded border-l-4 border-red-500">
                    <div className="font-semibold text-red-800 dark:text-red-200 text-sm">Zone A (Core Area)</div>
                    <div className="text-xs text-red-700 dark:text-red-300 mt-1">Diameter ≤ 9μm (SMF) or 50μm (MMF)</div>
                    <div className="text-xs text-red-700 dark:text-red-300">✗ ZERO defects allowed - No scratches, pits, or contamination</div>
                  </div>

                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded border-l-4 border-yellow-500">
                    <div className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm">Zone B (Cladding)</div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Diameter 9-125μm (up to cladding edge)</div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-300">✓ Minor scratches acceptable if width ≤ 3μm and not in core</div>
                  </div>

                  <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded border-l-4 border-blue-500">
                    <div className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Zone C (Polishing Layer)</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">Diameter 125-250μm</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">✓ Some scratches acceptable - no impact on core</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold mb-3">Common Defects & Acceptance</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-700">
                      <TableHead>Defect Type</TableHead>
                      <TableHead>Zone A</TableHead>
                      <TableHead>Zone B</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-sm">Scratches (≤3μm width)</TableCell>
                      <TableCell>✗ REJECT</TableCell>
                      <TableCell>✓ ACCEPT</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-sm">Pitting or dimples</TableCell>
                      <TableCell>✗ REJECT</TableCell>
                      <TableCell>⚠ Review</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-sm">Dust particles</TableCell>
                      <TableCell>✗ REJECT - Clean</TableCell>
                      <TableCell>✓ ACCEPT if small</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-sm">Oil film/residue</TableCell>
                      <TableCell>✗ REJECT - Clean</TableCell>
                      <TableCell>✓ ACCEPT</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Inspection Requirements</h4>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• Minimum 400x magnification fiber scope required</li>
                  <li>• Proper lighting without glare</li>
                  <li>• Verify ferrule alignment (centered in field of view)</li>
                  <li>• Document with photos if defects found</li>
                  <li>• Inspect BOTH ends of every connection before mating</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IEEE 802.3 */}
        <TabsContent value="ieee" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>IEEE 802.3 Ethernet Power Budgets</CardTitle>
              <p className="text-sm text-gray-500 mt-2">Standards-based link distance and loss limits</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Key Point</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  IEEE 802.3 defines power budgets (max allowable loss), NOT connector grades. The power budget is calculated based on minimum transmitter power and maximum receiver sensitivity.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-indigo-100 dark:bg-indigo-900/40">
                    <TableHead>Standard</TableHead>
                    <TableHead>Wavelength</TableHead>
                    <TableHead>Max Loss (dB)</TableHead>
                    <TableHead>Max Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">1GBASE-SX</TableCell>
                    <TableCell>850nm</TableCell>
                    <TableCell className="font-mono">2.0 (OM1), 3.0 (OM2+)</TableCell>
                    <TableCell>275m (OM1), 550m (OM2+)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">1GBASE-LX</TableCell>
                    <TableCell>1310nm</TableCell>
                    <TableCell className="font-mono">3.0 (SMF)</TableCell>
                    <TableCell>5 km</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">10GBASE-SR4</TableCell>
                    <TableCell>850nm</TableCell>
                    <TableCell className="font-mono">1.9 (OM4)</TableCell>
                    <TableCell>100 m</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">10GBASE-LR4</TableCell>
                    <TableCell>1310nm</TableCell>
                    <TableCell className="font-mono">6.3 (SMF)</TableCell>
                    <TableCell>10 km</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ITU-T */}
        <TabsContent value="itut" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>ITU-T Fiber Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">ITU-T G.652 (SMF)</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Conventional single-mode fiber, most common fiber worldwide.
                  </p>
                  <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <div>• <strong>Attenuation:</strong> ≤0.35 dB/km @1310nm, ≤0.25 dB/km @1550nm</div>
                    <div>• <strong>Dispersion zero:</strong> ~1310nm (minimizes pulse broadening)</div>
                    <div>• <strong>Cost:</strong> Lowest (most compatible with standard amps)</div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">ITU-T G.655 (NZDSF)</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Non-zero dispersion-shifted fiber for DWDM long-haul systems.
                  </p>
                  <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <div>• <strong>Purpose:</strong> Reduces four-wave mixing (FWM) in multi-wavelength systems</div>
                    <div>• <strong>Dispersion:</strong> Small positive dispersion to prevent FWM</div>
                    <div>• <strong>Use case:</strong> 40-400G long-distance DWDM links</div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">ITU-T G.657 (Bend-Insensitive SMF)</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Bend-insensitive fiber for FTTH installations with tight bend requirements.
                  </p>
                  <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                    <div>• <strong>G.657.A1:</strong> 5.0mm minimum bend radius (FTTH standard)</div>
                    <div>• <strong>G.657.A2:</strong> 7.5mm minimum bend radius (more tolerant)</div>
                    <div>• <strong>G.657.B3:</strong> 15mm minimum bend radius (outdoor cable)</div>
                    <div>• <strong>Attenuation:</strong> Same as G.652 (≤0.35 dB/km @1310nm)</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Standards Compliance Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Calculate link loss using TIA-568-D formula with actual component values</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Test using bidirectional OTDR (TIA-526-14-C Method B recommended)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Inspect all connectors per IEC 61300-3-35 (400x scope, Zone A = zero defects)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Document testing results with reference method used and bidirectional averages</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>Verify fiber type (G.652, G.657, OM3/4/5) matches application requirements</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}