import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Stethoscope, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  Zap,
  Radio,
  Thermometer,
  Eye,
  Cable,
  Wrench,
  RefreshCw,
  XCircle,
  Image,
  Info,
  ExternalLink
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen } from 'lucide-react';

// Reference images for diagnostics
const DIAGNOSTIC_IMAGES = {
  dirty_connector: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/dirty_connector_scope.png',
  clean_connector: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/clean_connector_scope.png',
  scratched_connector: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/scratched_connector.png',
  macrobend_trace: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/macrobend_otdr.png',
  good_splice_trace: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/good_splice_otdr.png',
  fiber_break_trace: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/fiber_break_otdr.png',
};

const DIAGNOSTIC_TREE = {
  start: {
    question: "What symptom are you experiencing?",
    icon: Stethoscope,
    options: [
      { label: "No light / Total loss", next: "no_light", icon: XCircle, severity: "critical" },
      { label: "High loss / Weak signal", next: "high_loss", icon: AlertTriangle, severity: "warning" },
      { label: "Intermittent connection", next: "intermittent", icon: RefreshCw, severity: "warning" },
      { label: "High bit error rate", next: "ber", icon: Radio, severity: "moderate" },
      { label: "OTDR shows anomaly", next: "otdr_anomaly", icon: Zap, severity: "info" },
      { label: "PON / FTTH Issue", next: "pon_issue", icon: Radio, severity: "warning" },
    ]
  },
  no_light: {
    question: "Where does the light stop?",
    icon: Cable,
    options: [
      { label: "At transmitter (no output)", next: "tx_issue", severity: "critical" },
      { label: "First connector/patch panel", next: "first_connector", severity: "high" },
      { label: "Mid-span (splice/junction)", next: "mid_span_break", severity: "high" },
      { label: "Far end (receiver side)", next: "far_end", severity: "high" },
      { label: "Unknown / can't determine", next: "unknown_break", severity: "critical" },
    ]
  },
  tx_issue: {
    diagnosis: true,
    title: "Transmitter Issue",
    severity: "critical",
    icon: Zap,
    causes: [
      "Laser/LED failure",
      "SFP/transceiver not seated properly",
      "TX disabled in software",
      "Power supply issue to optics",
    ],
    actions: [
      "Check transceiver is fully seated - remove and re-insert",
      "Verify TX is enabled (show interface, no shut)",
      "Check power LED on transceiver",
      "Try known-good transceiver",
      "Check DOM/DDM readings for TX power",
      "Verify correct wavelength transceiver installed",
    ],
    tools: ["VFL (Visual Fault Locator)", "Power meter", "DOM/DDM capable switch/router"]
  },
  first_connector: {
    diagnosis: true,
    title: "First Connector Contamination/Damage",
    severity: "high",
    icon: Eye,
    causes: [
      "Contaminated connector end-face",
      "Damaged/cracked ferrule",
      "Wrong connector type (PC vs APC mismatch)",
      "Connector not fully seated",
    ],
    actions: [
      "Inspect connector with 400x fiber scope",
      "Clean connector following IEC 61300-3-35",
      "Check for PC/APC mismatch (green = APC)",
      "Verify connector clicks into adapter",
      "Replace patch cord if damaged",
      "Check bulkhead adapter for debris",
    ],
    tools: ["400x Fiber scope", "IPA cleaning supplies", "VFL"],
    images: [
      { url: DIAGNOSTIC_IMAGES.dirty_connector, caption: "Dirty connector - requires cleaning", type: "bad" },
      { url: DIAGNOSTIC_IMAGES.clean_connector, caption: "Clean connector - pass", type: "good" },
      { url: DIAGNOSTIC_IMAGES.scratched_connector, caption: "Scratched ferrule - replace connector", type: "bad" }
    ]
  },
  mid_span_break: {
    diagnosis: true,
    title: "Mid-Span Fiber Break",
    severity: "high",
    icon: Cable,
    causes: [
      "Physical damage to cable (dig-up, crush)",
      "Rodent damage",
      "Excessive bend radius",
      "Failed splice",
      "Water ingress and freeze damage",
    ],
    actions: [
      "Run OTDR from both ends to pinpoint break location",
      "Calculate distance to event",
      "Dispatch tech to identified location",
      "Inspect splice enclosures in area",
      "Check for recent construction activity",
      "Prepare fusion splicer for repair",
    ],
    tools: ["OTDR", "Fusion splicer", "Cable locator", "VFL"],
    images: [
      { url: DIAGNOSTIC_IMAGES.fiber_break_trace, caption: "OTDR trace showing fiber break - high reflectance spike then no signal", type: "bad" }
    ]
  },
  far_end: {
    diagnosis: true,
    title: "Far End / Receiver Side Issue",
    severity: "high",
    icon: Radio,
    causes: [
      "Receiver contamination",
      "Receiver damage/saturation",
      "Wrong patch cord at receiver",
      "Receiver disabled or failed",
    ],
    actions: [
      "Inspect and clean receiver-side connector",
      "Check RX power level with power meter",
      "Verify correct patch cord polarity",
      "Check receiver for saturation (too much power)",
      "Try known-good patch cord",
      "Check DOM readings for RX power",
    ],
    tools: ["Power meter", "400x scope", "VFL", "Attenuator (if saturated)"]
  },
  unknown_break: {
    diagnosis: true,
    title: "Unknown Break Location",
    severity: "critical",
    icon: Stethoscope,
    causes: [
      "Break could be anywhere in link",
      "Multiple failures possible",
      "Documentation may be incorrect",
    ],
    actions: [
      "Start with VFL from transmitter end",
      "Look for red light escaping at break point",
      "Run OTDR from transmitter end",
      "If no OTDR event, run from receiver end",
      "Use bidirectional averaging if available",
      "Check all accessible connection points",
      "Verify fiber documentation is accurate",
    ],
    tools: ["VFL", "OTDR", "400x scope", "Power meter"]
  },
  high_loss: {
    question: "What type of high loss?",
    icon: AlertTriangle,
    options: [
      { label: "Loss at specific point (connector/splice)", next: "point_loss", severity: "high" },
      { label: "Distributed loss (entire span)", next: "distributed_loss", severity: "moderate" },
      { label: "Wavelength-dependent (worse at 1550/1625)", next: "bend_loss", severity: "moderate" },
      { label: "Loss increasing over time", next: "degrading_loss", severity: "warning" },
    ]
  },
  point_loss: {
    diagnosis: true,
    title: "High Loss at Specific Point",
    severity: "high",
    icon: Zap,
    causes: [
      "Contaminated connector",
      "Poor splice quality",
      "Connector damage (scratches, chips)",
      "Air gap in mechanical splice",
      "Core misalignment",
    ],
    actions: [
      "Identify exact location with OTDR",
      "If connector: Inspect with 400x scope",
      "Clean connector per IEC procedure",
      "Re-inspect after cleaning",
      "If still failing, replace connector/patch",
      "If splice: Consider re-splicing",
      "Document before/after loss values",
    ],
    tools: ["OTDR", "400x scope", "Cleaning supplies", "Fusion splicer"]
  },
  distributed_loss: {
    diagnosis: true,
    title: "Distributed High Loss",
    severity: "moderate",
    icon: Cable,
    causes: [
      "Fiber attenuation out of spec",
      "Water in cable (hydrogen darkening)",
      "Manufacturing defect",
      "Old fiber degradation",
      "Wrong fiber type for application",
    ],
    actions: [
      "Verify fiber type matches documentation",
      "Compare measured attenuation to spec",
      "Check for water intrusion in cable path",
      "Test at multiple wavelengths",
      "Consider fiber replacement if out of spec",
      "Check if fiber is bend-insensitive type for tight routes",
    ],
    tools: ["OTDR", "Power meter/light source", "Fiber identifier"]
  },
  bend_loss: {
    diagnosis: true,
    title: "Macrobend Loss",
    severity: "moderate",
    icon: RefreshCw,
    causes: [
      "Fiber bent below minimum bend radius",
      "Cable kinked or crushed",
      "Too-tight cable tie or velcro",
      "Improper routing in patch panel",
      "Splice tray fiber routing issue",
    ],
    actions: [
      "Compare loss at 1310nm vs 1550nm/1625nm",
      "Bend loss is higher at longer wavelengths",
      "Use OTDR to find location of bend",
      "Inspect physical route at that location",
      "Check for over-tightened cable ties",
      "Verify minimum bend radius maintained",
      "Consider G.657 bend-insensitive fiber for future",
    ],
    tools: ["OTDR (dual wavelength)", "VFL", "Cable inspection"],
    images: [
      { url: DIAGNOSTIC_IMAGES.macrobend_trace, caption: "OTDR showing macrobend - localized loss, higher at 1550nm than 1310nm", type: "bad" }
    ]
  },
  degrading_loss: {
    diagnosis: true,
    title: "Loss Increasing Over Time",
    severity: "warning",
    icon: Thermometer,
    causes: [
      "Connector contamination accumulating",
      "Water ingress progressing",
      "Mechanical stress increasing",
      "Environmental damage (UV, heat)",
      "Splice aging (index gel drying)",
    ],
    actions: [
      "Compare current OTDR to baseline",
      "Identify which events are degrading",
      "Check environmental conditions",
      "Inspect and clean all connectors",
      "Check splice enclosures for moisture",
      "Document trend for future reference",
      "Schedule preventive maintenance",
    ],
    tools: ["OTDR", "Baseline documentation", "Environmental monitoring"]
  },
  intermittent: {
    question: "When does the intermittent occur?",
    icon: RefreshCw,
    options: [
      { label: "With physical movement/vibration", next: "physical_intermittent", severity: "high" },
      { label: "Temperature related", next: "thermal_intermittent", severity: "moderate" },
      { label: "Random / no pattern", next: "random_intermittent", severity: "warning" },
    ]
  },
  physical_intermittent: {
    diagnosis: true,
    title: "Movement-Related Intermittent",
    severity: "high",
    icon: Wrench,
    causes: [
      "Loose connector not fully seated",
      "Cracked ferrule making intermittent contact",
      "Damaged cable with broken fibers",
      "Poor mechanical splice",
      "Loose adapter/bulkhead",
    ],
    actions: [
      "Check all connectors are fully seated",
      "Gently wiggle connectors while monitoring power",
      "Inspect connectors for ferrule cracks",
      "Check cable for physical damage",
      "Tighten adapter panel mounting",
      "Replace suspect connectors one at a time",
      "Run OTDR while manipulating cable",
    ],
    tools: ["Power meter (real-time)", "400x scope", "OTDR"]
  },
  thermal_intermittent: {
    diagnosis: true,
    title: "Temperature-Related Intermittent",
    severity: "moderate",
    icon: Thermometer,
    causes: [
      "Thermal expansion/contraction at splice",
      "Index gel viscosity change in mechanical splice",
      "Connector ferrule expansion",
      "Cable jacket shrinkage",
    ],
    actions: [
      "Document when failures occur vs temperature",
      "Check outdoor enclosures for proper sealing",
      "Inspect mechanical splices for gel issues",
      "Consider replacing mechanical with fusion splice",
      "Verify cable is rated for temperature range",
      "Check for proper strain relief",
    ],
    tools: ["Temperature logger", "OTDR baseline at different temps"]
  },
  random_intermittent: {
    diagnosis: true,
    title: "Random Intermittent Connection",
    severity: "warning",
    icon: AlertTriangle,
    causes: [
      "Marginal connection at threshold",
      "Electrical interference on active equipment",
      "Transceiver marginal/failing",
      "Power supply fluctuation",
      "Software/firmware bug",
    ],
    actions: [
      "Check optical power margin",
      "Verify DOM/DDM readings in normal range",
      "Check for nearby electrical interference",
      "Monitor power supply stability",
      "Update transceiver firmware",
      "Try swap with known-good transceiver",
      "Check error logs for patterns",
    ],
    tools: ["Power meter", "DOM monitoring", "Error log analysis"]
  },
  ber: {
    diagnosis: true,
    title: "High Bit Error Rate",
    severity: "moderate",
    icon: Radio,
    causes: [
      "Marginal optical power (near sensitivity)",
      "Dispersion (long SMF at high speed)",
      "Reflections causing interference",
      "Dirty connectors",
      "Wrong fiber type",
      "Mode conditioning issues (MMF)",
    ],
    actions: [
      "Check received optical power level",
      "Clean all connectors in path",
      "Verify fiber type matches optics",
      "Check for high reflectance events (>-35dB)",
      "For long SMF links, consider dispersion compensation",
      "For MMF, check launch conditions",
      "Try attenuator if over-powered",
    ],
    tools: ["Power meter", "BER tester", "400x scope", "OTDR"]
  },
  otdr_anomaly: {
    question: "What does the OTDR show?",
    icon: Zap,
    options: [
      { label: "Large reflective spike", next: "reflective_spike", severity: "high" },
      { label: "Non-reflective loss event", next: "non_reflective", severity: "moderate" },
      { label: "Gainer (apparent gain)", next: "gainer", severity: "info" },
      { label: "Ghost/echo", next: "ghost", severity: "info" },
    ]
  },
  reflective_spike: {
    diagnosis: true,
    title: "Large Reflective Event",
    severity: "high",
    icon: Zap,
    causes: [
      "Contaminated connector (>-35dB is dirty)",
      "Air gap in connector",
      "Cracked fiber",
      "End of fiber (open connector)",
      "PC/APC mismatch",
    ],
    actions: [
      "Locate event distance precisely",
      "If connector: Inspect and clean",
      "Reflectance >-35dB usually = contamination",
      "Reflectance around -14dB = open end or break",
      "Check for APC connector mated to PC",
      "Re-test after cleaning",
    ],
    tools: ["400x scope", "Cleaning supplies", "OTDR"]
  },
  non_reflective: {
    diagnosis: true,
    title: "Non-Reflective Loss Event",
    severity: "moderate",
    icon: Cable,
    causes: [
      "Fusion splice",
      "Macrobend",
      "Microbend (stress point)",
      "Manufacturing anomaly",
    ],
    actions: [
      "Compare loss at multiple wavelengths",
      "If 1550nm loss >> 1310nm loss = bend",
      "Check physical route at event location",
      "Inspect for cable damage or tight routing",
      "If at known splice, consider re-splicing",
      "For microbend, relieve cable stress",
    ],
    tools: ["OTDR (dual wavelength)", "Physical inspection"]
  },
  gainer: {
    diagnosis: true,
    title: "Apparent Gain (Gainer Event)",
    severity: "info",
    icon: CheckCircle2,
    causes: [
      "Normal OTDR artifact at splices",
      "Different fiber backscatter coefficients",
      "Splice joining different fiber types",
      "Not an actual problem",
    ],
    actions: [
      "Run OTDR from BOTH directions",
      "Average the two results",
      "True splice loss = (A→B + B→A) / 2",
      "Gainer in one direction cancels with loss in other",
      "Document for baseline reference",
      "This is normal and expected behavior",
    ],
    tools: ["OTDR", "Bidirectional test procedure"]
  },
  ghost: {
    diagnosis: true,
    title: "Ghost / Echo Event",
    severity: "info",
    icon: Eye,
    causes: [
      "Multiple reflections between two reflective events",
      "High reflectance connectors",
      "OTDR artifact, not real event",
    ],
    actions: [
      "Ghost appears at 2x distance of real event",
      "Clean high-reflectance connectors",
      "Use shorter pulse width if available",
      "Ghost will disappear when reflections reduced",
      "Don't chase ghosts - they're not real!",
    ],
    tools: ["OTDR", "400x scope", "Cleaning supplies"]
  },
  // PON / FTTH specific diagnostics
  pon_issue: {
    question: "What PON issue are you experiencing?",
    icon: Radio,
    options: [
      { label: "ONT not registering / offline", next: "ont_offline", severity: "critical" },
      { label: "Low ONT Rx power", next: "low_ont_rx", severity: "high" },
      { label: "High OLT Rx power (weak upstream)", next: "high_olt_rx", severity: "high" },
      { label: "ONT rebooting / unstable", next: "ont_unstable", severity: "warning" },
      { label: "Slow speeds / packet loss", next: "pon_performance", severity: "moderate" },
      { label: "Multiple ONTs affected", next: "multi_ont", severity: "critical" },
    ]
  },
  ont_offline: {
    diagnosis: true,
    title: "ONT Not Registering",
    severity: "critical",
    icon: XCircle,
    causes: [
      "No optical signal reaching ONT",
      "ONT not provisioned in OLT",
      "Wrong PON port assignment",
      "ONT hardware failure",
      "Fiber path issue (break, dirty connector)",
      "Splitter port issue",
    ],
    actions: [
      "Check ONT optical power LED (should be solid)",
      "Verify ONT serial number is provisioned on OLT",
      "Check OLT port for ONT registration attempts",
      "Measure optical power at ONT input (-8 to -28 dBm typical)",
      "If no light, trace back: ONT port → drop → NAP → splitter → FDH",
      "Clean all connectors in path",
      "Try known-good ONT to isolate issue",
      "Check splitter output with power meter",
    ],
    tools: ["Power meter", "VFL", "400x scope", "OLT CLI/NMS access"],
    ponSpecs: {
      gpom: { rxMin: -28, rxMax: -8, standard: "ITU-T G.984" },
      xgspon: { rxMin: -28, rxMax: -8, standard: "ITU-T G.9807" }
    }
  },
  low_ont_rx: {
    diagnosis: true,
    title: "Low ONT Receive Power",
    severity: "high",
    icon: AlertTriangle,
    causes: [
      "Dirty connectors in path",
      "Excessive splitter cascade loss",
      "Fiber attenuation higher than expected",
      "Macrobend in drop cable",
      "Damaged connector at ONT or NAP",
      "OLT transmit power degraded",
    ],
    actions: [
      "Measure actual ONT Rx power (target: -8 to -25 dBm)",
      "Calculate expected loss: fiber + connectors + splitters",
      "Compare measured vs calculated - identify excess loss",
      "Clean connectors starting at ONT, work back to OLT",
      "Check drop cable routing for tight bends",
      "Verify splitter ratio matches design",
      "Check OLT Tx power in DOM readings",
      "Run OTDR from FDH to locate loss points",
    ],
    tools: ["Power meter", "OTDR", "400x scope", "Cleaning kit"],
    ponSpecs: {
      acceptable: { min: -25, max: -8, unit: "dBm" },
      marginal: { min: -27, max: -25, unit: "dBm" },
      fail: { below: -28, unit: "dBm" }
    }
  },
  high_olt_rx: {
    diagnosis: true,
    title: "Weak Upstream (High OLT Rx Loss)",
    severity: "high",
    icon: AlertTriangle,
    causes: [
      "ONT transmitter degraded",
      "Dirty connector at ONT output",
      "Upstream wavelength (1310nm) more sensitive to bends",
      "APC connector contamination",
      "ONT Tx power out of spec",
    ],
    actions: [
      "Check OLT Rx power for this ONT (-8 to -28 dBm acceptable)",
      "Compare ONT Tx power (should be +0.5 to +5 dBm)",
      "Clean ONT SC/APC connector carefully",
      "1310nm upstream is more affected by macrobends than 1490nm downstream",
      "Check for tight bends in drop cable",
      "If ONT Tx low, replace ONT",
      "Verify return loss at connectors (<-60 dB for APC)",
    ],
    tools: ["Power meter @ 1310nm", "400x scope", "OLT NMS/CLI"],
    ponSpecs: {
      ontTx: { min: 0.5, max: 5, unit: "dBm" },
      oltRx: { min: -28, max: -8, unit: "dBm" }
    }
  },
  ont_unstable: {
    diagnosis: true,
    title: "ONT Rebooting / Unstable",
    severity: "warning",
    icon: RefreshCw,
    causes: [
      "Marginal optical power (near sensitivity limit)",
      "Power supply issue at ONT",
      "Optical power fluctuating",
      "OLT port issue",
      "Firmware bug on ONT",
      "Overheating ONT",
    ],
    actions: [
      "Check ONT Rx power - if near -27 to -28 dBm, link is marginal",
      "Monitor power over time for fluctuations",
      "Verify ONT power supply voltage",
      "Check for physical damage or overheating",
      "Try different OLT port if available",
      "Update ONT firmware to latest version",
      "Check for pattern (time of day, temperature)",
      "Ensure adequate ONT ventilation",
    ],
    tools: ["Power meter", "Multimeter", "Temperature monitor", "OLT logs"]
  },
  pon_performance: {
    diagnosis: true,
    title: "Slow Speeds / Packet Loss",
    severity: "moderate",
    icon: Radio,
    causes: [
      "High BER due to marginal optical power",
      "OLT port oversubscription",
      "QoS misconfiguration",
      "Ethernet issue (not fiber)",
      "ONT Ethernet port issue",
      "RF interference (if RF overlay)",
    ],
    actions: [
      "Verify optical power is in acceptable range",
      "Check OLT for FEC corrected/uncorrected errors",
      "Look for GEM/HEC errors on OLT",
      "Check bandwidth allocation on OLT (DBA settings)",
      "Test with direct Ethernet connection to ONT",
      "Try different ONT Ethernet port",
      "Check for packet loss at each hop",
      "Verify customer speed tier configuration",
    ],
    tools: ["OLT CLI/NMS", "Speed test", "Packet capture"],
    ponSpecs: {
      fecCorrected: "Some is normal",
      fecUncorrected: "Should be zero",
      gemErrors: "Should be zero"
    }
  },
  multi_ont: {
    diagnosis: true,
    title: "Multiple ONTs Affected",
    severity: "critical",
    icon: AlertTriangle,
    causes: [
      "OLT port/card failure",
      "Upstream fiber issue (before splitter)",
      "Splitter failure",
      "FDH/cabinet issue",
      "OLT software/config issue",
      "Power outage in area",
    ],
    actions: [
      "Identify common point: same OLT port? Same splitter? Same FDH?",
      "Check OLT port status and alarms",
      "Measure power at splitter input",
      "If splitter input OK but outputs not, splitter failed",
      "Check for fiber cut between OLT and splitter",
      "Verify OLT port didn't get disabled",
      "Check for area power outage affecting ONTs",
      "Run OTDR from OLT to splitter",
    ],
    tools: ["OLT NMS/CLI", "Power meter", "OTDR", "VFL"],
    diagram: "OLT → Feeder fiber → Splitter → Distribution → NAPs → Drops → ONTs"
  },
};

