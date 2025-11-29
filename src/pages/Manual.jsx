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
  Network,
  GraduationCap,
  FileSearch
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
**Fiber Oracle** - "When you need to know, ask the Oracle."

A comprehensive field reference tool designed for fiber optic technicians, network engineers, and installation professionals. 

**Key Features:**
- Power level calculations for GPON and XGS-PON networks
- TIA-598 fiber color code identification (up to 3456 fibers)
- Loss budget calculations with industry-standard values
- OLTS and OTDR test wizards
- AI-powered OTDR trace analysis (Beta)
- Fiber Doctor interactive troubleshooting
- Cleaning and inspection procedures
- Comprehensive reference tables
- Education Center with Fiber 101, 102, and 103 courses
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
The home screen displays all available modules organized into categories. Tap any card to access that tool.

**Menu Structure (5 Categories):**

┌─────────────────────────────────────────────────────────┐
│  FIBER ORACLE - Home Dashboard                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔢 CALCULATORS - Planning & Estimation                 │
│  ├── Power Calculator (GPON/XGS-PON Rx estimator)      │
│  ├── Loss Budget (TIA-568-D link loss calculation)     │
│  ├── Splitter Loss (Instant values by split ratio)     │
│  └── Bend Radius (Minimum bend by cable type)          │
│                                                         │
│  🧪 TESTING - Test Procedures & Wizards                 │
│  ├── OLTS Tier-1 (Method B bidirectional power)        │
│  ├── OTDR Tier-2 (Bidirectional characterization)      │
│  └── Cleaning & Inspection (IEC 61300-3-35)            │
│                                                         │
│  🩺 TROUBLESHOOT - Diagnostics & Analysis               │
│  ├── Fiber Doctor (Interactive troubleshooting)        │
│  ├── AI OTDR Analysis [BETA] (AI-powered trace)        │
│  └── Impairment Library (Visual defect reference)      │
│                                                         │
│  📚 REFERENCE - Specs, Tables & Data                    │
│  ├── Fiber Locator (TIA-598 color codes)               │
│  ├── PON Power Levels (GPON & XGS-PON specs)           │
│  ├── Reference Tables (Attenuation, connectors, etc.)  │
│  ├── LCP / CLCP Info (Cabinet & splitter database)     │
│  └── Industry Links (Standards & vendors)              │
│                                                         │
│  🎓 LEARN - Education & Documentation                   │
│  ├── Education Center (Fiber 101, 102, 103)            │
│  └── User Manual (This documentation)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘

**Quick Reference Bar**
At the top of the home screen, you'll find commonly-referenced values:
- SMF attenuation at 1310nm and 1550nm
- Elite connector loss values
- Reflectance limits for UPC and APC

**Bottom Navigation (Mobile)**
On mobile devices, use the bottom navigation bar to filter by category:
- All | Calc | Test | Fix | Ref | Settings

**Customizing Your Dashboard**
Click the eye icon (👁) in the header to show/hide modules based on your needs.

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
Tap the gear icon (⚙️) on the home screen or use the bottom navigation bar.

