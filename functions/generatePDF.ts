import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

// Helper function to sanitize text for PDF (remove problematic characters)
function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '*')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/±/g, '+/-')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/°/g, ' deg')
    .replace(/µ/g, 'u')
    .replace(/[^\x00-\x7F]/g, ''); // Remove any remaining non-ASCII characters
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await req.json();

    let pdfBytes;

    switch (type) {
      case 'brochure':
        pdfBytes = generateBrochurePDF();
        break;
      case 'studyGuide':
        pdfBytes = generateStudyGuidePDF(data);
        break;
      case 'jobReport':
        pdfBytes = generateJobReportPDF(data);
        break;
      case 'certificate':
        pdfBytes = generateCertificatePDF(data);
        break;
      default:
        return Response.json({ error: 'Invalid PDF type' }, { status: 400 });
    }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${type}-${Date.now()}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateBrochurePDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Color palette
  const colors = {
    primary: [79, 70, 229],      // Indigo
    secondary: [139, 92, 246],   // Purple
    accent: [236, 72, 153],      // Pink
    dark: [30, 41, 59],          // Slate
    light: [248, 250, 252],
    emerald: [16, 185, 129],
    blue: [59, 130, 246],
    amber: [245, 158, 11],
  };

  // ========== PAGE 1: Cover ==========
  // Gradient header
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');
  doc.setFillColor(...colors.secondary);
  doc.rect(0, 60, pageWidth, 30, 'F');
  
  // Decorative lines
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  for (let i = 0; i < 8; i++) {
    doc.line(pageWidth - 50 + i * 8, 0, pageWidth - 20 + i * 8, 90);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiber Oracle', margin, 40);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('When you need to know, ask the Oracle.', margin, 55);
  
  doc.setFontSize(11);
  doc.text('The Complete Field Reference for Fiber Optic Professionals', margin, 75);

  y = 100;
  doc.setTextColor(...colors.dark);

  // Intro paragraph
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const intro = 'Fiber Oracle consolidates everything a fiber technician needs into one powerful, offline-capable app. From PON power calculations to AI-powered OTDR analysis, from comprehensive glossaries to certification courses - it\'s all here, designed by fiber professionals for fiber professionals.';
  const introLines = doc.splitTextToSize(intro, pageWidth - 2 * margin);
  doc.text(introLines, margin, y);
  y += introLines.length * 6 + 12;

  // Stats bar
  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 3, 3, 'F');
  
  const stats = [
    { value: '15+', label: 'Tools' },
    { value: '200+', label: 'Glossary Terms' },
    { value: '3', label: 'Courses' },
    { value: '100%', label: 'Offline' },
  ];
  
  const statWidth = (pageWidth - 2 * margin) / 4;
  stats.forEach((stat, i) => {
    const x = margin + statWidth * i + statWidth / 2;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(stat.value, x, y + 9, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(stat.label, x, y + 15, { align: 'center' });
  });
  y += 30;

  // Module Categories
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Five Powerful Categories', margin, y);
  y += 10;

  const categories = [
    { name: 'CALCULATORS', color: colors.emerald, items: ['Power Level Calculator', 'Loss Budget Calculator', 'Splitter Loss Reference', 'Bend Radius Guide'] },
    { name: 'TESTING', color: colors.blue, items: ['OLTS Tier-1 Wizard', 'OTDR Tier-2 Wizard', 'Cleaning & Inspection', 'Job Reports'] },
    { name: 'TROUBLESHOOTING', color: [239, 68, 68], items: ['Fiber Doctor Flowchart', 'AI OTDR Analysis (Beta)', 'Impairment Library'] },
    { name: 'REFERENCE', color: colors.amber, items: ['Fiber Locator (3456 fibers)', 'PON Power Levels', 'Reference Tables', 'LCP/CLCP Database', 'Industry Links'] },
    { name: 'EDUCATION', color: colors.secondary, items: ['Fiber 101: Foundations', 'Fiber 102: PON & FTTH', 'Fiber 103: Troubleshooting', 'Certification Exams'] },
  ];

  categories.forEach((cat, idx) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFillColor(...cat.color);
    doc.roundedRect(margin, y, 3, 18, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...cat.color);
    doc.text(cat.name, margin + 6, y + 5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(cat.items.join('  |  '), margin + 6, y + 12);
    y += 22;
  });

  // Footer
  doc.setFillColor(...colors.primary);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Fiber Oracle 2025  |  Page 1 of 3', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // ========== PAGE 2: Features Deep Dive ==========
  doc.addPage();
  y = margin;

  // Header
  doc.setFillColor(...colors.secondary);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Feature Highlights', margin, 17);

  y = 35;
  doc.setTextColor(...colors.dark);

  // Feature blocks
  const features = [
    {
      title: 'Power Level Calculator',
      color: colors.emerald,
      desc: 'Instantly estimate ONT receive power for GPON and XGS-PON networks. Enter OLT transmit power, splitter ratio, fiber length, and connector count to get accurate predictions with pass/fail status.',
    },
    {
      title: 'Fiber Locator',
      color: colors.amber,
      desc: 'Identify any fiber from 12 to 3,456 count cables using TIA-598 color codes. Supports loose tube, ribbon, and high-count configurations with visual color displays.',
    },
    {
      title: 'Fiber Doctor',
      color: [239, 68, 68],
      desc: 'Interactive troubleshooting flowchart guides you through diagnosing fiber issues. Answer questions about symptoms and get targeted solutions with required tools and procedures.',
    },
    {
      title: 'AI OTDR Analysis',
      color: colors.secondary,
      desc: 'Upload OTDR traces or enter event data for AI-powered diagnostics. Get event-by-event analysis, confidence scores, and prioritized action items based on industry standards.',
    },
    {
      title: 'Reference Tables & Glossary',
      color: colors.blue,
      desc: 'Comprehensive reference including 200+ glossary terms, attenuation coefficients, connector specs, splice values, color codes, PON specifications, and interactive diagrams.',
    },
    {
      title: 'Education Center',
      color: colors.primary,
      desc: 'Three progressive courses: Fiber 101 (Foundations), Fiber 102 (PON & FTTH), Fiber 103 (Advanced Troubleshooting). Each includes study guides and certification exams.',
    },
  ];

  features.forEach((f, idx) => {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
      doc.setFillColor(...colors.secondary);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Feature Highlights (continued)', margin, 17);
      y = 35;
    }

    // Feature box
    doc.setFillColor(...colors.light);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 2, 2, 'F');
    
    // Color accent
    doc.setFillColor(...f.color);
    doc.roundedRect(margin, y, 4, 35, 2, 0, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text(f.title, margin + 8, y + 8);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(f.desc, pageWidth - 2 * margin - 12);
    doc.text(descLines, margin + 8, y + 15);
    
    y += 40;
  });

  // Footer
  doc.setFillColor(...colors.primary);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Fiber Oracle 2025  |  Page 2 of 3', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // ========== PAGE 3: Standards & Quick Reference ==========
  doc.addPage();
  y = margin;

  // Header
  doc.setFillColor(...colors.accent);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Standards & Quick Reference', margin, 17);

  y = 35;

  // Standards compliance
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Industry Standards Compliance', margin, y);
  y += 8;

  const standardGroups = [
    { org: 'TIA', standards: ['TIA-568-D (Cabling)', 'TIA-526-14-C (OLTS)', 'TIA-598-D (Color Codes)', 'TIA-758-B (OSP)'] },
    { org: 'ITU-T', standards: ['G.652/G.657 (Fiber)', 'G.984 (GPON)', 'G.9807 (XGS-PON)', 'G.9804 (25G/50G PON)'] },
    { org: 'IEC', standards: ['IEC 61300-3-35 (Inspection)', 'IEC 60794 (Cable)', 'IEC 61280 (Testing)'] },
    { org: 'FOA', standards: ['CFOT Guidelines', 'Testing Best Practices', 'Safety Standards'] },
    { org: 'Other', standards: ['IEEE 802.3', 'Telcordia GR-326/20', 'NEC 770', 'OSHA 1926'] },
  ];

  doc.setFontSize(8);
  standardGroups.forEach(group => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(group.org + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(group.standards.join('  |  '), margin + 15, y);
    y += 6;
  });

  y += 10;

  // Quick Reference Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Quick Reference Values', margin, y);
  y += 8;

  // Table header
  doc.setFillColor(...colors.primary);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Parameter', margin + 3, y + 5.5);
  doc.text('Value', pageWidth / 2, y + 5.5);
  doc.text('Standard', pageWidth - margin - 30, y + 5.5);
  y += 8;

  const refValues = [
    ['SMF Attenuation @1310nm', '<=0.35 dB/km', 'TIA-568-D'],
    ['SMF Attenuation @1550nm', '<=0.25 dB/km', 'TIA-568-D'],
    ['MMF Attenuation @850nm', '<=3.0 dB/km', 'TIA-568-D'],
    ['Elite Connector Loss', '<=0.15 dB', 'TIA-568-D'],
    ['Standard Connector Loss', '<=0.50 dB', 'TIA-568-D'],
    ['Fusion Splice Loss', '<=0.10 dB', 'TIA-568-D'],
    ['UPC Reflectance', '<-50 dB', 'GR-326'],
    ['APC Reflectance', '<-60 dB', 'GR-326'],
    ['GPON Budget (B+)', '28 dB', 'G.984.2'],
    ['GPON Budget (C+)', '32 dB', 'G.984.2'],
    ['XGS-PON Budget (N1)', '29 dB', 'G.9807.1'],
    ['XGS-PON Budget (N2)', '31 dB', 'G.9807.1'],
  ];

  doc.setTextColor(...colors.dark);
  refValues.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 3, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], pageWidth / 2, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(row[2], pageWidth - margin - 30, y + 4.5);
    doc.setTextColor(...colors.dark);
    y += 6;
  });

  y += 10;

  // Splitter Loss Quick Ref
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('Splitter Loss Reference', margin, y);
  y += 6;

  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, 'F');
  
  const splitters = ['1:2 = 3.5 dB', '1:4 = 7.0 dB', '1:8 = 10.5 dB', '1:16 = 14.0 dB', '1:32 = 17.5 dB', '1:64 = 21.0 dB'];
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const splitterText = splitters.join('    |    ');
  doc.text(splitterText, pageWidth / 2, y + 10, { align: 'center' });

  y += 25;

  // FOA Guidelines Callout
  doc.setFillColor(139, 92, 246); // Purple
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FOA Recommended Practices Integrated', margin + 5, y + 7);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const foaText = '* 1-Jumper Reference Method  * Bidirectional OTDR Testing  * Inspect Before Connection  * Complete Documentation  * Safety Protocols';
  doc.text(foaText, margin + 5, y + 14);

  y += 28;

  // Why Fiber Oracle box
  doc.setFillColor(...colors.emerald);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Why Fiber Oracle?', margin + 5, y + 10);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const whyText = '* Works 100% offline after first load  * Mobile-first responsive design  * Current 2025 standards  * Free to use  * No account required for basic tools  * Built by fiber techs, for fiber techs';
  const whyLines = doc.splitTextToSize(whyText, pageWidth - 2 * margin - 10);
  doc.text(whyLines, margin + 5, y + 18);

  // Footer
  doc.setFillColor(...colors.primary);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Fiber Oracle 2025  |  Page 3 of 3  |  fiberoracle.com', pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc.output('arraybuffer');
}

