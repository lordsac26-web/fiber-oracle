import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Link2, 
  ExternalLink, 
  Wifi, 
  Zap, 
  Scissors, 
  Cable, 
  Plug, 
  BookOpen, 
  Radio,
  ShoppingCart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const INDUSTRY_LINKS = {
  testEquipment: [
    { name: 'VIAVI Solutions', url: 'https://www.viavisolutions.com', description: 'OTDR, OLTS, fiber test equipment' },
    { name: 'EXFO', url: 'https://www.exfo.com', description: 'Test & measurement, network monitoring' },
    { name: 'Fluke Networks', url: 'https://www.flukenetworks.com', description: 'Certifiers, OTDRs, cable testers' },
    { name: 'AFL', url: 'https://www.aflglobal.com', description: 'Test equipment, fusion splicers, accessories' },
    { name: 'Kingfisher', url: 'https://www.kingfisherfiber.com', description: 'Power meters, light sources, test kits' },
  ],
  fusionSplicers: [
    { name: 'Fujikura', url: 'https://www.fujikura.com', description: 'Premium fusion splicers and cleavers' },
    { name: 'Sumitomo Electric', url: 'https://www.sumitomoelectric.com', description: 'Fusion splicers, fiber products' },
    { name: 'FITEL / Furukawa', url: 'https://www.fitel.com', description: 'Splicers, fiber products' },
    { name: 'INNO Instrument', url: 'https://www.innoinstrument.com', description: 'Affordable fusion splicers' },
  ],
  fiberManufacturers: [
    { name: 'Corning', url: 'https://www.corning.com/optical-communications', description: 'Fiber, cable, connectivity solutions' },
    { name: 'Prysmian Group', url: 'https://www.prysmiangroup.com', description: 'Cables and fiber products' },
    { name: 'CommScope', url: 'https://www.commscope.com', description: 'Infrastructure, connectivity' },
    { name: 'OFS (Furukawa)', url: 'https://www.ofsoptics.com', description: 'Specialty and standard fibers' },
    { name: 'Sterlite Technologies', url: 'https://www.stl.tech', description: 'Fiber and cable manufacturing' },
  ],
  connectorsAccessories: [
    { name: 'Senko', url: 'https://www.senko.com', description: 'Connectors, adapters, cleaning products' },
    { name: 'US Conec (MTP)', url: 'https://www.usconec.com', description: 'MPO/MTP connectors and accessories' },
    { name: 'Diamond SA', url: 'https://www.diamond-fo.com', description: 'E2000 and specialty connectors' },
    { name: 'Amphenol', url: 'https://www.amphenol.com', description: 'Connectors and interconnects' },
    { name: 'Sticklers / MicroCare', url: 'https://www.sticklers.com', description: 'Fiber cleaning products' },
  ],
  standardsOrganizations: [
    { name: 'TIA (Telecommunications Industry Association)', url: 'https://www.tiaonline.org', description: 'TIA-568, TIA-526 standards' },
    { name: 'IEEE', url: 'https://www.ieee.org', description: 'IEEE 802.3 Ethernet standards' },
    { name: 'IEC', url: 'https://www.iec.ch', description: 'IEC 61300 connector standards' },
    { name: 'ITU-T', url: 'https://www.itu.int', description: 'G.652, G.657 fiber standards' },
    { name: 'Fiber Optic Association (FOA)', url: 'https://www.foa.org', description: 'Training, certification, resources' },
  ],
  training: [
    { name: 'FOA (Fiber Optic Association)', url: 'https://www.foa.org', description: 'CFOT, CFOS certifications' },
    { name: 'Light Brigade', url: 'https://www.lightbrigade.com', description: 'Hands-on fiber training' },
    { name: 'BICSI', url: 'https://www.bicsi.org', description: 'ICT installer certifications' },
    { name: 'The Fiber School', url: 'https://www.thefiberschool.com', description: 'Online and in-person training' },
  ],
  suppliers: [
    { name: 'Fiber Instrument Sales', url: 'https://www.fiberinstrumentsales.com', description: 'Fiber optic tools, test equipment, supplies' },
  ]
};

export default function IndustryLinks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Industry Links</h1>
              <p className="text-xs text-gray-500">External resources and vendors</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <Wifi className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Internet connection required.</strong> These links will navigate to external websites. 
            Make sure you have an active internet connection before clicking.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Suppliers */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                  <ShoppingCart className="h-4 w-4 text-rose-600" />
                </div>
                Suppliers & Distributors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {INDUSTRY_LINKS.suppliers.map(link => (
                <a 
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-sm group-hover:text-rose-600">{link.name}</div>
                    <div className="text-xs text-gray-500">{link.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-rose-600" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Test Equipment */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Zap className="h-4 w-4 text-blue-600" />
                </div>
                Test Equipment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {INDUSTRY_LINKS.testEquipment.map(link => (
                <a 
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-sm group-hover:text-blue-600">{link.name}</div>
                    <div className="text-xs text-gray-500">{link.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Fusion Splicers */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Scissors className="h-4 w-4 text-purple-600" />
                </div>
                Fusion Splicers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {INDUSTRY_LINKS.fusionSplicers.map(link => (
                <a 
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-sm group-hover:text-purple-600">{link.name}</div>
                    <div className="text-xs text-gray-500">{link.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Fiber Manufacturers */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Cable className="h-4 w-4 text-emerald-600" />
                </div>
                Fiber Manufacturers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {INDUSTRY_LINKS.fiberManufacturers.map(link => (
                <a 
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-sm group-hover:text-emerald-600">{link.name}</div>
                    <div className="text-xs text-gray-500">{link.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-emerald-600" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Connectors & Accessories */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Plug className="h-4 w-4 text-indigo-600" />
                </div>
                Connectors & Accessories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {INDUSTRY_LINKS.connectorsAccessories.map(link => (
                <a 
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-sm group-hover:text-indigo-600">{link.name}</div>
                    <div className="text-xs text-gray-500">{link.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Standards Organizations */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                </div>
                Standards Organizations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {INDUSTRY_LINKS.standardsOrganizations.map(link => (
                <a 
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
                >
                  <div>
                    <div className="font-medium text-sm group-hover:text-orange-600">{link.name}</div>
                    <div className="text-xs text-gray-500">{link.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-600" />
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Training & Certification */}
          <Card className="border-0 shadow-lg md:col-span-2 lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                  <Radio className="h-4 w-4 text-teal-600" />
                </div>
                Training & Certification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                {INDUSTRY_LINKS.training.map(link => (
                  <a 
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors group"
                  >
                    <div>
                      <div className="font-medium text-sm group-hover:text-teal-600">{link.name}</div>
                      <div className="text-xs text-gray-500">{link.description}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-teal-600" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}