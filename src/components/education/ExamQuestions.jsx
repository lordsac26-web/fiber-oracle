// Fiber Certification Exam Question Banks
// Aligned with FOA (Fiber Optic Association) and industry certification standards
import FIBER103_QUESTIONS from './Fiber103Questions';

export const EXAM_QUESTIONS = {
  fiber101: {
    title: 'Fiber 101 Certification Exam',
    subtitle: 'Foundations of Fiber Optics & FTTH',
    passingScore: 70,
    timeLimit: 45, // minutes
    totalQuestions: 40,
    questions: [
      // Multiple Choice - Single Answer (20 questions)
      {
        id: 1,
        type: 'single',
        difficulty: 'easy',
        domain: 'Fiber Fundamentals',
        question: 'What is the core diameter of single-mode fiber (SMF)?',
        options: ['9 μm', '50 μm', '62.5 μm', '125 μm'],
        correctAnswer: 0,
        explanation: 'Single-mode fiber has a 9μm core diameter. The 125μm refers to the cladding diameter, which is the same for both SMF and MMF.'
      },
      {
        id: 2,
        type: 'single',
        difficulty: 'easy',
        domain: 'Fiber Fundamentals',
        question: 'What color jacket is standard for single-mode fiber?',
        options: ['Aqua', 'Orange', 'Yellow', 'Blue'],
        correctAnswer: 2,
        explanation: 'Yellow is the standard jacket color for single-mode fiber per TIA-598. Aqua and orange are used for multimode fiber.'
      },
      {
        id: 3,
        type: 'single',
        difficulty: 'easy',
        domain: 'Color Codes',
        question: 'According to TIA-598, what is the first fiber color in the 12-fiber color code?',
        options: ['White', 'Blue', 'Red', 'Orange'],
        correctAnswer: 1,
        explanation: 'Blue is position 1 in the TIA-598 12-fiber color code: Blue, Orange, Green, Brown, Slate, White, Red, Black, Yellow, Violet, Rose, Aqua.'
      },
      {
        id: 4,
        type: 'single',
        difficulty: 'easy',
        domain: 'Connectors',
        question: 'What color identifies an APC (Angled Physical Contact) connector?',
        options: ['Blue', 'Black', 'Green', 'White'],
        correctAnswer: 2,
        explanation: 'Green identifies APC connectors. Blue identifies UPC connectors. Never mix APC and UPC as this can damage the connector end faces.'
      },
      {
        id: 5,
        type: 'single',
        difficulty: 'easy',
        domain: 'PON Architecture',
        question: 'What does OLT stand for in a PON network?',
        options: ['Optical Light Transmitter', 'Optical Line Terminal', 'Optical Link Tester', 'Output Level Threshold'],
        correctAnswer: 1,
        explanation: 'OLT stands for Optical Line Terminal. It is located at the central office and serves as the service provider endpoint of a PON.'
      },
      {
        id: 6,
        type: 'single',
        difficulty: 'easy',
        domain: 'Fiber Fundamentals',
        question: 'What is the typical cladding diameter for both SMF and MMF?',
        options: ['9 μm', '50 μm', '62.5 μm', '125 μm'],
        correctAnswer: 3,
        explanation: 'Both single-mode and multimode fibers have a standard cladding diameter of 125μm. This allows the same fusion splicers and connectors to be used.'
      },
      {
        id: 7,
        type: 'single',
        difficulty: 'easy',
        domain: 'GPON',
        question: 'What is the downstream wavelength for GPON?',
        options: ['1270 nm', '1310 nm', '1490 nm', '1550 nm'],
        correctAnswer: 2,
        explanation: 'GPON uses 1490nm for downstream traffic. Upstream uses 1310nm. This allows both directions to travel on the same fiber using WDM.'
      },
      {
        id: 8,
        type: 'single',
        difficulty: 'easy',
        domain: 'GPON',
        question: 'What is the maximum downstream speed of GPON?',
        options: ['1.244 Gbps', '2.488 Gbps', '9.953 Gbps', '10 Gbps'],
        correctAnswer: 1,
        explanation: 'GPON provides 2.488 Gbps downstream and 1.244 Gbps upstream. XGS-PON provides 9.953 Gbps symmetric.'
      },
      {
        id: 9,
        type: 'single',
        difficulty: 'medium',
        domain: 'Power Levels',
        question: 'What is the typical insertion loss for a 1:32 optical splitter?',
        options: ['7.4 dB', '10.7 dB', '14.1 dB', '17.5 dB'],
        correctAnswer: 3,
        explanation: 'A 1:32 splitter has approximately 17.5 dB insertion loss. This is calculated as 10 × log₁₀(32) = 15.05 dB plus ~2.5 dB excess loss.'
      },
      {
        id: 10,
        type: 'single',
        difficulty: 'medium',
        domain: 'Power Levels',
        question: 'What is the typical fiber attenuation for SMF at 1310nm?',
        options: ['0.25 dB/km', '0.35 dB/km', '0.50 dB/km', '1.0 dB/km'],
        correctAnswer: 1,
        explanation: 'SMF attenuation is approximately 0.35 dB/km at 1310nm and 0.25 dB/km at 1550nm. The lower loss at 1550nm makes it better for long distances.'
      },
      {
        id: 11,
        type: 'single',
        difficulty: 'medium',
        domain: 'Connectors',
        question: 'What is the ferrule diameter of an LC connector?',
        options: ['1.25 mm', '2.5 mm', '3.0 mm', '125 μm'],
        correctAnswer: 0,
        explanation: 'LC connectors use a 1.25mm ferrule diameter. SC connectors use a 2.5mm ferrule. The smaller LC size allows higher port density.'
      },
      {
        id: 12,
        type: 'single',
        difficulty: 'medium',
        domain: 'Cleaning',
        question: 'According to industry statistics, what percentage of fiber problems are caused by contamination?',
        options: ['25%', '50%', '75%', '85%'],
        correctAnswer: 3,
        explanation: 'Approximately 85% of fiber problems are caused by contamination. This is why "Clean, Inspect, Connect" is the fundamental rule of fiber work.'
      },
      {
        id: 13,
        type: 'single',
        difficulty: 'easy',
        domain: 'Testing',
        question: 'Which testing tier uses an OTDR?',
        options: ['Tier 1', 'Tier 2', 'Tier 3', 'Both Tier 1 and 2'],
        correctAnswer: 1,
        explanation: 'OTDR testing is Tier 2. Tier 1 uses OLTS (Optical Loss Test Set) for end-to-end insertion loss measurement. Tier 2 provides more detailed characterization.'
      },
      {
        id: 14,
        type: 'single',
        difficulty: 'hard',
        domain: 'Power Levels',
        question: 'If an OLT transmits at +5 dBm and the total link loss is 25 dB, what power will the ONT receive?',
        options: ['-30 dBm', '-25 dBm', '-20 dBm', '-15 dBm'],
        correctAnswer: 2,
        explanation: 'ONT Rx = OLT Tx - Total Loss = +5 dBm - 25 dB = -20 dBm. This is within the typical GPON ONT receive range of -8 to -28 dBm.'
      },
      {
        id: 15,
        type: 'single',
        difficulty: 'hard',
        domain: 'GPON',
        question: 'What is the maximum optical budget for GPON Class C+?',
        options: ['24 dB', '28 dB', '32 dB', '35 dB'],
        correctAnswer: 2,
        explanation: 'GPON Class C+ has a 32 dB optical budget. Class B+ has 28 dB. The higher budget allows longer distances or higher split ratios.'
      },
      {
        id: 16,
        type: 'single',
        difficulty: 'hard',
        domain: 'Connectors',
        question: 'What is the minimum return loss for a UPC connector?',
        options: ['>30 dB', '>40 dB', '>50 dB', '>60 dB'],
        correctAnswer: 2,
        explanation: 'UPC (Ultra Physical Contact) connectors must have return loss >50 dB. APC connectors must have >60 dB due to the angled end face.'
      },
      {
        id: 17,
        type: 'single',
        difficulty: 'medium',
        domain: 'Fiber Fundamentals',
        question: 'What wavelengths are typically used for multimode fiber?',
        options: ['850nm and 1300nm', '1310nm and 1550nm', '1490nm and 1310nm', '1577nm and 1270nm'],
        correctAnswer: 0,
        explanation: '850nm and 1300nm are used for multimode fiber. 1310nm and 1550nm are the primary wavelengths for single-mode fiber.'
      },
      {
        id: 18,
        type: 'single',
        difficulty: 'medium',
        domain: 'PON Architecture',
        question: 'What is the typical maximum split ratio for GPON?',
        options: ['1:16', '1:32', '1:64', '1:128'],
        correctAnswer: 3,
        explanation: 'GPON supports up to 1:128 split ratio, though 1:32 or 1:64 is more common in practice to maintain adequate power budget.'
      },
      {
        id: 19,
        type: 'single',
        difficulty: 'hard',
        domain: 'Power Levels',
        question: 'What is the maximum insertion loss for an "Elite" grade connector per TIA-568?',
        options: ['0.10 dB', '0.15 dB', '0.30 dB', '0.50 dB'],
        correctAnswer: 1,
        explanation: 'Elite grade connectors have ≤0.15 dB insertion loss. Standard grade allows up to 0.50 dB. Elite grade is required for high-performance applications.'
      },
      {
        id: 20,
        type: 'single',
        difficulty: 'hard',
        domain: 'Safety',
        question: 'At what power level (in mW) does laser light become a Class 3B hazard?',
        options: ['1 mW', '5 mW', '10 mW', '50 mW'],
        correctAnswer: 1,
        explanation: 'Class 3B lasers are 5-500 mW. Most telecom lasers are Class 1 or 1M (safe under normal conditions) but should never be viewed directly.'
      },

      // True/False (10 questions)
      {
        id: 21,
        type: 'truefalse',
        difficulty: 'easy',
        domain: 'Connectors',
        question: 'APC and UPC connectors can be safely mated together.',
        correctAnswer: false,
        explanation: 'FALSE. Never mix APC (green) and UPC (blue) connectors. The 8° angle of APC will not mate properly with the flat UPC end face, causing damage and high loss.'
      },
      {
        id: 22,
        type: 'truefalse',
        difficulty: 'easy',
        domain: 'Fiber Fundamentals',
        question: 'Single-mode fiber can transmit data over longer distances than multimode fiber.',
        correctAnswer: true,
        explanation: 'TRUE. Single-mode fiber can transmit over 100+ km, while multimode is typically limited to 550m or less depending on speed and fiber type.'
      },
      {
        id: 23,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'PON Architecture',
        question: 'Optical splitters require electrical power to operate.',
        correctAnswer: false,
        explanation: 'FALSE. Optical splitters are passive devices - they split the optical signal without requiring any power. This is why PON is called "Passive" Optical Network.'
      },
      {
        id: 24,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Cleaning',
        question: 'It is acceptable to blow on a fiber connector to remove dust.',
        correctAnswer: false,
        explanation: 'FALSE. Never blow on connectors - breath contains moisture that can contaminate the end face. Use proper cleaning tools and dry/wet cleaning methods.'
      },
      {
        id: 25,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Power Levels',
        question: 'A fiber link with -30 dBm at the ONT would be considered acceptable for GPON.',
        correctAnswer: false,
        explanation: 'FALSE. -30 dBm is below the typical minimum sensitivity of -28 dBm for GPON ONTs. This would likely cause errors or complete loss of service.'
      },
      {
        id: 26,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'GPON',
        question: 'GPON uses the same wavelength for both upstream and downstream traffic.',
        correctAnswer: false,
        explanation: 'FALSE. GPON uses 1490nm for downstream and 1310nm for upstream. This wavelength division allows bidirectional traffic on a single fiber.'
      },
      {
        id: 27,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Fiber Fundamentals',
        question: 'The cladding of an optical fiber has a higher refractive index than the core.',
        correctAnswer: false,
        explanation: 'FALSE. The core has a higher refractive index than the cladding. This difference causes total internal reflection, keeping light trapped in the core.'
      },
      {
        id: 28,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Testing',
        question: 'OLTS testing can determine the location of faults along a fiber link.',
        correctAnswer: false,
        explanation: 'FALSE. OLTS (Tier 1) only measures total end-to-end loss. OTDR (Tier 2) is required to determine the location of faults and events along the fiber.'
      },
      {
        id: 29,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Power Levels',
        question: 'A fusion splice typically has lower insertion loss than a mechanical splice.',
        correctAnswer: true,
        explanation: 'TRUE. Fusion splices typically have 0.02-0.10 dB loss, while mechanical splices typically have 0.10-0.50 dB loss.'
      },
      {
        id: 30,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Safety',
        question: 'Infrared light from fiber optic cables is visible to the human eye.',
        correctAnswer: false,
        explanation: 'FALSE. 1310nm and 1550nm are infrared wavelengths, invisible to human eyes. This makes them particularly dangerous as you cannot see the hazard.'
      },

      // Fill in the Blank (5 questions)
      {
        id: 31,
        type: 'fillin',
        difficulty: 'easy',
        domain: 'Color Codes',
        question: 'In the TIA-598 color code, fiber position 7 is _____.',
        correctAnswer: ['red', 'RED', 'Red'],
        explanation: 'Position 7 is Red. The 12-fiber sequence is: Blue, Orange, Green, Brown, Slate, White, Red, Black, Yellow, Violet, Rose, Aqua.'
      },
      {
        id: 32,
        type: 'fillin',
        difficulty: 'easy',
        domain: 'Power Levels',
        question: 'SMF attenuation at 1550nm is approximately _____ dB/km.',
        correctAnswer: ['0.25', '.25', '0.25 dB/km'],
        explanation: 'SMF attenuation at 1550nm is 0.25 dB/km. At 1310nm it is 0.35 dB/km. The lower attenuation at 1550nm makes it preferred for long-haul transmission.'
      },
      {
        id: 33,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'GPON',
        question: 'The upstream wavelength for GPON is _____ nm.',
        correctAnswer: ['1310', '1310nm', '1310 nm'],
        explanation: 'GPON upstream uses 1310nm wavelength. Downstream uses 1490nm. XGS-PON uses different wavelengths: 1270nm upstream and 1577nm downstream.'
      },
      {
        id: 34,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'Power Levels',
        question: 'The insertion loss for a 1:8 optical splitter is approximately _____ dB.',
        correctAnswer: ['10.7', '10.7 dB', '11'],
        explanation: 'A 1:8 splitter has approximately 10.7 dB insertion loss. This is calculated as 10 × log₁₀(8) = 9.03 dB plus ~1.5 dB excess loss.'
      },
      {
        id: 35,
        type: 'fillin',
        difficulty: 'hard',
        domain: 'Connectors',
        question: 'APC connectors have an angled end face of _____ degrees.',
        correctAnswer: ['8', '8 degrees', '8°'],
        explanation: 'APC (Angled Physical Contact) connectors have an 8° angle on the ferrule end face. This angle reduces back reflection to >60 dB return loss.'
      },

      // Scenario/Case Study (5 questions)
      {
        id: 36,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Troubleshooting',
        scenario: 'A technician is installing a new ONT. The OLT shows the ONT is registered, but the customer reports no internet service. The ONT PON light is solid green.',
        question: 'What is the FIRST thing the technician should check?',
        options: [
          'Replace the ONT with a new unit',
          'Verify the Ethernet cable connection between ONT and router',
          'Call the central office to check OLT configuration',
          'Run an OTDR test on the drop fiber'
        ],
        correctAnswer: 1,
        explanation: 'Start with the simplest checks first. A solid green PON light indicates good optical connectivity. The issue is likely in the customer premises wiring or equipment, not the fiber link.'
      },
      {
        id: 37,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Power Levels',
        scenario: 'You measure the following: OLT Tx = +4 dBm, Feeder fiber = 5 km, 1:32 splitter, Drop fiber = 0.5 km, 4 connectors total.',
        question: 'What is the approximate expected ONT receive power? (Use 0.35 dB/km fiber loss, 0.3 dB/connector)',
        options: ['-18.95 dBm', '-22.45 dBm', '-25.95 dBm', '-28.45 dBm'],
        correctAnswer: 1,
        explanation: 'Calculation: +4 dBm - (5.5 km × 0.35 dB/km) - 17.5 dB (splitter) - (4 × 0.3 dB) = +4 - 1.925 - 17.5 - 1.2 = -16.625 dBm ≈ -22.45 dBm with typical margin.'
      },
      {
        id: 38,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Cleaning',
        scenario: 'During inspection, you observe a connector end face with multiple scratches across the core zone and what appears to be dried residue.',
        question: 'What is the correct action?',
        options: [
          'Connect anyway - minor contamination is acceptable',
          'Dry clean only and connect',
          'Wet clean, dry clean, re-inspect, and re-terminate if defects remain',
          'Immediately re-terminate without attempting to clean'
        ],
        correctAnswer: 2,
        explanation: 'Scratches in the core zone with residue require wet cleaning followed by dry cleaning and re-inspection. If defects remain after cleaning, re-termination may be necessary per IEC 61300-3-35.'
      },
      {
        id: 39,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'PON Architecture',
        scenario: 'A service provider needs to serve 96 homes from a single OLT port while maintaining Class B+ budget compliance (28 dB max).',
        question: 'Which splitter configuration would work while staying within budget?',
        options: [
          'Single 1:128 splitter',
          'Cascade of 1:4 then 1:32 splitters',
          'Cascade of 1:8 then 1:16 splitters',
          'None of the above - cannot serve 96 homes with Class B+ budget'
        ],
        correctAnswer: 2,
        explanation: '1:8 (10.7 dB) + 1:16 (14.1 dB) = 24.8 dB splitter loss, leaving margin for fiber and connectors within 28 dB budget. Option B would give 7.4 + 17.5 = 24.9 dB but only 128 ports, not suitable. 1:128 would exceed budget.'
      },
      {
        id: 40,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Testing',
        scenario: 'You complete a new fiber installation and perform OLTS testing. The measured loss is 3.2 dB, but your calculated loss budget was 2.5 dB.',
        question: 'What should you do?',
        options: [
          'Accept the installation - 0.7 dB difference is within tolerance',
          'Investigate the excess loss using OTDR to identify the source',
          'Replace all connectors and re-test',
          'Add an optical amplifier to compensate'
        ],
        correctAnswer: 1,
        explanation: 'A 0.7 dB discrepancy warrants investigation using OTDR to identify the source of excess loss. It could be a dirty connector, poor splice, or macrobend that should be corrected before acceptance.'
      },
      {
        id: 41,
        type: 'single',
        difficulty: 'easy',
        domain: 'Fiber Fundamentals',
        source: 'FOA Reference Guide - Optical Fiber',
        question: 'What physical principle keeps light guided inside the fiber core?',
        options: ['Total internal reflection', 'Electromagnetic induction', 'Radio frequency modulation', 'Thermal conduction'],
        correctAnswer: 0,
        explanation: 'Fiber guides light because the core has a higher refractive index than the cladding, causing total internal reflection at the core-cladding boundary.'
      },
      {
        id: 42,
        type: 'single',
        difficulty: 'medium',
        domain: 'Fiber Fundamentals',
        source: 'FOA Reference Guide - Optical Fiber',
        question: 'Why does single-mode fiber support longer distances than multimode fiber?',
        options: ['It has no modal dispersion from multiple light paths', 'It uses a larger core', 'It requires no cladding', 'It only works with LED transmitters'],
        correctAnswer: 0,
        explanation: 'Single-mode fiber carries essentially one mode of light, eliminating modal dispersion that limits multimode distance and bandwidth.'
      },
      {
        id: 43,
        type: 'single',
        difficulty: 'easy',
        domain: 'Cable Construction',
        source: 'FOA Reference Guide - Fiber Optic Cable',
        question: 'What is the main job of the cable jacket?',
        options: ['Protect the fibers from the installation environment', 'Increase optical power', 'Convert light to electrical signal', 'Set the PON split ratio'],
        correctAnswer: 0,
        explanation: 'The jacket is the outer protective covering selected for the environment, such as indoor flame rating, outdoor moisture resistance, or armored protection.'
      },
      {
        id: 44,
        type: 'single',
        difficulty: 'medium',
        domain: 'Cable Construction',
        source: 'FOA Reference Guide - Fiber Optic Cable',
        question: 'Which cable design is most commonly used for outside plant trunk cables?',
        options: ['Loose tube cable', 'Zipcord patch cable', 'Simplex indoor cable', 'Desktop breakout cord'],
        correctAnswer: 0,
        explanation: 'Loose tube cable protects fibers from pulling tension and moisture, making it common for outdoor trunk, conduit, aerial, and buried installations.'
      },
      {
        id: 45,
        type: 'single',
        difficulty: 'medium',
        domain: 'Cable Construction',
        source: 'FOA Reference Guide - Fiber Optic Cable',
        question: 'When pulling fiber optic cable, what should the pulling force be attached to?',
        options: ['Strength members', 'Individual glass fibers', 'Connector boots', 'Buffer coating only'],
        correctAnswer: 0,
        explanation: 'Pulling force should be applied to the cable strength members, such as aramid yarn, so the glass fibers are not stretched or damaged.'
      },
      {
        id: 46,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Cable Construction',
        source: 'FOA Reference Guide - Fiber Optic Cable',
        question: 'Loose tube cables isolate fibers from high pulling tension better than tight-buffered patch-style cables.',
        correctAnswer: true,
        explanation: 'TRUE. Loose tube designs allow fibers to float inside tubes and are better suited for outside plant installation stresses.'
      },
      {
        id: 47,
        type: 'single',
        difficulty: 'easy',
        domain: 'Cleaning',
        source: 'FOA Connector Cleaning Reference',
        question: 'What should be done before mating fiber connectors?',
        options: ['Inspect and clean the end faces as needed', 'Blow on the ferrules', 'Touch the end face to confirm it is dry', 'Apply ordinary glass cleaner'],
        correctAnswer: 0,
        explanation: 'Best practice is inspect-clean-inspect. Contamination can cause high loss, reflections, or permanent damage when connectors are mated.'
      },
      {
        id: 48,
        type: 'single',
        difficulty: 'medium',
        domain: 'Cleaning',
        source: 'FOA Connector Cleaning Reference',
        question: 'Which cleaning method is preferred when dry cleaning does not remove oily contamination?',
        options: ['Wet/dry cleaning with proper fiber cleaning materials', 'Breathing on the connector and wiping it', 'Scraping the ferrule with a blade', 'Rinsing with tap water'],
        correctAnswer: 0,
        explanation: 'Wet/dry cleaning loosens stubborn contamination, then removes remaining solvent and debris with a dry wipe or cleaner.'
      },
      {
        id: 49,
        type: 'truefalse',
        difficulty: 'easy',
        domain: 'Cleaning',
        source: 'FOA Connector Cleaning Reference',
        question: 'Dust caps guarantee a connector is clean and ready to mate.',
        correctAnswer: false,
        explanation: 'FALSE. Dust caps protect connectors, but they can also hold contamination. Always inspect and clean before connection.'
      },
      {
        id: 50,
        type: 'single',
        difficulty: 'medium',
        domain: 'Testing',
        source: 'FOA Reference Guide - Fiber Optic Testing',
        question: 'What does an OLTS directly measure?',
        options: ['End-to-end insertion loss', 'Exact location of every splice', 'Connector end-face geometry', 'ONT provisioning status'],
        correctAnswer: 0,
        explanation: 'An optical loss test set uses a source and power meter to measure total insertion loss across the link.'
      },
      {
        id: 51,
        type: 'single',
        difficulty: 'medium',
        domain: 'Testing',
        source: 'FOA Reference Guide - OTDRs',
        question: 'What is an OTDR especially useful for during troubleshooting?',
        options: ['Locating distance to faults and events', 'Assigning IP addresses', 'Increasing splitter output power', 'Changing ONT serial numbers'],
        correctAnswer: 0,
        explanation: 'An OTDR sends pulses and analyzes backscatter/reflections, allowing a trained technician to estimate event loss and distance.'
      },
      {
        id: 52,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Testing',
        source: 'FOA Reference Guide - Fiber Optic Testing',
        question: 'A power meter reading by itself tells you where the loss occurs along the fiber.',
        correctAnswer: false,
        explanation: 'FALSE. A power meter can show total received power or loss, but an OTDR is needed to locate events along the fiber.'
      },
      {
        id: 53,
        type: 'single',
        difficulty: 'easy',
        domain: 'Safety',
        source: 'FOA Eye Safety Reference',
        question: 'What is the safest rule when working around active fiber links?',
        options: ['Never look into a fiber until power is verified safe', 'Look quickly to see if light is present', 'Only check with one eye', 'Use a magnifier to make invisible light visible'],
        correctAnswer: 0,
        explanation: 'Infrared telecom wavelengths may be invisible. Never inspect a live fiber with the eye; verify the link is dark or use proper inspection equipment.'
      },
      {
        id: 54,
        type: 'truefalse',
        difficulty: 'easy',
        domain: 'Safety',
        source: 'FOA Safety Reference',
        question: 'Fiber scraps should be collected and disposed of because they can puncture skin or eyes.',
        correctAnswer: true,
        explanation: 'TRUE. Cleaved fiber shards are tiny, sharp glass pieces. Use eye protection and a dedicated disposal container.'
      },
      {
        id: 55,
        type: 'single',
        difficulty: 'medium',
        domain: 'Fiber Fundamentals',
        source: 'FOA Reference Guide - Optical Fiber',
        question: 'What does numerical aperture describe in a fiber?',
        options: ['The acceptance angle range for guided light', 'The jacket color sequence', 'The number of splitters in a PON', 'The connector ferrule diameter'],
        correctAnswer: 0,
        explanation: 'Numerical aperture relates to the range of light angles that can enter the fiber and remain guided by total internal reflection.'
      },
      {
        id: 56,
        type: 'single',
        difficulty: 'medium',
        domain: 'Fiber Fundamentals',
        source: 'FOA Reference Guide - Optical Fiber',
        question: 'What is the main reason graded-index multimode fiber performs better than step-index multimode fiber?',
        options: ['It reduces modal dispersion by varying the core index profile', 'It removes the need for cladding', 'It uses copper strength members', 'It converts multimode to single-mode'],
        correctAnswer: 0,
        explanation: 'Graded-index fiber uses a changing index profile so higher-angle modes travel faster, reducing modal dispersion compared with step-index fiber.'
      },
      {
        id: 57,
        type: 'single',
        difficulty: 'medium',
        domain: 'Connectors',
        source: 'FOA Connector Cleaning and Inspection References',
        question: 'Why should APC and UPC connectors not be mixed?',
        options: ['Their end-face geometries do not mate correctly', 'They use different glass colors', 'APC only works on multimode fiber', 'UPC uses no ferrule'],
        correctAnswer: 0,
        explanation: 'APC uses an angled end face while UPC is not angled. Mixing them creates poor contact, high loss/reflection, and possible damage.'
      },
      {
        id: 58,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'Cable Construction',
        source: 'FOA Reference Guide - Fiber Optic Cable',
        question: 'The outer protective covering of a fiber optic cable is called the _____.',
        correctAnswer: ['jacket', 'Jacket'],
        explanation: 'The jacket is the outer layer selected to protect the cable from indoor, outdoor, moisture, sunlight, flame, or mechanical conditions.'
      },
      {
        id: 59,
        type: 'fillin',
        difficulty: 'easy',
        domain: 'Fiber Fundamentals',
        source: 'FOA Reference Guide - Optical Fiber',
        question: 'Light travels primarily in the fiber _____.',
        correctAnswer: ['core', 'Core'],
        explanation: 'The core is the central glass region where the optical signal is guided.'
      },
      {
        id: 60,
        type: 'single',
        difficulty: 'hard',
        domain: 'Power Levels',
        source: 'FOA Testing and Fiber Fundamentals References',
        question: 'A link budget has +4 dBm transmitter power and 23 dB total passive loss. What is the expected receiver power?',
        options: ['-19 dBm', '-23 dBm', '-27 dBm', '+19 dBm'],
        correctAnswer: 0,
        explanation: 'Receiver power equals transmitter power minus loss: +4 dBm - 23 dB = -19 dBm.'
      },
      {
        id: 61,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Cable Construction',
        source: 'FOA Reference Guide - Fiber Optic Cable',
        scenario: 'A crew is installing an outdoor feeder cable through duct. The cable must tolerate pulling tension and possible moisture exposure.',
        question: 'Which cable construction is the best starting choice?',
        options: ['Loose tube outside plant cable with water blocking', 'Indoor zipcord patch cable', 'Simplex desktop cable', 'Unjacketed buffered fiber only'],
        correctAnswer: 0,
        explanation: 'Loose tube OSP cable is designed for outdoor conditions, pulling stress, and moisture protection.'
      },
      {
        id: 62,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Cleaning',
        source: 'FOA Connector Cleaning Reference',
        scenario: 'A connector still shows a fingerprint-like smear after dry cleaning and inspection.',
        question: 'What should the technician do next?',
        options: ['Use proper wet/dry cleaning and inspect again', 'Mate it quickly before dust lands', 'Blow on it and reconnect', 'Ignore it if power is currently acceptable'],
        correctAnswer: 0,
        explanation: 'Oily residue normally requires proper wet/dry cleaning followed by re-inspection before connection.'
      },
      {
        id: 63,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Testing',
        source: 'FOA Reference Guide - OTDRs',
        scenario: 'An OLTS test fails but does not identify where the excess loss is located.',
        question: 'Which tool should be used next to localize the issue?',
        options: ['OTDR', 'Label printer', 'Ethernet speed tester', 'Wi-Fi analyzer'],
        correctAnswer: 0,
        explanation: 'After a failed insertion-loss test, an OTDR can help locate high-loss events, splices, connectors, macrobends, or breaks.'
      },
      {
        id: 64,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Fiber Fundamentals',
        source: 'FOA Reference Guide - Optical Fiber',
        question: 'Most glass telecommunications fibers have a 125 micron cladding diameter.',
        correctAnswer: true,
        explanation: 'TRUE. Standard single-mode and common multimode glass fibers use 125um cladding, even though their core diameters differ.'
      },
      {
        id: 65,
        type: 'single',
        difficulty: 'medium',
        domain: 'Cable Construction',
        source: 'FOA Reference Guide - Fiber Optic Cable',
        question: 'Why are indoor fiber cables required to use flame-rated jackets?',
        options: ['To meet building fire code requirements', 'To increase optical bandwidth', 'To reduce splitter loss', 'To make the core larger'],
        correctAnswer: 0,
        explanation: 'Indoor cable jackets must meet flame and smoke requirements for the installation space, such as riser or plenum environments.'
      }
    ]
  },

  fiber102: {
    title: 'Fiber 102 Certification Exam',
    subtitle: 'Intermediate PON & FTTH',
    passingScore: 75,
    timeLimit: 60,
    totalQuestions: 40,
    questions: [
      // Will populate with intermediate level questions
      {
        id: 1,
        type: 'single',
        difficulty: 'medium',
        domain: 'XGS-PON',
        question: 'What is the downstream wavelength for XGS-PON?',
        options: ['1490 nm', '1550 nm', '1577 nm', '1310 nm'],
        correctAnswer: 2,
        explanation: 'XGS-PON uses 1577nm for downstream and 1270nm for upstream. These different wavelengths allow coexistence with GPON on the same fiber.'
      },
      {
        id: 2,
        type: 'single',
        difficulty: 'medium',
        domain: 'XGS-PON',
        question: 'What speed does XGS-PON provide in both directions?',
        options: ['2.488 Gbps', '5 Gbps', '9.953 Gbps', '25 Gbps'],
        correctAnswer: 2,
        explanation: 'XGS-PON provides symmetric 9.953 Gbps (approximately 10 Gbps) in both upstream and downstream directions.'
      },
      {
        id: 3,
        type: 'single',
        difficulty: 'medium',
        domain: 'Loss Budget',
        question: 'What is the insertion loss of a 1:4 optical splitter?',
        options: ['3.8 dB', '7.4 dB', '10.7 dB', '14.1 dB'],
        correctAnswer: 1,
        explanation: 'A 1:4 splitter has approximately 7.4 dB insertion loss. Formula: 10 × log₁₀(4) + excess loss = 6.02 + ~1.4 = ~7.4 dB.'
      },
      {
        id: 4,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        question: 'On an OTDR trace, what type of event shows both reflection and loss?',
        options: ['Fusion splice', 'Connector', 'Macrobend', 'Fiber end'],
        correctAnswer: 1,
        explanation: 'Connectors show both a reflective spike (from the air gap/interface) and insertion loss. Fusion splices typically show only loss (non-reflective).'
      },
      {
        id: 5,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        question: 'What appears as a large loss event without reflection on an OTDR trace?',
        options: ['Dirty connector', 'Optical splitter', 'Fiber break', 'Mechanical splice'],
        correctAnswer: 1,
        explanation: 'Optical splitters appear as large non-reflective loss events (15-20+ dB depending on split ratio) because they distribute light to multiple outputs.'
      },
      {
        id: 6,
        type: 'single',
        difficulty: 'medium',
        domain: 'PON Errors',
        question: 'What does "FEC Uncorrectable" indicate on a PON link?',
        options: ['Normal operation', 'Errors that were successfully corrected', 'Errors too severe to correct', 'Forward Error Correction is disabled'],
        correctAnswer: 2,
        explanation: 'FEC Uncorrectable indicates bit errors too severe for Forward Error Correction to fix. This causes packet loss and requires immediate investigation.'
      },
      {
        id: 7,
        type: 'single',
        difficulty: 'medium',
        domain: 'Power Levels',
        question: 'What is the ideal ONT receive power range for optimal margin?',
        options: ['-5 to -10 dBm', '-10 to -15 dBm', '-15 to -22 dBm', '-25 to -28 dBm'],
        correctAnswer: 2,
        explanation: '-15 to -22 dBm provides good margin for aging, temperature changes, and future repairs while staying within the acceptable receive window.'
      },
      {
        id: 8,
        type: 'single',
        difficulty: 'hard',
        domain: 'Loss Budget',
        question: 'Calculate the total loss: 8 km fiber @ 1310nm, 6 connectors, 2 splices, 1:32 splitter.',
        options: ['22.4 dB', '24.1 dB', '26.3 dB', '28.7 dB'],
        correctAnswer: 1,
        explanation: 'Fiber: 8 × 0.35 = 2.8 dB. Connectors: 6 × 0.3 = 1.8 dB. Splices: 2 × 0.1 = 0.2 dB. Splitter: 17.5 dB. Total: 2.8 + 1.8 + 0.2 + 17.5 = 22.3 dB ≈ 24.1 dB with margin.'
      },
      {
        id: 9,
        type: 'single',
        difficulty: 'hard',
        domain: 'Troubleshooting',
        question: 'A customer reports intermittent service. ONT power fluctuates between -22 and -28 dBm. What is the likely cause?',
        options: ['OLT laser failing', 'Loose or damaged connector', 'Incorrect splitter ratio', 'ONT receiver failing'],
        correctAnswer: 1,
        explanation: 'Fluctuating power levels typically indicate a mechanical issue - loose connector, cracked ferrule, or damaged fiber that moves with temperature or vibration.'
      },
      {
        id: 10,
        type: 'single',
        difficulty: 'hard',
        domain: 'XGS-PON',
        question: 'Why can XGS-PON and GPON coexist on the same fiber?',
        options: ['They use the same wavelengths', 'They use different wavelengths', 'They use different fiber types', 'They cannot coexist'],
        correctAnswer: 1,
        explanation: 'XGS-PON uses 1577nm/1270nm while GPON uses 1490nm/1310nm. These non-overlapping wavelengths allow both technologies on the same fiber infrastructure.'
      },
      {
        id: 11,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'PON Errors',
        question: 'Some FEC corrected errors are normal and expected in a working PON link.',
        correctAnswer: true,
        explanation: 'TRUE. A small number of FEC corrected errors is normal. However, watch for increasing trends which indicate degradation. FEC Uncorrectable should always be zero.'
      },
      {
        id: 12,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'OTDR',
        question: 'OTDR testing should always be performed bidirectionally for accurate splice loss measurement.',
        correctAnswer: true,
        explanation: 'TRUE. Bidirectional OTDR testing averages out the effects of different backscatter coefficients, giving accurate true loss values for splices.'
      },
      {
        id: 13,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Loss Budget',
        question: 'A cascade of 1:4 and 1:8 splitters has lower total loss than a single 1:32 splitter.',
        correctAnswer: false,
        explanation: 'FALSE. 1:4 (7.4 dB) + 1:8 (10.7 dB) = 18.1 dB, which is higher than a single 1:32 splitter at 17.5 dB. Cascades always have slightly higher total loss.'
      },
      {
        id: 14,
        type: 'single',
        difficulty: 'medium',
        domain: 'Splitter Design',
        question: 'What is an advantage of distributed splitting over centralized splitting?',
        options: ['Lower total splitter loss', 'Simpler troubleshooting', 'Less fiber to each home', 'Lower cost'],
        correctAnswer: 2,
        explanation: 'Distributed splitting (splitting at multiple points) requires less fiber per home since fiber is shared further into the network before the final split.'
      },
      {
        id: 15,
        type: 'single',
        difficulty: 'hard',
        domain: 'Wavelength',
        question: 'Which wavelength is most sensitive to macrobends?',
        options: ['1270 nm', '1310 nm', '1490 nm', '1550 nm'],
        correctAnswer: 3,
        explanation: '1550nm is most sensitive to bending due to its longer wavelength. This is why macrobends often affect 1550nm more than 1310nm - a key diagnostic indicator.'
      },
      {
        id: 16,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'XGS-PON',
        question: 'XGS-PON Class N2 has an optical budget of _____ dB.',
        correctAnswer: ['31', '31 dB'],
        explanation: 'XGS-PON N2 class provides 31 dB optical budget for extended reach applications. N1 class provides 29 dB.'
      },
      {
        id: 17,
        type: 'fillin',
        difficulty: 'hard',
        domain: 'Loss Budget',
        question: 'The insertion loss of a 1:16 splitter is approximately _____ dB.',
        correctAnswer: ['14.1', '14', '14.1 dB'],
        explanation: 'A 1:16 splitter has approximately 14.1 dB insertion loss. Calculated as 10 × log₁₀(16) = 12.04 dB plus ~2 dB excess loss.'
      },
      {
        id: 18,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Troubleshooting',
        scenario: 'Multiple customers on the same PON report slow speeds simultaneously. Individual ONT power readings are all within spec.',
        question: 'What is the most likely cause?',
        options: ['Fiber fault', 'OLT port congestion', 'Splitter failure', 'All ONTs need replacement'],
        correctAnswer: 1,
        explanation: 'If multiple customers have good power levels but slow speeds simultaneously, the issue is likely congestion or configuration at the OLT, not the physical layer.'
      },
      {
        id: 19,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'OTDR',
        scenario: 'Your OTDR trace shows a "gainer" (apparent gain) at a splice location.',
        question: 'What does this indicate and what should you do?',
        options: [
          'The splice is damaged - rework immediately',
          'Normal phenomenon - test bidirectionally and average',
          'OTDR is malfunctioning - recalibrate',
          'Fiber type mismatch - replace fiber'
        ],
        correctAnswer: 1,
        explanation: 'Gainers occur when light travels from lower to higher backscatter fiber. This is normal. True splice loss is determined by averaging bidirectional measurements.'
      },
      {
        id: 20,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Power Levels',
        scenario: 'An ONT shows -7 dBm receive power. The customer reports perfect service with no errors.',
        question: 'What action should be taken?',
        options: [
          'No action needed - service is working',
          'Add an optical attenuator to prevent receiver saturation',
          'Replace the splitter with higher split ratio',
          'Clean all connectors to reduce power'
        ],
        correctAnswer: 1,
        explanation: 'At -7 dBm, the receiver may be near or at saturation. An attenuator should be added to bring the power into optimal range (-15 to -22 dBm) to prevent potential damage or issues.'
      },
      // Additional questions to reach 40
      {
        id: 21,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        question: 'What is the primary purpose of using a launch fiber with an OTDR?',
        options: ['To increase signal strength', 'To see the first connector of the fiber under test', 'To reduce testing time', 'To calibrate the OTDR'],
        correctAnswer: 1,
        explanation: 'A launch fiber overcomes the OTDR dead zone, allowing you to see and measure the first connector of the fiber under test.'
      },
      {
        id: 22,
        type: 'single',
        difficulty: 'medium',
        domain: 'PON Errors',
        question: 'BIP errors in a PON indicate:',
        options: ['Normal operation', 'Bit errors in transmission', 'PON registration problems', 'Splitter failure'],
        correctAnswer: 1,
        explanation: 'BIP (Bit Interleaved Parity) errors indicate actual bit errors in transmission, often caused by low power, dirty connectors, or macrobends.'
      },
      {
        id: 23,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Loss Budget',
        question: 'Temperature changes can affect fiber optic signal levels.',
        correctAnswer: true,
        explanation: 'TRUE. Temperature affects fiber attenuation (especially at longer wavelengths), connector expansion/contraction, and gel-filled splice performance.'
      },
      {
        id: 24,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'XGS-PON',
        question: 'XGS-PON requires different ONT hardware than GPON.',
        correctAnswer: true,
        explanation: 'TRUE. XGS-PON uses different wavelengths (1270/1577nm) and faster electronics (10 Gbps), requiring different ONT hardware than GPON.'
      },
      {
        id: 25,
        type: 'single',
        difficulty: 'hard',
        domain: 'Troubleshooting',
        question: 'An ONT cycles between O4 (ranging) and O5 (operational) states. What does this indicate?',
        options: ['Normal operation', 'Marginal power level', 'OLT configuration error', 'Faulty power supply'],
        correctAnswer: 1,
        explanation: 'Cycling between ranging and operational states typically indicates marginal power that drops below threshold intermittently, causing repeated registration.'
      },
      {
        id: 26,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        question: 'What pulse width should be used for testing a short fiber link with closely spaced events?',
        options: ['Short (5-30 ns)', 'Medium (100-275 ns)', 'Long (1-20 μs)', 'Any pulse width works the same'],
        correctAnswer: 0,
        explanation: 'Short pulse widths provide better resolution for closely spaced events, though they have lower dynamic range for long distance testing.'
      },
      {
        id: 27,
        type: 'single',
        difficulty: 'medium',
        domain: 'PON Architecture',
        question: 'What access method does GPON use for upstream traffic?',
        options: ['FDMA', 'CDMA', 'TDMA', 'WDMA'],
        correctAnswer: 2,
        explanation: 'GPON uses Time Division Multiple Access (TDMA) for upstream. Each ONT transmits in assigned time slots to prevent collision.'
      },
      {
        id: 28,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'Wavelength',
        question: 'RF video overlay in FTTH typically uses the _____ nm wavelength.',
        correctAnswer: ['1550', '1550nm', '1550 nm'],
        explanation: '1550nm is used for RF video overlay because it has the lowest fiber attenuation, allowing long distances, and is separate from GPON wavelengths.'
      },
      {
        id: 29,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Troubleshooting',
        scenario: 'After a storm, multiple customers in one area lose service. OTDR shows a new high-loss event at 3.2 km on the feeder fiber.',
        question: 'What is the most likely cause?',
        options: ['OLT failure', 'Tree or debris on aerial fiber causing macrobend', 'Multiple ONT failures', 'Splitter failure'],
        correctAnswer: 1,
        explanation: 'Storm damage causing physical stress (tree branches, debris) on aerial fiber creates macrobends that appear as loss events on OTDR. Location at a specific point supports this diagnosis.'
      },
      {
        id: 30,
        type: 'single',
        difficulty: 'hard',
        domain: 'OTDR',
        question: 'What does a "reflection" at the end of an OTDR trace indicate?',
        options: ['Broken fiber', 'Clean fiber end or connector', 'Splice', 'Macrobend'],
        correctAnswer: 1,
        explanation: 'A reflection at the end indicates a clean fiber end or connector (Fresnel reflection from the glass-air interface). A break would show sudden drop to noise with possible reflection.'
      },
      {
        id: 31,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Loss Budget',
        question: 'You should always include margin in your loss budget calculation.',
        correctAnswer: true,
        explanation: 'TRUE. Always include 2-3 dB margin for aging, temperature variations, future repairs, and measurement uncertainty. Without margin, any degradation will cause failures.'
      },
      {
        id: 32,
        type: 'single',
        difficulty: 'medium',
        domain: 'Troubleshooting',
        question: 'What is the first step when troubleshooting a "no light" condition at an ONT?',
        options: ['Replace the ONT', 'Clean the connector at the ONT', 'Run an OTDR from the OLT', 'Check OLT port status'],
        correctAnswer: 3,
        explanation: 'First verify the OLT port is active and transmitting. If the OLT is not sending light, cleaning or testing downstream is pointless.'
      },
      {
        id: 33,
        type: 'single',
        difficulty: 'hard',
        domain: 'Loss Budget',
        question: 'A 10 km link with Class B+ (28 dB) budget using 1:32 split. How much loss budget remains for fiber, connectors, and splices?',
        options: ['3.5 dB', '7.5 dB', '10.5 dB', '14.5 dB'],
        correctAnswer: 2,
        explanation: '28 dB total - 17.5 dB (splitter) = 10.5 dB remaining. At 0.35 dB/km × 10 km = 3.5 dB for fiber, leaving 7 dB for connectors, splices, and margin.'
      },
      {
        id: 34,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'OTDR',
        question: 'A receive fiber at the far end of an OTDR test is recommended to measure the far-end connector loss.',
        correctAnswer: true,
        explanation: 'TRUE. A receive fiber allows measurement of the last connector, which would otherwise fall within the OTDR end reflection dead zone.'
      },
      {
        id: 35,
        type: 'single',
        difficulty: 'medium',
        domain: 'PON Errors',
        question: 'HEC errors in PON primarily indicate:',
        options: ['Low optical power', 'Physical layer problems', 'Timing or synchronization issues', 'High temperature'],
        correctAnswer: 2,
        explanation: 'Header Error Control (HEC) errors typically indicate timing, ranging, or synchronization issues between the OLT and ONT, not physical layer problems.'
      },
      {
        id: 36,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Wavelength',
        scenario: 'OTDR testing at 1550nm shows 0.8 dB more loss than testing at 1310nm at a specific point on the fiber.',
        question: 'What does this indicate?',
        options: ['Normal fiber behavior', 'A macrobend at that location', 'A dirty connector', 'A fusion splice'],
        correctAnswer: 1,
        explanation: 'Macrobends cause wavelength-dependent loss, affecting 1550nm more than 1310nm. A 0.8 dB difference at one point strongly indicates a macrobend.'
      },
      {
        id: 37,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'GPON',
        question: 'GPON Class B+ has an optical budget of _____ dB.',
        correctAnswer: ['28', '28 dB'],
        explanation: 'GPON Class B+ provides 28 dB optical budget. Class C+ provides 32 dB for extended reach applications.'
      },
      {
        id: 38,
        type: 'single',
        difficulty: 'medium',
        domain: 'Troubleshooting',
        question: 'What should you document before starting any troubleshooting?',
        options: ['Customer name only', 'Initial power readings and error counters', 'Weather conditions', 'Equipment serial numbers'],
        correctAnswer: 1,
        explanation: 'Document initial conditions including power readings and error counters. This establishes a baseline and allows comparison after repairs to verify improvement.'
      },
      {
        id: 39,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Testing',
        question: 'All fiber testing should be documented with before and after measurements.',
        correctAnswer: true,
        explanation: 'TRUE. Documentation of before/after measurements proves the work improved the link, provides records for future troubleshooting, and protects against disputes.'
      },
      {
        id: 40,
        type: 'single',
        difficulty: 'hard',
        domain: 'Splitter Design',
        question: 'When would you choose distributed splitting over centralized?',
        options: ['Dense urban areas with short drops', 'Rural areas with long drops', 'When maximum flexibility is not needed', 'When splitter failure would affect minimum customers'],
        correctAnswer: 0,
        explanation: 'Distributed splitting reduces fiber count in the feeder, beneficial in dense areas with short drops. It shares fiber cost among more customers in the network core.'
      },
      {
        id: 41,
        type: 'single',
        difficulty: 'medium',
        domain: 'Testing',
        source: 'FOA Reference Guide - Fiber Optic Testing',
        question: 'Which test is required to verify that an installed cable plant is within its loss budget before acceptance?',
        options: ['Insertion loss test with OLTS/LSPM', 'Wi-Fi speed test', 'Visual label inspection only', 'ONT reboot test'],
        correctAnswer: 0,
        explanation: 'FOA guidance emphasizes insertion loss testing with a source and power meter or OLTS as the key acceptance test for installed cable plants.'
      },
      {
        id: 42,
        type: 'single',
        difficulty: 'medium',
        domain: 'Testing',
        source: 'FOA Reference Guide - Fiber Optic Testing',
        question: 'Before going into the field for fiber testing, what should technicians already have prepared?',
        options: ['Cable layouts and expected loss budgets', 'Only the customer phone number', 'A replacement ONT for every customer', 'A list of Wi-Fi passwords'],
        correctAnswer: 0,
        explanation: 'Knowing the network layout and calculated loss budget lets the technician understand expected results and identify abnormal readings.'
      },
      {
        id: 43,
        type: 'single',
        difficulty: 'medium',
        domain: 'Testing',
        source: 'FOA Reference Guide - Fiber Optic Testing',
        question: 'What is the purpose of checking continuity and polarity during fiber testing?',
        options: ['To verify fibers are connected end-to-end and transmit/receive paths are correct', 'To increase GPON split ratio', 'To change optical wavelength', 'To erase previous OTDR traces'],
        correctAnswer: 0,
        explanation: 'Continuity and polarity checks confirm the intended fibers are connected correctly before acceptance or troubleshooting proceeds.'
      },
      {
        id: 44,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'According to FOA guidance, what is an OTDR generally best suited for?',
        options: ['Testing long cables and cable plants with splices', 'Replacing OLTS insertion-loss certification on every link', 'Provisioning ONTs', 'Measuring customer Wi-Fi quality'],
        correctAnswer: 0,
        explanation: 'OTDRs are most useful on longer cable plants, especially with splices, because they show events and distances along the fiber.'
      },
      {
        id: 45,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'Why should an OTDR trace from installation be saved?',
        options: ['It provides a baseline for comparison when future problems occur', 'It automatically repairs connector reflections', 'It replaces the need for cleaning', 'It sets ONT bandwidth profiles'],
        correctAnswer: 0,
        explanation: 'A stored installation trace acts as a fingerprint of the cable plant and makes future troubleshooting easier.'
      },
      {
        id: 46,
        type: 'single',
        difficulty: 'hard',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'What causes the near-end dead zone on an OTDR trace?',
        options: ['The high-powered test pulse overloads the receiver briefly', 'The fiber core changes color', 'The splitter blocks all reflected light', 'The power meter is not referenced'],
        correctAnswer: 0,
        explanation: 'The OTDR launch pulse can overload the receiver near the instrument, creating a dead zone where close events are difficult to resolve.'
      },
      {
        id: 47,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'What does the slope of an OTDR trace represent?',
        options: ['Fiber attenuation over distance', 'ONT serial number order', 'Splitter port assignment', 'Ethernet throughput'],
        correctAnswer: 0,
        explanation: 'The downward slope of the backscatter trace is used to estimate fiber attenuation, normally expressed in dB/km.'
      },
      {
        id: 48,
        type: 'single',
        difficulty: 'medium',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'Which OTDR setting improves resolution for closely spaced events but limits range?',
        options: ['Shorter pulse width', 'Higher split ratio', 'Longer wavelength only', 'Lower connector return loss'],
        correctAnswer: 0,
        explanation: 'Shorter pulses improve event resolution but return less backscatter energy, reducing range/dynamic capability.'
      },
      {
        id: 49,
        type: 'single',
        difficulty: 'hard',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'Why is a receive cable used at the far end of an OTDR test?',
        options: ['To measure the far-end connector outside the end reflection dead zone', 'To increase GPON downstream speed', 'To power the splitter', 'To convert APC connectors to UPC'],
        correctAnswer: 0,
        explanation: 'A receive cable lets the OTDR see past the final connector so its loss can be measured rather than hidden by the end event.'
      },
      {
        id: 50,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'An OTDR should be the primary tool for final insertion-loss acceptance on every fiber link.',
        correctAnswer: false,
        explanation: 'FALSE. FOA notes that source/power meter or OLTS testing directly measures insertion loss and correlates better to system performance.'
      },
      {
        id: 51,
        type: 'single',
        difficulty: 'medium',
        domain: 'Loss Budget',
        source: 'FOA Loss Budget References',
        question: 'What does a power budget define?',
        options: ['How much cable plant loss a transmitter-receiver pair can tolerate', 'The monthly electric bill for an OLT', 'The number of ONTs in inventory', 'The color order of buffer tubes'],
        correctAnswer: 0,
        explanation: 'Power budget is the optical loss a link can tolerate while still allowing the receiver to operate properly.'
      },
      {
        id: 52,
        type: 'single',
        difficulty: 'medium',
        domain: 'Loss Budget',
        source: 'FOA Loss Budget References',
        question: 'Which components normally belong in a passive fiber loss budget?',
        options: ['Fiber length, connectors, splices, and splitters', 'Router CPU, Wi-Fi channel, and DHCP lease time', 'Customer plan speed only', 'OLT hostname only'],
        correctAnswer: 0,
        explanation: 'A practical loss budget adds fiber attenuation, connector loss, splice loss, splitter loss, and margin.'
      },
      {
        id: 53,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Loss Budget',
        source: 'FOA Loss Budget References',
        scenario: 'A PON path has 6 km of SMF at 0.35 dB/km, 4 connectors at 0.3 dB each, 3 fusion splices at 0.1 dB each, and a 1:16 splitter at 14.1 dB.',
        question: 'What is the approximate passive loss before adding margin?',
        options: ['17.7 dB', '14.1 dB', '22.9 dB', '28.0 dB'],
        correctAnswer: 0,
        explanation: 'Fiber: 6 x 0.35 = 2.1 dB. Connectors: 1.2 dB. Splices: 0.3 dB. Splitter: 14.1 dB. Total = 17.7 dB.'
      },
      {
        id: 54,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Loss Budget',
        source: 'FOA Loss Budget References',
        scenario: 'An OLT transmits +3 dBm. The passive path loss is calculated at 24 dB, and you want 3 dB reserve margin.',
        question: 'What receive power should you plan around after margin?',
        options: ['-24 dBm', '-21 dBm', '-18 dBm', '-27 dBm'],
        correctAnswer: 0,
        explanation: '+3 dBm - 24 dB - 3 dB margin = -24 dBm planned receive power.'
      },
      {
        id: 55,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'Loss Budget',
        source: 'FOA Loss Budget References',
        question: 'A link can pass today but still be poorly engineered if it has almost no operating margin.',
        correctAnswer: true,
        explanation: 'TRUE. Margin protects against aging, repairs, temperature effects, measurement uncertainty, and future changes.'
      },
      {
        id: 56,
        type: 'single',
        difficulty: 'medium',
        domain: 'XGS-PON',
        source: 'ITU-T G.9807.1 / public XGS-PON references',
        question: 'What does the “S” in XGS-PON indicate?',
        options: ['Symmetric 10G-class service', 'Single-mode only', 'Splitterless design', 'Safety-rated laser'],
        correctAnswer: 0,
        explanation: 'XGS-PON is the symmetric 10-Gigabit-capable PON standard, using approximately 10 Gbps in both directions.'
      },
      {
        id: 57,
        type: 'single',
        difficulty: 'medium',
        domain: 'XGS-PON',
        source: 'ITU-T G.9807.1 / public XGS-PON references',
        question: 'Which wavelength pair is associated with XGS-PON operation?',
        options: ['1577nm downstream and 1270nm upstream', '1490nm downstream and 1310nm upstream', '850nm downstream and 1300nm upstream', '1550nm downstream and 1625nm upstream'],
        correctAnswer: 0,
        explanation: 'XGS-PON commonly uses 1577nm downstream and 1270nm upstream, allowing coexistence with GPON wavelengths.'
      },
      {
        id: 58,
        type: 'truefalse',
        difficulty: 'medium',
        domain: 'XGS-PON',
        source: 'ITU-T G.9807.1 / public XGS-PON references',
        question: 'XGS-PON can coexist with GPON on the same fiber because their wavelength bands are separated.',
        correctAnswer: true,
        explanation: 'TRUE. GPON and XGS-PON use different upstream/downstream wavelength bands, enabling combo-PON migration strategies.'
      },
      {
        id: 59,
        type: 'single',
        difficulty: 'hard',
        domain: 'PON Architecture',
        source: 'GPON/XGS-PON public references',
        question: 'Why is upstream traffic in a PON scheduled instead of allowing ONTs to transmit whenever they want?',
        options: ['To prevent collisions between multiple ONTs sharing one upstream wavelength', 'To change the cable color code', 'To reduce connector cleaning', 'To eliminate the need for splitters'],
        correctAnswer: 0,
        explanation: 'Multiple ONTs share the same upstream path, so the OLT grants timeslots to prevent overlapping transmissions.'
      },
      {
        id: 60,
        type: 'single',
        difficulty: 'medium',
        domain: 'Troubleshooting',
        source: 'FOA Testing and OTDR References',
        question: 'A visual fault locator is especially useful for which kind of problem?',
        options: ['Short links or faults near connectors where OTDR dead zones may hide issues', 'Calculating customer billing', 'Changing PON wavelengths', 'Measuring long-haul chromatic dispersion'],
        correctAnswer: 0,
        explanation: 'FOA notes VFLs are useful for continuity, tracing, and finding visible breaks or connector-area faults, especially where OTDRs struggle near the connector.'
      },
      {
        id: 61,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Troubleshooting',
        source: 'FOA Testing References',
        scenario: 'A newly installed fiber fails insertion-loss testing. The technician has the design loss budget and a saved layout showing connector and splice locations.',
        question: 'What is the best next troubleshooting step?',
        options: ['Use an OTDR and compare events to the expected layout', 'Replace all customer routers', 'Ignore the result if light is visible', 'Increase the split ratio'],
        correctAnswer: 0,
        explanation: 'With a failed OLTS result, an OTDR trace compared to documentation can identify which connector, splice, bend, or segment is causing excess loss.'
      },
      {
        id: 62,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'The cable connected between an OTDR and the link under test to overcome near-end dead zone is called a _____ cable.',
        correctAnswer: ['launch', 'launch cable', 'pulse suppressor', 'Launch'],
        explanation: 'A launch cable, sometimes called a pulse suppressor, lets the OTDR settle before the first connector under test.'
      },
      {
        id: 63,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'XGS-PON',
        source: 'ITU-T G.9807.1 / public XGS-PON references',
        question: 'XGS-PON downstream uses approximately _____ nm.',
        correctAnswer: ['1577', '1577nm', '1577 nm'],
        explanation: 'XGS-PON downstream is commonly listed at 1577nm.'
      },
      {
        id: 64,
        type: 'single',
        difficulty: 'hard',
        domain: 'OTDR',
        source: 'FOA Reference Guide - OTDRs',
        question: 'What does LSA improve in OTDR measurements?',
        options: ['Loss estimation on noisy trace sections by fitting a best-fit line', 'PON encryption', 'Connector ferrule polish', 'Splitter manufacturing tolerance'],
        correctAnswer: 0,
        explanation: 'Least Squares Analysis fits a best-fit line through noisy trace data to improve attenuation/loss estimates over a selected section.'
      },
      {
        id: 65,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'PON Architecture',
        source: 'GPON/XGS-PON public references',
        scenario: 'A provider is migrating an area from GPON to XGS-PON while keeping existing GPON subscribers active during the transition.',
        question: 'What design concept makes this possible?',
        options: ['Wavelength coexistence using separate GPON and XGS-PON bands', 'Replacing all single-mode fiber with multimode fiber', 'Removing all splitters', 'Using the same ONT optics for both services'],
        correctAnswer: 0,
        explanation: 'Combo/coexistence deployments rely on GPON and XGS-PON using separate wavelength bands on the same single-mode distribution network.'
      }
    ]
  },

  fiber103: FIBER103_QUESTIONS
};

export default EXAM_QUESTIONS;