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

// Comprehensive Fiber Glossary
const FIBER_GLOSSARY = {
  basic: {
    title: "Basic Terms",
    audience: "All Personnel",
    terms: [
      { term: "Fiber Optic Cable", definition: "A cable containing one or more optical fibers that transmit data as pulses of light.", example: "A 12-strand fiber cable running between buildings." },
      { term: "Single-Mode Fiber (SMF)", definition: "Fiber with a small core (8-10μm) that allows only one mode of light to propagate. Used for long distances.", example: "Yellow-jacketed OS2 cable for a 10km backbone link." },
      { term: "Multi-Mode Fiber (MMF)", definition: "Fiber with a larger core (50μm or 62.5μm) allowing multiple light modes. Used for shorter distances.", example: "Aqua OM4 cable for a 100m data center run." },
      { term: "Core", definition: "The central part of the fiber where light travels. Measured in microns (μm).", example: "SMF has a 9μm core; OM4 MMF has a 50μm core." },
      { term: "Cladding", definition: "The outer layer surrounding the core (125μm diameter) that keeps light confined in the core.", example: "The cladding reflects light back into the core via total internal reflection." },
      { term: "Connector", definition: "A mechanical device that attaches to the fiber end for connecting to equipment or other fibers.", example: "LC, SC, and MPO connectors are common types." },
      { term: "Patch Cord", definition: "A fiber cable with connectors on both ends used for making connections.", example: "A 2m LC-LC duplex patch cord." },
      { term: "dB (Decibel)", definition: "Unit of measurement for optical power levels and loss. A logarithmic ratio.", example: "A connector with 0.25 dB loss; signal at -15 dBm." },
      { term: "dBm", definition: "Absolute power level in decibels referenced to 1 milliwatt.", example: "Transmitter output: +5 dBm; Receiver sensitivity: -28 dBm." },
      { term: "Wavelength", definition: "The 'color' of light used, measured in nanometers (nm). Different wavelengths have different properties.", example: "1310nm and 1550nm for SMF; 850nm for MMF." },
      { term: "Duplex", definition: "A pair of fibers or connectors—one for transmit, one for receive.", example: "A duplex LC patch cord has two fibers side by side." },
      { term: "Simplex", definition: "A single fiber or connector for one-way communication.", example: "A simplex SC connector for a single fiber strand." },
    ]
  },
  intermediate: {
    title: "Technical Terms",
    audience: "Network Engineers & Technicians",
    terms: [
      { term: "Attenuation", definition: "Loss of optical power as light travels through fiber, measured in dB or dB/km.", example: "SMF at 1310nm: max 0.35 dB/km; OM4 at 850nm: max 3.0 dB/km." },
      { term: "Insertion Loss", definition: "The total loss caused when a component (connector, splice) is inserted into a link.", example: "An LC connector pair typically has 0.15 dB insertion loss." },
      { term: "Return Loss", definition: "The ratio of power reflected back versus power transmitted, expressed in positive dB.", example: "A UPC connector should have >50 dB return loss." },
      { term: "Reflectance", definition: "Same as return loss but expressed as a negative number. Closer to 0 is worse.", example: "APC connectors: <-60 dB reflectance; UPC: <-50 dB." },
      { term: "OLTS (Optical Loss Test Set)", definition: "Equipment with a light source and power meter to measure end-to-end insertion loss.", example: "Using OLTS to certify a link passes the 2.0 dB loss budget." },
      { term: "OTDR (Optical Time Domain Reflectometer)", definition: "Instrument that sends pulses and analyzes reflections to characterize events along a fiber.", example: "OTDR trace shows a splice at 1,234m with 0.08 dB loss." },
      { term: "Power Budget", definition: "The maximum allowable loss between transmitter and receiver for a given application.", example: "10GBASE-LR has a 6.2 dB power budget for 10km." },
      { term: "Link Loss", definition: "Total loss from all components: fiber attenuation, connectors, splices, and splitters.", example: "Total link loss = 2.5km × 0.35 dB + 4 connectors × 0.15 dB = 1.475 dB." },
      { term: "Encircled Flux (EF)", definition: "A standard for controlling light launch conditions in multimode testing for repeatable results.", example: "Using an EF-compliant launch cord for OM4 certification." },
      { term: "Mode Field Diameter (MFD)", definition: "The effective diameter of the light-carrying region in single-mode fiber.", example: "G.652 SMF has ~9.2μm MFD at 1310nm." },
      { term: "Numerical Aperture (NA)", definition: "The cone angle of light that a fiber can accept, affecting coupling efficiency.", example: "OM3 has NA of 0.200; higher NA captures more light but limits bandwidth." },
      { term: "Bandwidth-Length Product", definition: "The data-carrying capacity of MMF, measured in MHz·km.", example: "OM4 has 4700 MHz·km at 850nm—supports 100G to 150m." },
      { term: "UPC (Ultra Physical Contact)", definition: "Connector polish with a slightly curved end face for good return loss. Blue colored.", example: "Standard UPC connectors for data network applications." },
      { term: "APC (Angled Physical Contact)", definition: "Connector polish with an 8° angle to reduce back-reflection. Green colored.", example: "APC connectors required for PON and analog video systems." },
      { term: "GPON/XGS-PON", definition: "Passive Optical Network standards for fiber-to-the-home (FTTH) deployments.", example: "GPON: 2.5G down/1.25G up; XGS-PON: 10G symmetric." },
      { term: "Splitter", definition: "Passive device that divides optical signal into multiple outputs (e.g., 1:8, 1:32).", example: "A 1:32 splitter in a PON introduces ~17.5 dB loss." },
    ]
  },
  advanced: {
    title: "Installation & Splicing Terms",
    audience: "Field Technicians & Splicers",
    terms: [
      { term: "Fusion Splice", definition: "Permanent joining of two fibers by melting (fusing) the glass with an electric arc.", example: "A good fusion splice has <0.05 dB loss and no reflectance." },
      { term: "Mechanical Splice", definition: "Temporary/semi-permanent fiber join using index-matching gel and alignment mechanism.", example: "Used for emergency restoration; expect 0.1-0.3 dB loss." },
      { term: "Cleave", definition: "A controlled break of the fiber to create a flat, perpendicular end face for splicing.", example: "Cleave angle must be <1° for quality fusion splice." },
      { term: "Cleave Angle", definition: "The angle of the cleaved fiber end relative to perpendicular. Lower is better.", example: "Modern cleavers achieve 0.3-0.5° cleave angles consistently." },
      { term: "Buffer Tube", definition: "Protective tube containing one or more fibers, often color-coded.", example: "A 144-fiber cable has 12 buffer tubes with 12 fibers each." },
      { term: "Loose Tube Cable", definition: "Cable design where fibers float in gel-filled tubes, ideal for outdoor/aerial use.", example: "Outdoor OSP cable using loose tube construction for protection." },
      { term: "Tight Buffer Cable", definition: "Cable where coating is applied directly to fiber, easier to terminate.", example: "Indoor distribution cable with tight-buffered 900μm fibers." },
      { term: "Ribbon Fiber", definition: "Multiple fibers bonded side-by-side in a flat ribbon for mass fusion splicing.", example: "12-fiber ribbon spliced in seconds with ribbon splicer." },
      { term: "Pigtail", definition: "A short fiber with connector on one end, spliced to cable fiber on the other.", example: "Fusion splice a factory-terminated LC pigtail to each strand." },
      { term: "Splice Tray", definition: "Organizer for storing and protecting fusion splices inside an enclosure.", example: "12-fiber splice tray holds 12 fusion splices with bend radius protection." },
      { term: "Splice Enclosure", definition: "Weatherproof housing for splice trays, used at cable midpoints or endpoints.", example: "Aerial dome closure with capacity for 288 splices." },
      { term: "OTDR Dead Zone", definition: "Distance after a reflective event where the OTDR cannot detect other events.", example: "Event dead zone of 0.8m means events within 0.8m can't be distinguished." },
      { term: "Launch/Receive Fiber", definition: "Reference fibers attached before/after link under test to measure first/last connectors.", example: "150m launch fiber lets OTDR characterize the first connector." },
      { term: "Macrobend", definition: "Large-radius bend causing light to escape the core. Visible loss on OTDR.", example: "Cable bent too tightly around a conduit corner—1.5 dB macrobend loss." },
      { term: "Microbend", definition: "Tiny deformations in fiber from crushing or cable stress, causing distributed loss.", example: "Over-tightened cable tie causing microbend losses along the run." },
      { term: "Index-Matching Gel", definition: "Optical gel used in mechanical splices to reduce reflection at fiber interface.", example: "Fresh gel is critical for low-loss mechanical splices." },
      { term: "Core Alignment Splicer", definition: "Fusion splicer that actively aligns fiber cores for lowest-loss splices.", example: "Core-alignment splicers achieve <0.02 dB average splice loss." },
      { term: "V-Groove Splicer", definition: "Lower-cost fusion splicer that aligns fibers by cladding, not core.", example: "V-groove splicer: 0.05-0.10 dB typical, acceptable for MMF." },
      { term: "Arc Current", definition: "The electrical current used to create the fusion arc. Must match fiber type.", example: "Reduce arc current when splicing G.657 bend-insensitive fiber." },
      { term: "Pre-fuse/Main Fuse", definition: "Two-stage fusion process: pre-fuse cleans fiber ends, main fuse creates splice.", example: "Adjust pre-fuse time if seeing bubbles in splice." },
    ]
  },
  testing: {
    title: "Testing & Certification Terms",
    audience: "All Testing Personnel",
    terms: [
      { term: "Tier 1 Testing", definition: "Basic certification using OLTS to verify total insertion loss and length meet standards.", example: "Tier 1 test: Link passed with 1.85 dB loss (limit: 2.0 dB)." },
      { term: "Tier 2 Testing", definition: "Extended certification including OTDR trace to characterize all events on the link.", example: "Tier 2 adds OTDR to verify each splice is under 0.1 dB." },
      { term: "Bidirectional Testing", definition: "Testing fiber in both directions and averaging results for accurate loss measurement.", example: "A→B: 1.8 dB, B→A: 1.9 dB, Average: 1.85 dB." },
      { term: "Reference Setting", definition: "Zeroing the test equipment before measurement to exclude test cord losses.", example: "1-jumper reference method: set reference with launch cord attached to both." },
      { term: "1-Jumper Reference", definition: "Reference method that measures loss of both end connectors under test. Recommended.", example: "TIA recommends 1-jumper for most accurate results." },
      { term: "Backscatter", definition: "Small amount of light scattered backward by fiber impurities. Basis of OTDR operation.", example: "OTDR measures backscatter level changes to detect events." },
      { term: "Fresnel Reflection", definition: "Reflection caused by refractive index change at glass-air interfaces (connectors, breaks).", example: "End of fiber shows strong Fresnel reflection on OTDR trace." },
      { term: "Gainer", definition: "OTDR event where signal appears to increase—indicates fiber type mismatch, not actual gain.", example: "Gainer at 500m: OM3 spliced to OM4 with different backscatter." },
      { term: "Ghost Event", definition: "False events on OTDR trace caused by multiple reflections. Appear after end of fiber.", example: "Ignore spikes after the end reflection—they're ghosts." },
      { term: "Dynamic Range", definition: "OTDR's measurement range from noise floor to maximum input. Determines testable length.", example: "40 dB dynamic range can test ~160km of SMF at 1550nm." },
      { term: "Pulse Width", definition: "Duration of OTDR light pulse. Longer pulses = more range but less resolution.", example: "Use 10ns pulse for short links, 1μs pulse for long-haul." },
      { term: "Visual Fault Locator (VFL)", definition: "Red laser device to visually locate breaks, bends, or bad connectors.", example: "VFL shows red glow at the macrobend location in the fiber." },
      { term: "Fiber Scope", definition: "Microscope for inspecting connector end faces for contamination or damage.", example: "Scope reveals scratches in Zone A—connector needs replacement." },
      { term: "IEC 61300-3-35", definition: "Standard defining pass/fail criteria for connector end face inspection.", example: "Zone A (core): zero defects allowed per IEC 61300-3-35." },
    ]
  },
  pon: {
    title: "PON & Access Terms",
    audience: "FTTx Technicians",
    terms: [
      { term: "OLT (Optical Line Terminal)", definition: "Central office equipment that connects PON to the backbone network.", example: "OLT at the CO serves 256 subscribers via multiple PON ports." },
      { term: "ONT/ONU", definition: "Optical Network Terminal/Unit at customer premises converting fiber to Ethernet/voice.", example: "Install ONT in basement, run Cat6 to router location." },
      { term: "ODN (Optical Distribution Network)", definition: "The passive fiber infrastructure between OLT and ONTs including splitters.", example: "ODN design: 1:32 split at cabinet, 1:4 at each pedestal." },
      { term: "Split Ratio", definition: "Number of output ports on a splitter (1:8, 1:16, 1:32, 1:64).", example: "1:32 split allows one OLT port to serve 32 subscribers." },
      { term: "Splitter Loss", definition: "Inherent loss when dividing optical signal. Approximately 3.5 dB per doubling.", example: "1:32 splitter = ~17.5 dB loss (theoretical minimum ~15 dB)." },
      { term: "Class B+/C+", definition: "GPON power budget classes. B+: 28 dB max; C+: 32 dB max.", example: "Class C+ optics needed for 20km reach with 1:32 split." },
      { term: "N1/N2 Class", definition: "XGS-PON power budget classes. N1: 29 dB; N2: 31 dB.", example: "Upgrade to N2 optics to extend reach to rural subscribers." },
      { term: "FDH (Fiber Distribution Hub)", definition: "Cabinet containing splitters that distributes fiber to local area.", example: "FDH serves 288 homes with 1:8 splitters to distribution cables." },
      { term: "NAP (Network Access Point)", definition: "Small enclosure where drop cables connect to distribution cable.", example: "NAP at each pole serves 4-8 homes with pre-connectorized drops." },
      { term: "Drop Cable", definition: "Final fiber run from distribution point to customer premises.", example: "Flat drop cable with SC/APC connector for quick ONT connection." },
      { term: "Tx Power", definition: "Optical transmit power from OLT or ONT, measured in dBm.", example: "OLT Tx: +5 dBm; ONT Tx: +0.5 to +5 dBm depending on class." },
      { term: "Rx Sensitivity", definition: "Minimum optical power a receiver can detect while maintaining error rate.", example: "GPON OLT Rx sensitivity: -28 dBm for Class B+." },
      { term: "Optical Power Margin", definition: "Difference between received power and receiver sensitivity. Should be >3 dB.", example: "Rx power: -18 dBm, sensitivity: -28 dBm = 10 dB margin (good)." },
    ]
  }
};

