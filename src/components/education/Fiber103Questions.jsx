const FIBER103_QUESTIONS = {
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
      explanation: 'Ghost events appear at exactly twice the distance of the reflective event causing them. A connector at 500m would create a ghost at 1000m.'
    },
    {
      id: 3,
      type: 'single',
      difficulty: 'hard',
      domain: 'Bidirectional Analysis',
      question: 'Why do gainers appear on unidirectional OTDR traces?',
      options: ['OTDR malfunction', 'Fiber with different backscatter coefficients', 'Splice quality issues', 'Incorrect pulse width'],
      correctAnswer: 1,
      explanation: 'Backscatter differences can make a splice appear as gain in one direction. Bidirectional averaging corrects this artifact.'
    },
    {
      id: 4,
      type: 'single',
      difficulty: 'hard',
      domain: 'PON Diagnostics',
      question: 'An ONT stuck in O2-O3 state indicates:',
      options: ['Operational - fully working', 'Ranging in progress', 'Searching for OLT signal', 'Emergency deactivation'],
      correctAnswer: 2,
      explanation: 'O2-O3 is the standby/search state where the ONT is looking for a usable OLT downstream signal.'
    },
    {
      id: 5,
      type: 'single',
      difficulty: 'hard',
      domain: 'Error Analysis',
      question: 'FEC Uncorrectable errors should always be:',
      options: ['Less than 100 per hour', 'Less than 10 per 15 minutes', 'Zero', 'Ignored if service works'],
      correctAnswer: 2,
      explanation: 'FEC Uncorrectable errors indicate bit errors that could not be repaired and should be zero on a healthy link.'
    },
    {
      id: 6,
      type: 'single',
      difficulty: 'hard',
      domain: 'Wavelength Issues',
      question: 'If 1550nm loss is significantly higher than 1310nm loss at the same location, this indicates:',
      options: ['Dirty connector', 'Fusion splice issue', 'Macrobend', 'Fiber break'],
      correctAnswer: 2,
      explanation: 'Macrobends cause wavelength-dependent loss and affect longer wavelengths more strongly.'
    },
    {
      id: 7,
      type: 'single',
      difficulty: 'hard',
      domain: 'Intermittent Faults',
      question: 'Which type of splice is most susceptible to thermal intermittent faults?',
      options: ['Fusion splice', 'Mechanical splice', 'Both equally susceptible', 'Neither is susceptible'],
      correctAnswer: 1,
      explanation: 'Mechanical splices can be affected by temperature changes, gel behavior, and mechanical alignment.'
    },
    {
      id: 8,
      type: 'single',
      difficulty: 'hard',
      domain: 'Connector Inspection',
      question: 'According to IEC 61300-3-35 concepts, defects in which zone are most critical?',
      options: ['Core zone', 'Cladding zone', 'Contact zone', 'Connector boot'],
      correctAnswer: 0,
      explanation: 'Core-zone defects directly affect the guided optical signal and are the highest priority inspection concern.'
    },
    {
      id: 9,
      type: 'single',
      difficulty: 'hard',
      domain: 'Splitter Failures',
      question: 'What indicates a partial splitter failure?',
      options: ['All ports show no output', 'Some ports work while others fail', 'High loss on all ports', 'Low loss on all ports'],
      correctAnswer: 1,
      explanation: 'Partial splitter failure affects only some outputs; complete failure affects all outputs.'
    },
    {
      id: 10,
      type: 'single',
      difficulty: 'hard',
      domain: 'Fault Isolation',
      question: 'In systematic fault isolation, what is the divide-and-conquer method?',
      options: ['Test every component randomly', 'Test at midpoint to determine which half contains the fault', 'Replace all suspected components', 'Start only from the customer premises'],
      correctAnswer: 1,
      explanation: 'Divide-and-conquer isolates the fault domain by testing at logical midpoints until the failing section is identified.'
    },
    {
      id: 11,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Ghost Events',
      question: 'Ghost events can be reduced by lowering reflectance in the launch setup.',
      correctAnswer: true,
      explanation: 'TRUE. Lower-reflectance connectors and better launch setup reduce the multiple reflections that create ghosts.'
    },
    {
      id: 12,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Bidirectional Analysis',
      question: 'True splice loss equals the average of A-to-B and B-to-A measurements.',
      correctAnswer: true,
      explanation: 'TRUE. Bidirectional averaging cancels directional backscatter effects.'
    },
    {
      id: 13,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'PON Diagnostics',
      question: 'LOSI alarm means the ONT is receiving signal but cannot decode it.',
      correctAnswer: false,
      explanation: 'FALSE. LOSI means loss of signal. LOFI is closer to signal present but frame synchronization failing.'
    },
    {
      id: 14,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Wavelength Issues',
      question: 'XGS-PON can be more affected by macrobends than GPON because of its longer downstream wavelength.',
      correctAnswer: true,
      explanation: 'TRUE. XGS-PON downstream at 1577nm is longer and generally more bend-sensitive than GPON downstream at 1490nm.'
    },
    {
      id: 15,
      type: 'fillin',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      question: 'The cable connected between the OTDR and the link under test is called a _____ cable.',
      correctAnswer: ['launch', 'launch cable', 'pulse suppressor'],
      explanation: 'A launch cable lets the OTDR settle after the initial pulse and enables first-connector measurement.'
    },
    {
      id: 16,
      type: 'fillin',
      difficulty: 'hard',
      domain: 'Connector Inspection',
      question: 'The most critical connector inspection area is the _____ zone.',
      correctAnswer: ['core', 'Core'],
      explanation: 'The core zone directly carries the optical signal.'
    },
    {
      id: 17,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Intermittent Faults',
      scenario: 'A customer reports service fails every afternoon around 3 PM and recovers by evening. Weather is sunny.',
      question: 'What is the most likely cause?',
      options: ['OLT scheduled maintenance', 'Thermal expansion causing mechanical issue', 'Network congestion only', 'Customer equipment failure only'],
      correctAnswer: 1,
      explanation: 'Time-of-day heat patterns point to expansion, enclosure stress, mechanical splice issues, or loose connectors.'
    },
    {
      id: 18,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      scenario: 'An OTDR trace shows an event at 1,200m and another apparent event at 2,400m. No physical component exists at 2,400m.',
      question: 'What is this and how do you confirm?',
      options: ['Real splice - measure loss', 'Ghost event - change launch setup and retest', 'Fiber end - normal termination', 'Hidden splitter - increase pulse width'],
      correctAnswer: 1,
      explanation: 'A weaker event at an exact multiple of a reflective event is a classic ghost indicator.'
    },
    {
      id: 19,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Splitter Failures',
      scenario: 'Four customers on a 1:8 splitter lose service. The other four work fine. OTDR from OLT shows normal trace to splitter input.',
      question: 'What is the most likely issue?',
      options: ['Feeder fiber fault', 'OLT port failure', 'Partial splitter failure', 'All four customer routers failed'],
      correctAnswer: 2,
      explanation: 'A good input with only some failed outputs points to partial splitter or output-leg failure.'
    },
    {
      id: 20,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Error Analysis',
      scenario: 'ONT shows BIP Errors = 45/15min, FEC Corrected = 1,200/15min, FEC Uncorrectable = 0, Rx Power = -24 dBm.',
      question: 'What action is needed?',
      options: ['No action', 'Clean connectors and retest only', 'Investigate elevated errors and optical margin', 'Replace ONT immediately'],
      correctAnswer: 2,
      explanation: 'FEC may still be masking a degrading optical condition. Rising corrected errors require investigation before uncorrectables appear.'
    },
    {
      id: 21,
      type: 'single',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      question: 'Why should OTDR results not automatically override OLTS insertion-loss results?',
      options: ['OTDR infers loss indirectly from backscatter', 'OTDRs cannot show distance', 'OLTS uses no optical source', 'OLTS only tests copper'],
      correctAnswer: 0,
      explanation: 'OTDR measurements are indirect and may not correlate with actual end-to-end system insertion loss.'
    },
    {
      id: 22,
      type: 'single',
      difficulty: 'hard',
      domain: 'Fault Isolation',
      question: 'What is the primary reason for documenting root cause, not just the fix?',
      options: ['Legal requirements only', 'To prevent recurrence through corrective action', 'Customer satisfaction only', 'Billing only'],
      correctAnswer: 1,
      explanation: 'Root-cause documentation helps prevent repeat failures and improves future troubleshooting.'
    },
    {
      id: 23,
      type: 'single',
      difficulty: 'hard',
      domain: 'PON Diagnostics',
      question: 'An ONT repeatedly transitions between O4 and O5 states. What does this indicate?',
      options: ['Normal registration process', 'Marginal power or ranging instability', 'Always an OLT configuration error', 'Always incompatible firmware'],
      correctAnswer: 1,
      explanation: 'Cycling between ranging and operational states often indicates marginal optical or timing conditions.'
    },
    {
      id: 24,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Splitter Failures',
      question: 'Large variation between splitter output ports can indicate poor or failing splitter performance.',
      correctAnswer: true,
      explanation: 'TRUE. Output uniformity is a key splitter-health indicator.'
    },
    {
      id: 25,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Documentation',
      question: 'OTDR traces should be saved before and after repair work when they are part of the troubleshooting evidence.',
      correctAnswer: true,
      explanation: 'TRUE. Before/after traces prove change and create a future baseline.'
    },
    {
      id: 26,
      type: 'single',
      difficulty: 'hard',
      domain: 'Connector Inspection',
      question: 'What type of contamination most often requires wet cleaning?',
      options: ['Loose dust', 'Oil and fingerprints', 'Label text', 'Jacket color'],
      correctAnswer: 1,
      explanation: 'Oily residue usually needs proper wet/dry cleaning followed by re-inspection.'
    },
    {
      id: 27,
      type: 'single',
      difficulty: 'hard',
      domain: 'Intermittent Faults',
      question: 'How do you test for a mechanical intermittent fault?',
      options: ['Take one power reading', 'Monitor power while flexing cables/connectors', 'Only run a speed test', 'Check inventory records'],
      correctAnswer: 1,
      explanation: 'Real-time power monitoring while moving suspected components can reproduce mechanical intermittents.'
    },
    {
      id: 28,
      type: 'single',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      question: 'What advantage does LSA provide in OTDR analysis?',
      options: ['Faster testing only', 'More stable loss measurement over noisy trace sections', 'Automatic cleaning', 'Longer wavelengths'],
      correctAnswer: 1,
      explanation: 'Least Squares Analysis fits a line through trace data to reduce noise effects.'
    },
    {
      id: 29,
      type: 'fillin',
      difficulty: 'hard',
      domain: 'Reflectance',
      question: 'A connector polish with an 8-degree angle is commonly called _____.',
      correctAnswer: ['APC', 'apc', 'angled physical contact'],
      explanation: 'APC stands for Angled Physical Contact and is used to reduce reflectance.'
    },
    {
      id: 30,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Wavelength Issues',
      scenario: 'A customer has GPON service working but RF video at 1550nm is degraded.',
      question: 'What is the most likely physical cause?',
      options: ['Macrobend affecting longer wavelengths', 'OLT VLAN issue', 'ONT Wi-Fi issue', 'Wrong billing code'],
      correctAnswer: 0,
      explanation: '1550nm is more bend-sensitive, so RF/video degradation with GPON still working often points to a bend.'
    },
    {
      id: 31,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'PON Diagnostics',
      scenario: 'All ONTs on one PON port show LOAMI alarms but Rx power is good on all of them.',
      question: 'What does this indicate?',
      options: ['Physical layer fault only', 'OLT/PLOAM messaging issue', 'All ONTs need replacement', 'Dirty customer jumpers only'],
      correctAnswer: 1,
      explanation: 'LOAMI with good power across multiple ONTs suggests OLT/PON control messaging rather than a simple optical loss issue.'
    },
    {
      id: 32,
      type: 'single',
      difficulty: 'hard',
      domain: 'Test Equipment',
      question: 'Why should reference cords be treated as precision test equipment?',
      options: ['Bad reference cords contaminate every measurement', 'They set Wi-Fi channels', 'They power splitters', 'They replace inspection scopes'],
      correctAnswer: 0,
      explanation: 'Reference cords are part of the test system; worn or dirty cords make test results unreliable.'
    },
    {
      id: 33,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Test Equipment',
      question: 'Referencing/zeroing an OLTS before each test set is optional if the meter was recently calibrated.',
      correctAnswer: false,
      explanation: 'FALSE. Referencing establishes the baseline for that specific cords/adapters/test setup.'
    },
    {
      id: 34,
      type: 'single',
      difficulty: 'hard',
      domain: 'Fault Isolation',
      question: 'What documentation is critical after troubleshooting?',
      options: ['Customer signature only', 'Root cause, actions, before/after measurements, and prevention notes', 'Time spent only', 'Parts cost only'],
      correctAnswer: 1,
      explanation: 'Good documentation supports closure, repeat troubleshooting, and preventive maintenance.'
    },
    {
      id: 35,
      type: 'single',
      difficulty: 'hard',
      domain: 'Connector Inspection',
      question: 'Burnt residue or pitting on a connector end face usually indicates:',
      options: ['Normal wear', 'High-power damage requiring replacement', 'Clean connector', 'Acceptable dust cap residue'],
      correctAnswer: 1,
      explanation: 'Burn or pitting damage is not fixed by cleaning; the connector should be replaced or reterminated.'
    },
    {
      id: 36,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Bidirectional Analysis',
      scenario: 'Splice measurement: A-to-B = +0.05 dB gainer, B-to-A = 0.15 dB loss.',
      question: 'What is the true splice loss?',
      options: ['-0.05 dB', '0.05 dB', '0.10 dB', '0.20 dB'],
      correctAnswer: 1,
      explanation: 'Treat the gainer as -0.05 dB. True loss = (-0.05 + 0.15) / 2 = 0.05 dB.'
    },
    {
      id: 37,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      question: 'A receive fiber at the far end helps measure the last connector loss accurately.',
      correctAnswer: true,
      explanation: 'TRUE. The receive fiber moves the far-end connector outside the end-reflection dead zone.'
    },
    {
      id: 38,
      type: 'single',
      difficulty: 'hard',
      domain: 'Splitter Failures',
      question: 'What test confirms splitter output uniformity?',
      options: ['OTDR at one port only', 'Power meter at input and each output port', 'Visual inspection only', 'Wi-Fi throughput test'],
      correctAnswer: 1,
      explanation: 'Measure input and each output to calculate actual output loss and compare port-to-port uniformity.'
    },
    {
      id: 39,
      type: 'single',
      difficulty: 'hard',
      domain: 'Intermittent Faults',
      question: 'Time-based intermittent faults are often caused by:',
      options: ['Only dirty connectors', 'Network congestion, schedules, or environmental patterns', 'Always splitter failure', 'Always fiber breaks'],
      correctAnswer: 1,
      explanation: 'Recurring time patterns may be load/schedule-related or environmental, so timing must be documented.'
    },
    {
      id: 40,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Documentation',
      scenario: 'You complete a repair. The customer confirms service is working. Your company requires full documentation.',
      question: 'What must be included?',
      options: ['Customer confirmation only', 'Before/after power, traces/photos, root cause, actions, and time', 'Work order number only', 'Parts used only'],
      correctAnswer: 1,
      explanation: 'Complete documentation proves the repair, records the root cause, and provides future baseline data.'
    },
    {
      id: 41,
      type: 'single',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      source: 'FOA OTDR FAQ',
      question: 'Why can OTDR testing produce misleading results on short premises links?',
      options: ['Dead zones, reflections, and indirect loss calculations can dominate the trace', 'Short cables always have too much attenuation', 'Premises links cannot reflect light', 'OTDRs only work on multimode fiber'],
      correctAnswer: 0,
      explanation: 'FOA guidance warns OTDRs can be inappropriate on short links because resolution limits and artifacts may dominate results.'
    },
    {
      id: 42,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      source: 'FOA OTDR FAQ',
      question: 'Insertion-loss testing should still be performed even when OTDR traces are required by contract.',
      correctAnswer: true,
      explanation: 'TRUE. Source/power meter or OLTS testing measures end-to-end insertion loss more like actual link operation.'
    },
    {
      id: 43,
      type: 'single',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      source: 'FOA OTDR FAQ',
      question: 'What is the main limitation of OTDR joint-loss measurements?',
      options: ['They are directional and affected by fiber backscatter differences', 'They cannot show distance', 'They only work at visible wavelengths', 'They require copper continuity'],
      correctAnswer: 0,
      explanation: 'OTDR joint loss varies with direction when backscatter coefficients differ.'
    },
    {
      id: 44,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Bidirectional Analysis',
      source: 'FOA OTDR References',
      scenario: 'A splice measures +0.08 dB from A to B and 0.22 dB from B to A.',
      question: 'What is the true splice loss?',
      options: ['0.07 dB', '0.15 dB', '0.22 dB', '0.30 dB'],
      correctAnswer: 0,
      explanation: 'Treat the gainer as -0.08 dB. True loss = (-0.08 + 0.22) / 2 = 0.07 dB.'
    },
    {
      id: 45,
      type: 'single',
      difficulty: 'hard',
      domain: 'Ghost Events',
      source: 'FOA OTDR FAQ',
      question: 'Which pattern most strongly suggests an OTDR ghost event?',
      options: ['A weaker event at an exact multiple of a strong reflective event with no known component', 'A non-reflective splice at a planned splice point', 'A fiber-end reflection at the documented cable end', 'A gradual slope across a long fiber span'],
      correctAnswer: 0,
      explanation: 'Ghosts are false reflection artifacts, often appearing at multiples of strong reflective events.'
    },
    {
      id: 46,
      type: 'single',
      difficulty: 'hard',
      domain: 'Reflectance',
      source: 'FOA Reflectance Reference',
      question: 'What connector polish generally provides the lowest reflectance?',
      options: ['APC angled physical contact', 'Flat air-gap', 'Standard PC only', 'Unpolished ferrule'],
      correctAnswer: 0,
      explanation: 'APC polish angles the fiber end face to reduce back reflection.'
    },
    {
      id: 47,
      type: 'single',
      difficulty: 'hard',
      domain: 'Reflectance',
      source: 'FOA Reflectance Reference',
      question: 'What typical reflectance value is associated with APC connectors?',
      options: ['Around -60 dB or better', 'Around -20 dB', 'Around -5 dB', '0 dB'],
      correctAnswer: 0,
      explanation: 'APC connectors are commonly associated with about -60 dB reflectance or better.'
    },
    {
      id: 48,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Reflectance',
      source: 'FOA Reflectance Reference',
      question: 'Reflectance is especially sensitive to connector cleanliness.',
      correctAnswer: true,
      explanation: 'TRUE. Contamination changes the optical interface and can increase reflection and loss.'
    },
    {
      id: 49,
      type: 'single',
      difficulty: 'hard',
      domain: 'Connector Inspection',
      source: 'IEC 61300-3-35 public guidance',
      question: 'What is the correct inspection workflow for a fiber connector end face?',
      options: ['Inspect, clean if needed, then inspect again', 'Clean once and connect without inspecting', 'Inspect only after the link fails', 'Use a VFL instead of inspection'],
      correctAnswer: 0,
      explanation: 'Inspect-clean-inspect verifies contamination is removed before mating.'
    },
    {
      id: 50,
      type: 'single',
      difficulty: 'hard',
      domain: 'Connector Inspection',
      source: 'IEC 61300-3-35 public guidance',
      question: 'Which connector zone is most critical because defects directly affect the guided optical signal?',
      options: ['Core zone', 'Contact/ferrule outer zone', 'Connector boot', 'Dust cap exterior'],
      correctAnswer: 0,
      explanation: 'The core zone carries the signal and is the most sensitive area.'
    },
    {
      id: 51,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Wavelength Issues',
      source: 'FOA Bend Loss References',
      scenario: 'A link passes at 1310nm but fails at 1550nm after a cabinet cleanup.',
      question: 'What is the most likely physical cause?',
      options: ['A macrobend introduced during cable dressing', 'An OLT software issue', 'A wrong customer VLAN', 'A missing DHCP lease'],
      correctAnswer: 0,
      explanation: 'Longer wavelengths are more bend-sensitive, so this pattern strongly suggests macrobending.'
    },
    {
      id: 52,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Wavelength Issues',
      source: 'FOA Bend Loss References',
      question: 'Macrobend loss is generally more severe at longer wavelengths.',
      correctAnswer: true,
      explanation: 'TRUE. 1550nm and 1577nm are useful for identifying bend-sensitive problems.'
    },
    {
      id: 53,
      type: 'single',
      difficulty: 'hard',
      domain: 'PON Diagnostics',
      source: 'GPON/XGS-PON operations concepts',
      question: 'What does a burst of upstream errors across multiple ONTs on the same PON most likely indicate?',
      options: ['A shared upstream path issue such as timing, splitter, feeder, or OLT impairment', 'Every customer router failed simultaneously', 'A single customer Wi-Fi issue', 'A billing-system outage'],
      correctAnswer: 0,
      explanation: 'Multiple ONTs with similar upstream errors point toward shared PON infrastructure or control timing.'
    },
    {
      id: 54,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'PON Diagnostics',
      source: 'GPON/XGS-PON operations concepts',
      scenario: 'One ONT has low Rx power and errors. All other ONTs on the PON are clean.',
      question: 'Where should troubleshooting focus first?',
      options: ['Drop fiber, premise connector, ONT patching, or customer-side path', 'OLT chassis replacement', 'Feeder cable replacement', 'All splitter outputs'],
      correctAnswer: 0,
      explanation: 'A single affected ONT usually points to its dedicated path, not the shared PON.'
    },
    {
      id: 55,
      type: 'single',
      difficulty: 'hard',
      domain: 'Error Analysis',
      source: 'PON performance monitoring concepts',
      question: 'Why should rising FEC-corrected errors be investigated even when FEC-uncorrectable errors remain zero?',
      options: ['They can indicate degrading optical margin before packet loss appears', 'They prove the link is perfect', 'They only measure Wi-Fi interference', 'They are generated by billing systems'],
      correctAnswer: 0,
      explanation: 'Corrected-error trends can reveal early degradation before customer-impacting errors occur.'
    },
    {
      id: 56,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Fault Isolation',
      source: 'FOA Network Troubleshooting',
      scenario: 'A neighborhood outage affects every ONT behind one splitter, but other splitters on the same OLT port are online.',
      question: 'What is the most likely fault domain?',
      options: ['Splitter input/output assembly or distribution after the shared point', 'OLT uplink routing', 'Every ONT power supply', 'Customer Wi-Fi congestion'],
      correctAnswer: 0,
      explanation: 'The scope points to the common splitter group infrastructure.'
    },
    {
      id: 57,
      type: 'single',
      difficulty: 'hard',
      domain: 'Fault Isolation',
      source: 'FOA Network Troubleshooting',
      question: 'What is the best first step when troubleshooting a complex intermittent fiber problem?',
      options: ['Define scope, timeline, and repeatability before replacing parts', 'Replace the ONT immediately', 'Increase the split ratio', 'Clear alarms and close the ticket'],
      correctAnswer: 0,
      explanation: 'Disciplined scoping prevents unnecessary replacement and identifies patterns.'
    },
    {
      id: 58,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Intermittent Faults',
      source: 'FOA Network Troubleshooting',
      scenario: 'Aerial drop service fails only during high wind and recovers afterward.',
      question: 'What test approach best fits the suspected fault?',
      options: ['Monitor optical power while flexing/moving the drop and connectors', 'Only run a speed test indoors', 'Replace the billing account', 'Change DHCP scope'],
      correctAnswer: 0,
      explanation: 'Wind-related faults often involve mechanical movement and can be reproduced with live optical monitoring.'
    },
    {
      id: 59,
      type: 'single',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      source: 'FOA OTDR FAQ',
      question: 'What does changing the launch cable help confirm when analyzing questionable OTDR events?',
      options: ['Whether events are artifacts tied to the test setup', 'Whether the OLT MAC address changed', 'Whether the ONT is provisioned', 'Whether the speed tier changed'],
      correctAnswer: 0,
      explanation: 'Artifacts may move or change with the test setup; real plant events stay fixed.'
    },
    {
      id: 60,
      type: 'single',
      difficulty: 'hard',
      domain: 'OTDR Advanced',
      source: 'FOA OTDR FAQ',
      question: 'Why must OTDR index of refraction settings be correct?',
      options: ['Distance calculations depend on light speed through the fiber', 'It changes connector polish type', 'It powers the laser safely', 'It sets subscriber speed profile'],
      correctAnswer: 0,
      explanation: 'OTDR distance is calculated from light time-of-flight through the fiber.'
    },
    {
      id: 61,
      type: 'fillin',
      difficulty: 'hard',
      domain: 'Reflectance',
      source: 'FOA Reflectance Reference',
      question: 'A connector polish with an 8-degree angle is commonly called _____.',
      correctAnswer: ['APC', 'apc', 'angled physical contact'],
      explanation: 'APC means Angled Physical Contact.'
    },
    {
      id: 62,
      type: 'fillin',
      difficulty: 'hard',
      domain: 'Wavelength Issues',
      source: 'FOA Bend Loss References',
      question: 'If 1550nm loss is much higher than 1310nm loss, suspect a _____.',
      correctAnswer: ['macrobend', 'macro bend', 'bend', 'bending issue'],
      explanation: 'Macrobends are more visible at longer wavelengths.'
    },
    {
      id: 63,
      type: 'scenario',
      difficulty: 'hard',
      domain: 'Documentation',
      source: 'FOA OTDR and troubleshooting references',
      scenario: 'A repair improves ONT Rx from -28.5 dBm to -22.0 dBm and clears FEC uncorrectable errors.',
      question: 'Which documentation best supports closure?',
      options: ['Before/after power, counters, photos, OTDR/OLTS evidence, root cause, and corrective action', 'Customer said it works', 'The ONT rebooted once', 'The truck roll time only'],
      correctAnswer: 0,
      explanation: 'Strong closure documentation proves improvement and creates a future baseline.'
    },
    {
      id: 64,
      type: 'truefalse',
      difficulty: 'hard',
      domain: 'Fault Isolation',
      source: 'FOA Network Troubleshooting',
      question: 'Fault isolation should start by determining whether the issue affects one ONT, one splitter group, one PON, or a wider network area.',
      correctAnswer: true,
      explanation: 'TRUE. Scope determines the most likely fault domain.'
    },
    {
      id: 65,
      type: 'single',
      difficulty: 'hard',
      domain: 'Test Equipment',
      source: 'FOA Testing References',
      question: 'Why should reference cords be treated as precision test equipment?',
      options: ['Bad reference cords contaminate every loss measurement that depends on them', 'They set Wi-Fi channels', 'They increase OLT split capacity', 'They replace cleaning tools'],
      correctAnswer: 0,
      explanation: 'Reference cords are part of the measurement chain and must be clean, inspected, and protected.'
    }
  ]
};

export default FIBER103_QUESTIONS;