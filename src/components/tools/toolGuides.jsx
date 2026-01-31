// Tool guide configurations for interactive walkthroughs

export const TOOL_GUIDES = {
  lossBudget: {
    title: "Loss Budget Calculator Guide",
    purpose: "Calculate the total optical loss budget for fiber optic links to ensure signal integrity and verify installation quality. This tool helps determine if your fiber link will meet performance requirements.",
    useCases: [
      "Pre-installation planning to determine maximum allowable link length",
      "Post-installation verification to confirm loss within specifications",
      "Troubleshooting high-loss issues by identifying loss sources",
      "Compliance verification against TIA/ISO standards"
    ],
    steps: [
      {
        title: "Select Fiber Type & Wavelength",
        description: "Choose the fiber type (Single-mode or Multimode) and operating wavelength. Single-mode fiber typically operates at 1310nm or 1550nm, while multimode uses 850nm or 1300nm.",
        tips: "For long-distance links (>2km), use single-mode fiber at 1550nm for lowest attenuation.",
        commonMistakes: "Mixing fiber types or using incorrect wavelength for your equipment can result in inaccurate calculations."
      },
      {
        title: "Enter Link Distance",
        description: "Input the total fiber length in kilometers or feet. This is the physical distance the light travels through the fiber cable.",
        tips: "Always add 10-15% extra length for slack, routing, and patch panels.",
        commonMistakes: "Forgetting to account for building risers, slack loops, and patch panel connections can lead to underestimating actual fiber length."
      },
      {
        title: "Count Connectors & Splices",
        description: "Enter the number of mated connector pairs and fusion/mechanical splices in your link. Each connection point introduces loss.",
        tips: "A typical patch panel has 2 connector pairs (4 connectors total). Count carefully to avoid errors.",
        commonMistakes: "Counting individual connectors instead of mated pairs (e.g., 6 connectors = 3 pairs)."
      },
      {
        title: "Review Calculated Loss Budget",
        description: "The tool displays total calculated loss, including fiber attenuation, connector loss, and splice loss. Compare against your equipment's loss budget.",
        tips: "Add a 3dB safety margin for aging, repairs, and future splices.",
        commonMistakes: "Using the calculated loss without considering equipment power budget and receiver sensitivity."
      }
    ],
    exampleScenario: {
      description: "A 5km single-mode fiber link with 4 connector pairs and 2 fusion splices at 1310nm wavelength",
      inputs: {
        "Fiber Type": "Single-mode (OS2)",
        "Wavelength": "1310nm",
        "Distance": "5 km",
        "Connector Pairs": "4",
        "Fusion Splices": "2"
      }
    },
    fieldReference: [
      {
        name: "Fiber Type",
        description: "The category of optical fiber being used. Single-mode for long distances, multimode for short distances.",
        required: true,
        example: "OS2 Single-mode, OM3 Multimode"
      },
      {
        name: "Wavelength",
        description: "The operating wavelength of the optical signal in nanometers. Different wavelengths have different attenuation characteristics.",
        required: true,
        example: "1310nm, 1550nm"
      },
      {
        name: "Distance",
        description: "Total length of fiber optic cable in the link. Include all routing, risers, and slack.",
        required: true,
        example: "5.2 km or 17000 ft"
      },
      {
        name: "Connector Pairs",
        description: "Number of mated connector pairs (not individual connectors). Each patch panel typically has 2 pairs.",
        required: true,
        example: "4 pairs (for 2 patch panels)"
      },
      {
        name: "Splices",
        description: "Number of fusion or mechanical splices in the link. Used when joining cable segments.",
        required: false,
        example: "2 fusion splices"
      }
    ]
  },

  otdrAnalysis: {
    title: "OTDR Analysis Guide",
    purpose: "Analyze Optical Time-Domain Reflectometer traces to identify fiber faults, measure distances, calculate splice/connector losses, and verify installation quality.",
    useCases: [
      "Locating fiber breaks, bends, or damage with precise distance measurements",
      "Measuring splice and connector loss for quality assurance",
      "Verifying new installations meet specifications",
      "Documenting fiber plant infrastructure for records"
    ],
    steps: [
      {
        title: "Upload OTDR Trace File",
        description: "Upload your OTDR trace file in SOR (Standard OTDR Record) or other supported formats. Most OTDR equipment can export files in this format.",
        tips: "Ensure your OTDR is set to the correct wavelength and pulse width for your fiber type before capturing traces.",
        commonMistakes: "Uploading traces captured with incorrect settings or from dirty connectors, which can mask real faults."
      },
      {
        title: "Review Detected Events",
        description: "The tool automatically identifies events (splices, connectors, bends, breaks) and displays them with distances and loss values.",
        tips: "Events with high loss (>0.5dB for splices, >0.75dB for connectors) should be investigated.",
        commonMistakes: "Ignoring small losses that accumulate across multiple events, leading to total link loss exceeding budget."
      },
      {
        title: "Identify Anomalies",
        description: "Look for unexpected events, high-loss points, or reflective events that indicate potential problems like dirty connectors or damaged fiber.",
        tips: "Reflective peaks usually indicate connectors or breaks. Non-reflective loss indicates bends or splices.",
        commonMistakes: "Confusing ghost events (artifacts from strong reflections) with real faults."
      },
      {
        title: "Generate Documentation",
        description: "Export a detailed report with trace images, event tables, and analysis results for compliance documentation and future reference.",
        tips: "Always document both directions (A-to-B and B-to-A) for complete link characterization.",
        commonMistakes: "Testing only one direction, missing asymmetric losses or one-way faults."
      }
    ],
    exampleScenario: {
      description: "Analyzing a 10km fiber link with 3 splices and 2 patch panels to verify post-installation quality",
      inputs: {
        "Trace File": "link_A_to_B_1310nm.sor",
        "Expected Events": "3 splices, 4 connectors",
        "Acceptance Criteria": "Splice loss <0.1dB, Connector loss <0.5dB"
      }
    },
    fieldReference: [
      {
        name: "Trace File",
        description: "OTDR trace file in SOR or compatible format containing backscatter data from fiber testing.",
        required: true,
        example: "fiber_link_1310nm.sor"
      },
      {
        name: "Wavelength",
        description: "The wavelength used during OTDR testing. Must match the trace file.",
        required: true,
        example: "1310nm or 1550nm"
      },
      {
        name: "IOR (Index of Refraction)",
        description: "The refractive index of the fiber core, typically 1.4677 for single-mode fiber. Used for accurate distance measurements.",
        required: false,
        example: "1.4677"
      }
    ]
  },

  fiberDoctor: {
    title: "Fiber Doctor Troubleshooting Guide",
    purpose: "Interactive diagnostic tool that guides you through systematic troubleshooting of common fiber optic problems using a decision-tree approach.",
    useCases: [
      "Diagnosing no-link or intermittent connectivity issues",
      "Troubleshooting high optical loss problems",
      "Resolving power meter reading discrepancies",
      "Step-by-step fault isolation for field technicians"
    ],
    steps: [
      {
        title: "Select Primary Symptom",
        description: "Choose the main issue you're experiencing from the list of common problems (no light, high loss, intermittent, etc.).",
        tips: "Start with the most obvious symptom. The tool will guide you through related issues.",
        commonMistakes: "Selecting multiple symptoms at once. Focus on the primary issue first."
      },
      {
        title: "Answer Diagnostic Questions",
        description: "The tool presents targeted questions about your setup and observations. Answer accurately based on your actual measurements and visual inspections.",
        tips: "Use proper test equipment (power meter, visual fault locator) to answer questions objectively.",
        commonMistakes: "Guessing or assuming without actually testing. This leads to incorrect diagnostic paths."
      },
      {
        title: "Follow Recommended Actions",
        description: "Based on your answers, the tool provides specific troubleshooting steps ranked by likelihood and ease of implementation.",
        tips: "Document each action and its result. This helps if you need to escalate to engineering support.",
        commonMistakes: "Skipping 'obvious' steps like connector cleaning. These solve 70% of field issues."
      },
      {
        title: "Test After Each Fix",
        description: "After implementing each recommended action, retest the link to verify the issue is resolved before proceeding to the next step.",
        tips: "Always clean connectors before any testing to establish a known-good baseline.",
        commonMistakes: "Making multiple changes at once, making it impossible to identify which action fixed the problem."
      }
    ],
    exampleScenario: {
      description: "Troubleshooting a 'No Light Detected' issue on a recently installed fiber link",
      inputs: {
        "Symptom": "No light/signal",
        "Link Type": "Single-mode, 2km",
        "Visual Fault Locator": "Red light visible at far end",
        "Power Meter Reading": "No power detected"
      }
    },
    fieldReference: [
      {
        name: "Symptom Category",
        description: "The primary issue affecting the fiber link. Choose the most accurate description of what you're experiencing.",
        required: true,
        example: "No signal, High loss, Intermittent"
      },
      {
        name: "Link Configuration",
        description: "Basic information about the fiber link including type, length, and number of connection points.",
        required: true,
        example: "Single-mode, 5km, 2 patch panels"
      },
      {
        name: "Test Equipment Used",
        description: "List of test equipment available and used for diagnosis. More tools enable more accurate troubleshooting.",
        required: false,
        example: "Power meter, VFL, OTDR"
      }
    ]
  },

  ponPM: {
    title: "PON PM Analysis Guide",
    purpose: "Analyze Passive Optical Network (PON) performance data to identify ONTs with signal quality issues, track trends, and optimize network health.",
    useCases: [
      "Identifying ONTs with weak optical signals before they fail",
      "Detecting splitter or feeder fiber degradation",
      "Comparing ONT performance across different OLT ports",
      "Preventive maintenance planning based on performance trends"
    ],
    steps: [
      {
        title: "Upload PON PM Report",
        description: "Import your PON performance management report (CSV format) exported from your OLT management system.",
        tips: "Export reports during normal operating hours for representative data. Avoid times with high temperature variations.",
        commonMistakes: "Uploading reports with incomplete data or from OLTs with known issues, skewing the analysis."
      },
      {
        title: "Review Health Statistics",
        description: "The tool provides overview statistics: total ONTs, critical/warning/healthy counts, average power levels, and error rates.",
        tips: "Focus on trends over time rather than single measurements. A gradual decline indicates progressive issues.",
        commonMistakes: "Reacting to single outlier readings instead of identifying systemic patterns."
      },
      {
        title: "Investigate Critical ONTs",
        description: "Drill down into ONTs flagged as critical (low Rx power, high errors). Check their physical location and service history.",
        tips: "ONTs with Rx power below -28dBm (GPON) or -30dBm (XGS-PON) need immediate attention.",
        commonMistakes: "Focusing only on power levels without checking error rates (BIP, FEC). Both indicate different problems."
      },
      {
        title: "Track Performance Trends",
        description: "Use historical comparison to identify degrading fibers, splitters, or OLT ports before they cause service outages.",
        tips: "A 3dB power drop over weeks/months indicates fiber degradation or connector contamination.",
        commonMistakes: "Not establishing baseline measurements after installation, making trend analysis impossible."
      }
    ],
    exampleScenario: {
      description: "Analyzing a PON PM report with 128 ONTs to identify those needing preventive maintenance",
      inputs: {
        "Report File": "olt_copake_2026-01-31.csv",
        "Total ONTs": "128",
        "Warning Threshold": "-27dBm",
        "Critical Threshold": "-28dBm"
      }
    },
    fieldReference: [
      {
        name: "Report File (CSV)",
        description: "PON performance data exported from OLT in CSV format, including ONT serial, power levels, and error counters.",
        required: true,
        example: "olt_export_2026-01-31.csv"
      },
      {
        name: "Warning Threshold",
        description: "Receive power level (in dBm) below which an ONT is flagged for monitoring. Typically -27dBm for GPON.",
        required: false,
        example: "-27 dBm"
      },
      {
        name: "Critical Threshold",
        description: "Receive power level (in dBm) below which an ONT requires immediate attention. Typically -28dBm for GPON.",
        required: false,
        example: "-28 dBm"
      }
    ]
  },

  referenceTables: {
    title: "Reference Tables Guide",
    purpose: "Quick access to industry-standard specifications, loss values, wavelengths, and technical parameters for fiber optic systems.",
    useCases: [
      "Looking up TIA/ISO standard values during installations",
      "Comparing measured values against acceptable limits",
      "Finding connector and splice loss specifications",
      "Reference during certification and compliance testing"
    ],
    steps: [
      {
        title: "Select Reference Category",
        description: "Choose the type of information you need: fiber specifications, connector loss, splice loss, wavelengths, or standards.",
        tips: "Use the search function to quickly find specific parameters across all tables.",
        commonMistakes: "Using outdated standards. Always verify you're referencing current TIA-568 or ISO/IEC standards."
      },
      {
        title: "Find Your Parameter",
        description: "Browse or search for the specific value you need. Tables include typical, maximum, and standard values.",
        tips: "Note the difference between 'typical' and 'maximum' values. Use maximum for worst-case calculations.",
        commonMistakes: "Using multimode values for single-mode calculations or vice versa."
      },
      {
        title: "Apply to Your Scenario",
        description: "Use the reference values in your calculations, documentation, or acceptance criteria.",
        tips: "Bookmark frequently used tables for quick access during field work.",
        commonMistakes: "Not accounting for temperature, wavelength, or fiber grade variations."
      }
    ],
    exampleScenario: {
      description: "Looking up acceptable splice loss for quality assurance during a fusion splicing project",
      inputs: {
        "Category": "Splice Loss",
        "Fiber Type": "Single-mode OS2",
        "Splice Method": "Fusion"
      }
    },
    fieldReference: [
      {
        name: "Search Query",
        description: "Keywords to find specific parameters or standards across all reference tables.",
        required: false,
        example: "connector loss, attenuation, wavelength"
      }
    ]
  }
};

// Get guide by tool ID
export function getToolGuide(toolId) {
  return TOOL_GUIDES[toolId] || null;
}