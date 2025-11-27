import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Zap, Cable, Scissors, Radio, Palette } from 'lucide-react';
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
      </Tabs>
    </div>
  );
}