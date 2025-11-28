// FiberTech Pro - Industry Standard Reference Values
// Sources: TIA-568-D, IEC 61300, ITU-T G.652/G.657, IEEE 802.3, Telcordia GR-326-CORE
// FOA Reference Guide 2024-2025, CommScope/Corning 2025 specifications

export const FIBER_ATTENUATION = {
  // Single Mode Fiber (OS2) - ITU-T G.652.D / TIA-568-D.3
  SMF: {
    "1310nm": 0.35, // dB/km max per TIA-568-D.3
    "1550nm": 0.25, // dB/km max
    "1625nm": 0.30, // dB/km (OTDR test wavelength)
  },
  // G.657.A1/A2 Bend-Insensitive SMF
  "G.657": {
    "1310nm": 0.35,
    "1550nm": 0.25,
    "1625nm": 0.30,
  },
  // Multimode Fiber - TIA-568-D.1
  OM3: {
    "850nm": 3.0,  // dB/km
    "1300nm": 1.0, // dB/km
  },
  OM4: {
    "850nm": 3.0,
    "1300nm": 1.0,
  },
  OM5: {
    "850nm": 3.0,
    "953nm": 2.3,  // SWDM wavelength
    "1300nm": 1.0,
  },
};

export const CONNECTOR_LOSS = {
  // Per TIA-568-D and Telcordia GR-326-CORE Issue 5
  elite: {
    smf: 0.15,  // dB max (Grade A)
    mmf: 0.15,  // dB max
    description: "Factory-terminated, premium grade connectors"
  },
  standard: {
    smf: 0.50,  // dB max (Grade B) - TIA-568-D typical
    mmf: 0.50,  // dB max
    description: "Field-terminated or standard grade"
  },
  // Typical measured values (FOA Reference)
  typical: {
    lc_smf: 0.10,
    sc_smf: 0.15,
    mpo_smf: 0.35,
    lc_mmf: 0.10,
    sc_mmf: 0.15,
    mpo_mmf: 0.20,
  }
};

export const SPLICE_LOSS = {
  // Per TIA-568-D and IEC 61073
  fusion: {
    smf: 0.10,  // dB max typical
    mmf: 0.10,  // dB max
    excellent: 0.02, // Achievable with modern splicers
    description: "Arc fusion splice"
  },
  mechanical: {
    smf: 0.30,  // dB max
    mmf: 0.30,  // dB max
    description: "Mechanical splice"
  }
};

export const STANDARD_BUDGETS = {
  // IEEE 802.3 and ITU-T specifications
  "10GBASE-SR": {
    wavelength: "850nm",
    fiber: "OM3/OM4",
    maxLoss: 2.6,
    maxDistance: { OM3: 300, OM4: 400 },
    standard: "IEEE 802.3ae"
  },
  "10GBASE-LR": {
    wavelength: "1310nm",
    fiber: "OS2",
    maxLoss: 6.2,
    maxDistance: 10000,
    standard: "IEEE 802.3ae"
  },
  "10GBASE-ER": {
    wavelength: "1550nm",
    fiber: "OS2",
    maxLoss: 11.0,
    maxDistance: 40000,
    standard: "IEEE 802.3ae"
  },
  "25GBASE-LR": {
    wavelength: "1310nm",
    fiber: "OS2",
    maxLoss: 6.3,
    maxDistance: 10000,
    standard: "IEEE 802.3by"
  },
  "100GBASE-SR4": {
    wavelength: "850nm",
    fiber: "OM4",
    maxLoss: 1.9,
    maxDistance: 100,
    standard: "IEEE 802.3bm"
  },
  "100GBASE-LR4": {
    wavelength: "1310nm",
    fiber: "OS2",
    maxLoss: 6.3,
    maxDistance: 10000,
    standard: "IEEE 802.3ba"
  },
  "100GBASE-ER4": {
    wavelength: "1550nm",
    fiber: "OS2",
    maxLoss: 15.0,
    maxDistance: 40000,
    standard: "IEEE 802.3ba"
  },
  "400GBASE-SR8": {
    wavelength: "850nm",
    fiber: "OM4",
    maxLoss: 1.9,
    maxDistance: 100,
    standard: "IEEE 802.3cm"
  },
  "400GBASE-DR4": {
    wavelength: "1310nm",
    fiber: "OS2",
    maxLoss: 3.0,
    maxDistance: 500,
    standard: "IEEE 802.3bs"
  },
  "400GBASE-FR4": {
    wavelength: "1310nm",
    fiber: "OS2",
    maxLoss: 4.0,
    maxDistance: 2000,
    standard: "IEEE 802.3cu"
  },
  "400GBASE-LR4": {
    wavelength: "1310nm",
    fiber: "OS2",
    maxLoss: 6.0,
    maxDistance: 10000,
    standard: "IEEE 802.3cu"
  },
  "400GBASE-ZR": {
    wavelength: "1550nm (C-band)",
    fiber: "OS2",
    maxLoss: 20.0,
    maxDistance: 80000,
    standard: "OIF 400ZR"
  },
  // PON Standards - ITU-T G.984/G.987/G.989
  "GPON Class B+": {
    wavelength: "1310/1490nm",
    fiber: "OS2",
    maxLoss: 28.0,
    maxDistance: 20000,
    standard: "ITU-T G.984.2"
  },
  "GPON Class C+": {
    wavelength: "1310/1490nm",
    fiber: "OS2",
    maxLoss: 32.0,
    maxDistance: 20000,
    standard: "ITU-T G.984.2 Amd.2"
  },
  "XGS-PON N1": {
    wavelength: "1270/1577nm",
    fiber: "OS2",
    maxLoss: 29.0,
    maxDistance: 20000,
    standard: "ITU-T G.9807.1"
  },
  "XGS-PON N2": {
    wavelength: "1270/1577nm",
    fiber: "OS2",
    maxLoss: 31.0,
    maxDistance: 40000,
    standard: "ITU-T G.9807.1"
  },
  "25G-PON": {
    wavelength: "1270/1358nm",
    fiber: "OS2",
    maxLoss: 29.0,
    maxDistance: 20000,
    standard: "ITU-T G.9804.3"
  },
  "50G-PON": {
    wavelength: "1340/1280nm",
    fiber: "OS2",
    maxLoss: 31.0,
    maxDistance: 20000,
    standard: "ITU-T G.9804.3"
  }
};

