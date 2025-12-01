import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

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
  const margin = 20;
  let y = margin;

  // Header
  doc.setFillColor(30, 58, 138); // Blue
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Fiber Oracle', margin, 30);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('When you need to know, ask the Oracle.', margin, 42);

  y = 70;
  doc.setTextColor(0, 0, 0);

  // Tagline
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('The Complete Field Reference for Fiber Professionals', margin, y);
  y += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const intro = 'Fiber Oracle puts every calculator, reference table, and troubleshooting guide you need right in your pocket. No more paper charts, no more guessing - just accurate, standards-based tools that work offline when you need them most.';
  const introLines = doc.splitTextToSize(intro, pageWidth - 2 * margin);
  doc.text(introLines, margin, y);
  y += introLines.length * 6 + 15;

  // Features Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('Key Features', margin, y);
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const features = [
    { title: 'Power Calculator', desc: 'Estimate ONT Rx power for GPON & XGS-PON networks' },
    { title: 'Loss Budget Calculator', desc: 'TIA-568-D compliant link loss calculations' },
    { title: 'Fiber Doctor', desc: 'Interactive troubleshooting flowchart for fast diagnosis' },
    { title: 'AI OTDR Analysis', desc: 'Upload traces for AI-powered fault detection' },
    { title: 'Reference Tables', desc: 'Attenuation, connectors, splices, and color codes' },
    { title: 'Education Center', desc: 'Fiber 101, 102, 103 courses with certifications' },
    { title: 'Job Reports', desc: 'Document and track fiber installation jobs' },
    { title: 'Impairment Library', desc: 'Visual guide to fiber defects and solutions' },
  ];

  features.forEach(f => {
    doc.setFont('helvetica', 'bold');
    doc.text(`• ${f.title}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(f.desc, margin + 45, y);
    y += 8;
  });

  y += 10;

  // Standards Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('Industry Standards Compliance', margin, y);
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const standards = ['TIA-568-D', 'TIA-526-14-C', 'TIA-598-D', 'IEC 61300-3-35', 'ITU-T G.984 (GPON)', 'ITU-T G.9807 (XGS-PON)'];
  standards.forEach(s => {
    doc.text(`• ${s}`, margin, y);
    y += 6;
  });

  y += 10;

  // Quick Reference Values
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('Quick Reference Values', margin, y);
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const refs = [
    ['SMF @1310nm', '≤0.35 dB/km'],
    ['SMF @1550nm', '≤0.25 dB/km'],
    ['Elite Connector', '≤0.15 dB'],
    ['Fusion Splice', '≤0.10 dB'],
    ['UPC Reflectance', '<-50 dB'],
    ['APC Reflectance', '<-60 dB'],
  ];

  refs.forEach(r => {
    doc.setFont('helvetica', 'normal');
    doc.text(r[0] + ':', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(r[1], margin + 40, y);
    y += 6;
  });

  // Footer
  doc.setFillColor(30, 58, 138);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Fiber Oracle © 2025 | fiberoracle.com', margin, pageHeight - 10);

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