function generateStudyGuidePDF(data) {
  const { courseId, title, subtitle, passingScore, sections } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Header
  doc.setFillColor(16, 185, 129); // Green
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 25);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${subtitle} | Passing Score: ${passingScore}%`, margin, 37);

  y = 60;
  doc.setTextColor(0, 0, 0);

  // Sections
  sections.forEach((section, sectionIndex) => {
    // Check if we need a new page
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${sectionIndex + 1}. ${section.title}`, margin, y);
    y += 10;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    section.content.forEach(item => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      const termLines = doc.splitTextToSize(item.term, pageWidth - 2 * margin);
      doc.text(termLines, margin, y);
      y += termLines.length * 5;

      doc.setFont('helvetica', 'normal');
      const defLines = doc.splitTextToSize(item.definition, pageWidth - 2 * margin);
      doc.text(defLines, margin, y);
      y += defLines.length * 5 + 6;
    });

    y += 5;
  });

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Fiber Oracle Study Guide | fiberoracle.com', margin, pageHeight - 10);

  return doc.output('arraybuffer');
}

function generateJobReportPDF(data) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Header
  doc.setFillColor(71, 85, 105); // Slate
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Report', margin, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Job #${data.job_number || 'N/A'}`, pageWidth - margin - 40, 25);

  y = 55;
  doc.setTextColor(0, 0, 0);

  // Job Details
  const addField = (label, value) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || 'N/A'), margin + 50, y);
    y += 8;
  };

  addField('Technician', data.technician_name);
  addField('Location', data.location);
  addField('Status', data.status);
  addField('Date', data.completion_date ? new Date(data.completion_date).toLocaleDateString() : data.created_date ? new Date(data.created_date).toLocaleDateString() : 'N/A');

  y += 5;

  // Power Readings Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Power Readings', margin, y);
  y += 8;

  doc.setTextColor(0, 0, 0);
  addField('Start Power', data.start_power_level ? `${data.start_power_level} dBm` : 'N/A');
  addField('End Power', data.end_power_level ? `${data.end_power_level} dBm` : 'N/A');
  
  if (data.start_power_level && data.end_power_level) {
    const improvement = data.end_power_level - data.start_power_level;
    addField('Improvement', `${improvement > 0 ? '+' : ''}${improvement.toFixed(2)} dB`);
  }

  y += 5;

  // Diagnosis Section
  if (data.diagnosis_used) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Fiber Doctor Diagnosis', margin, y);
    y += 8;

    doc.setTextColor(0, 0, 0);
    addField('Result', data.diagnosis_result);
    
    if (data.diagnosis_steps && data.diagnosis_steps.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Steps Taken:', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      data.diagnosis_steps.forEach((step, i) => {
        const stepLines = doc.splitTextToSize(`${i + 1}. ${step}`, pageWidth - 2 * margin);
        doc.text(stepLines, margin, y);
        y += stepLines.length * 5 + 2;
      });
    }
    y += 5;
  }

  // Notes Section
  if (data.notes) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Notes', margin, y);
    y += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated by Fiber Oracle | ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);

  return doc.output('arraybuffer');
}

