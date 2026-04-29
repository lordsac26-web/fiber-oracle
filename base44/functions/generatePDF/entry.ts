import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ─── Text Sanitizer ───────────────────────────────────────────────────────────
// jsPDF built-in helvetica only covers Latin-1 (ISO 8859-1, code points 0x00-0xFF).
// Any character outside that range renders as a garbled replacement glyph (e.g. "ï¿½").
// We must explicitly map every known special character before the final catch-all strip.
function s(text) {
  if (!text) return '';
  return String(text)
    // Typographic quotes -> straight quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Dashes: en-dash, em-dash, figure dash, horizontal bar -> hyphen
    .replace(/[\u2013\u2014\u2012\u2015]/g, '-')
    // Ellipsis
    .replace(/\u2026/g, '...')
    // Bullet / middle dot / star
    .replace(/[\u2022\u00B7\u2027]/g, '*')
    .replace(/[\u2605\u2606]/g, '*')
    // Math symbols
    .replace(/\u2264/g, '<=')   // <=
    .replace(/\u2265/g, '>=')   // >=
    .replace(/\u00B1/g, '+/-')  // +/-
    .replace(/\u00D7/g, 'x')    // x
    .replace(/\u00F7/g, '/')    // /
    .replace(/\u00B0/g, 'deg')  // deg
    // Micro / mu symbols
    .replace(/(\d+\.?\d*)\s*[\u03BC\u00B5]m/g, '$1um')
    .replace(/[\u03BC\u00B5]/g, 'u')
    // Copyright, registered, trademark
    .replace(/\u00A9/g, '(c)')
    .replace(/\u00AE/g, '(R)')
    .replace(/\u2122/g, '(TM)')
    // Non-breaking space
    .replace(/\u00A0/g, ' ')
    // Fraction/division slash
    .replace(/[\u2044\u2215]/g, '/')
    // Superscript numbers
    .replace(/\u00B9/g, '1').replace(/\u00B2/g, '2').replace(/\u00B3/g, '3')
    // Arrows
    .replace(/[\u2190]/g, '<-').replace(/[\u2192]/g, '->').replace(/[\u2194]/g, '<->')
    .replace(/[\u21D0]/g, '<-').replace(/[\u21D2]/g, '->').replace(/[\u21D4]/g, '<->')
    // Checkmarks / X marks
    .replace(/[\u2713\u2714]/g, '[OK]').replace(/[\u2717\u2718]/g, '[X]')
    // Strip anything remaining outside Latin-1 that helvetica cannot render
    .replace(/[^\x00-\xFF]/g, '');
}

// ─── Layout Helpers ───────────────────────────────────────────────────────────
function drawPageHeader(doc, pageWidth, title, subtitle, colors) {
  // Deep gradient background
  doc.setFillColor(...colors.headerBg);
  doc.rect(0, 0, pageWidth, 28, 'F');
  // Accent stripe
  doc.setFillColor(...colors.accent);
  doc.rect(0, 28, pageWidth, 3, 'F');
  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FIBER ORACLE', 14, 13);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(s(title), 14, 21);
  // Right-side subtitle
  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(s(subtitle), pageWidth - 14, 17, { align: 'right' });
  }
}

function drawPageFooter(doc, pageWidth, pageHeight, pageNum, totalPages, colors) {
  doc.setFillColor(...colors.footerBg);
  doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
  doc.setTextColor(180, 190, 210);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('fiberoracle.com', 14, pageHeight - 5);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), pageWidth - 14, pageHeight - 5, { align: 'right' });
}