export const OTDR_EVENTS = {
  reflective: {
    connector_good: { reflectance: "<-45 dB", loss: "<0.3 dB", description: "Good mated connector pair" },
    connector_marginal: { reflectance: "-45 to -35 dB", loss: "0.3-0.5 dB", description: "Needs cleaning/inspection" },
    connector_fail: { reflectance: ">-35 dB", loss: ">0.5 dB", description: "Contaminated or damaged" },
    mechanical_splice: { reflectance: "-40 to -50 dB", loss: "0.1-0.5 dB", description: "Typical mechanical splice" },
    crack_break: { reflectance: "-14 to -25 dB", loss: "High/Total", description: "Fiber break or crack" },
    end_of_fiber: { reflectance: "-14 dB (cleaved)", loss: "N/A", description: "Open fiber end" },
  },
  nonReflective: {
    fusion_splice: { loss: "0.02-0.10 dB", description: "Good fusion splice" },
    macrobend: { loss: "Variable, wavelength dependent", description: "Higher loss at 1550/1625nm" },
    microbend: { loss: "Distributed loss increase", description: "Often from cable stress" },
  }
};

export const REFLECTANCE_LIMITS = {
  // Per TIA-568-D and Telcordia GR-326
  "PC (Physical Contact)": -40,      // dB min
  "UPC (Ultra PC)": -50,             // dB min  
  "APC (Angled PC)": -60,            // dB min
  "Fusion Splice": -60,              // dB typical
  "Mechanical Splice": -40,          // dB min
};

export const CLEANING_PROCEDURES = {
  dust_particles: {
    severity: "Low",
    method: "Dry clean first",
    steps: [
      "Use fiber optic cleaning card or lint-free wipe",
      "Swipe in one direction only",
      "Inspect with 400x scope",
      "Repeat if necessary"
    ]
  },
  oil_film: {
    severity: "Medium",
    method: "Wet then dry clean",
    steps: [
      "Apply IPA (99%+) or fiber cleaning solvent to lint-free wipe",
      "Clean end-face with wet portion",
      "Immediately follow with dry portion",
      "Inspect with 400x scope",
      "Repeat if residue remains"
    ]
  },
  scratches: {
    severity: "High",
    method: "Cannot clean - replace",
    steps: [
      "Scratches in core zone cannot be cleaned",
      "Document with scope photo",
      "Replace connector/patch cord",
      "If pigtail, re-terminate"
    ]
  },
  pitting_chips: {
    severity: "Critical",
    method: "Cannot repair - replace",
    steps: [
      "Pitting indicates physical damage",
      "May be caused by mating with contaminated connector",
      "Document damage",
      "Replace connector assembly"
    ]
  },
  embedded_debris: {
    severity: "High",
    method: "Wet clean with pressure",
    steps: [
      "Use canned air (fiber-safe) first",
      "Apply cleaning solvent",
      "Use cleaning stick with pressure",
      "Inspect and repeat",
      "If debris remains embedded, replace"
    ]
  }
};