function generateCertificatePDF(data) {
  const { learnerName, courseTitle, courseSubtitle, score, certificateId, completionDate, courseId } = data;
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Course colors
  const courseColors = {
    fiber101: { r: 34, g: 197, b: 94 },   // Green
    fiber102: { r: 59, g: 130, b: 246 },  // Blue
    fiber103: { r: 168, g: 85, b: 247 },  // Purple
  };
  const color = courseColors[courseId] || courseColors.fiber101;

  // Background - light wash
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative fiber optic lines (top left corner)
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(0.5);
  for (let i = 0; i < 5; i++) {
    doc.line(0, 15 + i * 4, 40 + i * 8, 0);
  }

  // Decorative fiber optic lines (bottom right corner)
  for (let i = 0; i < 5; i++) {
    doc.line(pageWidth - 40 - i * 8, pageHeight, pageWidth, pageHeight - 15 - i * 4);
  }

  // Main border
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(2);
  doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3, 'S');

  // Inner border
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 2, 2, 'S');

  // Header accent bar
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(20, 20, pageWidth - 40, 8, 'F');

  // "CERTIFICATE OF COMPLETION" header
  doc.setTextColor(color.r, color.g, color.b);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 45, { align: 'center' });

  // Fiber Oracle branding
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiber Oracle', pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Education Center', pageWidth / 2, 68, { align: 'center' });

  // Decorative line
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 60, 75, pageWidth / 2 + 60, 75);

  // "This certifies that"
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(11);
  doc.text('This is to certify that', pageWidth / 2, 88, { align: 'center' });

  // Learner Name (prominent)
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(learnerName || 'Learner Name', pageWidth / 2, 105, { align: 'center' });

  // Underline for name
  const nameWidth = doc.getTextWidth(learnerName || 'Learner Name');
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - nameWidth / 2 - 10, 110, pageWidth / 2 + nameWidth / 2 + 10, 110);

  // "has successfully completed"
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('has successfully completed the certification exam for', pageWidth / 2, 123, { align: 'center' });

  // Course Title
  doc.setTextColor(color.r, color.g, color.b);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(courseTitle || 'Fiber Optics Course', pageWidth / 2, 138, { align: 'center' });

  // Course Subtitle
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(courseSubtitle || 'Professional Training', pageWidth / 2, 148, { align: 'center' });

  // Score badge
  const scoreX = pageWidth / 2;
  const scoreY = 165;
  doc.setFillColor(color.r, color.g, color.b);
  doc.roundedRect(scoreX - 30, scoreY - 8, 60, 16, 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Score: ' + score + '%', scoreX, scoreY + 2, { align: 'center' });

  // Footer section with two columns
  const footerY = pageHeight - 45;

  // Left: Date
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Date of Completion', 50, footerY);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const formattedDate = completionDate ? new Date(completionDate).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(formattedDate, 50, footerY + 8);

  // Right: Certificate ID
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Certificate ID', pageWidth - 50, footerY, { align: 'right' });
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(certificateId || 'FO-CERT-000000', pageWidth - 50, footerY + 8, { align: 'right' });

  // Bottom accent bar
  doc.setFillColor(color.r, color.g, color.b);
  doc.rect(20, pageHeight - 28, pageWidth - 40, 8, 'F');

  // Standards footer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Standards: TIA-568-D | IEC 61300 | ITU-T G.984/G.9807 | IEEE 802.3', pageWidth / 2, pageHeight - 16, { align: 'center' });
  doc.text('fiberoracle.com', pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc.output('arraybuffer');
}