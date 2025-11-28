import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Search, Zap, Cable, Scissors, Radio, Palette, Plug, X, GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FIBER_ATTENUATION, 
  CONNECTOR_LOSS, 
  SPLICE_LOSS, 
  STANDARD_BUDGETS,
  OTDR_EVENTS,
  REFLECTANCE_LIMITS,
  FIBER_COLORS,
  WAVELENGTH_INFO
} from './FiberConstants';

// Connector reference image
const CONNECTOR_REFERENCE_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/b61e02c48_connectortypes.png';

// Connector Types Data
const CONNECTOR_TYPES = [
  {
    type: 'LC',
    fullName: 'Lucent Connector / Little Connector',
    ferrule: '1.25mm',
    coupling: 'Push-pull latch',
    polishes: ['UPC', 'APC'],
    fiberTypes: ['SMF', 'MMF'],
    commonality: 'Very High',
    commonalityColor: 'bg-emerald-500',
    applications: 'Data centers, enterprise networks, high-density applications',
    notes: 'Industry standard for SFP/SFP+ transceivers. Most common in 2025.'
  },
  {
    type: 'SC',
    fullName: 'Subscriber Connector / Square Connector',
    ferrule: '2.5mm',
    coupling: 'Push-pull snap-in',
    polishes: ['UPC', 'APC'],
    fiberTypes: ['SMF', 'MMF'],
    commonality: 'High',
    commonalityColor: 'bg-emerald-400',
    applications: 'FTTH, PON, telecommunications, CATV',
    notes: 'Standard for GPON/XGS-PON. Very reliable push-pull design.'
  },
  {
    type: 'MPO/MTP',
    fullName: 'Multi-fiber Push On / Multi-fiber Termination Push-on',
    ferrule: 'Rectangular (12/24 fibers)',
    coupling: 'Push-pull with guide pins',
    polishes: ['UPC', 'APC'],
    fiberTypes: ['SMF', 'MMF'],
    commonality: 'Very High',
    commonalityColor: 'bg-emerald-500',
    applications: '40G/100G/400G data centers, parallel optics, trunk cables',
    notes: 'MTP is brand name (US Conec) of MPO. Critical for high-speed interconnects.'
  },
  {
    type: 'FC',
    fullName: 'Ferrule Connector / Fixed Connector',
    ferrule: '2.5mm',
    coupling: 'Threaded screw-on',
    polishes: ['UPC', 'APC'],
    fiberTypes: ['SMF'],
    commonality: 'Low',
    commonalityColor: 'bg-amber-500',
    applications: 'Test equipment, legacy telecom, precision instruments',
    notes: 'Being phased out. Still found on OTDRs and test equipment.'
  },
  {
    type: 'ST',
    fullName: 'Straight Tip',
    ferrule: '2.5mm',
    coupling: 'Bayonet twist-lock',
    polishes: ['UPC'],
    fiberTypes: ['MMF', 'SMF'],
    commonality: 'Low',
    commonalityColor: 'bg-amber-500',
    applications: 'Legacy LANs, industrial, military',
    notes: 'Legacy connector. Rarely used in new installations.'
  },
  {
    type: 'E2000',
    fullName: 'E2000 / LSH',
    ferrule: '2.5mm',
    coupling: 'Push-pull with spring-loaded dust cap',
    polishes: ['UPC', 'APC'],
    fiberTypes: ['SMF'],
    commonality: 'Medium',
    commonalityColor: 'bg-blue-500',
    applications: 'European telecom, high-reliability networks',
    notes: 'Built-in dust protection. Popular in European markets.'
  },
  {
    type: 'MU',
    fullName: 'Miniature Unit',
    ferrule: '1.25mm',
    coupling: 'Push-pull',
    polishes: ['UPC', 'APC'],
    fiberTypes: ['SMF', 'MMF'],
    commonality: 'Low',
    commonalityColor: 'bg-amber-500',
    applications: 'Japanese telecom, high-density panels',
    notes: 'Similar to LC but different form factor. Rare outside Japan.'
  },
  {
    type: 'MTRJ',
    fullName: 'Mechanical Transfer Registered Jack',
    ferrule: 'Rectangular (duplex)',
    coupling: 'RJ-style latch',
    polishes: ['UPC'],
    fiberTypes: ['MMF'],
    commonality: 'Very Low',
    commonalityColor: 'bg-red-400',
    applications: 'Legacy enterprise, desktop connections',
    notes: 'Obsolete. Not recommended for new installations.'
  },
  {
    type: 'SMA',
    fullName: 'Sub-Miniature version A',
    ferrule: '3.175mm (stainless steel)',
    coupling: 'Threaded screw-on',
    polishes: ['Flat'],
    fiberTypes: ['MMF', 'Large core'],
    commonality: 'Very Low',
    commonalityColor: 'bg-red-400',
    applications: 'Industrial lasers, medical devices, military',
    notes: 'Specialty applications only. Large core/high power.'
  },
  {
    type: 'D4',
    fullName: 'D4 Connector',
    ferrule: '2.0mm',
    coupling: 'Threaded with keying',
    polishes: ['PC'],
    fiberTypes: ['SMF'],
    commonality: 'Very Low',
    commonalityColor: 'bg-red-400',
    applications: 'Legacy Japanese telecom',
    notes: 'Obsolete. Found only in very old installations.'
  },
  {
    type: 'Biconic',
    fullName: 'Biconic Connector',
    ferrule: 'Tapered cone',
    coupling: 'Threaded alignment',
    polishes: ['PC'],
    fiberTypes: ['SMF', 'MMF'],
    commonality: 'Obsolete',
    commonalityColor: 'bg-gray-500',
    applications: 'Historical/museum only',
    notes: 'First generation connector. No longer manufactured.'
  },
  {
    type: 'SMC',
    fullName: 'Small Media Connector',
    ferrule: '1.25mm',
    coupling: 'Push-pull',
    polishes: ['UPC'],
    fiberTypes: ['SMF', 'MMF'],
    commonality: 'Very Low',
    commonalityColor: 'bg-red-400',
    applications: 'Specialty/niche applications',
    notes: 'Rarely encountered. LC is preferred alternative.'
  }
];