export const INSPECTION_ZONES = {
  // Per IEC 61300-3-35
  smf: {
    core: { diameter: 9, description: "Core zone - must be defect free" },
    cladding: { diameter: 125, description: "Cladding - no scratches >3μm" },
    adhesive: { diameter: 130, description: "Adhesive zone" },
    contact: { diameter: 250, description: "Contact/ferrule zone" }
  },
  mmf: {
    core: { diameter: 50, description: "Core zone (OM3/4) - must be defect free" },
    cladding: { diameter: 125, description: "Cladding zone" },
    adhesive: { diameter: 130, description: "Adhesive zone" },
    contact: { diameter: 250, description: "Contact/ferrule zone" }
  }
};

export const FIBER_COLORS = {
  // TIA-598-D Fiber Identification Colors
  tubes: [
    { position: 1, color: "Blue", hex: "#0000FF" },
    { position: 2, color: "Orange", hex: "#FF8000" },
    { position: 3, color: "Green", hex: "#00FF00" },
    { position: 4, color: "Brown", hex: "#8B4513" },
    { position: 5, color: "Slate", hex: "#708090" },
    { position: 6, color: "White", hex: "#FFFFFF" },
    { position: 7, color: "Red", hex: "#FF0000" },
    { position: 8, color: "Black", hex: "#000000" },
    { position: 9, color: "Yellow", hex: "#FFFF00" },
    { position: 10, color: "Violet", hex: "#EE82EE" },
    { position: 11, color: "Rose", hex: "#FF007F" },
    { position: 12, color: "Aqua", hex: "#00FFFF" }
  ],
  jacketTypes: {
    SMF_OS2: { color: "Yellow", description: "Single-mode OS2" },
    OM1: { color: "Orange", description: "Multimode OM1 62.5μm" },
    OM2: { color: "Orange", description: "Multimode OM2 50μm" },
    OM3: { color: "Aqua", description: "Multimode OM3 50μm laser-optimized" },
    OM4: { color: "Aqua/Violet", description: "Multimode OM4 50μm" },
    OM5: { color: "Lime Green", description: "Multimode OM5 WBMMF" }
  }
};

export const ETHERNET_CABLES = [
  {
    category: 'Cat5e',
    maxSpeed: '1 Gbps',
    maxDistance: '100m',
    frequency: '100 MHz',
    useCase: 'Home networks, VoIP, basic office LANs',
    shielding: 'UTP (Unshielded)',
  },
  {
    category: 'Cat6',
    maxSpeed: '1 Gbps (10 Gbps up to 55m)',
    maxDistance: '100m',
    frequency: '250 MHz',
    useCase: 'Modern LANs, PoE+, Gigabit networks',
    shielding: 'UTP or STP',
  },
  {
    category: 'Cat6a',
    maxSpeed: '10 Gbps',
    maxDistance: '100m',
    frequency: '500 MHz',
    useCase: 'Data centers, 10GBASE-T, high-bandwidth applications',
    shielding: 'STP (Shielded)',
  },
  {
    category: 'Cat7',
    maxSpeed: '10 Gbps',
    maxDistance: '100m',
    frequency: '600 MHz',
    useCase: 'High-performance data centers, future-proofing',
    shielding: 'S/FTP (Individually shielded pairs)',
  },
  {
    category: 'Cat7a',
    maxSpeed: '10 Gbps (40 Gbps short runs)',
    maxDistance: '100m',
    frequency: '1000 MHz',
    useCase: 'Enterprise data centers, broadband video',
    shielding: 'S/FTP',
  },
  {
    category: 'Cat8',
    maxSpeed: '25/40 Gbps',
    maxDistance: '30m',
    frequency: '2000 MHz',
    useCase: 'Short data center links, server-to-switch connections',
    shielding: 'S/FTP',
  },
];

