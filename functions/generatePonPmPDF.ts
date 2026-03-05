import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.1';

// jsPDF helvetica only supports Latin-1 (0x00-0xFF). Any char outside that range
// renders as a garbled replacement glyph (e.g. "ï¿½"). Map all known specials first,
// then strip anything still outside Latin-1.
function s(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2012\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u00B7\u2027]/g, '*')
    .replace(/\u2264/g, '<=').replace(/\u2265/g, '>=')
    .replace(/\u00B1/g, '+/-').replace(/\u00D7/g, 'x').replace(/\u00F7/g, '/')
    .replace(/\u00B0/g, 'deg')
    .replace(/(\d+\.?\d*)\s*[\u03BC\u00B5]m/g, '$1um')
    .replace(/[\u03BC\u00B5]/g, 'u')
    .replace(/\u00A9/g, '(c)').replace(/\u00AE/g, '(R)').replace(/\u2122/g, '(TM)')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2044\u2215]/g, '/')
    .replace(/[^\x00-\xFF]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportData } = await req.json();
    if (!reportData || !reportData.summary || !reportData.onts) {
      return Response.json({ error: 'Invalid report data' }, { status: 400 });
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 16;
    const CW = W - 2 * M;

    const C = {
      header:  [15, 23, 42],
      accent:  [30, 58, 138],   // navy blue
      indigo:  [79, 70, 229],
      red:     [220, 38, 38],
      amber:   [245,158, 11],
      green:   [34, 197, 94],
      slate:   [71, 85, 105],
      muted:   [100,116,139],
      light:   [241,245,249],
      dark:    [15, 23, 42],
      white:   [255,255,255],
    };

    const { summary, onts } = reportData;

    let pageNum = 1;
    const renderPageHeader = (doc, title, sub) => {
      doc.setFillColor(...C.header);
      doc.rect(0, 0, W, 26, 'F');
      doc.setFillColor(...C.indigo);
      doc.rect(0, 26, W, 2, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('FIBER ORACLE', M, 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 170, 210);
      doc.text(s(title), M, 20);
      if (sub) doc.text(s(sub), W - M, 16, { align: 'right' });
    };

    const renderPageFooter = (doc, current, total) => {
      doc.setFillColor(...C.header);
      doc.rect(0, H - 11, W, 11, 'F');
      doc.setTextColor(80, 100, 140);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Fiber Oracle  |  fiberoracle.com', M, H - 4);
      doc.text(`Page ${current} of ${total}`, W / 2, H - 4, { align: 'center' });
      doc.text(new Date().toLocaleString(), W - M, H - 4, { align: 'right' });
    };

    const FOOTER_LIMIT = H - 18;
    let y = 0;
    const newPage = () => {
      doc.addPage();
      pageNum++;
      renderPageHeader(doc, 'PON PM Analysis Report', `Generated: ${new Date().toLocaleDateString()}`);
      y = 34;
    };
    const checkY = (needed = 12) => { if (y > FOOTER_LIMIT - needed) newPage(); };

    // ── PAGE 1: COVER / SUMMARY ─────────────────────────────────────────────
    renderPageHeader(doc, 'PON PM Analysis Report', `Generated: ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`);
    y = 36;

    // Report name / date block
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(s(summary.reportName || 'PON PM Report'), M, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(`Uploaded: ${summary.uploadDate ? new Date(summary.uploadDate).toLocaleString() : 'N/A'}`, M, y);
    y += 12;

    // KPI cards row
    const kpiItems = [
      { label: 'Total ONTs', val: String(summary.totalOnts || 0),    color: C.indigo },
      { label: 'Critical',   val: String(summary.criticalCount || 0), color: C.red   },
      { label: 'Warnings',   val: String(summary.warningCount || 0),  color: C.amber },
      { label: 'Healthy',    val: String(summary.okCount || 0),       color: C.green },
      { label: 'OLTs',       val: String(summary.oltCount || 0),      color: C.slate },
    ];
    const kw = CW / kpiItems.length - 2;
    kpiItems.forEach((k, i) => {
      const kx = M + i * (kw + 2.5);
      doc.setFillColor(...C.light);
      doc.roundedRect(kx, y, kw, 20, 2, 2, 'F');
      doc.setFillColor(...k.color);
      doc.roundedRect(kx, y, kw, 2, 1, 1, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...k.color);
      doc.text(k.val, kx + kw / 2, y + 13, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(k.label, kx + kw / 2, y + 18, { align: 'center' });
    });
    y += 26;

    // OLT list
    if (summary.olts && summary.olts.length > 0) {
      doc.setFillColor(...C.light);
      doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.slate);
      doc.text('OLTs in Report:', M + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(summary.olts.join('  |  '), M + 30, y + 5);
      if (summary.avgOntRx != null) {
        doc.setTextColor(...C.muted);
        doc.text(`Avg ONT Rx: ${summary.avgOntRx?.toFixed(1)} dBm   Min: ${summary.minOntRx?.toFixed(1)} dBm   Max: ${summary.maxOntRx?.toFixed(1)} dBm`, M + 4, y + 10);
      }
      y += 16;
    }

    // ── CRITICAL SECTION ────────────────────────────────────────────────────
    const criticalOnts = onts.filter(o => o._analysis?.status === 'critical');
    if (criticalOnts.length > 0) {
      checkY(14);
      // section header
      doc.setFillColor(...C.red);
      doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`CRITICAL ISSUES  (${criticalOnts.length})`, M + 4, y + 5.5);
      y += 12;

      criticalOnts.slice(0, 60).forEach((ont, idx) => {
        checkY(24);

        // ONT row header
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
        doc.setFillColor(...C.red);
        doc.roundedRect(M, y, 2, 8, 1, 0, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(153, 27, 27);
        doc.text(`ONT: ${s(ont.OntID || ont.ont_id || 'N/A')}  |  Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}`, M + 4, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.muted);
        doc.setFontSize(7);
        doc.text(`${s(ont._oltName || ont.olt_name || 'N/A')} / ${s(ont._port || ont.shelf_slot_port || 'N/A')}  |  Model: ${s(ont.model || 'N/A')}`, W - M - 2, y + 5.5, { align: 'right' });
        y += 9;

        // Issues
        const issues = ont._analysis?.issues || [];
        if (issues.length > 0) {
          issues.forEach(issue => {
            checkY(8);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.dark);
            doc.text(`• ${s(issue.field)}: ${s(String(issue.value))}`, M + 4, y);
            doc.setTextColor(...C.muted);
            const msgLines = doc.splitTextToSize(s(issue.message), CW - 10);
            doc.text(msgLines, M + 12, y + 4.5);
            y += 4.5 + msgLines.length * 4 + 1;
          });
        }
        y += 3;
      });

      if (criticalOnts.length > 60) {
        checkY(8);
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${criticalOnts.length - 60} more critical issues omitted for brevity.`, M, y);
        y += 7;
      }
    }

    // ── WARNING SECTION ─────────────────────────────────────────────────────
    const warningOnts = onts.filter(o => o._analysis?.status === 'warning');
    if (warningOnts.length > 0) {
      checkY(14);
      doc.setFillColor(...C.amber);
      doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`WARNINGS  (${warningOnts.length})`, M + 4, y + 5.5);
      y += 12;

      warningOnts.slice(0, 60).forEach((ont) => {
        checkY(20);

        doc.setFillColor(255, 251, 235);
        doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
        doc.setFillColor(...C.amber);
        doc.roundedRect(M, y, 2, 8, 1, 0, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14);
        doc.text(`ONT: ${s(ont.OntID || ont.ont_id || 'N/A')}  |  Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}`, M + 4, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.muted);
        doc.setFontSize(7);
        doc.text(`${s(ont._oltName || ont.olt_name || 'N/A')} / ${s(ont._port || ont.shelf_slot_port || 'N/A')}`, W - M - 2, y + 5.5, { align: 'right' });
        y += 9;

        const warnings = ont._analysis?.warnings || [];
        warnings.forEach(warn => {
          checkY(8);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...C.dark);
          doc.text(`• ${s(warn.field)}: ${s(String(warn.value))}`, M + 4, y);
          doc.setTextColor(...C.muted);
          const msgLines = doc.splitTextToSize(s(warn.message), CW - 10);
          doc.text(msgLines, M + 12, y + 4.5);
          y += 4.5 + msgLines.length * 4 + 1;
        });
        y += 3;
      });

      if (warningOnts.length > 60) {
        checkY(8);
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${warningOnts.length - 60} more warnings omitted for brevity.`, M, y);
        y += 7;
      }
    }

    // ── HEALTHY SUMMARY ─────────────────────────────────────────────────────
    const okOnts = onts.filter(o => o._analysis?.status === 'ok');
    if (okOnts.length > 0) {
      checkY(14);
      doc.setFillColor(22, 163, 74);
      doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`HEALTHY ONTs  (${okOnts.length})`, M + 4, y + 5.5);
      y += 12;

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(M, y, CW, 10, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(21, 128, 61);
      doc.text(`${okOnts.length} ONTs are operating within normal parameters. No action required.`, M + 4, y + 7);
      y += 14;
    }

    // ── APPLY FOOTERS ───────────────────────────────────────────────────────
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      renderPageFooter(doc, i, totalPages);
    }

    return new Response(doc.output('arraybuffer'), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=FiberOracle-PON-PM-Report-${new Date().toISOString().slice(0,10)}.pdf`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});