export default function ReferenceTables() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reference Tables</h2>
            <p className="text-sm text-gray-500">Industry standard values (TIA-568-D, IEEE, ITU-T)</p>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search tables..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="attenuation" className="space-y-6">
        <TabsList className="bg-white dark:bg-gray-800 p-1 shadow-lg rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="attenuation" className="rounded-lg data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
            <Cable className="h-4 w-4 mr-2" />
            Attenuation
          </TabsTrigger>
          <TabsTrigger value="connectors" className="rounded-lg data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <Zap className="h-4 w-4 mr-2" />
            Connectors
          </TabsTrigger>
          <TabsTrigger value="splices" className="rounded-lg data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
            <Scissors className="h-4 w-4 mr-2" />
            Splices
          </TabsTrigger>
          <TabsTrigger value="standards" className="rounded-lg data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
            <Radio className="h-4 w-4 mr-2" />
            Standards
          </TabsTrigger>
          <TabsTrigger value="otdr" className="rounded-lg data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
            OTDR Events
          </TabsTrigger>
          <TabsTrigger value="colors" className="rounded-lg data-[state=active]:bg-cyan-100 data-[state=active]:text-cyan-700">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="connector-types" className="rounded-lg data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
            <Plug className="h-4 w-4 mr-2" />
            Connector Types
          </TabsTrigger>
        </TabsList>

        {/* Attenuation Table */}
        <TabsContent value="attenuation">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cable className="h-5 w-5 text-emerald-600" />
                Fiber Attenuation Coefficients (dB/km)
              </CardTitle>
              <p className="text-sm text-gray-500">Maximum values per TIA-568-D and ITU-T G.652/G.657</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead className="font-semibold">Fiber Type</TableHead>
                    <TableHead className="text-center">850nm</TableHead>
                    <TableHead className="text-center">1300nm</TableHead>
                    <TableHead className="text-center">1310nm</TableHead>
                    <TableHead className="text-center">1550nm</TableHead>
                    <TableHead className="text-center">1625nm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">OS2 SMF (G.652.D)</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">0.35</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline">0.25</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline">0.30</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">G.657.A1/A2 (Bend-Insensitive)</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center"><Badge variant="outline">0.35</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline">0.25</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline">0.30</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">OM3 (50μm Laser-Optimized)</TableCell>
                    <TableCell className="text-center"><Badge className="bg-amber-100 text-amber-800">3.0</Badge></TableCell>
                    <TableCell className="text-center"><Badge className="bg-amber-100 text-amber-800">1.0</Badge></TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">OM4 (50μm Extended)</TableCell>
                    <TableCell className="text-center"><Badge className="bg-amber-100 text-amber-800">3.0</Badge></TableCell>
                    <TableCell className="text-center"><Badge className="bg-amber-100 text-amber-800">1.0</Badge></TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">OM5 (Wideband MMF)</TableCell>
                    <TableCell className="text-center"><Badge className="bg-lime-100 text-lime-800">3.0</Badge></TableCell>
                    <TableCell className="text-center"><Badge className="bg-lime-100 text-lime-800">1.0</Badge></TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                    <TableCell className="text-center text-gray-400">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                <strong>Note:</strong> These are maximum specified values. Typical measured values are often 10-20% lower.
                Field measurements exceeding these values indicate potential fiber damage or contamination.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connector Loss Table */}
        <TabsContent value="connectors">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  Connector Insertion Loss (dB per mated pair)
                </CardTitle>
                <p className="text-sm text-gray-500">Per TIA-568-D and Telcordia GR-326-CORE</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-center">SMF</TableHead>
                      <TableHead className="text-center">MMF</TableHead>
                      <TableHead>Application</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        <Badge className="bg-emerald-100 text-emerald-800">Elite (Grade A)</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">≤ 0.15 dB</TableCell>
                      <TableCell className="text-center font-mono">≤ 0.15 dB</TableCell>
                      <TableCell className="text-sm text-gray-500">Factory-terminated, high-density</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <Badge className="bg-blue-100 text-blue-800">Standard (Grade B)</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">≤ 0.50 dB</TableCell>
                      <TableCell className="text-center font-mono">≤ 0.50 dB</TableCell>
                      <TableCell className="text-sm text-gray-500">Field-terminated, general use</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <Badge variant="outline">Typical Measured</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">0.10–0.20 dB</TableCell>
                      <TableCell className="text-center font-mono">0.10–0.15 dB</TableCell>
                      <TableCell className="text-sm text-gray-500">Clean, quality connectors</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Reflectance Requirements (dB)</CardTitle>
                <p className="text-sm text-gray-500">Minimum return loss by polish type</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead>Polish Type</TableHead>
                      <TableHead className="text-center">Min Reflectance</TableHead>
                      <TableHead>Typical Use</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(REFLECTANCE_LIMITS).map(([type, value]) => (
                      <TableRow key={type}>
                        <TableCell className="font-medium">{type}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">{value} dB</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {type.includes('APC') ? 'FTTH, PON, analog CATV' : 
                           type.includes('UPC') ? 'Data networks, digital' :
                           type.includes('Fusion') ? 'Permanent connections' :
                           type.includes('Mechanical') ? 'Emergency repairs' : 'Legacy systems'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Splice Loss Table */}
        <TabsContent value="splices">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-purple-600" />
                Splice Loss Values (dB)
              </CardTitle>
              <p className="text-sm text-gray-500">Per TIA-568-D and IEC 61073</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead>Splice Type</TableHead>
                    <TableHead className="text-center">SMF (Max)</TableHead>
                    <TableHead className="text-center">MMF (Max)</TableHead>
                    <TableHead className="text-center">Typical</TableHead>
                    <TableHead className="text-center">Excellent</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        Fusion Splice
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Badge className="bg-purple-100 text-purple-800">0.10 dB</Badge></TableCell>
                    <TableCell className="text-center"><Badge className="bg-purple-100 text-purple-800">0.10 dB</Badge></TableCell>
                    <TableCell className="text-center font-mono">0.02–0.05 dB</TableCell>
                    <TableCell className="text-center font-mono text-emerald-600">≤ 0.02 dB</TableCell>
                    <TableCell className="text-sm text-gray-500">Arc fusion with modern splicer</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        Mechanical Splice
                      </div>
                    </TableCell>
                    <TableCell className="text-center"><Badge className="bg-orange-100 text-orange-800">0.30 dB</Badge></TableCell>
                    <TableCell className="text-center"><Badge className="bg-orange-100 text-orange-800">0.30 dB</Badge></TableCell>
                    <TableCell className="text-center font-mono">0.10–0.20 dB</TableCell>
                    <TableCell className="text-center font-mono">0.05 dB</TableCell>
                    <TableCell className="text-sm text-gray-500">Index-matching gel required</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Fusion Splice Best Practices</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Clean fiber thoroughly before stripping</li>
                    <li>• Use proper cleave angle (&lt;1°)</li>
                    <li>• Verify arc current for fiber type</li>
                    <li>• Protect splice with heat-shrink sleeve</li>
                  </ul>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Mechanical Splice Best Practices</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Ensure index-matching gel is fresh</li>
                    <li>• Cleave quality is critical</li>
                    <li>• Fiber ends must butt together</li>
                    <li>• Best for emergency repairs only</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Standards Budget Table */}
        <TabsContent value="standards">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-orange-600" />
                Network Standards & Power Budgets
              </CardTitle>
              <p className="text-sm text-gray-500">IEEE 802.3 and ITU-T specifications</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead>Standard</TableHead>
                      <TableHead>Wavelength</TableHead>
                      <TableHead>Fiber Type</TableHead>
                      <TableHead className="text-center">Max Loss</TableHead>
                      <TableHead className="text-center">Max Distance</TableHead>
                      <TableHead>Specification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(STANDARD_BUDGETS)
                      .filter(([name]) => 
                        searchTerm === '' || 
                        name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(([name, spec]) => (
                      <TableRow key={name}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{spec.wavelength}</Badge>
                        </TableCell>
                        <TableCell>{spec.fiber}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-800 font-mono">{spec.maxLoss} dB</Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {typeof spec.maxDistance === 'object' 
                            ? `${spec.maxDistance.OM3}/${spec.maxDistance.OM4}m`
                            : spec.maxDistance >= 1000 
                              ? `${spec.maxDistance/1000}km` 
                              : `${spec.maxDistance}m`}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{spec.standard}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OTDR Events Table */}
        <TabsContent value="otdr">
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Reflective Events</CardTitle>
                <p className="text-sm text-gray-500">Events that show both loss and reflectance</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead>Event Type</TableHead>
                      <TableHead className="text-center">Reflectance</TableHead>
                      <TableHead className="text-center">Typical Loss</TableHead>
                      <TableHead>Interpretation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(OTDR_EVENTS.reflective).map(([key, event]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium capitalize">{key.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">{event.reflectance}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">{event.loss}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{event.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Non-Reflective Events</CardTitle>
                <p className="text-sm text-gray-500">Events showing loss only (no reflection)</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead>Event Type</TableHead>
                      <TableHead className="text-center">Typical Loss</TableHead>
                      <TableHead>Interpretation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(OTDR_EVENTS.nonReflective).map(([key, event]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium capitalize">{key.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">{event.loss}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{event.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fiber Colors */}
        <TabsContent value="colors">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-cyan-600" />
                  Fiber Identification Colors (TIA-598-D)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {FIBER_COLORS.tubes.map((fiber) => (
                    <div key={fiber.position} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-inner"
                        style={{ backgroundColor: fiber.hex }}
                      />
                      <div>
                        <div className="font-medium">{fiber.color}</div>
                        <div className="text-xs text-gray-500">Position {fiber.position}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Cable Jacket Colors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(FIBER_COLORS.jacketTypes).map(([type, info]) => (
                    <div key={type} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div 
                        className={`w-10 h-10 rounded-lg shadow-inner border-2 border-gray-300 ${
                          info.color === 'Yellow' ? 'bg-yellow-400' :
                          info.color === 'Orange' ? 'bg-orange-500' :
                          info.color === 'Aqua' ? 'bg-cyan-400' :
                          info.color === 'Aqua/Violet' ? 'bg-gradient-to-r from-cyan-400 to-violet-400' :
                          info.color === 'Lime Green' ? 'bg-lime-400' : 'bg-gray-400'
                        }`}
                      />
                      <div>
                        <div className="font-medium">{type}</div>
                        <div className="text-sm text-gray-500">{info.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Connector Types */}
        <TabsContent value="connector-types">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-indigo-600" />
                Fiber Optic Connector Types
              </CardTitle>
              <p className="text-sm text-gray-500">Visual reference with specifications and 2025 market prevalence</p>
            </CardHeader>
            <CardContent>
              {/* Reference Image */}
              <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Visual Reference Guide</h4>
                <img 
                  src={CONNECTOR_REFERENCE_IMAGE} 
                  alt="Fiber Optic Connector Types Reference" 
                  className="w-full max-w-4xl mx-auto rounded-lg"
                />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead className="w-20">Type</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead className="text-center">Ferrule</TableHead>
                      <TableHead className="text-center">Coupling</TableHead>
                      <TableHead className="text-center">Polish</TableHead>
                      <TableHead className="text-center">2025 Usage</TableHead>
                      <TableHead>Applications</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CONNECTOR_TYPES.filter(conn => 
                      searchTerm === '' || 
                      conn.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      conn.fullName.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((conn) => (
                      <TableRow key={conn.type}>
                        <TableCell className="font-bold text-lg">{conn.type}</TableCell>
                        <TableCell className="text-sm">{conn.fullName}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{conn.ferrule}</TableCell>
                        <TableCell className="text-center text-sm">{conn.coupling}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {conn.polishes.map(p => (
                              <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${conn.commonalityColor} text-white`}>
                            {conn.commonality}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          {conn.applications}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">Most Common (2025)</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>LC</strong> - Data centers, enterprise</li>
                    <li>• <strong>SC</strong> - FTTH, PON networks</li>
                    <li>• <strong>MPO/MTP</strong> - High-speed trunk cables</li>
                  </ul>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Declining Use</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>FC</strong> - Being replaced by LC</li>
                    <li>• <strong>ST</strong> - Legacy installations only</li>
                    <li>• <strong>MU</strong> - Limited to Japan</li>
                  </ul>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Obsolete</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>D4</strong> - No longer used</li>
                    <li>• <strong>Biconic</strong> - Historical only</li>
                    <li>• <strong>MTRJ</strong> - Not recommended</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
}