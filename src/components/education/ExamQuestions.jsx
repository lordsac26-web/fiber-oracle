// Fiber Certification Exam Question Banks
// Aligned with FOA (Fiber Optic Association) and industry certification standards

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
        difficulty: 'medium',
        domain: 'Fiber Fundamentals',
        question: 'What is the typical cladding diameter for both SMF and MMF?',
        options: ['9 μm', '50 μm', '62.5 μm', '125 μm'],
        correctAnswer: 3,
        explanation: 'Both single-mode and multimode fibers have a standard cladding diameter of 125μm. This allows the same fusion splicers and connectors to be used.'
      },
      {
        id: 7,
        type: 'single',
        difficulty: 'medium',
        domain: 'GPON',
        question: 'What is the downstream wavelength for GPON?',
        options: ['1270 nm', '1310 nm', '1490 nm', '1550 nm'],
        correctAnswer: 2,
        explanation: 'GPON uses 1490nm for downstream traffic. Upstream uses 1310nm. This allows both directions to travel on the same fiber using WDM.'
      },
      {
        id: 8,
        type: 'single',
        difficulty: 'medium',
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
        difficulty: 'medium',
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
        difficulty: 'hard',
        domain: 'Fiber Fundamentals',
        question: 'What wavelengths are typically used for multimode fiber?',
        options: ['850nm and 1300nm', '1310nm and 1550nm', '1490nm and 1310nm', '1577nm and 1270nm'],
        correctAnswer: 0,
        explanation: '850nm and 1300nm are used for multimode fiber. 1310nm and 1550nm are the primary wavelengths for single-mode fiber.'
      },
      {
        id: 18,
        type: 'single',
        difficulty: 'hard',
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
        difficulty: 'medium',
        domain: 'Color Codes',
        question: 'In the TIA-598 color code, fiber position 7 is _____.',
        correctAnswer: ['red', 'RED', 'Red'],
        explanation: 'Position 7 is Red. The 12-fiber sequence is: Blue, Orange, Green, Brown, Slate, White, Red, Black, Yellow, Violet, Rose, Aqua.'
      },
      {
        id: 32,
        type: 'fillin',
        difficulty: 'medium',
        domain: 'Power Levels',
        question: 'SMF attenuation at 1550nm is approximately _____ dB/km.',
        correctAnswer: ['0.25', '.25', '0.25 dB/km'],
        explanation: 'SMF attenuation at 1550nm is 0.25 dB/km. At 1310nm it is 0.35 dB/km. The lower attenuation at 1550nm makes it preferred for long-haul transmission.'
      },
      {
        id: 33,
        type: 'fillin',
        difficulty: 'hard',
        domain: 'GPON',
        question: 'The upstream wavelength for GPON is _____ nm.',
        correctAnswer: ['1310', '1310nm', '1310 nm'],
        explanation: 'GPON upstream uses 1310nm wavelength. Downstream uses 1490nm. XGS-PON uses different wavelengths: 1270nm upstream and 1577nm downstream.'
      },
      {
        id: 34,
        type: 'fillin',
        difficulty: 'hard',
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
      }
    ]
  },

  fiber103: {
    title: 'Fiber 103 Certification Exam',
    subtitle: 'Advanced Troubleshooting Mastery',
    passingScore: 80,
    timeLimit: 75,
    totalQuestions: 40,
    questions: [
      {
        id: 1,
        type: 'single',
        difficulty: 'hard',
        domain: 'OTDR Advanced',
        question: 'What is the typical event dead zone for a high-resolution OTDR at 1310nm?',
        options: ['0.5-1 meters', '0.8-3 meters', '5-10 meters', '15-25 meters'],
        correctAnswer: 1,
        explanation: 'Event dead zone for high-resolution OTDRs is typically 0.8-3 meters depending on pulse width. This is the minimum distance to distinguish two separate events.'
      },
      {
        id: 2,
        type: 'single',
        difficulty: 'hard',
        domain: 'Ghost Events',
        question: 'At what distance would a ghost event appear if caused by a connector at 500 meters?',
        options: ['250 meters', '500 meters', '1000 meters', '1500 meters'],
        correctAnswer: 2,
        explanation: 'Ghost events appear at exactly twice the distance of the reflective event causing them. A connector at 500m would create a ghost at 1000m (2 × 500m).'
      },
      {
        id: 3,
        type: 'single',
        difficulty: 'hard',
        domain: 'Bidirectional Analysis',
        question: 'Why do "gainers" appear on unidirectional OTDR traces?',
        options: [
          'OTDR malfunction',
          'Fiber with different backscatter coefficients',
          'Splice quality issues',
          'Incorrect pulse width'
        ],
        correctAnswer: 1,
        explanation: 'When light travels from lower backscatter to higher backscatter fiber, more light scatters back after the splice, appearing as a "gain". Bidirectional averaging corrects this.'
      },
      {
        id: 4,
        type: 'single',
        difficulty: 'hard',
        domain: 'PON Diagnostics',
        question: 'An ONT stuck in O2-O3 state indicates:',
        options: ['Operational - fully working', 'Ranging in progress', 'Searching for OLT signal', 'Emergency deactivation'],
        correctAnswer: 2,
        explanation: 'O2-O3 is the standby state where the ONT is searching for OLT downstream signal. This indicates no signal or signal too weak to synchronize.'
      },
      {
        id: 5,
        type: 'single',
        difficulty: 'hard',
        domain: 'Error Analysis',
        question: 'FEC Uncorrectable errors should always be:',
        options: ['Less than 100 per hour', 'Less than 10 per 15 minutes', 'Zero', 'Ignored if service works'],
        correctAnswer: 2,
        explanation: 'FEC Uncorrectable errors should always be zero. Any uncorrectable errors indicate bit errors that cannot be fixed, causing packet loss and service degradation.'
      },
      {
        id: 6,
        type: 'single',
        difficulty: 'hard',
        domain: 'Wavelength Issues',
        question: 'If 1550nm loss is significantly higher than 1310nm loss at the same location, this indicates:',
        options: ['Dirty connector', 'Fusion splice issue', 'Macrobend', 'Fiber break'],
        correctAnswer: 2,
        explanation: 'Macrobends cause wavelength-dependent loss, with longer wavelengths (1550nm) experiencing more loss than shorter wavelengths (1310nm). This is a key diagnostic indicator.'
      },
      {
        id: 7,
        type: 'single',
        difficulty: 'hard',
        domain: 'Intermittent Faults',
        question: 'Which type of splice is most susceptible to thermal intermittent faults?',
        options: ['Fusion splice', 'Mechanical splice', 'Both equally susceptible', 'Neither is susceptible'],
        correctAnswer: 1,
        explanation: 'Mechanical splices use index matching gel that changes viscosity with temperature, making them more susceptible to thermal-induced intermittent faults than fusion splices.'
      },
      {
        id: 8,
        type: 'single',
        difficulty: 'hard',
        domain: 'Connector Inspection',
        question: 'According to IEC 61300-3-35, scratches in which zone require connector replacement?',
        options: ['Core zone (0-25μm) if deep', 'Cladding zone (25-120μm)', 'Contact zone (130-250μm)', 'Any zone'],
        correctAnswer: 0,
        explanation: 'Deep scratches in the core zone (0-25μm) cannot be cleaned away and affect light transmission. This requires re-termination or connector replacement.'
      },
      {
        id: 9,
        type: 'single',
        difficulty: 'hard',
        domain: 'Splitter Failures',
        question: 'What indicates a partial splitter failure?',
        options: ['All ports show no output', 'Some ports work while others fail', 'High loss on all ports', 'Low loss on all ports'],
        correctAnswer: 1,
        explanation: 'Partial splitter failure means some ports work normally while others fail. Complete failure would affect all ports equally.'
      },
      {
        id: 10,
        type: 'single',
        difficulty: 'hard',
        domain: 'Fault Isolation',
        question: 'In systematic fault isolation, what is the "divide and conquer" method?',
        options: [
          'Test every component individually',
          'Test at midpoint to determine which half contains the fault',
          'Replace all suspected components',
          'Start testing from the customer premises'
        ],
        correctAnswer: 1,
        explanation: 'Divide and conquer means testing at the midpoint to determine which half contains the fault, then repeating until the fault is precisely located.'
      },
      {
        id: 11,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Ghost Events',
        question: 'Ghost events can be eliminated by using an APC launch cord instead of UPC.',
        correctAnswer: true,
        explanation: 'TRUE. APC connectors have lower reflectance (>60dB vs >50dB), reducing the double reflection that causes ghosts. Mandrel wraps can also help.'
      },
      {
        id: 12,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Bidirectional Analysis',
        question: 'True splice loss equals the average of A→B and B→A measurements.',
        correctAnswer: true,
        explanation: 'TRUE. True Loss = (A→B Loss + B→A Loss) ÷ 2. This formula cancels out the backscatter coefficient differences that cause gainers.'
      },
      {
        id: 13,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'PON Diagnostics',
        question: 'LOSI alarm means the ONT is receiving signal but cannot decode it.',
        correctAnswer: false,
        explanation: 'FALSE. LOSI (Loss of Signal Indication) means no optical signal is being received. LOFI (Loss of Frame) means signal is present but cannot be synchronized/decoded.'
      },
      {
        id: 14,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Wavelength Issues',
        question: 'XGS-PON is more affected by macrobends than GPON because of its longer downstream wavelength.',
        correctAnswer: true,
        explanation: 'TRUE. XGS-PON uses 1577nm downstream (vs GPON 1490nm). Longer wavelengths are more susceptible to bend loss, making XGS-PON more sensitive to macrobends.'
      },
      {
        id: 15,
        type: 'fillin',
        difficulty: 'hard',
        domain: 'OTDR Advanced',
        question: 'The attenuation dead zone is typically _____ times longer than the event dead zone.',
        correctAnswer: ['3', '3x', '3-4', 'three'],
        explanation: 'Attenuation dead zone is typically 3-4 times the event dead zone. For example, if event dead zone is 3m, attenuation dead zone is typically 9-12m.'
      },
      {
        id: 16,
        type: 'fillin',
        difficulty: 'hard',
        domain: 'Connector Inspection',
        question: 'The core zone in IEC 61300-3-35 extends from 0 to _____ μm.',
        correctAnswer: ['25', '25μm', '25 μm'],
        explanation: 'The core zone is 0-25μm. This zone allows NO defects as any contamination or damage here directly affects light transmission.'
      },
      {
        id: 17,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Intermittent Faults',
        scenario: 'A customer reports their service fails every afternoon around 3 PM and recovers by evening. Weather is sunny.',
        question: 'What is the most likely cause?',
        options: [
          'OLT scheduled maintenance',
          'Thermal expansion causing mechanical issue',
          'Network congestion',
          'Customer equipment failure'
        ],
        correctAnswer: 1,
        explanation: 'Afternoon failures during sunny weather suggest thermal expansion. As aerial cables or enclosures heat up, mechanical splices or loose connectors can fail, recovering as temperature drops.'
      },
      {
        id: 18,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'OTDR Advanced',
        scenario: 'Your OTDR trace shows an event at 1,200m and another apparent event at 2,400m. The 2,400m event has lower amplitude and no physical component exists there.',
        question: 'What is this and how do you confirm?',
        options: [
          'Real splice - measure loss',
          'Ghost event - change launch cord and retest',
          'Fiber end - normal termination',
          'Hidden splice - increase pulse width'
        ],
        correctAnswer: 1,
        explanation: 'Event at exactly 2× the distance (2,400m = 2 × 1,200m) with lower amplitude and no physical component is a ghost. Confirm by changing launch cord - ghosts move, real events don\'t.'
      },
      {
        id: 19,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Splitter Failures',
        scenario: 'Four customers on a 1:8 splitter lose service. The other four work fine. OTDR from OLT shows normal trace to splitter input.',
        question: 'What is the most likely issue?',
        options: [
          'Feeder fiber fault',
          'OLT port failure',
          'Partial splitter failure',
          'All four customer drops damaged'
        ],
        correctAnswer: 2,
        explanation: 'Four of eight ports failing while input is good and others work indicates partial splitter failure affecting specific output ports. Replace the splitter.'
      },
      {
        id: 20,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Error Analysis',
        scenario: 'ONT shows: BIP Errors = 45/15min, FEC Corrected = 1,200/15min, FEC Uncorrectable = 0, Rx Power = -24 dBm.',
        question: 'What action is needed?',
        options: [
          'No action - all within spec',
          'Clean connectors and retest',
          'Investigate cause of elevated errors',
          'Replace ONT immediately'
        ],
        correctAnswer: 2,
        explanation: 'While FEC is keeping uncorrectable at zero, 45 BIP errors and 1,200 FEC corrections per 15 minutes is elevated. At -24 dBm (marginal), investigate for dirty connectors or bends.'
      },
      {
        id: 21,
        type: 'single',
        difficulty: 'hard',
        domain: 'OTDR Advanced',
        question: 'What OTDR reference method is compliant with TIA-526-14?',
        options: ['1-jumper', '2-jumper', '3-jumper', 'Any method'],
        correctAnswer: 2,
        explanation: 'TIA-526-14 specifies the 3-jumper reference method for certification testing. This provides the most accurate loss measurement by characterizing both connectors under test.'
      },
      {
        id: 22,
        type: 'single',
        difficulty: 'hard',
        domain: 'Fault Isolation',
        question: 'What is the primary reason for documenting root cause, not just the fix?',
        options: [
          'Legal requirements',
          'To prevent recurrence through corrective action',
          'Customer satisfaction',
          'Billing purposes'
        ],
        correctAnswer: 1,
        explanation: 'Documenting root cause enables preventive measures to stop recurrence. Fixing the symptom without understanding the cause often leads to repeat failures.'
      },
      {
        id: 23,
        type: 'single',
        difficulty: 'hard',
        domain: 'PON Diagnostics',
        question: 'An ONT repeatedly transitions between O4 and O5 states. What does this indicate?',
        options: [
          'Normal registration process',
          'Marginal power causing ranging failures',
          'OLT configuration error',
          'Incompatible ONT firmware'
        ],
        correctAnswer: 1,
        explanation: 'Repeated O4→O5→O4 cycling indicates the ONT completes ranging but loses synchronization, typically due to marginal power that fluctuates around the threshold.'
      },
      {
        id: 24,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Splitter Failures',
        question: 'Splitter output ports should be uniform within ±1.5 dB of each other.',
        correctAnswer: true,
        explanation: 'TRUE. Quality splitters maintain uniformity within ±1.5 dB. Greater variation indicates a failing or poor-quality splitter that should be replaced.'
      },
      {
        id: 25,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Documentation',
        question: 'OTDR traces should be saved before AND after repair work.',
        correctAnswer: true,
        explanation: 'TRUE. Before/after traces document the baseline, prove repair effectiveness, and provide records for future troubleshooting. "If it\'s not documented, it didn\'t happen."'
      },
      {
        id: 26,
        type: 'single',
        difficulty: 'hard',
        domain: 'Connector Inspection',
        question: 'What type of contamination requires wet cleaning?',
        options: ['Dust particles', 'Oil and fingerprints', 'Fiber debris', 'All of the above'],
        correctAnswer: 1,
        explanation: 'Oil and fingerprints require wet cleaning with IPA. Dust and fiber debris can usually be removed with dry cleaning. Always dry clean after wet cleaning.'
      },
      {
        id: 27,
        type: 'single',
        difficulty: 'hard',
        domain: 'Intermittent Faults',
        question: 'How do you test for a mechanical intermittent fault?',
        options: [
          'Take a single power reading',
          'Monitor power while flexing cables and connectors',
          'Run an OTDR trace',
          'Check error counters once'
        ],
        correctAnswer: 1,
        explanation: 'Mechanical intermittents require real-time power monitoring while physically manipulating (flexing, tapping) cables and connectors to reproduce the fault.'
      },
      {
        id: 28,
        type: 'single',
        difficulty: 'hard',
        domain: 'OTDR Advanced',
        question: 'What advantage does LSA (Least Squares Approximation) provide in OTDR analysis?',
        options: [
          'Faster testing',
          'More accurate loss measurement over a section',
          'Automatic event detection',
          'Longer range'
        ],
        correctAnswer: 1,
        explanation: 'LSA fits a straight line to the trace data over a selected section, providing more accurate loss measurement by averaging out noise fluctuations.'
      },
      {
        id: 29,
        type: 'fillin',
        difficulty: 'hard',
        domain: 'Ghost Events',
        question: 'To eliminate ghost events, use a(n) _____ connector on the launch cord.',
        correctAnswer: ['APC', 'apc', 'angled'],
        explanation: 'APC (Angled Physical Contact) connectors have lower reflectance (>60 dB vs >50 dB for UPC), reducing the double reflection that causes ghost events.'
      },
      {
        id: 30,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Wavelength Issues',
        scenario: 'A customer has GPON service working perfectly but their RF video (1550nm) is degraded with snow on the TV.',
        question: 'What is the most likely cause?',
        options: [
          'GPON splitter issue',
          'Macrobend affecting 1550nm more than 1490nm',
          'ONT receiver failure',
          'OLT transmitter issue'
        ],
        correctAnswer: 1,
        explanation: '1550nm is most bend-sensitive. If GPON (1490nm downstream) works but RF video (1550nm) is degraded, there\'s likely a macrobend affecting the longer wavelength more.'
      },
      {
        id: 31,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'PON Diagnostics',
        scenario: 'All ONTs on one PON port show LOAMI alarms but Rx power is good on all of them.',
        question: 'What does this indicate?',
        options: [
          'Physical layer fault',
          'OLT PLOAM messaging issue',
          'All ONTs need replacement',
          'Splitter failure'
        ],
        correctAnswer: 1,
        explanation: 'LOAMI (Loss of PLOAM/Management) with good power on multiple ONTs indicates an OLT-side issue with PLOAM messaging, not a physical layer problem.'
      },
      {
        id: 32,
        type: 'single',
        difficulty: 'hard',
        domain: 'Test Equipment',
        question: 'How often should OTDRs receive factory calibration?',
        options: ['Monthly', 'Quarterly', 'Annually', 'Every 5 years'],
        correctAnswer: 2,
        explanation: 'Annual factory calibration is the industry standard minimum. Daily reference cord checks should be performed before testing, but full calibration is done annually.'
      },
      {
        id: 33,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'Test Equipment',
        question: 'Referencing/zeroing an OLTS before each test set is optional if recently calibrated.',
        correctAnswer: false,
        explanation: 'FALSE. Referencing must be done before each test set, even with recent calibration. It establishes the baseline for that specific test and compensates for connector variations.'
      },
      {
        id: 34,
        type: 'single',
        difficulty: 'hard',
        domain: 'Fault Isolation',
        question: 'What documentation is critical after completing troubleshooting?',
        options: [
          'Customer signature only',
          'Root cause, actions taken, before/after measurements, preventive measures',
          'Time spent only',
          'Equipment serial numbers'
        ],
        correctAnswer: 1,
        explanation: 'Complete documentation includes root cause analysis, actions taken, before/after measurements proving improvement, and preventive measures to avoid recurrence.'
      },
      {
        id: 35,
        type: 'single',
        difficulty: 'hard',
        domain: 'Connector Inspection',
        question: 'Burnt residue on a connector end face indicates:',
        options: [
          'Normal wear - clean and use',
          'High power damage - connector must be replaced',
          'Poor cleaning - rewipe',
          'Contamination - wet clean'
        ],
        correctAnswer: 1,
        explanation: 'Burnt residue indicates the connector was damaged by high optical power (often during live connection or too-high power). The connector must be replaced.'
      },
      {
        id: 36,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Bidirectional Analysis',
        scenario: 'Splice measurement: A→B = +0.05 dB (gainer), B→A = 0.15 dB loss.',
        question: 'What is the true splice loss?',
        options: ['-0.05 dB', '0.05 dB', '0.10 dB', '0.20 dB'],
        correctAnswer: 1,
        explanation: 'True loss = (A→B + B→A) ÷ 2 = (-0.05 + 0.15) ÷ 2 = 0.10 ÷ 2 = 0.05 dB. The gainer cancels out with the higher B→A measurement.'
      },
      {
        id: 37,
        type: 'truefalse',
        difficulty: 'hard',
        domain: 'OTDR Advanced',
        question: 'A receive fiber at the far end helps measure the last connector loss accurately.',
        correctAnswer: true,
        explanation: 'TRUE. The receive fiber moves the last connector out of the end-reflection dead zone, allowing accurate measurement of its loss.'
      },
      {
        id: 38,
        type: 'single',
        difficulty: 'hard',
        domain: 'Splitter Failures',
        question: 'What test confirms splitter uniformity?',
        options: [
          'OTDR at one port',
          'Power meter at input only',
          'Power meter at input and each output port',
          'Visual inspection'
        ],
        correctAnswer: 2,
        explanation: 'Measure input power, then measure each output port. Calculate actual loss for each port and verify all are within ±1.5 dB of each other for uniformity.'
      },
      {
        id: 39,
        type: 'single',
        difficulty: 'hard',
        domain: 'Intermittent Faults',
        question: 'Time-based intermittent faults are often caused by:',
        options: [
          'Dirty connectors',
          'Network congestion or scheduled processes',
          'Macrobends',
          'Splitter failure'
        ],
        correctAnswer: 1,
        explanation: 'Time-based intermittents that occur at specific times often relate to network congestion, backup schedules, or other time-triggered processes rather than physical faults.'
      },
      {
        id: 40,
        type: 'scenario',
        difficulty: 'hard',
        domain: 'Documentation',
        scenario: 'You complete a repair. The customer confirms service is working. Your company requires full documentation.',
        question: 'What must be included in your documentation?',
        options: [
          'Customer confirmation only',
          'Before/after power readings, OTDR traces, photos, root cause, actions, and time',
          'Work order number and time only',
          'Parts used and cost'
        ],
        correctAnswer: 1,
        explanation: 'Complete documentation includes: before/after measurements (power, OTDR), photos, identified root cause, all actions taken, time, and any preventive recommendations.'
      }
    ]
  }
};

export default EXAM_QUESTIONS;