export default function FiberDoctor() {
  const [currentNode, setCurrentNode] = useState('start');
  const [history, setHistory] = useState([]);

  const node = DIAGNOSTIC_TREE[currentNode];

  const goTo = (nextNode) => {
    setHistory([...history, currentNode]);
    setCurrentNode(nextNode);
  };

  const goBack = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const previous = newHistory.pop();
      setHistory(newHistory);
      setCurrentNode(previous);
    }
  };

  const restart = () => {
    setHistory([]);
    setCurrentNode('start');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'warning': return 'bg-amber-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-black';
      case 'info': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50 dark:bg-red-900/20 hover:bg-red-100';
      case 'high': return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100';
      case 'warning': return 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100';
      case 'moderate': return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100';
      case 'info': return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100';
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Fiber Doctor</h2>
            <p className="text-sm text-gray-500">Interactive troubleshooting guide</p>
          </div>
        </div>
        {history.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" size="sm" onClick={restart}>
              Restart
            </Button>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {history.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Step {history.length + 1}</span>
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all"
              style={{ width: `${Math.min((history.length + 1) * 25, 100)}%` }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentNode}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {node.diagnosis ? (
            // Diagnosis result
            <Card className="border-0 shadow-xl">
              <CardHeader className={`${getSeverityColor(node.severity)} rounded-t-lg`}>
                <div className="flex items-center gap-3">
                  {node.icon && <node.icon className="h-6 w-6" />}
                  <div>
                    <Badge variant="secondary" className="mb-2 bg-white/20 text-white">
                      Diagnosis
                    </Badge>
                    <CardTitle className="text-white text-xl">{node.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Probable Causes */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Probable Causes
                  </h4>
                  <ul className="space-y-2">
                    {node.causes.map((cause, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Actions */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-blue-500" />
                    Recommended Actions
                  </h4>
                  <ol className="space-y-2">
                    {node.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Required Tools */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-emerald-500" />
                    Tools Needed
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {node.tools.map((tool, i) => (
                      <Badge key={i} variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* PON Specifications */}
                {node.ponSpecs && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-indigo-500" />
                      PON Reference Values
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {node.ponSpecs.acceptable && (
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                          <div className="font-medium text-emerald-700 dark:text-emerald-300">Acceptable</div>
                          <div className="font-mono">{node.ponSpecs.acceptable.min} to {node.ponSpecs.acceptable.max} {node.ponSpecs.acceptable.unit}</div>
                        </div>
                      )}
                      {node.ponSpecs.marginal && (
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                          <div className="font-medium text-amber-700 dark:text-amber-300">Marginal</div>
                          <div className="font-mono">{node.ponSpecs.marginal.min} to {node.ponSpecs.marginal.max} {node.ponSpecs.marginal.unit}</div>
                        </div>
                      )}
                      {node.ponSpecs.ontTx && (
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <div className="font-medium text-blue-700 dark:text-blue-300">ONT Tx Power</div>
                          <div className="font-mono">+{node.ponSpecs.ontTx.min} to +{node.ponSpecs.ontTx.max} {node.ponSpecs.ontTx.unit}</div>
                        </div>
                      )}
                      {node.ponSpecs.oltRx && (
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                          <div className="font-medium text-purple-700 dark:text-purple-300">OLT Rx Range</div>
                          <div className="font-mono">{node.ponSpecs.oltRx.min} to {node.ponSpecs.oltRx.max} {node.ponSpecs.oltRx.unit}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Network Diagram */}
                {node.diagram && (
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Cable className="h-4 w-4 text-gray-500" />
                      Network Path
                    </h4>
                    <div className="text-sm font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {node.diagram}
                    </div>
                  </div>
                )}

                {/* Reference Images */}
                {node.images && node.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Image className="h-4 w-4 text-purple-500" />
                      Reference Images
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {node.images.map((img, i) => (
                        <Dialog key={i}>
                          <DialogTrigger asChild>
                            <div 
                              className={`p-2 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                                img.type === 'good' 
                                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' 
                                  : 'border-red-300 bg-red-50 dark:bg-red-900/20'
                              }`}
                            >
                              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center mb-2 overflow-hidden">
                                <img 
                                  src={img.url} 
                                  alt={img.caption} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs mt-1">Image</span></div>`;
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={img.type === 'good' ? 'bg-emerald-500' : 'bg-red-500'}>
                                  {img.type === 'good' ? 'PASS' : 'FAIL'}
                                </Badge>
                                <span className="text-xs text-gray-600 dark:text-gray-400">{img.caption}</span>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Badge className={img.type === 'good' ? 'bg-emerald-500' : 'bg-red-500'}>
                                  {img.type === 'good' ? 'PASS' : 'FAIL'}
                                </Badge>
                                {img.caption}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <img 
                                src={img.url} 
                                alt={img.caption} 
                                className="w-full rounded-lg"
                                onError={(e) => {
                                  e.target.parentElement.innerHTML = '<div class="p-8 text-center text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg">Reference image - view in field documentation</div>';
                                }}
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button variant="outline" onClick={restart}>
                    Start New Diagnosis
                  </Button>
                  <Link to={createPageUrl('Fiber103')}>
                    <Button variant="outline" className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Learn More (103)
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Question node
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  {node.icon && (
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <node.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                  <CardTitle className="text-lg">{node.question}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {node.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => goTo(option.next)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${getSeverityBg(option.severity)}`}
                  >
                    <div className="flex items-center gap-3">
                      {option.icon && <option.icon className="h-5 w-5 text-gray-500" />}
                      <span className="font-medium text-left">{option.label}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}