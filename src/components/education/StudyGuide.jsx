import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  BookOpen, 
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowLeft,
  Loader2,
  WifiOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { downloadPdfFromFunction } from '@/lib/pdfDownload';

// Study guide content for each module
const STUDY_GUIDES = {
  fiber101: {
    title: 'Fiber 101 Study Guide',
    subtitle: 'Foundations of Fiber Optics & FTTH',
    passingScore: 70,
    sections: [
      {
        title: 'Reference Sources Used',
        content: [
          { term: 'Primary Reference', definition: 'FOA Online Reference Guide to Fiber Optics: optical fiber basics, fiber optic cable construction, cleaning, testing, OTDRs, and safety.' },
          { term: 'Practice Alignment', definition: 'New exam questions are rewritten as original Fiber Oracle questions based on concepts from free public FOA references and general industry practice.' },
          { term: 'Exam Rotation', definition: 'Fiber 101 now has a larger question bank than the 40-question exam, so each attempt can draw a different mix of fundamentals, cable construction, cleaning, testing, safety, and PON questions.' },
        ]
      },
      {
        title: 'Fiber Optic Fundamentals',
        content: [
          { term: 'Core', definition: 'The center of the optical fiber where the signal light is guided. Single-mode fiber is typically about 9um core; multimode is commonly 50um or 62.5um.' },
          { term: 'Cladding', definition: 'The glass surrounding the core. Standard telecommunications glass fiber normally has 125um cladding.' },
          { term: 'Total Internal Reflection', definition: 'Light stays guided because the core has a higher refractive index than the cladding. Rays within the acceptance angle reflect back into the core.' },
          { term: 'Numerical Aperture', definition: 'A measure related to the angles of light the fiber can accept and still guide through total internal reflection.' },
          { term: 'Buffer and Jacket', definition: 'The buffer protects the glass fiber; the cable jacket protects the complete cable assembly from the installation environment.' },
        ]
      },
      {
        title: 'Single-Mode vs Multi-Mode',
        content: [
          { term: 'Single-Mode Fiber (SMF)', definition: 'Small core around 9um, yellow jacket in common TIA color coding, low loss, very high bandwidth, used for FTTH, PON, telecom, and long-distance links.' },
          { term: 'Multi-Mode Fiber (MMF)', definition: 'Larger 50um or 62.5um core, usually orange or aqua jacket depending on grade, used mainly for short premises, LAN, and data-center links.' },
          { term: 'Why SMF Goes Farther', definition: 'Single-mode fiber carries essentially one optical mode, avoiding modal dispersion that limits multimode bandwidth-distance performance.' },
          { term: 'Graded-Index MMF', definition: 'A multimode design that varies the refractive index across the core to reduce modal dispersion compared with older step-index multimode fiber.' },
          { term: 'Typical Wavelengths', definition: 'Multimode commonly uses 850nm and 1300nm. Single-mode commonly uses 1310nm and 1550nm; PON systems also use 1490nm, 1577nm, and 1270nm depending on technology.' },
        ]
      },
      {
        title: 'Cable Construction and Installation',
        content: [
          { term: 'Cable Assembly', definition: 'A fiber optic cable includes fibers, buffers or tubes, strength members, water blocking if needed, and an outer jacket.' },
          { term: 'Tight-Buffered Cable', definition: 'Common indoors where flexibility and direct termination are important. Examples include simplex, zipcord, distribution, and breakout styles.' },
          { term: 'Loose Tube Cable', definition: 'Common for outside plant trunks because the fibers are protected from pulling tension and can be protected from moisture with gel or dry water-blocking materials.' },
          { term: 'Strength Members', definition: 'Aramid yarn or other members take pulling force. Pulling should attach to the strength members, not the glass fibers or connector bodies.' },
          { term: 'Indoor Ratings', definition: 'Indoor cable jackets must meet applicable fire code requirements such as riser or plenum ratings.' },
          { term: 'Outdoor Ratings', definition: 'Outdoor cable selection depends on moisture, sunlight, temperature, aerial/buried/conduit exposure, rodent risk, and pulling tension.' },
        ]
      },
      {
        title: 'TIA-598 Color Code (12-Fiber)',
        content: [
          { term: 'Position 1-6', definition: 'Blue, Orange, Green, Brown, Slate, White.' },
          { term: 'Position 7-12', definition: 'Red, Black, Yellow, Violet, Rose, Aqua.' },
          { term: 'How It Repeats', definition: 'The 12-color sequence repeats for fibers, buffer tubes, and high-count cable groupings depending on cable construction.' },
          { term: 'Memory Aid', definition: 'Blue-Orange-Green-Brown-Slate-White, then Red-Black-Yellow-Violet-Rose-Aqua.' },
        ]
      },
      {
        title: 'Connectors and Polish Types',
        content: [
          { term: 'LC Connector', definition: 'Small-form connector with 1.25mm ferrule, common in SFPs, patch panels, and high-density equipment.' },
          { term: 'SC Connector', definition: 'Push-pull connector with 2.5mm ferrule, widely used in FTTH/PON customer and splitter environments.' },
          { term: 'UPC (Blue)', definition: 'Ultra Physical Contact polish, commonly blue, with low reflection for most digital links.' },
          { term: 'APC (Green)', definition: 'Angled Physical Contact polish, commonly green, with an 8-degree angle and very low reflectance; common in PON/RF video environments.' },
          { term: 'CRITICAL', definition: 'Never mate APC to UPC. Their end-face geometries do not match and can cause high loss, high reflection, and physical damage.' },
        ]
      },
      {
        title: 'Cleaning and Inspection',
        content: [
          { term: 'Inspect-Clean-Inspect', definition: 'Inspect before connecting, clean if needed, then inspect again before mating.' },
          { term: 'Dry Cleaning', definition: 'Use proper fiber cleaning tools first for dust and loose particles.' },
          { term: 'Wet/Dry Cleaning', definition: 'Use approved fiber cleaning materials when oily residue or stubborn contamination remains, then dry clean and inspect again.' },
          { term: 'Dust Caps', definition: 'Dust caps protect connectors but do not guarantee cleanliness. Caps can also carry dust or residue.' },
          { term: 'Never Do', definition: 'Do not touch ferrule end faces, blow on connectors, use household cleaners, or connect a contaminated end face.' },
        ]
      },
      {
        title: 'PON Network Architecture',
        content: [
          { term: 'OLT', definition: 'Optical Line Terminal at the central office or headend. It sends downstream traffic and receives upstream traffic.' },
          { term: 'ONT/ONU', definition: 'Optical Network Terminal or Unit at the customer side. It converts optical service to customer interfaces such as Ethernet and voice.' },
          { term: 'Splitter', definition: 'Passive optical device that divides one optical input into many outputs without electrical power.' },
          { term: 'Feeder Fiber', definition: 'Fiber section from the OLT area toward the splitter or distribution network.' },
          { term: 'Drop Fiber', definition: 'Final fiber segment from the distribution point or splitter area to the customer premises.' },
        ]
      },
      {
        title: 'GPON and Intro XGS-PON Facts',
        content: [
          { term: 'GPON Downstream', definition: '2.488 Gbps downstream at 1490nm.' },
          { term: 'GPON Upstream', definition: '1.244 Gbps upstream at 1310nm.' },
          { term: 'GPON Split Ratios', definition: 'GPON can support high split ratios such as 1:64 or 1:128, but 1:32 and 1:64 are common because power budget and margin matter.' },
          { term: 'Class B+ and C+', definition: 'Class B+ is commonly associated with a 28 dB optical budget; Class C+ provides about 32 dB.' },
          { term: 'XGS-PON Introduction', definition: 'XGS-PON provides about 10 Gbps symmetric service using 1577nm downstream and 1270nm upstream, allowing coexistence with GPON wavelengths.' },
        ]
      },
      {
        title: 'Power Levels and Loss Budget',
        content: [
          { term: 'dBm', definition: 'Absolute optical power referenced to 1 milliwatt.' },
          { term: 'dB', definition: 'Relative gain or loss. Link budgets subtract passive losses in dB from transmitter power in dBm.' },
          { term: 'Basic Formula', definition: 'Receiver power = transmitter power - total passive loss. Example: +4 dBm - 23 dB = -19 dBm.' },
          { term: 'SMF Loss', definition: 'Common planning values are about 0.35 dB/km at 1310nm and 0.25 dB/km at 1550nm.' },
          { term: 'Connector and Splice Loss', definition: 'Field connector planning often uses about 0.3 dB each; fusion splices are commonly much lower, often around 0.1 dB or less.' },
          { term: 'Splitter Loss', definition: 'Approximate splitter losses: 1:4 = 7.4 dB, 1:8 = 10.7 dB, 1:16 = 14.1 dB, 1:32 = 17.5 dB, 1:64 = 20.9 dB.' },
          { term: 'Margin', definition: 'Always leave margin for aging, temperature, repairs, dirty connections, measurement uncertainty, and future changes.' },
        ]
      },
      {
        title: 'Testing Overview',
        content: [
          { term: 'OLTS / Insertion Loss', definition: 'An optical loss test set uses a source and power meter to measure total end-to-end loss for pass/fail acceptance.' },
          { term: 'OTDR', definition: 'An optical time domain reflectometer shows events versus distance and can help locate faults, verify length, and evaluate splice or connector events.' },
          { term: 'When To Use Each', definition: 'OLTS tells whether the complete link loss passes. OTDR helps find where excess loss, reflections, breaks, or macrobends are located.' },
          { term: 'Launch / Receive Fibers', definition: 'Launch and receive fibers help move near-end and far-end connectors out of OTDR dead zones so connector loss can be evaluated.' },
          { term: 'Documentation', definition: 'Save before/after readings and traces. Good documentation proves work quality and helps future troubleshooting.' },
        ]
      },
      {
        title: 'Safety',
        content: [
          { term: 'Eye Safety', definition: 'Never look into a fiber end, connector, microscope, or source until optical power is verified safe. Telecom IR light may be invisible.' },
          { term: 'Fiber Shards', definition: 'Cleaved fiber scraps are sharp glass. Wear eye protection and place scraps in a dedicated container.' },
          { term: 'Work Area', definition: 'Keep the work area clean, avoid food or drinks near fiber work, and dispose of all scraps properly.' },
          { term: 'Live Fiber', definition: 'Use proper test equipment to verify whether a fiber is active. Do not rely on visibility because common wavelengths are outside human vision.' },
        ]
      },
    ]
  },
  fiber102: {
    title: 'Fiber 102 Study Guide',
    subtitle: 'Intermediate PON & FTTH',
    passingScore: 75,
    sections: [
      {
        title: 'Reference Sources Used',
        content: [
          { term: 'Primary References', definition: 'FOA fiber optic testing, OTDR, and loss budget references; public GPON/XGS-PON wavelength and optical budget references including ITU-T G.984/G.9807 summaries.' },
          { term: 'Practice Alignment', definition: 'The added Fiber102 questions are original rewritten questions built from concepts in public technical references, not copied practice-exam text.' },
          { term: 'Exam Rotation', definition: 'Fiber102 now uses a larger bank than the 40-question exam, so each attempt rotates a different mix of PON design, XGS-PON, loss budget, OTDR, and troubleshooting questions.' },
        ]
      },
      {
        title: 'GPON Deep Dive (ITU-T G.984)',
        content: [
          { term: 'Downstream', definition: 'GPON downstream is 2.488 Gbps at 1490nm.' },
          { term: 'Upstream', definition: 'GPON upstream is 1.244 Gbps at 1310nm.' },
          { term: 'TDMA Upstream', definition: 'The OLT assigns upstream time slots so multiple ONTs sharing the same PON do not transmit over each other.' },
          { term: 'Class B+', definition: 'Common GPON budget class around 28 dB; often used for standard FTTH deployments.' },
          { term: 'Class C+', definition: 'Higher GPON budget class around 32 dB for longer reach, higher split, or more margin.' },
          { term: 'Split Ratio', definition: 'GPON can support high split ratios, but practical design must preserve power budget and operating margin.' },
        ]
      },
      {
        title: 'XGS-PON (ITU-T G.9807.1)',
        content: [
          { term: 'Meaning of XGS', definition: 'XGS-PON is a 10-Gigabit-capable symmetric PON system: approximately 10 Gbps downstream and upstream.' },
          { term: 'Downstream', definition: 'XGS-PON downstream uses approximately 1577nm.' },
          { term: 'Upstream', definition: 'XGS-PON upstream uses approximately 1270nm.' },
          { term: 'N1 / N2 Budgets', definition: 'Common planning references list N1 around 29 dB and N2 around 31 dB optical budget.' },
          { term: 'Coexistence', definition: 'XGS-PON can coexist with GPON on the same fiber because GPON and XGS-PON use separate wavelength bands.' },
          { term: 'Migration Note', definition: 'Combo PON or coexistence elements allow operators to migrate customers gradually without immediately replacing every GPON subscriber.' },
        ]
      },
      {
        title: 'PON Wavelength Plan',
        content: [
          { term: '1270nm', definition: 'XGS-PON upstream.' },
          { term: '1310nm', definition: 'GPON upstream and a common single-mode testing wavelength.' },
          { term: '1490nm', definition: 'GPON downstream.' },
          { term: '1550nm', definition: 'Often used for RF video overlay and testing; more bend-sensitive than 1310nm.' },
          { term: '1577nm', definition: 'XGS-PON downstream; longer wavelengths are generally more sensitive to macrobending.' },
        ]
      },
      {
        title: 'Loss Budget Calculation',
        content: [
          { term: 'Power Budget', definition: 'The maximum optical loss a transmitter-receiver pair can tolerate and still operate properly.' },
          { term: 'Passive Loss Formula', definition: 'Total passive loss = fiber attenuation + connector loss + splice loss + splitter loss.' },
          { term: 'Receiver Estimate', definition: 'Expected receiver power = transmitter power - passive loss - planned reserve margin.' },
          { term: 'Fiber Loss', definition: 'Planning values often use about 0.35 dB/km at 1310nm and 0.25 dB/km at 1550nm for single-mode fiber.' },
          { term: 'Connector Loss', definition: 'Field planning often uses about 0.3 dB per connector unless project standards specify otherwise.' },
          { term: 'Fusion Splice', definition: 'Often planned around 0.1 dB or less per splice.' },
          { term: 'Margin Rule', definition: 'Leave operating margin for aging, repairs, temperature, testing uncertainty, and dirty or disturbed connections.' },
        ]
      },
      {
        title: 'Splitter Loss Values',
        content: [
          { term: '1:2', definition: 'Approximately 3.8 dB.' },
          { term: '1:4', definition: 'Approximately 7.4 dB.' },
          { term: '1:8', definition: 'Approximately 10.7 dB.' },
          { term: '1:16', definition: 'Approximately 14.1 dB.' },
          { term: '1:32', definition: 'Approximately 17.5 dB.' },
          { term: '1:64', definition: 'Approximately 20.9 dB.' },
          { term: 'Cascade Rule', definition: 'Cascaded splitters add in dB. Example: 1:4 + 1:8 = 7.4 + 10.7 = 18.1 dB.' },
        ]
      },
      {
        title: 'Fiber Acceptance Testing',
        content: [
          { term: 'Continuity and Polarity', definition: 'Verify fibers are continuous and transmit/receive paths are connected correctly before final acceptance.' },
          { term: 'OLTS / LSPM', definition: 'Source and power meter or OLTS testing directly measures end-to-end insertion loss and is the normal acceptance test against the loss budget.' },
          { term: 'Reference Test Cords', definition: 'Use known-good reference cords and adapters that match the cable plant under test.' },
          { term: 'Documentation', definition: 'Bring layouts, expected loss budgets, and test sheets. Save test results for acceptance records and future troubleshooting.' },
          { term: 'Safety Check', definition: 'Check optical power before looking at or inspecting connectors because telecom wavelengths may be invisible.' },
        ]
      },
      {
        title: 'OTDR Event Identification',
        content: [
          { term: 'How OTDR Works', definition: 'An OTDR sends high-power optical pulses and measures backscatter and reflected light versus time to estimate distance and events.' },
          { term: 'Trace Slope', definition: 'The slope of the trace represents fiber attenuation in dB/km.' },
          { term: 'Connector', definition: 'Reflective event plus insertion loss.' },
          { term: 'Fusion Splice', definition: 'Usually a small non-reflective loss event; very good splices may be hard to see.' },
          { term: 'Mechanical Splice', definition: 'May show both loss and reflection.' },
          { term: 'Splitter', definition: 'Large non-reflective loss event because optical power is divided among outputs.' },
          { term: 'Fiber End / Break', definition: 'End reflections or sudden drops to the noise floor help identify cable end or fault conditions.' },
        ]
      },
      {
        title: 'OTDR Setup and Best Practices',
        content: [
          { term: 'Launch Cable', definition: 'Connected between the OTDR and link under test to overcome the near-end dead zone and measure the first connector.' },
          { term: 'Receive Cable', definition: 'Connected at the far end so the final connector can be measured beyond the end reflection/dead zone.' },
          { term: 'Pulse Width', definition: 'Short pulse widths improve resolution for close events; longer pulse widths increase range but reduce resolution.' },
          { term: 'Dead Zone', definition: 'A region after a strong reflective event where the OTDR receiver is recovering and nearby events can be hidden.' },
          { term: 'LSA', definition: 'Least Squares Analysis fits a best-fit line to noisy trace sections for more stable loss/attenuation estimates.' },
          { term: 'Baseline Trace', definition: 'Save the original installation trace so later troubleshooting traces can be compared to it.' },
        ]
      },
      {
        title: 'PON Error Types',
        content: [
          { term: 'BIP Errors', definition: 'Bit Interleaved Parity errors indicate bit-level transmission problems and should be monitored for rate and trend.' },
          { term: 'FEC Corrected', definition: 'Errors repaired by Forward Error Correction. Some corrected errors can occur, but increasing trends suggest degradation.' },
          { term: 'FEC Uncorrectable', definition: 'Errors too severe for FEC to repair. These should be zero in a healthy link because they can cause packet loss.' },
          { term: 'HEC / GEM Errors', definition: 'Header or framing-related errors can indicate timing, ranging, synchronization, or transmission quality issues.' },
        ]
      },
      {
        title: 'ONT Power Analysis',
        content: [
          { term: 'Too Low', definition: 'Very low receive power near the sensitivity limit can cause drops, errors, or registration problems.' },
          { term: 'Marginal', definition: 'A link that works with little margin may fail after temperature changes, repairs, dirty connectors, or aging.' },
          { term: 'Good Range', definition: 'Healthy design keeps receive power inside the equipment window with practical reserve margin.' },
          { term: 'Too High', definition: 'Too much receive power can saturate a receiver; an optical attenuator may be needed.' },
          { term: 'Trend Matters', definition: 'Stable readings are better than fluctuating readings. Sudden or periodic changes point to mechanical, thermal, or connector issues.' },
        ]
      },
      {
        title: 'Systematic Troubleshooting',
        content: [
          { term: 'Step 1', definition: 'Confirm symptoms, service scope, affected customers, and whether the issue is single-customer or shared PON.' },
          { term: 'Step 2', definition: 'Check OLT/ONT status, alarms, optical power, and error counters before touching the plant.' },
          { term: 'Step 3', definition: 'Inspect and clean accessible connectors before deeper testing.' },
          { term: 'Step 4', definition: 'If insertion loss fails, use OTDR with launch/receive cable to locate excess loss or reflections.' },
          { term: 'Step 5', definition: 'Compare results to documentation and baseline traces; isolate feeder, splitter, distribution, or drop sections.' },
          { term: 'Step 6', definition: 'Document root cause, before/after readings, trace files, photos, and corrective action.' },
        ]
      },
    ]
  },
  fiber103: {
    title: 'Fiber 103 Study Guide',
    subtitle: 'Advanced Troubleshooting Mastery',
    passingScore: 80,
    sections: [
      {
        title: 'Advanced OTDR Analysis',
        content: [
          { term: 'Event Dead Zone', definition: '0.8-8m - minimum distance between events that can be distinguished' },
          { term: 'Attenuation Dead Zone', definition: '3-25m - distance before accurate loss measurement is possible' },
          { term: 'Short Pulse (5-30ns)', definition: 'High resolution, shorter range' },
          { term: 'Medium Pulse (100-275ns)', definition: 'Balanced resolution/range' },
          { term: 'Long Pulse (1-20μs)', definition: 'Long range, lower resolution' },
          { term: 'LSA', definition: 'Least Squares Approximation - for accurate loss measurement' },
        ]
      },
      {
        title: 'Ghost Events & Artifacts',
        content: [
          { term: 'Ghost Event', definition: 'Appears at exactly 2× distance of real reflective event' },
          { term: 'Cause', definition: 'Double reflection between high-reflectance connectors' },
          { term: 'Detection', definition: 'Lower amplitude than source, moves when launch cord changes' },
          { term: 'Elimination', definition: 'Clean launch connector, use APC launch cord, add mandrel wrap' },
          { term: 'Test', definition: 'Change launch cord - ghosts move, real events don\'t' },
        ]
      },
      {
        title: 'Bidirectional OTDR Analysis',
        content: [
          { term: 'Why Needed', definition: 'Unidirectional measurements can show false "gainers"' },
          { term: 'Gainer Cause', definition: 'Light travels from lower to higher backscatter fiber' },
          { term: 'True Loss Formula', definition: '(A→B Loss + B→A Loss) ÷ 2' },
          { term: 'Best Practice', definition: 'Always test bidirectionally for accurate splice loss' },
        ]
      },
      {
        title: 'PON Diagnostic States',
        content: [
          { term: 'O1', definition: 'Initial state - no signal' },
          { term: 'O2-O3', definition: 'Standby - searching for OLT' },
          { term: 'O4', definition: 'Ranging - measuring distance' },
          { term: 'O5', definition: 'Operational - fully working' },
          { term: 'O6-O7', definition: 'Emergency/popup states' },
          { term: 'LOSI', definition: 'Loss of Signal - no light reaching ONT' },
          { term: 'LOFI', definition: 'Loss of Frame - signal present but can\'t sync' },
          { term: 'LOAMI', definition: 'Loss of PLOAM - management message lost' },
        ]
      },
      {
        title: 'Error Counter Thresholds',
        content: [
          { term: 'BIP Errors', definition: 'Critical if >100/15min. Causes: low power, dirty connectors, bends' },
          { term: 'FEC Corrected', definition: 'Monitor trend - increasing indicates degradation' },
          { term: 'FEC Uncorrectable', definition: 'Must be 0 - causes packet loss, immediate action required' },
          { term: 'HEC/GEM Errors', definition: 'Check timing, ranging issues, failing ONT' },
        ]
      },
      {
        title: 'Wavelength Sensitivity',
        content: [
          { term: '1310nm', definition: 'Less bend sensitive' },
          { term: '1490nm (GPON DS)', definition: 'Moderate bend sensitivity' },
          { term: '1550nm', definition: 'Most bend sensitive - used for RF video' },
          { term: '1577nm (XGS DS)', definition: 'Very bend sensitive' },
          { term: 'Diagnostic Key', definition: 'If 1550nm loss >> 1310nm loss = macrobend' },
          { term: 'Equal Loss', definition: 'Both wavelengths equal = connector/splice issue' },
        ]
      },
      {
        title: 'Intermittent Fault Types',
        content: [
          { term: 'Thermal', definition: 'Temperature changes affect mechanical splices, index gel viscosity' },
          { term: 'Mechanical', definition: 'Movement/vibration, damaged cables, loose connectors' },
          { term: 'Time-Based', definition: 'Load or schedule related issues' },
          { term: 'Hunting Tips', definition: 'Real-time power meter while flexing, check ferrules at 400x' },
        ]
      },
      {
        title: 'Connector Inspection Zones (IEC 61300-3-35)',
        content: [
          { term: 'Core Zone (0-25μm)', definition: 'NO defects allowed' },
          { term: 'Cladding Zone (25-120μm)', definition: 'Limited defects allowed' },
          { term: 'Adhesive Zone (120-130μm)', definition: 'Limited defects allowed' },
          { term: 'Contact Zone (130-250μm)', definition: 'Defects acceptable' },
        ]
      },
      {
        title: 'Splitter Failure Analysis',
        content: [
          { term: 'Complete Failure', definition: 'No output on any port' },
          { term: 'Partial Failure', definition: 'Some ports affected' },
          { term: 'High Insertion Loss', definition: 'Gradual degradation' },
          { term: 'Uniformity', definition: 'Ports should be within ±1.5 dB of each other' },
          { term: 'Warning Sign', definition: 'Multiple customers on same splitter with issues = suspect splitter' },
        ]
      },
      {
        title: 'Systematic Fault Isolation',
        content: [
          { term: 'Step 1', definition: 'Gather Information - symptoms, timeline, recent changes' },
          { term: 'Step 2', definition: 'Establish Baseline - what should readings be?' },
          { term: 'Step 3', definition: 'Divide the Link - test at midpoint' },
          { term: 'Step 4', definition: 'Continue Dividing - keep halving until isolated' },
          { term: 'Step 5', definition: 'Root Cause Analysis - why it failed, not just what' },
          { term: 'Step 6', definition: 'Document & Prevent - update records, preventive measures' },
        ]
      },
    ]
  }
};