export const ETHERNET_WIRING = {
  straightThrough: {
    name: 'Straight-Through (Patch) Cable',
    description: 'Used to connect different types of devices (PC to switch, router to switch). Both ends use the same pin configuration.',
    standard: 'T568B on both ends (most common) or T568A on both ends',
    uses: ['PC to Switch/Hub', 'Router to Switch/Hub', 'Server to Switch'],
    pinout: [
      { pin: 1, color: 'Orange/White', signal: 'TX+' },
      { pin: 2, color: 'Orange', signal: 'TX-' },
      { pin: 3, color: 'Green/White', signal: 'RX+' },
      { pin: 4, color: 'Blue', signal: 'Unused' },
      { pin: 5, color: 'Blue/White', signal: 'Unused' },
      { pin: 6, color: 'Green', signal: 'RX-' },
      { pin: 7, color: 'Brown/White', signal: 'Unused' },
      { pin: 8, color: 'Brown', signal: 'Unused' },
    ]
  },
  crossover: {
    name: 'Crossover Cable',
    description: 'Used to connect similar devices directly (PC to PC, switch to switch). TX and RX pairs are crossed between ends.',
    standard: 'T568A on one end, T568B on the other end',
    uses: ['PC to PC', 'Switch to Switch', 'Router to Router', 'Hub to Hub'],
    pinoutA: [
      { pin: 1, color: 'Green/White', signal: 'TX+' },
      { pin: 2, color: 'Green', signal: 'TX-' },
      { pin: 3, color: 'Orange/White', signal: 'RX+' },
      { pin: 4, color: 'Blue', signal: 'Unused' },
      { pin: 5, color: 'Blue/White', signal: 'Unused' },
      { pin: 6, color: 'Orange', signal: 'RX-' },
      { pin: 7, color: 'Brown/White', signal: 'Unused' },
      { pin: 8, color: 'Brown', signal: 'Unused' },
    ],
    pinoutB: [
      { pin: 1, color: 'Orange/White', signal: 'RX+' },
      { pin: 2, color: 'Orange', signal: 'RX-' },
      { pin: 3, color: 'Green/White', signal: 'TX+' },
      { pin: 4, color: 'Blue', signal: 'Unused' },
      { pin: 5, color: 'Blue/White', signal: 'Unused' },
      { pin: 6, color: 'Green', signal: 'TX-' },
      { pin: 7, color: 'Brown/White', signal: 'Unused' },
      { pin: 8, color: 'Brown', signal: 'Unused' },
    ]
  },
  rollover: {
    name: 'Rollover (Console) Cable',
    description: 'Used for console access to network devices like routers and switches. Pin 1 connects to Pin 8, Pin 2 to Pin 7, etc.',
    standard: 'Pins are reversed end-to-end (1↔8, 2↔7, 3↔6, 4↔5)',
    uses: ['PC to Router Console Port', 'PC to Switch Console Port', 'Terminal Server connections'],
    pinoutA: [
      { pin: 1, color: 'Blue', signal: 'RTS' },
      { pin: 2, color: 'Orange', signal: 'DTR' },
      { pin: 3, color: 'Black', signal: 'TXD' },
      { pin: 4, color: 'Red', signal: 'GND' },
      { pin: 5, color: 'Green', signal: 'GND' },
      { pin: 6, color: 'Yellow', signal: 'RXD' },
      { pin: 7, color: 'Brown', signal: 'DSR' },
      { pin: 8, color: 'White', signal: 'CTS' },
    ],
    pinoutB: [
      { pin: 1, color: 'White', signal: 'CTS' },
      { pin: 2, color: 'Brown', signal: 'DSR' },
      { pin: 3, color: 'Yellow', signal: 'RXD' },
      { pin: 4, color: 'Green', signal: 'GND' },
      { pin: 5, color: 'Red', signal: 'GND' },
      { pin: 6, color: 'Black', signal: 'TXD' },
      { pin: 7, color: 'Orange', signal: 'DTR' },
      { pin: 8, color: 'Blue', signal: 'RTS' },
    ]
  }
};

export const WAVELENGTH_INFO = {
  "850nm": { type: "Multimode", application: "Short-reach datacenter", window: "First" },
  "1300nm": { type: "Multimode", application: "Extended multimode", window: "Second" },
  "1310nm": { type: "Singlemode", application: "Metro/Access", window: "O-band" },
  "1490nm": { type: "Singlemode", application: "GPON downstream", window: "S-band" },
  "1550nm": { type: "Singlemode", application: "Long-haul, DWDM", window: "C-band" },
  "1577nm": { type: "Singlemode", application: "XGS-PON downstream", window: "L-band" },
  "1625nm": { type: "Singlemode", application: "OTDR test/monitoring", window: "U-band" }
};