const AUDIENCE_COLORS = {
  "All Personnel": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Network Engineers & Technicians": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Field Technicians & Splicers": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "All Testing Personnel": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "FTTx Technicians": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
};

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
          <TabsTrigger value="glossary" className="rounded-lg data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
            <GraduationCap className="h-4 w-4 mr-2" />
            Glossary
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

        {/* Glossary */}
        <TabsContent value="glossary">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-violet-600" />
                Fiber Optic Glossary & Definitions
              </CardTitle>
              <p className="text-sm text-gray-500">Comprehensive terms for all skill levels—from beginners to experienced splicers</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Reference Key */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Beginner Focus
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start with Basic Terms and Testing & Certification. These cover day-to-day vocabulary.
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Engineer Focus
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Technical Terms covers power budgets, loss calculations, and network design concepts.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    Field Tech Focus
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Installation & Splicing Terms covers hands-on terminology for construction and splicing work.
                  </p>
                </div>
              </div>

              {/* Search within glossary */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search terms..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Glossary Sections */}
              <div className="space-y-4">
                {Object.entries(FIBER_GLOSSARY).map(([key, section]) => {
                  const filteredTerms = section.terms.filter(t => 
                    searchTerm === '' || 
                    t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    t.definition.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  
                  if (filteredTerms.length === 0) return null;
                  
                  return (
                    <Collapsible key={key} defaultOpen={key === 'basic' || searchTerm !== ''}>
                      <Card className="border border-gray-200 dark:border-gray-700">
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CardTitle className="text-lg">{section.title}</CardTitle>
                                <Badge className={AUDIENCE_COLORS[section.audience]}>
                                  {section.audience}
                                </Badge>
                                <Badge variant="outline">{filteredTerms.length} terms</Badge>
                              </div>
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {filteredTerms.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-violet-500"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 dark:text-white">
                                        {item.term}
                                      </h4>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {item.definition}
                                      </p>
                                      {item.example && (
                                        <div className="mt-2 p-2 bg-violet-50 dark:bg-violet-900/20 rounded text-sm">
                                          <span className="font-medium text-violet-700 dark:text-violet-300">Example: </span>
                                          <span className="text-gray-600 dark:text-gray-400">{item.example}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}