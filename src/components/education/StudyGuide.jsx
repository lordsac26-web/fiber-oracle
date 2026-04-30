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
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Study guide content for each module
const STUDY_GUIDES = {
  fiber101: {
    title: 'Fiber 101 Study Guide',
    subtitle: 'Foundations of Fiber Optics & FTTH',
    passingScore: 70,
    sections: [
      {
        title: 'Fiber Optic Fundamentals',
        content: [
          { term: 'Core', definition: 'The center of the fiber where light travels. SMF core = 9μm, MMF core = 50μm or 62.5μm' },
          { term: 'Cladding', definition: 'Surrounds the core (125μm), reflects light back into the core via total internal reflection' },
          { term: 'Jacket/Buffer', definition: 'Outer protective coating, color-coded for identification' },
          { term: 'Single-Mode Fiber (SMF)', definition: 'Yellow jacket, 9μm core, used for long distances (up to 100+ km), wavelengths 1310nm/1550nm' },
          { term: 'Multi-Mode Fiber (MMF)', definition: 'Aqua/Orange jacket, 50/62.5μm core, short distances (up to 550m), wavelengths 850nm/1300nm' },
        ]
      },
      {
        title: 'TIA-598 Color Code (12-Fiber)',
        content: [
          { term: 'Position 1-6', definition: 'Blue, Orange, Green, Brown, Slate, White' },
          { term: 'Position 7-12', definition: 'Red, Black, Yellow, Violet, Rose, Aqua' },
          { term: 'Memory Aid', definition: '"Blue-Orange-Green-Brown-Slate-White" then "Red-Black-Yellow-Violet-Rose-Aqua"' },
        ]
      },
      {
        title: 'Connectors & Polish Types',
        content: [
          { term: 'LC Connector', definition: 'Lucent Connector, 1.25mm ferrule, most common in data centers, push-pull latch' },
          { term: 'SC Connector', definition: 'Subscriber Connector, 2.5mm ferrule, standard for FTTH/PON, snap-in design' },
          { term: 'UPC (Blue)', definition: 'Ultra Physical Contact, return loss >50 dB' },
          { term: 'APC (Green)', definition: 'Angled Physical Contact (8°), return loss >60 dB, required for RF video overlay' },
          { term: 'CRITICAL', definition: 'NEVER mix UPC and APC connectors - green to green, blue to blue only!' },
        ]
      },
      {
        title: 'PON Network Architecture',
        content: [
          { term: 'OLT', definition: 'Optical Line Terminal - Located at central office, sends downstream/receives upstream' },
          { term: 'ONT/ONU', definition: 'Optical Network Terminal/Unit - At customer premises, converts fiber to Ethernet/voice' },
          { term: 'Splitter', definition: 'Passive device that splits optical signal. 1:32 typical, ~17.5 dB loss' },
          { term: 'Feeder Fiber', definition: 'Fiber from OLT to splitter' },
          { term: 'Drop Fiber', definition: 'Fiber from splitter to customer ONT' },
        ]
      },
      {
        title: 'GPON Specifications (ITU-T G.984)',
        content: [
          { term: 'Downstream', definition: '2.488 Gbps at 1490nm wavelength' },
          { term: 'Upstream', definition: '1.244 Gbps at 1310nm wavelength' },
          { term: 'Max Split Ratio', definition: '1:128 (typically 1:32 or 1:64)' },
          { term: 'Max Distance', definition: '20 km standard, up to 60 km with extended optics' },
          { term: 'Class B+', definition: '28 dB optical budget (most common)' },
          { term: 'Class C+', definition: '32 dB optical budget (extended reach)' },
        ]
      },
      {
        title: 'Power Levels & dB',
        content: [
          { term: 'dBm', definition: 'Absolute power level referenced to 1 milliwatt' },
          { term: 'dB', definition: 'Relative measurement (loss or gain)' },
          { term: 'OLT Tx Power', definition: '+3 to +7 dBm (Class C+)' },
          { term: 'ONT Rx (Good)', definition: '-8 to -25 dBm' },
          { term: 'ONT Rx (Low)', definition: 'Below -27 dBm = problems' },
          { term: 'SMF Loss @1310nm', definition: '0.35 dB/km' },
          { term: 'SMF Loss @1550nm', definition: '0.25 dB/km' },
          { term: 'Elite Connector Loss', definition: '≤0.15 dB' },
          { term: 'Fusion Splice Loss', definition: '≤0.10 dB' },
        ]
      },
      {
        title: 'Cleaning & Inspection (IEC 61300-3-35)',
        content: [
          { term: 'Key Statistic', definition: '85% of fiber problems are caused by contamination' },
          { term: 'Cleaning Steps', definition: '1) Inspect → 2) Dry clean → 3) Re-inspect → 4) Wet clean if needed → 5) Final inspection' },
          { term: 'Never Do', definition: 'Touch ferrule end face, blow on connectors, use household cleaners' },
          { term: 'Always Do', definition: 'Inspect before connecting, use dust caps, dry clean first' },
        ]
      },
      {
        title: 'Testing Overview',
        content: [
          { term: 'OLTS (Tier 1)', definition: 'Optical Loss Test Set - Measures total end-to-end loss, quick pass/fail certification' },
          { term: 'OTDR (Tier 2)', definition: 'Optical Time Domain Reflectometer - Shows events along fiber, locates faults and splices' },
          { term: 'Key Difference', definition: 'OLTS tells you IF there\'s a problem. OTDR tells you WHERE the problem is.' },
        ]
      },
      {
        title: 'Safety',
        content: [
          { term: 'Eye Safety', definition: 'NEVER look into fiber ends or laser sources. IR light (1310/1550nm) is invisible but dangerous' },
          { term: 'Fiber Shards', definition: 'Glass fiber is extremely sharp. Use fiber trash container, wear safety glasses when cleaving' },
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
        title: 'GPON Deep Dive (ITU-T G.984)',
        content: [
          { term: 'Downstream', definition: '2.488 Gbps at 1490nm' },
          { term: 'Upstream', definition: '1.244 Gbps at 1310nm' },
          { term: 'Class B+', definition: '28 dB budget, OLT Tx: +1.5 to +5 dBm' },
          { term: 'Class C+', definition: '32 dB budget, OLT Tx: +3 to +7 dBm' },
          { term: 'TDMA', definition: 'Time Division Multiple Access - allows multiple ONTs to share upstream wavelength' },
        ]
      },
      {
        title: 'XGS-PON (ITU-T G.9807)',
        content: [
          { term: 'Downstream', definition: '9.953 Gbps at 1577nm' },
          { term: 'Upstream', definition: '9.953 Gbps at 1270nm (symmetric!)' },
          { term: 'N1 Class', definition: '29 dB budget (standard)' },
          { term: 'N2 Class', definition: '31 dB budget (extended)' },
          { term: 'Coexistence', definition: 'Different wavelengths allow GPON and XGS-PON on same fiber (combo PON)' },
        ]
      },
      {
        title: 'PON Wavelength Plan',
        content: [
          { term: '1270nm', definition: 'XGS-PON Upstream' },
          { term: '1310nm', definition: 'GPON Upstream, also OTDR testing' },
          { term: '1490nm', definition: 'GPON Downstream' },
          { term: '1550nm', definition: 'RF Video Overlay, OTDR testing' },
          { term: '1577nm', definition: 'XGS-PON Downstream' },
        ]
      },
      {
        title: 'Loss Budget Calculation',
        content: [
          { term: 'Formula', definition: 'Total Loss = Fiber + Connectors + Splices + Splitters' },
          { term: 'Fiber Loss', definition: '0.35 dB/km @1310nm, 0.25 dB/km @1550nm' },
          { term: 'Connector Loss', definition: '0.15-0.50 dB each (field grade ~0.30 dB)' },
          { term: 'Fusion Splice', definition: '~0.10 dB each' },
          { term: '1:32 Splitter', definition: '~17.5 dB insertion loss' },
          { term: 'Margin Rule', definition: 'Always leave 3-6 dB margin for aging and repairs' },
        ]
      },
      {
        title: 'Splitter Loss Values',
        content: [
          { term: '1:2', definition: '3.8 dB' },
          { term: '1:4', definition: '7.4 dB' },
          { term: '1:8', definition: '10.7 dB' },
          { term: '1:16', definition: '14.1 dB' },
          { term: '1:32', definition: '17.5 dB' },
          { term: '1:64', definition: '20.9 dB' },
          { term: 'Cascade Example', definition: '1:4 + 1:8 = 7.4 + 10.7 = 18.1 dB (vs 17.5 dB for single 1:32)' },
        ]
      },
      {
        title: 'OTDR Event Identification',
        content: [
          { term: 'Connector', definition: 'Reflective spike + loss (reflection + insertion loss)' },
          { term: 'Fusion Splice', definition: 'Non-reflective loss only (small dip)' },
          { term: 'Mechanical Splice', definition: 'Reflective + loss (higher than fusion)' },
          { term: 'Splitter', definition: 'Large non-reflective loss event (17+ dB)' },
          { term: 'End of Fiber', definition: 'High reflective spike, then noise floor' },
          { term: 'Break/Fault', definition: 'Sudden drop to noise floor with possible reflection' },
        ]
      },
      {
        title: 'PON Error Types',
        content: [
          { term: 'BIP Errors', definition: 'Bit Interleaved Parity - indicates bit errors. Threshold: <10/15min acceptable' },
          { term: 'FEC Corrected', definition: 'Errors fixed by Forward Error Correction. Watch for increasing trends' },
          { term: 'FEC Uncorrectable', definition: 'Too severe for FEC. Should be 0 - causes packet loss' },
          { term: 'HEC/GEM Errors', definition: 'Header errors, often timing/collision issues' },
        ]
      },
      {
        title: 'ONT Power Analysis',
        content: [
          { term: 'Too Low', definition: 'Below -27 dBm - signal problems' },
          { term: 'Marginal', definition: '-27 to -25 dBm - monitor closely' },
          { term: 'Good Range', definition: '-25 to -10 dBm' },
          { term: 'Ideal Target', definition: '-15 to -22 dBm (good margin)' },
          { term: 'Too High', definition: 'Above -8 dBm - may need attenuator' },
        ]
      },
      {
        title: 'Systematic Troubleshooting',
        content: [
          { term: 'Step 1', definition: 'Check ONT Status - PON light solid green?' },
          { term: 'Step 2', definition: 'Measure Rx Power - within spec?' },
          { term: 'Step 3', definition: 'Inspect & Clean - start at ONT, work back' },
          { term: 'Step 4', definition: 'Check Splitter - verify correct port' },
          { term: 'Step 5', definition: 'OTDR If Needed - locate fault distance' },
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

  const handleDownloadPDF = async (saveOffline = false) => {
    setIsDownloading(true);
    try {
      const response = await base44.functions.invoke('generatePDF', { 
         type: 'studyGuide',
         data: {
           courseId,
           title: guide.title,
           subtitle: guide.subtitle,
           passingScore: guide.passingScore,
           sections: guide.sections
         }
       }, { responseType: 'arraybuffer' });

       toast.success('Study guide generated successfully');

       const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${guide.title.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
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
      <Card className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">Open Book Exam</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You may reference this study guide during the certification exam. Download the PDF to have it ready.
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