┌─────────────────────────────────────────────────────────┐
│  SETTINGS                                               │
├─────────────────────────────────────────────────────────┤
│  📋 BRANDING TAB                                        │
│  ├── Company Name (for reports)                        │
│  ├── Company Logo (URL or upload)                      │
│  └── Custom Report Fields                              │
│                                                         │
│  🎨 APPEARANCE TAB                                      │
│  ├── Dark Mode Toggle                                  │
│  └── Primary Color Selection                           │
│                                                         │
│  ⚙️ TEST VALUES TAB                                     │
│  ├── Custom Connector Loss (override TIA default)      │
│  ├── Custom Splice Loss (override TIA default)         │
│  ├── Custom Fiber Attenuation                          │
│  └── Require Photo Documentation                       │
└─────────────────────────────────────────────────────────┘

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
        id: 'ai-otdr-analysis',
        title: 'AI OTDR Analysis (Beta)',
        content: `
**Purpose**
Upload OTDR traces or enter event data for AI-powered analysis against TIA/IEC standards.

┌─────────────────────────────────────────────────────────┐
│  AI OTDR ANALYSIS - Workflow                            │
├─────────────────────────────────────────────────────────┤
│  Step 1: INTRODUCTION                                   │
│  └── Overview of what the tool does                    │
│                                                         │
│  Step 2: INPUT DATA                                     │
│  ├── Select OTDR brand/model                           │
│  ├── Choose fiber type (G.652, G.657, etc.)            │
│  ├── Set test wavelength                               │
│  ├── Enter total length and loss                       │
│  ├── Upload .SOR file (recommended) or image           │
│  └── Describe reported symptom                         │
│                                                         │
│  Step 3: EVENT DETAILS                                  │
│  ├── Add events manually (distance, loss, reflectance) │
│  └── Add notes for each event                          │
│                                                         │
│  Step 4: AI ANALYSIS                                    │
│  └── AI processes data against standards               │
│                                                         │
│  Step 5: RESULTS & ACTIONS                              │
│  ├── Interactive trace visualization                   │
│  ├── Overall assessment with confidence score          │
│  ├── Event-by-event analysis                           │
│  ├── Priority actions list                             │
│  └── Technician feedback panel                         │
└─────────────────────────────────────────────────────────┘

**Key Features:**

**1. .SOR File Support**
Upload standard OTDR .sor files for richest data extraction. The AI extracts all events automatically.

**2. Advanced Impairment Recognition**
The AI distinguishes between subtle issues:
- Microbend vs Macrobend (wavelength sensitivity)
- Poor fusion splice vs dirty connector
- Ghost events vs real reflections
- Fiber breaks vs end-of-fiber

**3. Confidence Scoring**
Each diagnosis includes a confidence percentage (0-100%) indicating AI certainty.

**4. Interactive Trace Visualization**
┌─────────────────────────────────────────────────────────┐
│  TRACE VIEW CONTROLS                                    │
├─────────────────────────────────────────────────────────┤
│  🔍 Zoom: Scroll wheel or +/- buttons                   │
│  ✋ Pan: Click and drag when zoomed                     │
│  ⚙️ Options:                                            │
│     ├── Event Labels (on/off)                          │
│     ├── Distance Markers (on/off)                      │
│     └── Threshold Lines (configurable)                 │
│  📑 Reference: Upload baseline trace for comparison    │
│  📥 Export: Download trace as PNG image                │
│  🖨️ Print: Print trace directly                        │
└─────────────────────────────────────────────────────────┘

**5. Threshold Lines**
Configurable pass/fail threshold lines:
- Connector max loss (default 0.5 dB)
- Splice max loss (default 0.1 dB)

**6. Reference Trace Overlay**
Upload a baseline/reference trace to compare against current measurements (shown as dashed blue line).

**7. Technician Feedback**
Help improve AI accuracy by confirming or correcting diagnoses:
- ✓ Correct - AI was right
- ~ Partially - AI was close
- ✗ Incorrect - Select actual impairment type

**Supported File Types:**
- .SOR (recommended - standard OTDR format)
- .PDF (trace exports)
- Images (.png, .jpg, .jpeg)

**Standards Referenced:**
- TIA-568-D (attenuation, connector, splice limits)
- TIA-526-14-C (OLTS procedures)
- IEC 61300-3-35 (inspection criteria)
- ITU-T G.652/G.657 (fiber specifications)
        `
      },
      {
        id: 'fiber-doctor',
        title: 'Fiber Doctor',
        content: `
**Purpose**
Interactive troubleshooting flowchart for diagnosing fiber issues.

┌─────────────────────────────────────────────────────────┐
│  FIBER DOCTOR - Decision Tree Flow                      │
├─────────────────────────────────────────────────────────┤
│  START: Select Primary Symptom                          │
│  │                                                      │
│  ├── High Loss on Link                                  │
│  │   ├── Is it at a specific point?                    │
│  │   │   ├── Yes → Check connector/splice              │
│  │   │   └── No → Distributed loss (bends?)            │
│  │   └── ...continues with targeted questions          │
│  │                                                      │
│  ├── High Reflectance                                   │
│  │   ├── UPC or APC connector?                         │
│  │   └── ...diagnosis path                             │
│  │                                                      │
│  ├── No Light / No Signal                               │
│  │   ├── VFL visible through fiber?                    │
│  │   └── ...diagnosis path                             │
│  │                                                      │
│  ├── Intermittent Connection                            │
│  │   └── ...diagnosis path                             │
│  │                                                      │
│  └── PON-Specific Issues                                │
│      ├── ONT not registering                           │
│      ├── Low Rx power                                  │
│      └── ...diagnosis path                             │
│                                                         │
│  RESULT: Diagnosis + Actions + Tools Needed             │
└─────────────────────────────────────────────────────────┘

**How to Use:**
1. Start with your primary symptom
2. Answer diagnostic questions
3. Follow the decision tree
4. Receive specific diagnosis and action items

**Each Diagnosis Provides:**
- Identified issue type and severity
- Probable causes (ranked by likelihood)
- Step-by-step troubleshooting actions
- Required tools for remediation
- Reference images when applicable

**Integration with Learning:**
After troubleshooting, the Fiber Doctor links to relevant sections in Fiber 103 (Advanced Troubleshooting) for deeper learning.

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
    id: 'education',
    title: 'Education Center',
    icon: Lightbulb,
    subsections: [
      {
        id: 'education-overview',
        title: 'Learning Paths',
        content: `
**Education Center Overview**

┌─────────────────────────────────────────────────────────┐
│  RECOMMENDED LEARNING PATH                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ①  FIBER 101 - Foundations (20 min)                    │
│  │   Beginner • Start Here                             │
│  │   ├── Fiber Structure & Light Propagation           │
│  │   ├── SMF vs MMF                                    │
│  │   ├── TIA-598 Color Codes                           │
│  │   ├── Connector Types                               │
│  │   ├── PON/FTTH Architecture Basics                  │
│  │   ├── Power Levels & dB Math                        │
│  │   └── Safety Essentials                             │
│  │                                                      │
│  ▼                                                      │
│  ②  FIBER 102 - Intermediate PON/FTTH (30 min)          │
│  │   Intermediate • Level Up                           │
│  │   ├── GPON Deep Dive                                │
│  │   ├── XGS-PON Specifications                        │
│  │   ├── Loss Budget Calculations                      │
│  │   ├── OTDR Trace Interpretation                     │
│  │   ├── Splitter Cascades                             │
│  │   └── Basic Troubleshooting                         │
│  │                                                      │
│  ▼                                                      │
│  ③  FIBER 103 - Advanced Troubleshooting (45 min)       │
│  │   Advanced • Expert Level                           │
│  │   ├── OTDR Mastery                                  │
│  │   ├── Ghost Event Identification                    │
│  │   ├── Bidirectional Analysis                        │
│  │   ├── PON Error Counter Diagnostics                 │
│  │   ├── Intermittent Fault Isolation                  │
│  │   └── Documentation Best Practices                  │
│  │                                                      │
│  ▼                                                      │
│  ④  FIBER DOCTOR - Apply Your Knowledge                 │
│      Diagnostics Tool                                   │
│      └── Real-world troubleshooting practice           │
│                                                         │
└─────────────────────────────────────────────────────────┘

**Course Features:**
- Interactive slide-based learning
- Progress tracking within each course
- Visual diagrams and examples
- Quick navigation between topics
        `
      },
      {
        id: 'fiber-101-topics',
        title: 'Fiber 101 Topics',
        content: `
**Fiber 101: Foundations of Fiber Optics**
Duration: ~20 minutes | Level: Beginner

**Topics Covered:**

1. **What is Fiber Optics?**
   - Total internal reflection
   - Core, cladding, and buffer structure
   - Light propagation basics

2. **Fiber Types**
   - Single-Mode Fiber (SMF) - G.652, G.657
   - Multi-Mode Fiber (MMF) - OM3, OM4, OM5
   - When to use each type

3. **Color Codes (TIA-598)**
   - 12-fiber color sequence
   - Tube/binder identification
   - High-count cable organization

4. **Connectors**
   - LC, SC, FC, ST, MPO/MTP
   - UPC vs APC polish types
   - Proper handling and care

5. **FTTH/PON Architecture**
   - OLT, ODN, ONT components
   - Splitter function and placement
   - Typical network layouts

6. **Power Levels & dB**
   - Understanding decibels
   - Typical Tx and Rx ranges
   - Loss budget concept introduction

7. **Safety**
   - Laser hazards
   - Fiber shards
   - Proper PPE
        `
      },
      {
        id: 'fiber-102-topics',
        title: 'Fiber 102 Topics',
        content: `
**Fiber 102: Intermediate PON & FTTH**
Duration: ~30 minutes | Level: Intermediate

**Topics Covered:**

1. **GPON Deep Dive**
   - ITU-T G.984 specifications
   - Wavelength plan (1310/1490/1550)
   - Class B+ and C+ power budgets

2. **XGS-PON**
   - ITU-T G.9807 specifications
   - 10G symmetric operation
   - N1, N2, E1 power classes
   - Coexistence with GPON

3. **Loss Budget Calculation**
   - Component loss values
   - Step-by-step calculation method
   - Safety margin requirements

4. **Splitter Cascades**
   - Calculating total split ratio
   - Loss accumulation
   - Design considerations

5. **OTDR Basics**
   - Trace interpretation
   - Event identification
   - Distance and loss reading

6. **Common FTTH Issues**
   - Connector contamination
   - Bend loss
   - Splitter failures

7. **Field Best Practices**
   - Testing procedures
   - Documentation requirements
   - Quality standards
        `
      },
      {
        id: 'fiber-103-topics',
        title: 'Fiber 103 Topics',
        content: `
**Fiber 103: Advanced Troubleshooting**
Duration: ~45 minutes | Level: Advanced

**Topics Covered:**

1. **OTDR Mastery**
   - Pulse width selection
   - Dead zone management
   - Dynamic range optimization

2. **Ghost Event Identification**
   - What causes ghosts
   - How to identify them
   - Elimination techniques

3. **Bidirectional Analysis**
   - Why test both directions
   - Averaging results
   - Identifying gainers

4. **PON Diagnostics**
   - Error counter interpretation
   - BIP, FEC, GEM, HEC errors
   - Threshold monitoring

5. **Intermittent Faults**
   - Common causes
   - Systematic isolation
   - Documentation for patterns

6. **Splitter Failure Modes**
   - Partial failures
   - Port-specific issues
   - Testing methodology

7. **Documentation Best Practices**
   - What to record
   - Photo documentation
   - Report generation
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
**Q: Does Fiber Oracle work offline?**
A: Yes! Once loaded, most features work without internet. Only external links and AI OTDR Analysis require connectivity.

**Q: Where is my data stored?**
A: All data (settings, LCP entries, custom impairments) is stored locally on your device using browser storage.

**Q: Can I use this on multiple devices?**
A: Yes, but data doesn't sync between devices. Each device maintains its own local data.

**Q: Is there a desktop version?**
A: Fiber Oracle is a Progressive Web App (PWA). You can install it on desktop or mobile for an app-like experience.

**Q: How do I install the PWA?**
A: On mobile, use "Add to Home Screen" from your browser menu. On desktop, look for the install icon in the address bar.

**Q: Are the values accurate?**
A: All values are based on current industry standards (TIA-568-D, IEEE 802.3, ITU-T). When in doubt, verify against manufacturer specifications.

**Q: What does the Beta tag mean on AI OTDR Analysis?**
A: The AI OTDR Analysis feature is in beta testing. While functional, it's continuously being improved. Your feedback helps make it better!
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
                <p className="text-xs text-gray-500">Fiber Oracle Documentation</p>
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