export default function StudyGuide({ courseId }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const guide = STUDY_GUIDES[courseId];

  if (!guide) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Study guide not found for this course.</p>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      await downloadPdfFromFunction('generatePDF', {
        type: 'studyGuide',
        data: {
          courseId,
          title: guide.title,
          subtitle: guide.subtitle,
          passingScore: guide.passingScore,
          sections: guide.sections,
        },
      }, `${guide.title.replace(/\s+/g, '-')}.pdf`);

      toast.success('Study guide generated successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error(error.message || 'Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">{guide.title}</h1>
              <p className="text-blue-100">{guide.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
               <Badge className="bg-white/20 text-white border-0">
                 Passing Score: {guide.passingScore}%
               </Badge>
               <Button onClick={() => handleDownloadPDF()} disabled={isDownloading} variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50">
                 {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                 {isDownloading ? 'Generating...' : 'Download PDF'}
               </Button>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Notice */}
      <Card className="border border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Open Book Exam · Expanded Question Pool</h4>
              <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
                You may reference this refreshed guide during the certification exam. This course now rotates questions from a larger source-referenced bank.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Study Guide Content */}
      <div className="space-y-6">
        {guide.sections.map((section, idx) => (
          <Card key={idx} className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gray-50 dark:bg-gray-800">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {section.content.map((item, itemIdx) => (
                  <div key={itemIdx} className={`p-3 rounded-lg ${
                    item.term === 'CRITICAL' || item.term === 'Warning Sign' 
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <div className="flex items-start gap-2">
                      {item.term === 'CRITICAL' || item.term === 'Warning Sign' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.term}: </span>
                        <span className="text-gray-600 dark:text-gray-300">{item.definition}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { STUDY_GUIDES };