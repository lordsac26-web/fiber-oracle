import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportData } = await req.json();

    if (!reportData || !reportData.summary || !reportData.onts) {
      return Response.json({ error: 'Invalid report data' }, { status: 400 });
    }

    const doc = new jsPDF();
    let y = 20;

    // Helper to add new page if needed
    const checkPage = () => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text('PON PM Analysis Report', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
    y += 15;

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Total ONTs: ${reportData.summary.totalOnts}`, 30, y);
    y += 6;
    doc.setTextColor(220, 38, 38);
    doc.text(`Critical Issues: ${reportData.summary.criticalCount}`, 30, y);
    y += 6;
    doc.setTextColor(245, 158, 11);
    doc.text(`Warnings: ${reportData.summary.warningCount}`, 30, y);
    y += 6;
    doc.setTextColor(34, 197, 94);
    doc.text(`Healthy: ${reportData.summary.okCount}`, 30, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
    doc.text(`OLTs: ${reportData.summary.oltCount}`, 30, y);
    y += 15;

    // Critical Issues
    const criticalOnts = reportData.onts.filter(o => o._analysis.status === 'critical');
    if (criticalOnts.length > 0) {
      checkPage();
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      doc.text(`CRITICAL ISSUES (${criticalOnts.length})`, 20, y);
      y += 8;

      criticalOnts.slice(0, 50).forEach(ont => {
        checkPage();
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`ONT: ${ont.OntID || 'N/A'} | Serial: ${ont.SerialNumber || 'N/A'}`, 25, y);
        y += 5;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Location: ${ont._oltName} / ${ont._port}`, 25, y);
        y += 4;
        doc.text(`Model: ${ont.model || 'N/A'}`, 25, y);
        y += 5;

        if (ont._analysis.issues.length > 0) {
          doc.setTextColor(220, 38, 38);
          doc.text('Issues:', 25, y);
          y += 4;
          ont._analysis.issues.forEach(issue => {
            checkPage();
            doc.setTextColor(0, 0, 0);
            doc.text(`  - ${issue.field}: ${issue.value}`, 30, y);
            y += 4;
            doc.setTextColor(100, 116, 139);
            doc.text(`    ${issue.message}`, 30, y);
            y += 4;
          });
        }
        y += 3;
      });

      if (criticalOnts.length > 50) {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`... and ${criticalOnts.length - 50} more critical issues (see full export)`, 25, y);
        y += 10;
      }
    }

    // Warnings
    const warningOnts = reportData.onts.filter(o => o._analysis.status === 'warning');
    if (warningOnts.length > 0) {
      checkPage();
      y += 5;
      doc.setFontSize(14);
      doc.setTextColor(245, 158, 11);
      doc.text(`WARNINGS (${warningOnts.length})`, 20, y);
      y += 8;

      warningOnts.slice(0, 50).forEach(ont => {
        checkPage();
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text(`ONT: ${ont.OntID || 'N/A'} | Serial: ${ont.SerialNumber || 'N/A'}`, 25, y);
        y += 5;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Location: ${ont._oltName} / ${ont._port}`, 25, y);
        y += 4;
        doc.text(`Model: ${ont.model || 'N/A'}`, 25, y);
        y += 5;

        if (ont._analysis.warnings.length > 0) {
          doc.setTextColor(245, 158, 11);
          doc.text('Warnings:', 25, y);
          y += 4;
          ont._analysis.warnings.forEach(warn => {
            checkPage();
            doc.setTextColor(0, 0, 0);
            doc.text(`  - ${warn.field}: ${warn.value}`, 30, y);
            y += 4;
            doc.setTextColor(100, 116, 139);
            doc.text(`    ${warn.message}`, 30, y);
            y += 4;
          });
        }
        y += 3;
      });

      if (warningOnts.length > 50) {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`... and ${warningOnts.length - 50} more warnings (see full export)`, 25, y);
        y += 10;
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount} | Fiber Oracle PON PM Report`, 20, 285);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pon-pm-report-${new Date().toISOString().slice(0,10)}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});