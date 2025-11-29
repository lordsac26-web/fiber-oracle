import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ArrowLeft, 
  Search,
  BookOpen,
  Zap,
  Calculator,
  Cable,
  Activity,
  Stethoscope,
  Sparkles,
  ImageIcon,
  Settings,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  HelpCircle,
  Layers,
  Network
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MANUAL_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    subsections: [
      {
        id: 'overview',
        title: 'Overview',
        content: `
**FiberTech Pro** is a comprehensive field reference tool designed for fiber optic technicians, network engineers, and installation professionals. 

**Key Features:**
- Power level calculations for GPON and XGS-PON networks
- TIA-598 fiber color code identification (up to 3456 fibers)
- Loss budget calculations with industry-standard values
- OLTS and OTDR test wizards
- Cleaning and inspection procedures
- Comprehensive reference tables
- Offline-capable PWA

**Target Users:**
- FTTH/PON installers and technicians
- Data center technicians
- Network engineers
- Fiber optic splicers
- Quality assurance personnel
        `
      },
      {
        id: 'navigation',
        title: 'Navigating the App',
        content: `
**Home Screen**
The home screen displays all available modules as cards. Tap any card to access that tool.

**Quick Reference Bar**
At the top of the home screen, you'll find commonly-referenced values:
- SMF attenuation at 1310nm and 1550nm
- Elite connector loss values
- Reflectance limits for UPC and APC

**Module Categories:**
- **Quick Access**: Power Level Calc, Splitter Loss, Bend Radius
- **Core Tools**: Loss Budget, Fiber Locator, OLTS, OTDR, Fiber Doctor, Cleaning
- **Reference**: Impairments, Reference Tables, PON Levels
- **Tools**: LCP/CLCP Info, Industry Links

**Navigation**
- Use the back arrow (←) to return to the previous screen
- All pages have a sticky header for easy navigation
        `
      },
      {
        id: 'settings',
        title: 'Settings & Customization',
        content: `
**Accessing Settings**
Tap the gear icon (⚙️) on the home screen to access settings.

**Branding Tab**
- Set your company name for reports
- Upload a company logo
- Set primary brand color

**Appearance Tab**
- Toggle dark mode
- Theme persists across sessions

**Test Values Tab**
- Override default connector loss values
- Override default splice loss values
- Configure custom report fields
- Toggle photo requirements for tests

**Data Storage**
All settings are stored locally on your device. Data persists even when offline.
        `
      },
      {
        id: 'offline',
        title: 'Offline Capabilities',
        content: `
**FiberTech Pro works offline!**

Once you've loaded the app, most features work without an internet connection:
- All calculators and reference tools
- Fiber locator
- Reference tables
- Cleaning procedures
- Saved LCP entries

**What requires internet:**
- Initial app load
- Industry links (external websites)
- Saving reports to cloud (if enabled)

**Tip:** Load the app once while connected to ensure all resources are cached.
        `
      }
    ]
  },
  {
    id: 'modules',
    title: 'Module Reference',
    icon: Zap,
    subsections: [
      {
        id: 'power-calc',
        title: 'Power Level Calculator',
        content: `
**Purpose**
Estimate the expected receive power at an ONT based on network parameters.

**Inputs:**
- **OLT Tx Power**: Transmit power from the OLT (typically +3 to +7 dBm)
- **Splitter Ratio**: The split ratio in the ODN (1:2 to 1:128)
- **Fiber Length**: Total fiber distance in kilometers
- **Connector Count**: Number of mated connector pairs
- **Splice Count**: Number of fusion or mechanical splices

**Outputs:**
- Expected ONT Rx power in dBm
- Total link loss breakdown
- Status indicator (Good/Marginal/Low/High)

**Standards:**
- GPON: ITU-T G.984.2 (Class B+, C+)
- XGS-PON: ITU-T G.9807.1 (N1, N2)

**Use Case:**
Before installing an ONT, use this calculator to verify the expected power level falls within acceptable ranges.
        `
      },
      {
        id: 'fiber-locator',
        title: 'Fiber Locator',
        content: `
**Purpose**
Identify fiber numbers using TIA-598 color codes, supporting cables from 12 to 3456 fibers.

**Standard Mode (1-144 fibers)**
- Select binder/tube color and fiber color
- Instantly see the fiber number
- Or enter a fiber number to see the color combination

**High-Count Mode (144+ fibers)**
- Select cable structure (144 to 3456 fibers)
- For 288+ cables: Select unit number, then tube color, then fiber color
- Supports both loose tube and ribbon cable configurations

**Supported Cable Types:**
- Loose tube: 144, 288, 432, 576, 864, 1728, 3456
- Ribbon: 144, 288, 576, 864, 1728, 3456

**Formula:**
- 144-fiber: Fiber # = (Tube Position - 1) × 12 + Fiber Position
- High-count: Fiber # = (Unit - 1) × 144 + (Tube Position - 1) × 12 + Fiber Position
        `
      },
      {
        id: 'loss-budget',
        title: 'Loss Budget Calculator',
        content: `
**Purpose**
Calculate total link loss and compare against network standard requirements.

**Inputs:**
- Fiber type (OS2, OM3, OM4, OM5)
- Wavelength (850nm to 1625nm)
- Fiber length in km or meters
- Number of connectors (Elite or Standard grade)
- Number of splices (Fusion or Mechanical)
- Optional: Splitter insertion loss
- Network standard selection

**Outputs:**
- Total calculated loss
- Loss breakdown by component
- Budget utilization percentage
- Pass/Marginal/Fail status
- Safety margin remaining

**Standards Included:**
- IEEE 802.3: 10G, 25G, 100G, 400G variants
- ITU-T: GPON, XGS-PON, 25G-PON, 50G-PON

**Best Practice:**
Always maintain at least 3 dB safety margin below the maximum allowed loss.
        `
      },
      {
        id: 'olts-wizard',
        title: 'OLTS Tier-1 Wizard',
        content: `
**Purpose**
Guide you through proper OLTS (Optical Loss Test Set) certification testing.

**Steps:**
1. **Setup**: Configure test parameters (fiber type, wavelength, reference method)
2. **Reference**: Set reference with proper warm-up and 1-jumper method
3. **Measurement**: Record bidirectional loss values
4. **Results**: View pass/fail status and generate report

**Key Concepts:**
- **Bidirectional Testing**: Test in both directions and average results
- **Reference Setting**: Zero out test cord losses before measuring
- **1-Jumper Reference**: TIA-recommended method for accurate results

**Output:**
- Per-wavelength loss measurements
- Bidirectional average
- Pass/fail against selected standard
- Exportable test report
        `
      },
      {
        id: 'otdr-wizard',
        title: 'OTDR Tier-2 Wizard',
        content: `
**Purpose**
Guide you through OTDR characterization testing with event analysis.

**Steps:**
1. **Setup**: Configure wavelength, pulse width, range, and launch fiber
2. **Trace**: Acquire traces in both directions
3. **Events**: Log all events (connectors, splices, bends)
4. **Results**: Review event table and overall characterization

**Event Types:**
- **Connectors**: Reflective events with loss (look for <0.5 dB, <-45 dB reflectance)
- **Splices**: Non-reflective loss events (look for <0.1 dB)
- **Bends**: Non-reflective loss, often wavelength-dependent
- **End of Fiber**: High reflectance at fiber termination

**Pro Tips:**
- Use launch fiber (150m+) to characterize first connector
- Use receive fiber to characterize last connector
- Compare bidirectional traces to identify gainers (MFD mismatch)
        `
      },
      {
        id: 'fiber-doctor',
        title: 'Fiber Doctor',
        content: `
**Purpose**
Interactive troubleshooting flowchart for diagnosing fiber issues.

**How to Use:**
1. Start with your primary symptom
2. Answer diagnostic questions
3. Follow the decision tree
4. Receive specific diagnosis and action items

**Common Issues Covered:**
- High loss on link
- High reflectance
- No light/signal
- Intermittent connectivity
- PON-specific issues (ONT not registering, low Rx power)

**Diagnostic Tools Suggested:**
- Visual Fault Locator (VFL)
- OTDR
- Fiber scope
- Power meter

**Tip:** The Fiber Doctor works offline, so you can troubleshoot in the field without connectivity.
        `
      },
      {
        id: 'cleaning',
        title: 'Cleaning & Inspection',
        content: `
**Purpose**
Step-by-step cleaning procedures following IEC 61300-3-35 standards.

**Cleaning Methods:**
1. **Dry Clean**: For light dust and particles
2. **Wet/Dry Clean**: For oil, film, or stubborn contamination
3. **Adapter Cleaning**: For in-adapter connectors
4. **MPO/MTP Cleaning**: For multi-fiber connectors

**Inspection Zones (IEC 61300-3-35):**
- **Zone A (Core)**: Must be defect-free
- **Zone B (Cladding)**: No scratches >3μm
- **Zone C (Adhesive)**: Minor defects acceptable
- **Zone D (Contact)**: Cosmetic only

**Pass/Fail Criteria:**
- SMF Core Zone: 0-25μm diameter
- MMF Core Zone: 0-65μm diameter (OM3/4)
- No scratches, pits, or contamination in core zone

**Always Remember:**
Inspect → Clean → Re-inspect → Connect
        `
      },
      {
        id: 'impairments',
        title: 'Impairment Library',
        content: `
**Purpose**
Visual reference for identifying defects in fiber scope images and OTDR traces.

**Scope Impairments:**
- **Contamination**: Dust, oil, fingerprints
- **Damage**: Scratches, pits, cracks, chips
- **Manufacturing**: Core offset, poor polish

**OTDR Impairments:**
- **Reflective Events**: Connectors, mechanical splices, breaks
- **Non-Reflective Events**: Fusion splices, bends, stress points
- **Anomalies**: Gainers, ghosts, noise

**Custom Entries:**
You can add your own impairment photos for reference:
1. Tap "Add Custom"
2. Upload photo from device
3. Add title, description, and severity
4. Entry saves locally

**Tip:** Build a library of issues you commonly encounter for training purposes.
        `
      },
      {
        id: 'reference-tables',
        title: 'Reference Tables',
        content: `
**Purpose**
Comprehensive reference data for fiber optic specifications.

**Tables Included:**

**Attenuation**
- SMF (OS2, G.657): 0.35 dB/km @1310nm, 0.25 dB/km @1550nm
- MMF (OM3/4/5): 3.0 dB/km @850nm, 1.0 dB/km @1300nm

**Connectors**
- Elite Grade: ≤0.15 dB
- Standard Grade: ≤0.50 dB
- Reflectance: UPC <-50 dB, APC <-60 dB

**Splices**
- Fusion: ≤0.10 dB (typical 0.02-0.05 dB)
- Mechanical: ≤0.30 dB

**Network Standards**
- Complete IEEE 802.3 specifications
- ITU-T PON standards
- Distance and loss limits

**OTDR Events**
- Expected loss and reflectance values
- Interpretation guidelines

**Color Codes**
- TIA-598 fiber identification
- Jacket color by fiber type

**Connector Types**
- Visual reference for all connector types
- Usage and commonality

**Glossary**
- Comprehensive fiber terminology
- Organized by skill level
        `
      },
      {
        id: 'pon-levels',
        title: 'PON Power Levels',
        content: `
**Purpose**
Reference for acceptable power levels in GPON and XGS-PON networks.

**GPON (ITU-T G.984.2)**
| Class | OLT Tx | ONT Rx Range | Budget |
|-------|--------|--------------|--------|
| B+ | +1.5 to +5 | -8 to -28 | 28 dB |
| C+ | +3 to +7 | -8 to -32 | 32 dB |

**XGS-PON (ITU-T G.9807.1)**
| Class | OLT Tx | ONT Rx Range | Budget |
|-------|--------|--------------|--------|
| N1 | +2 to +7 | -1 to -28 | 29 dB |
| N2 | +4 to +9 | -1 to -29 | 31 dB |

**Splitter Loss Reference**
- 1:2 = 3.5 dB
- 1:4 = 7.0 dB
- 1:8 = 10.5 dB
- 1:16 = 14.0 dB
- 1:32 = 17.5 dB
- 1:64 = 21.0 dB

**PON Errors**
- BIP errors
- FEC corrected/uncorrectable
- GEM errors
- HEC errors
        `
      },
      {
        id: 'lcp-info',
        title: 'LCP / CLCP Info',
        content: `
**Purpose**
Store and lookup cabinet and splitter location information.

**Features:**
- Add LCP/CLCP entries with splitter information
- Record physical location and GPS coordinates
- Store OLT logical location (Shelf/Slot/Port)
- Track optic information (make, model, serial)
- Search and filter entries
- Import from CSV/TXT files
- View entries on map

**Adding Entries:**
1. Tap "Add LCP"
2. Enter LCP number and splitter number (required)
3. Add location details (optional)
4. Capture GPS coordinates (optional)
5. Add OLT mapping (optional)
6. Save

**Importing Data:**
1. Tap "Import"
2. Download template for format reference
3. Upload CSV or TXT file
4. Review preview
5. Confirm import

**Data Storage:**
All LCP data is stored locally on your device.
        `
      }
    ]
  },
  {
    id: 'reference',
    title: 'Technical Reference',
    icon: Target,
    subsections: [
      {
        id: 'standards',
        title: 'Industry Standards',
        content: `
**TIA Standards**
- **TIA-568-D**: Generic Telecommunications Cabling
- **TIA-526-7**: Optical Power Loss - SMF
- **TIA-526-14-C**: Optical Power Loss - MMF
- **TIA-598-D**: Optical Fiber Color Coding
- **TIA-455 (FOTP)**: Fiber Optic Test Procedures

**IEC Standards**
- **IEC 61300-3-35**: Connector End Face Inspection
- **IEC 61280**: Fiber Optic Test Procedures
- **IEC 61073**: Mechanical Splices and Protectors

**IEEE Standards**
- **IEEE 802.3**: Ethernet (10M to 400G)

**ITU-T Standards**
- **G.652**: Single-Mode Fiber Characteristics
- **G.657**: Bend-Insensitive Single-Mode Fiber
- **G.984**: GPON
- **G.9807**: XGS-PON
- **G.9804**: 25G/50G Higher Speed PON

**Telcordia**
- **GR-326**: Single-Mode Connectors & Jumpers
- **GR-20**: Generic Requirements for Optical Fiber
        `
      },
      {
        id: 'formulas',
        title: 'Common Formulas',
        content: `
**Link Loss Calculation**
\`\`\`
Total Loss = (Fiber Length × Attenuation) + (Connectors × Connector Loss) + (Splices × Splice Loss) + Splitter Loss
\`\`\`

**Fiber Number from Colors (144-fiber)**
\`\`\`
Fiber # = (Tube Position - 1) × 12 + Fiber Position
\`\`\`

**High-Count Fiber Number**
\`\`\`
Fiber # = (Unit - 1) × 144 + (Tube Position - 1) × 12 + Fiber Position
\`\`\`

**Power Level**
\`\`\`
Rx Power (dBm) = Tx Power (dBm) - Total Loss (dB)
\`\`\`

**Splitter Loss (Theoretical)**
\`\`\`
Loss (dB) = 10 × log₁₀(N)
where N = number of output ports
\`\`\`

**dB to Linear Conversion**
\`\`\`
Linear Ratio = 10^(dB/10)
dB = 10 × log₁₀(Linear Ratio)
\`\`\`

**Bidirectional Average**
\`\`\`
Average Loss = (A→B Loss + B→A Loss) / 2
\`\`\`
        `
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting Guide',
        content: `
**High Loss Issues**

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| High connector loss | Contamination | Clean and re-inspect |
| High splice loss | Poor cleave | Re-cleave and re-splice |
| Distributed loss | Macrobend | Check routing, relieve stress |
| Loss at specific point | Damage/break | Locate with OTDR, repair |

**Reflectance Issues**

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| High reflectance | Contamination | Clean connector |
| Very high reflectance | Air gap/crack | Replace connector |
| UPC/APC mismatch | Wrong connector type | Use correct type |

**PON Issues**

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| ONT not registering | Low Rx power | Check splitters, clean connectors |
| Intermittent service | Marginal power | Reduce loss or upgrade optics |
| No light at ONT | Fiber break | Locate with VFL/OTDR |

**Quick Checks**
1. Always clean first
2. Check for proper connector mating
3. Verify fiber type matches equipment
4. Confirm UPC-to-UPC or APC-to-APC connections
5. Check for tight bends in cable routing
        `
      }
    ]
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    subsections: [
      {
        id: 'general-faq',
        title: 'General Questions',
        content: `
**Q: Does FiberTech Pro work offline?**
A: Yes! Once loaded, most features work without internet. Only external links require connectivity.

**Q: Where is my data stored?**
A: All data (settings, LCP entries, custom impairments) is stored locally on your device using browser storage.

**Q: Can I use this on multiple devices?**
A: Yes, but data doesn't sync between devices. Each device maintains its own local data.

**Q: Is there a desktop version?**
A: FiberTech Pro is a Progressive Web App (PWA). You can install it on desktop or mobile for an app-like experience.

**Q: How do I install the PWA?**
A: On mobile, use "Add to Home Screen" from your browser menu. On desktop, look for the install icon in the address bar.

**Q: Are the values accurate?**
A: All values are based on current industry standards (TIA-568-D, IEEE 802.3, ITU-T). When in doubt, verify against manufacturer specifications.
        `
      },
      {
        id: 'technical-faq',
        title: 'Technical Questions',
        content: `
**Q: Why does my OTDR show a "gainer"?**
A: Gainers occur when splicing fibers with different mode field diameters (MFD). The OTDR measures backscatter, which differs between fiber types. Always test bidirectionally and average.

**Q: What's the difference between insertion loss and return loss?**
A: Insertion loss measures power lost passing through a component (in dB). Return loss measures power reflected back toward the source (also in dB, but higher is better).

**Q: Why is APC required for PON?**
A: PON systems are sensitive to back-reflections which can cause laser instability. APC connectors have 8° angled end-faces that direct reflections away from the fiber core.

**Q: How accurate are the loss calculations?**
A: Calculations use maximum specified values from standards. Actual measured losses are typically 10-20% lower for quality installations.

**Q: What's encircled flux and why does it matter?**
A: Encircled flux (EF) is a standard for controlling light launch conditions in multimode testing. Using EF-compliant test equipment ensures repeatable results.
        `
      }
    ]
  }
];