function sectionHeader(doc, label, x, y, w, colors) {
  doc.setFillColor(...colors.sectionBar);
  doc.roundedRect(x, y, w, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(s(label).toUpperCase(), x + 4, y + 5);
  return y + 11;
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type, data } = await req.json();
    let pdfBytes;

    switch (type) {
      case 'brochure':    pdfBytes = generateBrochurePDF(); break;
      case 'studyGuide':  pdfBytes = generateStudyGuidePDF(data); break;
      case 'jobReport':   pdfBytes = generateJobReportPDF(data); break;
      case 'certificate': pdfBytes = generateCertificatePDF(data); break;
      default: return Response.json({ error: 'Invalid PDF type' }, { status: 400 });
    }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=FiberOracle-${type}-${Date.now()}.pdf`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BROCHURE PDF — flashy 4-page marketing document
// ═══════════════════════════════════════════════════════════════════════════════
function generateBrochurePDF() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const M = 16; // margin
  const CW = W - 2 * M; // content width

  const C = {
    indigo:   [79,  70, 229],
    purple:   [124,  58, 237],
    pink:     [219,  39, 119],
    emerald:  [16, 185, 129],
    blue:     [59, 130, 246],
    amber:    [245,158,  11],
    teal:     [20, 184, 166],
    rose:     [244, 63,  94],
    dark:     [15,  23,  42],
    slate:    [71,  85, 105],
    muted:    [100,116,139],
    light:    [241,245,249],
    white:    [255,255,255],
  };

  // ── PAGE 1: COVER ──────────────────────────────────────────────────────────
  // Full-bleed gradient background
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, W, H, 'F');

  // Diagonal accent bands (fiber optic light streaks)
  const streaks = [
    { x: -20, angle: 15, color: C.indigo, alpha: 0.35, w: 18 },
    { x: 30,  angle: 15, color: C.purple, alpha: 0.25, w: 10 },
    { x: 70,  angle: 15, color: C.pink,   alpha: 0.20, w: 6  },
    { x: 160, angle: 15, color: C.indigo, alpha: 0.18, w: 12 },
    { x: 190, angle: 15, color: C.purple, alpha: 0.22, w: 8  },
  ];
  // Draw top-right glowing corner
  doc.setFillColor(124, 58, 237);
  doc.setGState && doc.setGState(doc.GState({ opacity: 0.15 }));
  doc.ellipse(W, 0, 80, 80, 'F');
  doc.setGState && doc.setGState(doc.GState({ opacity: 1 }));

  // Horizontal accent bar at top
  doc.setFillColor(...C.indigo);
  doc.rect(0, 0, W, 2, 'F');

  // Large title block
  const titleY = 70;
  doc.setTextColor(...C.white);
  doc.setFontSize(52);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiber Oracle', M, titleY);

  // Tagline
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 190, 230);
  doc.text('When You Need to Know, Ask the Oracle.', M, titleY + 14);

  // Divider line
  doc.setDrawColor(...C.indigo);
  doc.setLineWidth(0.8);
  doc.line(M, titleY + 20, M + 90, titleY + 20);

  // Sub-tagline
  doc.setFontSize(10);
  doc.setTextColor(120, 140, 180);
  doc.text('The Complete Field Reference for Fiber Optic Professionals', M, titleY + 29);

  // Version badge pill
  const bx = M, by = titleY + 38;
  doc.setFillColor(...C.indigo);
  doc.roundedRect(bx, by, 42, 8, 4, 4, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('VERSION 2.1  |  2026', bx + 21, by + 5.5, { align: 'center' });

  // ── STATS ROW ────────────────────────────────────────────────────────────
  const statsY = 135;
  const statItems = [
    { val: '15+',   lbl: 'Professional Tools', color: C.indigo },
    { val: '200+',  lbl: 'Glossary Terms',      color: C.purple },
    { val: '3',     lbl: 'Course Levels',        color: C.emerald },
    { val: '100%',  lbl: 'Offline Capable',      color: C.amber },
  ];
  const sw = CW / 4;
  statItems.forEach((st, i) => {
    const sx = M + sw * i + sw / 2;
    // Pill background
    doc.setFillColor(30, 40, 70);
    doc.roundedRect(M + sw * i + 2, statsY, sw - 4, 22, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...st.color);
    doc.text(st.val, sx, statsY + 12, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 140, 180);
    doc.text(st.lbl, sx, statsY + 19, { align: 'center' });
  });

  // ── FEATURE GRID (2×3) ───────────────────────────────────────────────────
  const features = [
    { icon: '~',  title: 'Power Calculator',    desc: 'Predict ONT Rx power for GPON & XGS-PON with pass/fail.', color: C.emerald },
    { icon: 'L',  title: 'Fiber Locator',       desc: 'TIA-598 color coding up to 3,456 fibers. Instant ID.',    color: C.purple  },
    { icon: 'T',  title: 'OLTS / OTDR Wizards', desc: 'Guided Tier-1/2 testing with auto pass/fail analysis.',  color: C.blue    },
    { icon: '+',  title: 'Fiber Doctor',         desc: 'Interactive flowchart diagnosis for any field problem.',  color: C.rose    },
    { icon: 'AI', title: 'AI OTDR Analysis',    desc: 'Upload traces for AI event ID and action items.',         color: C.indigo  },
    { icon: 'Ed', title: 'Education Center',    desc: 'Fiber 101/102/103 courses + certification exams.',       color: C.teal    },
  ];

  const gridTop = 168;
  const cols = 2;
  const rows = 3;
  const fw = CW / cols - 3;
  const fh = 22;

  features.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const fx = M + col * (fw + 6);
    const fy = gridTop + row * (fh + 4);

    doc.setFillColor(20, 28, 55);
    doc.roundedRect(fx, fy, fw, fh, 2, 2, 'F');

    // color accent left bar
    doc.setFillColor(...f.color);
    doc.roundedRect(fx, fy, 3, fh, 1, 1, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(f.title, fx + 7, fy + 7);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 140, 180);
    const descLines = doc.splitTextToSize(f.desc, fw - 10);
    doc.text(descLines, fx + 7, fy + 13);
  });

  // ── WHY SECTION (bottom callout) ─────────────────────────────────────────
  const whyY = 252;
  doc.setFillColor(30, 20, 60);
  doc.roundedRect(M, whyY, CW, 24, 3, 3, 'F');
  doc.setFillColor(...C.purple);
  doc.roundedRect(M, whyY, 3, 24, 1, 1, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Why Fiber Oracle?', M + 7, whyY + 7);

  const whyItems = ['Works 100% Offline', 'Mobile-First Design', 'Current 2026 Standards', 'Free to Use', 'Built by Fiber Techs'];
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 165, 200);
  doc.text(whyItems.join('   |   '), M + 7, whyY + 14);

  doc.setFontSize(6.5);
  doc.setTextColor(80, 100, 140);
  doc.text('Works on phones, tablets, and desktops. No account required for basic tools. TIA / ITU-T / IEC / IEEE compliant.', M + 7, whyY + 20);

  // ── COVER FOOTER ──────────────────────────────────────────────────────────
  doc.setFillColor(10, 14, 35);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(80, 100, 140);
  doc.setFontSize(7);
  doc.text('fiberoracle.com', M, H - 4);
  doc.text('1 of 4', W / 2, H - 4, { align: 'center' });
  doc.text(new Date().getFullYear().toString(), W - M, H - 4, { align: 'right' });


  // ══ PAGE 2: FEATURE DEEP DIVE ════════════════════════════════════════════
  doc.addPage();

  // Header
  doc.setFillColor(15, 10, 40);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...C.indigo);
  doc.rect(0, 0, W, 2, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Feature Highlights', M, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 140, 180);
  doc.text('A closer look at what makes Fiber Oracle the essential tool for field technicians.', M, 30);
  doc.setDrawColor(...C.indigo);
  doc.setLineWidth(0.5);
  doc.line(M, 34, W - M, 34);

  let y2 = 42;
  const deepFeatures = [
    {
      title: 'Power Level Calculator',
      color: C.emerald,
      tags: ['GPON', 'XGS-PON', 'Pass/Fail'],
      desc: 'Enter OLT Tx power, splitter ratio, fiber length, and connector count. Get instant ONT Rx power predictions with color-coded pass/fail status per ITU-T G.984 and G.9807 budget classes.',
    },
    {
      title: 'Advanced Fiber Locator',
      color: C.purple,
      tags: ['TIA-598-D', 'Up to 3456 Fibers', 'Loose Tube & Ribbon'],
      desc: 'Identify any fiber from 12 to 3,456 count cables using TIA-598 standardized color codes. Visual tube/fiber color display with support for loose tube, ribbon, and high-count configurations.',
    },
    {
      title: 'OLTS Tier-1 & OTDR Tier-2 Wizards',
      color: C.blue,
      tags: ['TIA-526-14-C', 'Guided Steps', 'Auto Analysis'],
      desc: 'Step-by-step guided testing for Tier-1 (insertion loss) and Tier-2 (OTDR) certification. Automatic pass/fail based on TIA-568-D channel loss limits. Generates a signed test report.',
    },
    {
      title: 'Fiber Doctor — Interactive Diagnostics',
      color: C.rose,
      tags: ['Flowchart', 'Root Cause', 'Tools List'],
      desc: 'Answer questions about your symptoms and get targeted solutions with required tools and step-by-step procedures. Covers low signal, high BER, physical damage, splice issues, and more.',
    },
    {
      title: 'AI-Powered OTDR Analysis',
      color: C.indigo,
      tags: ['AI/ML', 'Event Analysis', 'Action Items'],
      desc: 'Upload your OTDR trace or enter event data for AI-powered diagnostics. Receive event-by-event analysis with confidence scores, root cause identification, and prioritized corrective actions.',
    },
    {
      title: 'Education Center — Fiber 101 / 102 / 103',
      color: C.teal,
      tags: ['Certification', '3 Courses', 'Study Guides'],
      desc: 'Progressive courses covering Foundations (101), PON & FTTH (102), and Advanced Troubleshooting (103). Each includes interactive slides, downloadable study guides, and a timed certification exam.',
    },
  ];

  deepFeatures.forEach((f) => {
    if (y2 > H - 42) { doc.addPage(); y2 = 20; }
    const bh = 36;
    doc.setFillColor(22, 28, 60);
    doc.roundedRect(M, y2, CW, bh, 2, 2, 'F');

    // left accent
    doc.setFillColor(...f.color);
    doc.roundedRect(M, y2, 4, bh, 1, 1, 'F');

    // title
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(f.title, M + 8, y2 + 8);

    // tags
    let tagX = M + 8;
    const tagY = y2 + 14;
    f.tags.forEach(tag => {
      const tw = doc.getTextWidth(tag) + 6;
      doc.setFillColor(f.color[0], f.color[1], f.color[2]);
      doc.setDrawColor(...f.color);
      doc.setLineWidth(0.3);
      doc.roundedRect(tagX, tagY - 3.5, tw, 5.5, 2, 2, 'S');
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...f.color);
      doc.text(tag, tagX + tw / 2, tagY + 0.5, { align: 'center' });
      tagX += tw + 3;
    });

    // description
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 165, 200);
    const dLines = doc.splitTextToSize(f.desc, CW - 14);
    doc.text(dLines, M + 8, y2 + 22);

    y2 += bh + 5;
  });

  // footer p2
  doc.setFillColor(10, 14, 35);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(80, 100, 140);
  doc.setFontSize(7);
  doc.text('fiberoracle.com', M, H - 4);
  doc.text('2 of 4', W / 2, H - 4, { align: 'center' });
  doc.text(new Date().getFullYear().toString(), W - M, H - 4, { align: 'right' });


  // ══ PAGE 3: STANDARDS + QUICK REFERENCE ═════════════════════════════════
  doc.addPage();
  doc.setFillColor(15, 10, 40);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...C.purple);
  doc.rect(0, 0, W, 2, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Standards & Quick Reference', M, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 140, 180);
  doc.text('All values in Fiber Oracle are sourced from current industry standards.', M, 30);
  doc.setDrawColor(...C.purple);
  doc.setLineWidth(0.5);
  doc.line(M, 34, W - M, 34);

  let y3 = 42;

  // Standards grid
  const stdGroups = [
    { org: 'TIA',      color: C.blue,    stds: ['TIA-568-D (Premises Cabling)', 'TIA-526-14-C (OLTS Testing)', 'TIA-598-D (Color Codes)', 'TIA-758-B (OSP Plant)'] },
    { org: 'ITU-T',    color: C.indigo,  stds: ['G.652 / G.657 (Fiber Types)', 'G.984 (GPON)', 'G.9807.1 (XGS-PON)', 'G.9804 (25G / 50G PON)'] },
    { org: 'IEC',      color: C.teal,    stds: ['IEC 61300-3-35 (Inspection)', 'IEC 60794 (Cable Specs)', 'IEC 61280-4-x (Testing)'] },
    { org: 'Other',    color: C.amber,   stds: ['IEEE 802.3 (Ethernet)', 'Telcordia GR-326 / GR-20', 'NEC Article 770', 'OSHA 1926'] },
  ];

  const sgW = (CW - 6) / 2;
  stdGroups.forEach((g, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const gx = M + col * (sgW + 6);
    const gy = y3 + row * 30;

    doc.setFillColor(22, 28, 60);
    doc.roundedRect(gx, gy, sgW, 28, 2, 2, 'F');
    doc.setFillColor(...g.color);
    doc.roundedRect(gx, gy, 4, 28, 1, 1, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...g.color);
    doc.text(g.org, gx + 7, gy + 7);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 165, 200);
    g.stds.forEach((st, j) => {
      doc.text(st, gx + 7, gy + 13 + j * 4.5);
    });
  });

  y3 += 65;

  // Quick Reference Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Quick Reference Values', M, y3);
  y3 += 7;

  // Table header
  doc.setFillColor(...C.indigo);
  doc.roundedRect(M, y3, CW, 7, 1, 1, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const col1 = M + 3, col2 = M + CW * 0.55, col3 = M + CW * 0.78;
  doc.text('Parameter', col1, y3 + 5);
  doc.text('Value', col2, y3 + 5);
  doc.text('Standard', col3, y3 + 5);
  y3 += 7;

  const refRows = [
    ['SMF Attenuation @ 1310nm', '<= 0.35 dB/km', 'TIA-568-D'],
    ['SMF Attenuation @ 1550nm', '<= 0.25 dB/km', 'TIA-568-D'],
    ['MMF Attenuation @ 850nm',  '<= 3.0 dB/km',  'TIA-568-D'],
    ['Connector Loss (Elite)',    '<= 0.15 dB',    'TIA-568-D'],
    ['Connector Loss (Standard)', '<= 0.50 dB',   'TIA-568-D'],
    ['Fusion Splice Loss',        '<= 0.10 dB',   'TIA-568-D'],
    ['Mechanical Splice Loss',   '<= 0.20 dB',    'TIA-568-D'],
    ['UPC Return Loss',          '< -50 dB',      'GR-326-CORE'],
    ['APC Return Loss',          '< -60 dB',      'GR-326-CORE'],
    ['GPON Budget Class B+',     '28 dB',          'ITU-T G.984.2'],
    ['GPON Budget Class C+',     '32 dB',          'ITU-T G.984.2'],
    ['XGS-PON N1 Budget',        '29 dB',          'ITU-T G.9807.1'],
    ['XGS-PON N2 Budget',        '31 dB',          'ITU-T G.9807.1'],
    ['GPON ONT Rx Range',        '-28 to -8 dBm',  'ITU-T G.984'],
    ['XGS-PON ONT Rx Range',     '-28 to -9 dBm',  'ITU-T G.9807'],
  ];

  refRows.forEach((row, i) => {
    if (y3 > H - 40) { doc.addPage(); y3 = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(22, 28, 60);
      doc.rect(M, y3, CW, 5.5, 'F');
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 195, 220);
    doc.text(s(row[0]), col1, y3 + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.amber);
    doc.text(s(row[1]), col2, y3 + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 120, 160);
    doc.text(s(row[2]), col3, y3 + 4);
    y3 += 5.5;
  });

  y3 += 8;

  // Splitter loss box
  if (y3 < H - 40) {
    doc.setFillColor(20, 12, 50);
    doc.roundedRect(M, y3, CW, 18, 2, 2, 'F');
    doc.setFillColor(...C.purple);
    doc.roundedRect(M, y3, 4, 18, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text('Splitter Loss Reference', M + 8, y3 + 6);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 165, 200);
    doc.text('1:2 = 3.5 dB   |   1:4 = 7.0 dB   |   1:8 = 10.5 dB   |   1:16 = 14.0 dB   |   1:32 = 17.5 dB   |   1:64 = 21.0 dB', M + 8, y3 + 13);
  }

  // footer p3
  doc.setFillColor(10, 14, 35);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(80, 100, 140);
  doc.setFontSize(7);
  doc.text('fiberoracle.com', M, H - 4);
  doc.text('3 of 4', W / 2, H - 4, { align: 'center' });
  doc.text(new Date().getFullYear().toString(), W - M, H - 4, { align: 'right' });


  // ══ PAGE 4: CATEGORIES + CTA ═════════════════════════════════════════════
  doc.addPage();
  doc.setFillColor(15, 10, 40);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...C.emerald);
  doc.rect(0, 0, W, 2, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Module Categories', M, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 140, 180);
  doc.text('Five organized categories covering every aspect of fiber optic fieldwork.', M, 30);
  doc.setDrawColor(...C.emerald);
  doc.setLineWidth(0.5);
  doc.line(M, 34, W - M, 34);

  const cats = [
    { name: 'CALCULATORS', color: C.emerald, items: ['Power Level Calculator (GPON/XGS-PON)', 'Loss Budget Calculator', 'Splitter Loss Reference', 'Optical Calculator', 'Bend Radius Guide'] },
    { name: 'TESTING',     color: C.blue,    items: ['OLTS Tier-1 Wizard', 'OTDR Tier-2 Wizard', 'Fiber Cleaning & Inspection', 'Job Reports', 'PON PM Analysis', 'FEC Corrected Analysis'] },
    { name: 'TROUBLESHOOT',color: C.rose,    items: ['Fiber Doctor Flowchart', 'AI OTDR Analysis (Beta)', 'Impairment Library', 'PON Levels Reference'] },
    { name: 'REFERENCE',   color: C.amber,   items: ['Fiber Locator (12-3,456 fibers)', 'Reference Tables & Glossary', 'LCP/CLCP Database & Map', 'Capacity Planning', 'Industry Links'] },
    { name: 'EDUCATION',   color: C.teal,    items: ['Fiber 101: Foundations', 'Fiber 102: PON & FTTH', 'Fiber 103: Troubleshooting', 'Study Guides', 'Certification Exams'] },
  ];

  let y4 = 42;
  cats.forEach((cat) => {
    if (y4 > H - 40) return;
    const catH = 10 + cat.items.length * 5;
    doc.setFillColor(22, 28, 60);
    doc.roundedRect(M, y4, CW, catH, 2, 2, 'F');
    doc.setFillColor(...cat.color);
    doc.roundedRect(M, y4, 4, catH, 1, 1, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...cat.color);
    doc.text(cat.name, M + 8, y4 + 6);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 165, 200);
    cat.items.forEach((item, j) => {
      doc.text(`  * ${item}`, M + 8, y4 + 11 + j * 5);
    });
    y4 += catH + 4;
  });

  // Bottom CTA box
  const ctaY = H - 70;
  doc.setFillColor(...C.indigo);
  doc.roundedRect(M, ctaY, CW, 46, 3, 3, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Ready to get started?', CW / 2 + M, ctaY + 13, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 255);
  doc.text('Visit fiberoracle.com — free, no account required for basic tools.', CW / 2 + M, ctaY + 22, { align: 'center' });
  doc.text('Works on any device, online or offline.', CW / 2 + M, ctaY + 29, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(160, 180, 255);
  doc.text('Standards: TIA-568-D  |  ITU-T G.984 / G.9807  |  IEC 61300  |  IEEE 802.3  |  FOA Best Practices', CW / 2 + M, ctaY + 38, { align: 'center' });

  // footer p4
  doc.setFillColor(10, 14, 35);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(80, 100, 140);
  doc.setFontSize(7);
  doc.text('fiberoracle.com', M, H - 4);
  doc.text('4 of 4', W / 2, H - 4, { align: 'center' });
  doc.text('© ' + new Date().getFullYear() + ' Fiber Oracle', W - M, H - 4, { align: 'right' });

  return doc.output('arraybuffer');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STUDY GUIDE PDF — clean professional document
// ═══════════════════════════════════════════════════════════════════════════════
function generateStudyGuidePDF(data) {
  const { courseId, title, subtitle, passingScore, sections } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 20;
  const CW = W - 2 * M;

  const courseColors = {
    fiber101: [16, 185, 129],
    fiber102: [59, 130, 246],
    fiber103: [168, 85, 247],
  };
  const accent = courseColors[courseId] || courseColors.fiber101;

  // ── COVER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 3, 'F');

  doc.setFillColor(20, 30, 55);
  doc.roundedRect(M, 60, CW, 80, 4, 4, 'F');
  doc.setFillColor(...accent);
  doc.roundedRect(M, 60, 4, 80, 2, 2, 'F');

  doc.setTextColor(...accent);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FIBER ORACLE EDUCATION CENTER', M + 8, 76);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(s(title), M + 8, 92);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 165, 200);
  doc.text(s(subtitle), M + 8, 103);

  doc.setFillColor(...accent);
  doc.roundedRect(M + 8, 112, 50, 8, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`PASSING SCORE: ${passingScore}%`, M + 33, 117.5, { align: 'center' });

  // Footer
  doc.setFillColor(10, 14, 30);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(80, 100, 140);
  doc.setFontSize(7);
  doc.text('fiberoracle.com', M, H - 4);
  doc.text(new Date().toLocaleDateString(), W - M, H - 4, { align: 'right' });

  // ── CONTENT PAGES ──────────────────────────────────────────────────────────
  doc.addPage();
  let y = 22;
  const CONTENT_H = H - 24; // leave footer room

  const addPageHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 16, 'F');
    doc.setFillColor(...accent);
    doc.rect(0, 16, W, 1, 'F');
    doc.setTextColor(...accent);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('FIBER ORACLE', M, 10);
    doc.setTextColor(150, 165, 200);
    doc.setFont('helvetica', 'normal');
    doc.text(s(title), W - M, 10, { align: 'right' });
    y = 22;
  };

  const addPageFooter = () => {
    doc.setFillColor(10, 14, 30);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setTextColor(80, 100, 140);
    doc.setFontSize(6.5);
    doc.text('fiberoracle.com', M, H - 3.5);
    doc.text(new Date().toLocaleDateString(), W - M, H - 3.5, { align: 'right' });
  };

  addPageHeader();

  sections.forEach((section, si) => {
    if (y > CONTENT_H - 20) { addPageFooter(); doc.addPage(); addPageHeader(); }

    // Section header
    doc.setFillColor(...accent);
    doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${si + 1}. ${s(section.title)}`, M + 4, y + 5.5);
    y += 12;

    section.content.forEach(item => {
      if (y > CONTENT_H - 16) { addPageFooter(); doc.addPage(); addPageHeader(); }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 235, 255);
      const termLines = doc.splitTextToSize(s(item.term), CW);
      doc.text(termLines, M, y);
      y += termLines.length * 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 165, 200);
      const defLines = doc.splitTextToSize(s(item.definition), CW);
      doc.text(defLines, M, y);
      y += defLines.length * 5 + 5;
    });

    y += 4;
  });

  addPageFooter();
  return doc.output('arraybuffer');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  JOB REPORT PDF — professional dark-header report
