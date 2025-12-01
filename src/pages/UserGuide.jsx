import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ArrowLeft, 
  Search,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Calculator,
  Activity,
  Stethoscope,
  GraduationCap,
  Settings,
  HelpCircle,
  Zap,
  Cable,
  Sparkles,
  FileSearch,
  ImageIcon,
  ClipboardList,
  FileText,
  Home,
  Target,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const USER_GUIDE_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Home,
    color: 'from-blue-500 to-indigo-600',
    subsections: [
      {
        id: 'overview',
        title: 'What is Fiber Oracle?',
        content: `
**Fiber Oracle** is your comprehensive fiber optic field companion, designed to help technicians, engineers, and installers work more efficiently and accurately.

### Key Features
- **Calculators** for loss budgets, power levels, and unit conversions
- **Testing guides** for OLTS, OTDR, and inspection procedures
- **Troubleshooting tools** including AI-powered OTDR analysis
- **Reference tables** for standards, specifications, and color codes
- **Educational courses** covering fiber optic fundamentals to advanced topics

### Who Is This For?
- Fiber optic technicians and installers
- Network engineers and designers
- Field service personnel
- Students learning fiber optics
- Anyone working with fiber optic systems
        `
      },
      {
        id: 'navigation',
        title: 'Navigating the App',
        content: `
### Home Screen
The home screen displays all available modules organized by category:
- **Calculate** - Mathematical tools and calculators
- **Test** - Testing procedures and wizards
- **Troubleshoot** - Diagnostic and analysis tools
- **Reference** - Lookup tables and specifications
- **Learn** - Educational courses and documentation

### Category Filters
Use the category pills at the top to filter modules by type, or select "All" to see everything organized by section.

### Quick References
The header and footer display common reference values like:
- SMF attenuation (0.35 dB/km @ 1310nm, 0.25 dB/km @ 1550nm)
- Connector loss limits (Elite ≤0.15 dB)
- Reflectance limits (UPC <-50 dB, APC <-60 dB)

### Mobile Navigation
On mobile devices, use the bottom navigation bar to quickly switch between categories.
        `
      },
      {
        id: 'customization',
        title: 'Customizing Your Experience',
        content: `
### Dark Mode
Toggle dark mode using the moon/sun icon in the header for comfortable viewing in low-light conditions.

### Hiding Modules
Click the eye icon in the header to show/hide specific modules. Hidden modules won't clutter your dashboard but can be restored anytime.

### Settings
Access the Settings page to:
- Set default values for calculations
- Configure company branding
- Manage hidden content
- Export/import preferences

### Onboarding Tour
New users will see an interactive tour. You can restart it anytime from the Settings page or by clicking the help icon.
        `
      }
    ]
  },
  {
    id: 'calculators',
    title: 'Calculators',
    icon: Calculator,
    color: 'from-indigo-500 to-purple-600',
    subsections: [
      {
        id: 'optical-calculator',
        title: 'Optical Calculator',
        content: `
The Optical Calculator provides three essential tools in one module:

### Link Loss Calculator
Calculates total expected loss for a fiber link based on:
- **Fiber type** (SMF G.652, G.657, OM3, OM4, etc.)
- **Distance** in kilometers
- **Number of connectors** and their quality grade
- **Number of splices** (fusion or mechanical)
- **Splitter configuration** (if applicable)

**How to Use:**
1. Select your fiber type
2. Enter the total link distance
3. Specify the number of connectors and splices
4. Add any splitters in the path
5. View the calculated total loss with breakdown

### PON Power Calculator
Estimates ONT receive power for GPON, XGS-PON, and next-gen PON systems:
1. Select your PON class (B+, C+, N1, N2, etc.)
2. Enter OLT transmit power
3. Input total link loss
4. View expected ONT Rx power and status

### dB Converter
Convert between:
- **dBm ↔ mW** (power levels)
- **dB ↔ Linear ratio** (loss/gain)
        `
      },
      {
        id: 'loss-budget',
        title: 'Loss Budget Calculator',
        content: `
The Loss Budget Calculator helps you plan fiber links according to **TIA-568-D** standards.

### Input Parameters
- **Application** (Enterprise LAN, PON, Data Center, etc.)
- **Fiber Type** (Single-mode or Multimode variants)
- **Wavelength** (850nm, 1310nm, 1550nm, etc.)
- **Link Distance**
- **Number of Connections**
- **Number of Splices**

### Output
- Total calculated loss
- Maximum allowable loss for the application
- Pass/Fail status
- Safety margin

### Best Practices
- Always include a **3 dB safety margin** for future repairs
- Use **worst-case attenuation values** for planning
- Account for **all connections** including patch panels
        `
      },
      {
        id: 'power-calculator',
        title: 'Power Level Calculator',
        content: `
Estimate ONT receive power levels for PON deployments.

### Supported PON Types
- **GPON** (ITU-T G.984)
- **XGS-PON** (ITU-T G.9807)
- **25G-PON / 50G-PON** (emerging standards)

### Input Fields
- OLT Tx Power (dBm)
- Splitter configuration (1:2 to 1:128)
- Fiber distance
- Number of connectors
- Additional losses

### Status Indicators
- **Good** (green): Within optimal range
- **Marginal** (yellow): Near sensitivity limit
- **Too Low** (red): Below minimum sensitivity
- **Too High** (red): Risk of receiver saturation
        `
      },
      {
        id: 'splitter-loss',
        title: 'Splitter Loss Reference',
        content: `
Quick lookup for optical splitter insertion loss values.

### Common Split Ratios
| Ratio | Typical Loss |
|-------|-------------|
| 1:2   | 3.5 dB      |
| 1:4   | 7.0 dB      |
| 1:8   | 10.5 dB     |
| 1:16  | 14.0 dB     |
| 1:32  | 17.5 dB     |
| 1:64  | 21.0 dB     |
| 1:128 | 24.5 dB     |

### Cascaded Splitters
For cascaded configurations, add the losses together:
- 1:4 + 1:8 = 7.0 + 10.5 = **17.5 dB total**

### Note
These are typical values. Always check manufacturer specifications for exact values, as they can vary by ±0.5 dB or more.
        `
      },
      {
        id: 'bend-radius',
        title: 'Bend Radius Calculator',
        content: `
Determine minimum bend radius requirements for different cable types.

### Fiber Types
- **G.652.D** - Standard single-mode (30mm min radius)
- **G.657.A1** - Bend-tolerant (10mm min radius)
- **G.657.A2** - Enhanced bend (7.5mm min radius)
- **G.657.B3** - Extreme bend (5mm min radius)

### Cable Types
Indoor, outdoor, drop, and patchcord cables each have different requirements based on:
- Cable construction
- Number of fibers
- Jacket material
- Installation method (loaded vs. unloaded)

### Visual Comparisons
The tool provides size comparisons to common objects (pencil, coin, etc.) to help visualize acceptable bend sizes in the field.
        `
      }
    ]
  },
  {
    id: 'testing',
    title: 'Testing Procedures',
    icon: Activity,
    color: 'from-emerald-500 to-teal-600',
    subsections: [
      {
        id: 'olts-testing',
        title: 'OLTS Tier-1 Testing',
        content: `
Optical Loss Test Set (OLTS) testing measures insertion loss and is the foundation of fiber certification.

### Test Methods
- **Method A** (1 reference cord): Simple but less accurate
- **Method B** (3 reference cords): Most accurate, tests mated connections
- **Method C** (1 reference cord): Alternative single-cord method

### Step-by-Step Guide
1. **Set Reference**
   - Clean all reference cords
   - Connect source to meter through reference cord(s)
   - Zero/reference the meter

2. **Test the Link**
   - Connect to the fiber under test
   - Record measurements at each wavelength
   - Compare to calculated loss budget

3. **Bidirectional Testing**
   - Test from both ends
   - Average the results for accurate loss values

### Pass/Fail Criteria
Based on TIA-568-D:
- Total loss must be ≤ calculated loss budget
- Individual events should meet connector/splice limits
        `
      },
      {
        id: 'otdr-testing',
        title: 'OTDR Tier-2 Testing',
        content: `
Optical Time Domain Reflectometer (OTDR) testing provides detailed characterization of the fiber link.

### What OTDR Shows
- **Distance** to each event
- **Loss** at connectors and splices
- **Reflectance** at reflective events
- **Fiber attenuation** (dB/km)
- **Total link loss**

### Test Setup
1. Select appropriate **wavelength** (1310nm, 1550nm, or both)
2. Set **pulse width** based on link length
3. Use **launch/receive cables** to test near-end connectors
4. Configure **averaging time** for noise reduction

### Bidirectional Testing
Always test from both ends because:
- Splices can show as "gainers" from one direction
- Average bidirectional loss gives true values
- Some events may be masked from one direction

### Interpreting Results
- **Reflective events** (spikes): Connectors, mechanical splices, breaks
- **Non-reflective events** (steps): Fusion splices, bends, fiber changes
- **Gradual slope**: Normal fiber attenuation
        `
      },
      {
        id: 'cleaning-inspection',
        title: 'Cleaning & Inspection',
        content: `
Proper cleaning and inspection per **IEC 61300-3-35** is critical for fiber performance.

### Inspection First
**Always inspect before and after cleaning:**
1. Use a fiber scope at 200x-400x magnification
2. Check the core zone (Zone A)
3. Check the cladding zone (Zone B)
4. Check the adhesive/contact zone (Zone C)
5. Check the ferrule zone (Zone D)

### Pass/Fail Criteria
| Zone | Scratches | Defects |
|------|-----------|---------|
| Core (A) | None | None |
| Cladding (B) | ≤5 (0-3μm) | None >5μm |
| Contact (C) | Limited | None >10μm |
| Ferrule (D) | Unlimited | Limited |

### Cleaning Methods
1. **Dry Cleaning** - Use lint-free wipes or click cleaners
2. **Wet-Dry Cleaning** - IPA or fiber cleaning fluid, then dry
3. **Adapter Cleaning** - Use swabs designed for adapters
4. **MPO Cleaning** - Specialized MPO cleaning tools

### Best Practices
- Never touch the ferrule end face
- Clean in one direction only
- Inspect after every cleaning
- Replace contaminated cleaning supplies
        `
      },
      {
        id: 'job-reports',
        title: 'Job Reports',
        content: `
Document your fiber work with comprehensive job reports.

### Creating a Report
1. Enter **job number** and **technician name**
2. Add **location** details
3. Record **before/after power levels**
4. Document **diagnosis steps** taken
5. Attach **photos** of work performed
6. Add **notes** for future reference

### Report Fields
- Job identification (number, location, date)
- Technician information
- Power level readings (start/end)
- Power improvement calculation
- Equipment used
- Diagnosis results
- Photos and documentation

### Exporting
Reports can be exported as PDF for:
- Customer documentation
- Quality assurance records
- Compliance requirements
- Billing support
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    subsections: [
      {
        id: 'fiber-doctor',
        title: 'Fiber Doctor',
        content: `
An interactive troubleshooting flowchart that guides you through diagnosing fiber issues.

### How It Works
1. **Select the symptom** you're experiencing
2. **Answer questions** about your observations
3. **Follow the diagnostic path** based on your answers
4. **Get recommendations** for tools and actions

### Common Symptoms
- No signal / Total loss
- High loss
- Intermittent connection
- Slow speeds
- High bit error rate

### Diagnostic Outputs
- **Probable cause** identification
- **Recommended actions** prioritized by likelihood
- **Tools needed** for the repair
- **Reference images** showing what to look for

### PON-Specific Diagnostics
Special troubleshooting paths for:
- ONT not registering
- Low ONT Rx power
- OLT port issues
- Splitter problems
        `
      },
      {
        id: 'ai-otdr-analysis',
        title: 'AI OTDR Analysis (Beta)',
        content: `
Upload OTDR traces for AI-powered analysis and recommendations.

### Supported Inputs
- **.SOR files** - Standard OTDR format
- **EXFO iOLM PDFs** - Auto-extracts event data
- **Manual entry** - Enter events by hand
- **Trace images** - Upload screenshots

### Analysis Output
The AI analyzes your trace against industry standards and provides:

**Overall Assessment**
- Pass/Marginal/Fail status
- Standards compliance check
- Total excess loss calculation

**Event-by-Event Analysis**
- Event type identification (connector, splice, bend, etc.)
- Severity rating (critical, warning, info, OK)
- Confidence score for each diagnosis
- Distinguishing factors explaining the diagnosis

**Priority Actions**
- Ranked list of recommended repairs
- Expected improvement for each action
- Effort level (quick, moderate, significant)
- Tools needed

### Interactive Trace View
- Zoom and pan the trace visualization
- Click events for detailed analysis
- Compare against reference traces
- Export as PNG or print

### Feedback
Help improve the AI by providing feedback on diagnosis accuracy.
        `
      },
      {
        id: 'impairment-library',
        title: 'Impairment Library',
        content: `
A visual reference guide for identifying fiber defects and impairments.

### Categories
- **Connector End Face** - Scratches, contamination, damage
- **OTDR Signatures** - How impairments appear on traces
- **Physical Damage** - Breaks, bends, crushes
- **Environmental** - Water ingress, rodent damage

### For Each Impairment
- **Visual example** showing what it looks like
- **OTDR signature** showing trace characteristics
- **Causes** of the impairment
- **Effects** on system performance
- **Remediation** steps to fix it

### Common Impairments
| Type | Loss | Reflectance | Key Identifier |
|------|------|-------------|----------------|
| Dirty connector | 0.3-1.5 dB | >-35 dB | Localized, cleanable |
| Macrobend | Variable | None | λ-dependent (1550>>1310) |
| Bad splice | 0.1-0.5 dB | None/low | Non-reflective step |
| Cracked ferrule | >1 dB | >-20 dB | Very high reflectance |
| Fiber break | Total | Very high | Spike then nothing |
        `
      }
    ]
  },
  {
    id: 'reference',
    title: 'Reference',
    icon: BookOpen,
    color: 'from-slate-500 to-gray-600',
    subsections: [
      {
        id: 'fiber-locator',
        title: 'Fiber Locator (Color Codes)',
        content: `
Identify fiber positions using **TIA-598-D** color coding.

### Standard Color Sequence
1. Blue
2. Orange
3. Green
4. Brown
5. Slate
6. White
7. Red
8. Black
9. Yellow
10. Violet
11. Rose
12. Aqua

### Tube/Buffer Colors
Same 12-color sequence applies to buffer tubes in loose-tube cables.

### How to Use
1. Select the **cable type** (ribbon, loose-tube, etc.)
2. Enter the **fiber number** you're looking for
3. Get the **tube color** and **fiber color** within that tube

### Example
Fiber #37 in a 144-fiber cable:
- Tube: Green (tube 4)
- Fiber: Blue (fiber 1 in tube 4)
        `
      },
      {
        id: 'pon-levels',
        title: 'PON Power Levels',
        content: `
Reference specifications for GPON and XGS-PON systems.

### GPON (ITU-T G.984)
| Class | OLT Tx | ONT Sensitivity | ONT Overload |
|-------|--------|-----------------|--------------|
| B+    | +1.5 to +5 dBm | -28 dBm | -8 dBm |
| C+    | +3 to +7 dBm | -32 dBm | -12 dBm |

### XGS-PON (ITU-T G.9807)
| Class | OLT Tx | ONT Sensitivity | ONT Overload |
|-------|--------|-----------------|--------------|
| N1    | +2 to +7 dBm | -28 dBm | -8 dBm |
| N2    | +4 to +9 dBm | -29 dBm | -9 dBm |
| E1    | +3 to +7 dBm | -31 dBm | -11 dBm |
| E2    | +5 to +9 dBm | -33 dBm | -13 dBm |

### Typical Values
- **Good ONT Rx**: -15 to -25 dBm
- **Marginal**: -25 to -28 dBm
- **Critical**: Below -28 dBm
        `
      },
      {
        id: 'reference-tables',
        title: 'Reference Tables',
        content: `
Comprehensive lookup tables for fiber optic specifications.

### Fiber Attenuation
| Fiber Type | 850nm | 1300nm | 1310nm | 1550nm |
|------------|-------|--------|--------|--------|
| SMF G.652  | -     | -      | 0.35   | 0.25   |
| OM3        | 3.0   | 1.0    | -      | -      |
| OM4        | 3.0   | 1.0    | -      | -      |
| OM5        | 3.0   | 1.0    | -      | -      |

### Connector Loss Limits
| Grade | Single-mode | Multimode |
|-------|-------------|-----------|
| Elite | ≤0.15 dB    | ≤0.15 dB  |
| Standard | ≤0.50 dB | ≤0.50 dB  |

### Splice Loss Limits
| Type | Typical | Maximum |
|------|---------|---------|
| Fusion | 0.02-0.05 dB | 0.10 dB |
| Mechanical | 0.10-0.20 dB | 0.30 dB |

### Reflectance Limits
| Connector Type | Minimum Return Loss |
|----------------|---------------------|
| UPC | >50 dB (< -50 dB reflectance) |
| APC | >60 dB (< -60 dB reflectance) |
        `
      },
      {
        id: 'lcp-info',
        title: 'LCP / CLCP Database',
        content: `
Manage and lookup information about Local Convergence Points and cabinets.

### What's Stored
- LCP/CLCP identifier
- Physical location and GPS coordinates
- Splitter configuration
- OLT assignment (name, shelf, slot, port)
- Optic information (make, model, serial)
- Notes and service history

### Features
- **Search** by LCP number, location, or OLT
- **Map view** showing cabinet locations
- **Add/Edit** entries for your network
- **Export** data for documentation

### Use Cases
- Quickly find which OLT port serves a location
- Document splitter ratios at each cabinet
- Track optic inventory in the field
- Navigate to cabinet locations
        `
      }
    ]
  },
  {
    id: 'learning',
    title: 'Education Center',
    icon: GraduationCap,
    color: 'from-green-500 to-emerald-600',
    subsections: [
      {
        id: 'fiber-101',
        title: 'Fiber 101: Fundamentals',
        content: `
An introduction to fiber optic technology for beginners.

### Topics Covered
- **What is fiber optics?** - Light transmission principles
- **Fiber types** - Single-mode vs. multimode
- **Cable construction** - Jackets, buffers, strength members
- **Connectors** - Types, polishes, and handling
- **Basic measurements** - Loss, power levels, dB math

### Learning Outcomes
After completing Fiber 101, you will:
- Understand how light travels through fiber
- Identify different fiber and connector types
- Know proper handling procedures
- Perform basic dB calculations
- Recognize common fiber optic terms

### Duration
Approximately 30-45 minutes of self-paced learning.

### Certification
Complete the exam to earn your Fiber 101 certificate.
        `
      },
      {
        id: 'fiber-102',
        title: 'Fiber 102: Testing & Measurement',
        content: `
Intermediate course covering fiber optic testing procedures.

### Topics Covered
- **Test equipment** - Power meters, light sources, OTDRs
- **OLTS testing** - Methods A, B, and C
- **OTDR fundamentals** - Trace interpretation basics
- **Loss budgets** - Calculation and verification
- **Documentation** - Recording and reporting results

### Learning Outcomes
After completing Fiber 102, you will:
- Set up and use OLTS equipment properly
- Perform bidirectional loss testing
- Interpret basic OTDR traces
- Calculate and verify loss budgets
- Document test results professionally

### Prerequisites
Fiber 101 or equivalent knowledge.

### Certification
Complete the exam to earn your Fiber 102 certificate.
        `
      },
      {
        id: 'fiber-103',
        title: 'Fiber 103: Advanced Troubleshooting',
        content: `
Advanced course for experienced technicians.

### Topics Covered
- **Advanced OTDR analysis** - Event identification, artifacts
- **PON troubleshooting** - GPON/XGS-PON diagnostics
- **Error counters** - Interpreting OLT/ONT statistics
- **Difficult problems** - Intermittent faults, environmental issues
- **Documentation** - Professional reporting practices

### Learning Outcomes
After completing Fiber 103, you will:
- Identify complex OTDR events and artifacts
- Troubleshoot PON-specific issues
- Use error counters for diagnostics
- Solve intermittent and difficult problems
- Create professional troubleshooting reports

### Prerequisites
Fiber 102 or equivalent experience.

### Certification
Complete the exam to earn your Fiber 103 certificate.
        `
      },
      {
        id: 'certifications',
        title: 'Certifications & Exams',
        content: `
Earn certificates to demonstrate your fiber optic knowledge.

### Available Certifications
- **Fiber 101 Certificate** - Fundamentals
- **Fiber 102 Certificate** - Testing & Measurement
- **Fiber 103 Certificate** - Advanced Troubleshooting

### Exam Format
- Multiple choice questions
- Passing score: 80%
- Unlimited retakes
- Instant results

### Your Certificates
- View earned certificates in your profile
- Download PDF certificates
- Track scores and completion dates
- Share achievements

### Study Resources
- Course slides and content
- Study guides with key terms
- Practice questions
- Reference materials
        `
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings & Preferences',
    icon: Settings,
    color: 'from-gray-500 to-slate-600',
    subsections: [
      {
        id: 'preferences',
        title: 'User Preferences',
        content: `
Customize the app to match your workflow.

### Display Settings
- **Dark Mode** - Toggle between light and dark themes
- **Units** - Metric or imperial measurements

### Default Values
Set custom default values for calculations:
- Connector loss (default: 0.3 dB)
- Splice loss (default: 0.1 dB)
- Fiber attenuation rates

### Visibility Settings
Control which modules and sections appear:
- Hide unused modules from the home screen
- Collapse sections within modules
- Restore hidden content anytime

### Data Management
- Export your preferences
- Import settings from another device
- Reset to defaults
        `
      },
      {
        id: 'branding',
        title: 'Company Branding',
        content: `
Customize the app with your company identity.

### Available Options
- **Company Name** - Appears in reports and certificates
- **Logo** - Upload your company logo
- **Primary Color** - Accent color throughout the app

### Where Branding Appears
- PDF report headers
- Exported certificates
- Print outputs

### Requirements
- Logo: PNG or JPG, recommended 200x200px minimum
- Colors: Hex code format (#RRGGBB)
        `
      }
    ]
  },
  {
    id: 'faq',
    title: 'FAQ & Support',
    icon: HelpCircle,
    color: 'from-amber-500 to-orange-600',
    subsections: [
      {
        id: 'common-questions',
        title: 'Frequently Asked Questions',
        content: `
### General Questions

**Q: Does the app work offline?**
A: Many features work offline including calculators, reference tables, and educational content. Some features like AI analysis require an internet connection.

**Q: How do I save my work?**
A: Job reports and LCP entries are automatically saved to your account. Calculation results can be exported as needed.

**Q: Can I use this on my phone?**
A: Yes! The app is fully responsive and works great on mobile devices, tablets, and desktops.

### Technical Questions

**Q: Why does my OTDR show different loss than OLTS?**
A: OTDR measures backscatter and calculates loss, while OLTS measures actual power. Bidirectional OTDR averaging should match OLTS results.

**Q: What's the difference between loss and reflectance?**
A: Loss (dB) is power that doesn't make it through. Reflectance (dB) is power reflected back toward the source. Both are measured in dB but represent different phenomena.

**Q: Why do I get "gainers" on OTDR traces?**
A: Apparent gainers occur at splices when testing single-direction due to different backscatter coefficients between fibers. Bidirectional averaging eliminates this artifact.

### Account Questions

**Q: How do I reset my password?**
A: Use the "Forgot Password" link on the login page.

**Q: Can multiple technicians share an account?**
A: We recommend individual accounts for accurate job tracking and personalized settings.
        `
      },
      {
        id: 'glossary',
        title: 'Glossary of Terms',
        content: `
### Common Fiber Optic Terms

**APC (Angled Physical Contact)** - Connector polish with 8° angle to reduce reflectance.

**Attenuation** - Reduction in optical power as light travels through fiber, measured in dB or dB/km.

**Backscatter** - Light scattered backward in fiber, used by OTDRs for measurements.

**dB (Decibel)** - Logarithmic unit for expressing ratios, commonly used for loss and gain.

**dBm** - Power level referenced to 1 milliwatt (0 dBm = 1 mW).

**Fusion Splice** - Permanent joint made by melting fiber ends together.

**GPON** - Gigabit Passive Optical Network, ITU-T G.984 standard.

**Insertion Loss** - Power loss caused by inserting a component into a fiber path.

**Macrobend** - Large-radius bend causing light to escape the fiber.

**Mechanical Splice** - Splice using alignment fixture and index-matching gel.

**OTDR** - Optical Time Domain Reflectometer, used to characterize fiber links.

**OLTS** - Optical Loss Test Set, used to measure insertion loss.

**ONT** - Optical Network Terminal, customer premises equipment in PON.

**OLT** - Optical Line Terminal, central office equipment in PON.

**Reflectance** - Ratio of reflected power to incident power, expressed in negative dB.

**Return Loss** - Same as reflectance but expressed as positive dB value.

**SMF** - Single-Mode Fiber, fiber with small core (~9μm) for long distances.

**UPC (Ultra Physical Contact)** - Connector polish with curved end face, <-50 dB reflectance.

**XGS-PON** - 10G Symmetric PON, ITU-T G.9807 standard.
        `
      },
      {
        id: 'support',
        title: 'Getting Help',
        content: `
### In-App Help
- **Tooltips** - Hover over icons and labels for quick explanations
- **Info buttons** - Click (i) icons for detailed information
- **This guide** - Comprehensive documentation for all features

### Onboarding Tour
New to the app? The onboarding tour walks you through key features. Restart it anytime from Settings.

### Feedback
We're constantly improving based on user feedback. Let us know:
- Features that would help your workflow
- Issues or bugs you encounter
- Content that needs clarification

### Contact
For additional support, visit the Contact page in the app.

### Updates
The app is regularly updated with:
- New features and tools
- Bug fixes and improvements
- Updated standards references
- Additional educational content
        `
      }
    ]
  }
];

export default function UserGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(['getting-started']);
  const [activeSubsection, setActiveSubsection] = useState('overview');

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const filteredSections = USER_GUIDE_SECTIONS.map(section => ({
    ...section,
    subsections: section.subsections.filter(sub =>
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.subsections.length > 0);

  const activeContent = USER_GUIDE_SECTIONS
    .flatMap(s => s.subsections)
    .find(sub => sub.id === activeSubsection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">User Guide</h1>
              <p className="text-xs text-gray-500">Complete documentation for Fiber Oracle</p>
            </div>
            <Badge variant="outline" className="hidden sm:flex">
              {USER_GUIDE_SECTIONS.reduce((acc, s) => acc + s.subsections.length, 0)} Topics
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:w-72 flex-shrink-0">
            <Card className="sticky top-24 border-0 shadow-lg">
              <CardContent className="p-4">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search guide..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Navigation */}
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <nav className="space-y-1">
                    {filteredSections.map((section) => (
                      <Collapsible
                        key={section.id}
                        open={expandedSections.includes(section.id)}
                        onOpenChange={() => toggleSection(section.id)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                              <section.icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="flex-1 text-left text-sm font-medium">{section.title}</span>
                            {expandedSections.includes(section.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-9 mt-1 space-y-0.5">
                            {section.subsections.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => setActiveSubsection(sub.id)}
                                className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                                  activeSubsection === sub.id
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                              >
                                {sub.title}
                              </button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 md:p-8">
                {activeContent ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <h1 className="text-2xl font-bold mb-6">{activeContent.title}</h1>
                    <div className="space-y-4">
                      {activeContent.content.split('\n').map((line, i) => {
                        // Handle headers
                        if (line.startsWith('### ')) {
                          return <h3 key={i} className="text-lg font-semibold mt-6 mb-3">{line.replace('### ', '')}</h3>;
                        }
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-xl font-semibold mt-6 mb-3">{line.replace('## ', '')}</h2>;
                        }
                        // Handle bold text
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return <p key={i} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
                        }
                        // Handle list items
                        if (line.startsWith('- ')) {
                          return (
                            <div key={i} className="flex items-start gap-2 ml-4">
                              <span className="text-blue-500 mt-1">•</span>
                              <span dangerouslySetInnerHTML={{ __html: line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            </div>
                          );
                        }
                        // Handle numbered items
                        if (/^\d+\.\s/.test(line)) {
                          const num = line.match(/^(\d+)\./)[1];
                          return (
                            <div key={i} className="flex items-start gap-2 ml-4">
                              <span className="text-blue-500 font-semibold min-w-[20px]">{num}.</span>
                              <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            </div>
                          );
                        }
                        // Handle tables
                        if (line.startsWith('|')) {
                          return null; // Tables handled separately
                        }
                        // Handle Q&A format
                        if (line.startsWith('**Q:')) {
                          return (
                            <div key={i} className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <p className="font-semibold text-blue-800 dark:text-blue-200" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*/g, '') }} />
                            </div>
                          );
                        }
                        if (line.startsWith('A:')) {
                          return (
                            <p key={i} className="ml-4 mb-4 text-gray-600 dark:text-gray-300">{line.replace('A: ', '')}</p>
                          );
                        }
                        // Regular paragraphs
                        if (line.trim()) {
                          return (
                            <p key={i} className="text-gray-600 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                          );
                        }
                        return null;
                      })}
                      
                      {/* Render tables if present */}
                      {activeContent.content.includes('|') && (
                        <div className="overflow-x-auto mt-4">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-800">
                                {activeContent.content
                                  .split('\n')
                                  .find(l => l.startsWith('|') && !l.includes('---'))
                                  ?.split('|')
                                  .filter(Boolean)
                                  .map((cell, i) => (
                                    <th key={i} className="px-3 py-2 text-left font-semibold border">{cell.trim()}</th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {activeContent.content
                                .split('\n')
                                .filter(l => l.startsWith('|') && !l.includes('---'))
                                .slice(1)
                                .map((row, i) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                    {row.split('|').filter(Boolean).map((cell, j) => (
                                      <td key={j} className="px-3 py-2 border">{cell.trim()}</td>
                                    ))}
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">Select a topic</h3>
                    <p className="text-sm text-gray-500 mt-1">Choose a section from the sidebar to view its content.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="mt-6 border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">Pro Tip</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Use the search bar to quickly find specific topics. You can search for terms like "OTDR", "connector loss", or "GPON" to jump directly to relevant content.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}