export default function Manual() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState(['getting-started']);
  const [activeSubsection, setActiveSubsection] = useState('overview');

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const findSubsection = (id) => {
    for (const section of MANUAL_SECTIONS) {
      const sub = section.subsections.find(s => s.id === id);
      if (sub) return { section, subsection: sub };
    }
    return null;
  };

  const activeContent = findSubsection(activeSubsection);

  const filteredSections = searchTerm 
    ? MANUAL_SECTIONS.map(section => ({
        ...section,
        subsections: section.subsections.filter(sub => 
          sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(section => section.subsections.length > 0)
    : MANUAL_SECTIONS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">User Manual</h1>
                <p className="text-xs text-gray-500">FiberTech Pro Documentation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={createPageUrl('Fiber101')}>
                <Button variant="outline" size="sm">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Quick Start
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-24">
              <CardContent className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search manual..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-2">
                    {filteredSections.map(section => (
                      <Collapsible 
                        key={section.id}
                        open={expandedSections.includes(section.id)}
                        onOpenChange={() => toggleSection(section.id)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <section.icon className="h-4 w-4 text-indigo-600" />
                              <span className="font-medium text-sm">{section.title}</span>
                            </div>
                            {expandedSections.includes(section.id) 
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            }
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-6 space-y-1 mt-1">
                            {section.subsections.map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => setActiveSubsection(sub.id)}
                                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                                  activeSubsection === sub.id
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                {sub.title}
                              </button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  {activeContent && (
                    <>
                      <activeContent.section.icon className="h-4 w-4" />
                      <span>{activeContent.section.title}</span>
                      <ChevronRight className="h-4 w-4" />
                      <span>{activeContent.subsection.title}</span>
                    </>
                  )}
                </div>
                <CardTitle className="text-2xl">
                  {activeContent?.subsection.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  {activeContent && (
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {activeContent.subsection.content.split('\n').map((line, i) => {
                        // Simple markdown-like parsing
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return <h3 key={i} className="text-lg font-bold mt-6 mb-2">{line.replace(/\*\*/g, '')}</h3>;
                        }
                        if (line.startsWith('- ')) {
                          return <li key={i} className="ml-4">{line.substring(2)}</li>;
                        }
                        if (line.startsWith('| ')) {
                          return <code key={i} className="block text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1">{line}</code>;
                        }
                        if (line.startsWith('```')) {
                          return null;
                        }
                        if (line.trim() === '') {
                          return <br key={i} />;
                        }
                        return <p key={i} className="my-1">{line}</p>;
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}