// ═══════════════════════════════════════════════════════════════════════════════
function generateJobReportPDF(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const CW = W - 2 * M;

  const C = {
    header:  [15, 23, 42],
    accent:  [79, 70, 229],
    slate:   [71, 85, 105],
    muted:   [100,116,139],
    light:   [241,245,249],
    dark:    [30, 41, 59],
    white:   [255,255,255],
    emerald: [16, 185, 129],
    red:     [239, 68, 68],
    amber:   [245,158, 11],
  };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.header);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 40, W, 2, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Report', M, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 170, 210);
  doc.text('Fiber Oracle Field Documentation', M, 26);
  doc.text(new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }), M, 33);

  doc.setTextColor(...C.accent);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Job #${s(data.job_number || 'N/A')}`, W - M, 24, { align: 'right' });

  let y = 52;
  const FOOTER_H = H - 14;

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const checkPage = (needed = 14) => {
    if (y > FOOTER_H - needed) {
      // footer
      doc.setFillColor(...C.header);
      doc.rect(0, H - 12, W, 12, 'F');
      doc.setTextColor(80, 100, 140);
      doc.setFontSize(6.5);
      doc.text('Fiber Oracle  |  fiberoracle.com', M, H - 4);
      doc.text(`Generated: ${new Date().toLocaleString()}`, W - M, H - 4, { align: 'right' });

      doc.addPage();
      // mini header
      doc.setFillColor(...C.header);
      doc.rect(0, 0, W, 16, 'F');
      doc.setFillColor(...C.accent);
      doc.rect(0, 16, W, 1.5, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('FIBER ORACLE JOB REPORT', M, 10);
      doc.setTextColor(150, 170, 210);
      doc.setFont('helvetica', 'normal');
      doc.text(`Job #${s(data.job_number || 'N/A')}`, W - M, 10, { align: 'right' });
      y = 24;
    }
  };

  const infoRow = (label, value, valColor = null) => {
    checkPage(8);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.slate);
    doc.text(s(label), M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...(valColor || C.dark));
    const vLines = doc.splitTextToSize(s(String(value || 'N/A')), CW - 50);
    doc.text(vLines, M + 48, y);
    y += Math.max(6, vLines.length * 5.5);
  };

  const sectionTitle = (label, accentColor = null) => {
    checkPage(14);
    y += 4;
    const ac = accentColor || C.accent;
    doc.setFillColor(...ac);
    doc.roundedRect(M, y, CW, 7.5, 1, 1, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(s(label).toUpperCase(), M + 4, y + 5.3);
    y += 11;
  };

  // ── SUBSCRIBER INFO ────────────────────────────────────────────────────────
  if (data.subscriber_info && (data.subscriber_info.name || data.subscriber_info.account)) {
    const si = data.subscriber_info;
    sectionTitle('Subscriber Info', [16, 185, 129]);
    if (si.name)     infoRow('Customer Name',     si.name);
    if (si.account)  infoRow('Account',           si.account);
    const addr = [si.address, si.city, si.zip].filter(Boolean).join(', ');
    if (addr)        infoRow('Address',           addr);
    if (si.ont_ranged)        infoRow('ONT Ranged',        si.ont_ranged);
    if (si.software_version)  infoRow('SW Version',        si.software_version);
  }

  // ── JOB DETAILS ────────────────────────────────────────────────────────────
  sectionTitle('Job Details');
  infoRow('Technician', data.technician_name);
  infoRow('Location', data.location);
  const statusColor = data.status === 'completed' ? C.emerald : data.status === 'needs_followup' ? C.red : C.amber;
  infoRow('Status', (data.status || 'N/A').replace(/_/g, ' ').toUpperCase(), statusColor);
  infoRow('Date', data.completion_date ? new Date(data.completion_date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : data.created_date ? new Date(data.created_date).toLocaleDateString() : 'N/A');

  // ── ONT INFORMATION ───────────────────────────────────────────────────────
  if (data.fiber_info) {
    sectionTitle('ONT Information', [59, 130, 246]);
    infoRow('FSAN Serial', data.fiber_info.fsan);
    infoRow('ONT ID', data.fiber_info.ont_id);
    infoRow('Model', data.fiber_info.model);
    infoRow('OLT / Port', `${data.fiber_info.olt || 'N/A'} / ${data.fiber_info.port || 'N/A'}`);
    if (data.fiber_info.lcp) infoRow('LCP / Splitter', `${data.fiber_info.lcp}${data.fiber_info.splitter ? ' / ' + data.fiber_info.splitter : ''}`);
  }

  // ── POWER READINGS ────────────────────────────────────────────────────────
  sectionTitle('Power Readings', C.emerald);
  infoRow('Start Power Level', data.start_power_level != null ? data.start_power_level + ' dBm' : 'N/A');
  infoRow('End Power Level',   data.end_power_level   != null ? data.end_power_level   + ' dBm' : 'N/A');
  if (data.start_power_level != null && data.end_power_level != null) {
    const imp = (data.end_power_level - data.start_power_level).toFixed(2);
    infoRow('Improvement', (imp > 0 ? '+' : '') + imp + ' dB', imp >= 0 ? C.emerald : C.red);
  }

  // ── DIAGNOSIS ─────────────────────────────────────────────────────────────
  if (data.diagnosis_used && data.diagnosis_result) {
    sectionTitle('Fiber Doctor Diagnosis', [168, 85, 247]);
    checkPage(16);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    const diagLines = doc.splitTextToSize(s(data.diagnosis_result), CW);
    doc.text(diagLines, M, y);
    y += diagLines.length * 5.5 + 3;

    if (data.diagnosis_steps && data.diagnosis_steps.length > 0) {
      checkPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.slate);
      doc.text('Steps Taken:', M, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      data.diagnosis_steps.forEach((step, i) => {
        checkPage(8);
        const stepLines = doc.splitTextToSize(s(`${i + 1}. ${step}`), CW);
        doc.setTextColor(...C.dark);
        doc.text(stepLines, M, y);
        y += stepLines.length * 5 + 2;
      });
    }
  }

  // ── EQUIPMENT USED ────────────────────────────────────────────────────────
  if (data.equipment_used && data.equipment_used.length > 0) {
    sectionTitle('Equipment Used', C.amber);
    data.equipment_used.forEach(eq => {
      checkPage(7);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      const eqLines = doc.splitTextToSize(s(`• ${eq}`), CW);
      doc.text(eqLines, M, y);
      y += eqLines.length * 5 + 1;
    });
  }

  // ── HISTORICAL TRENDS ─────────────────────────────────────────────────────
  if (data.historical_trends && data.historical_trends.length > 0) {
    sectionTitle('Historical Performance', [20, 184, 166]);
    data.historical_trends.forEach(trend => {
      checkPage(7);
      const tLines = doc.splitTextToSize(s(trend), CW);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.text(tLines, M, y);
      y += tLines.length * 5 + 2;
    });
  }

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    sectionTitle('Technician Notes');
    checkPage(14);
    doc.setFillColor(241, 245, 249);
    const noteLines = doc.splitTextToSize(s(data.notes), CW - 8);
    const noteH = noteLines.length * 5.5 + 8;
    doc.roundedRect(M, y, CW, noteH, 2, 2, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(noteLines, M + 4, y + 6);
    y += noteH + 4;
  }

  // ── FINAL FOOTER ──────────────────────────────────────────────────────────
  doc.setFillColor(...C.header);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setTextColor(80, 100, 140);
  doc.setFontSize(6.5);
  doc.text('Fiber Oracle  |  fiberoracle.com', M, H - 4);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - M, H - 4, { align: 'right' });

  return doc.output('arraybuffer');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CERTIFICATE PDF — landscape, professional
// ═══════════════════════════════════════════════════════════════════════════════
function generateCertificatePDF(data) {
  const { learnerName, courseTitle, courseSubtitle, score, certificateId, completionDate, courseId } = data;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const safeName     = s(learnerName)    || 'Learner Name';
  const safeTitle    = s(courseTitle)    || 'Fiber Optics Course';
  const safeSub      = s(courseSubtitle) || 'Professional Training';
  const safeCertId   = s(certificateId)  || 'FO-CERT-000000';

  const courseColors = {
    fiber101: [16, 185, 129],
    fiber102: [59, 130, 246],
    fiber103: [168, 85, 247],
  };
  const [r, g, b] = courseColors[courseId] || courseColors.fiber101;

  // Background
  doc.setFillColor(10, 14, 35);
  doc.rect(0, 0, W, H, 'F');

  // Corner accents
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 2, 'F');
  doc.rect(0, H - 2, W, 2, 'F');
  doc.rect(0, 0, 2, H, 'F');
  doc.rect(W - 2, 0, 2, H, 'F');

  // Fiber streak decorations
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.3);
  for (let i = 0; i < 6; i++) {
    doc.setDrawColor(r, g, b);
    doc.line(0, 15 + i * 4, 20 + i * 5, 0);
    doc.line(W - (20 + i * 5), H, W, H - (15 + i * 4));
  }

  // Outer border
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(1.2);
  doc.roundedRect(6, 6, W - 12, H - 12, 3, 3, 'S');

  // Inner subtle border
  doc.setDrawColor(40, 55, 90);
  doc.setLineWidth(0.3);
  doc.roundedRect(10, 10, W - 20, H - 20, 2, 2, 'S');

  // Header color bar
  doc.setFillColor(r, g, b);
  doc.roundedRect(12, 12, W - 24, 5, 1, 1, 'F');

  // "CERTIFICATE OF COMPLETION"
  doc.setTextColor(r, g, b);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('CERTIFICATE OF COMPLETION', W / 2, 30, { align: 'center' });

  // Fiber Oracle branding
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiber Oracle', W / 2, 46, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 140, 180);
  doc.text('Education Center', W / 2, 54, { align: 'center' });

  // Decorative rule
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.6);
  doc.line(W / 2 - 45, 60, W / 2 + 45, 60);

  // "This certifies that"
  doc.setTextColor(120, 140, 180);
  doc.setFontSize(10);
  doc.text('This is to certify that', W / 2, 72, { align: 'center' });

  // Name (prominent)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(34);
  doc.setFont('helvetica', 'bold');
  doc.text(safeName, W / 2, 88, { align: 'center' });

  const nw = doc.getTextWidth(safeName);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - nw / 2 - 5, 93, W / 2 + nw / 2 + 5, 93);

  // "has successfully completed"
  doc.setTextColor(120, 140, 180);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('has successfully completed the certification exam for', W / 2, 103, { align: 'center' });

  // Course title
  doc.setTextColor(r, g, b);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(safeTitle, W / 2, 117, { align: 'center' });

  doc.setTextColor(150, 165, 200);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(safeSub, W / 2, 126, { align: 'center' });

  // Score badge
  const scoreY = 140;
  doc.setFillColor(r, g, b);
  doc.roundedRect(W / 2 - 22, scoreY - 5.5, 44, 11, 5.5, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Score: ${score}%`, W / 2, scoreY + 2.5, { align: 'center' });

  // Footer row
  const footerY = H - 30;
  doc.setTextColor(100, 120, 160);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Date of Completion', 30, footerY);
  doc.setTextColor(220, 235, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const fd = completionDate
    ? new Date(completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(fd, 30, footerY + 7);

  doc.setTextColor(100, 120, 160);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Certificate ID', W - 30, footerY, { align: 'right' });
  doc.setTextColor(220, 235, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(safeCertId, W - 30, footerY + 7, { align: 'right' });

  // Bottom color bar
  doc.setFillColor(r, g, b);
  doc.roundedRect(12, H - 17, W - 24, 4, 1, 1, 'F');

  // Standards micro text
  doc.setTextColor(60, 80, 120);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Standards: TIA-568-D  |  IEC 61300  |  ITU-T G.984 / G.9807  |  IEEE 802.3  |  fiberoracle.com', W / 2, H - 8, { align: 'center' });

  return doc.output('arraybuffer');
}