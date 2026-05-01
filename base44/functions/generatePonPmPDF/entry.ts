/**
 * generatePonPmPDF
 *
 * Produces a professional-grade PON PM analysis PDF report using jsPDF.
 * Layout: Cover page → Executive Summary → OLT/Port Breakdown → Critical Issues
 *         → Warnings → Healthy Summary → Appendix
 *
 * Design principles:
 *  - 20mm page margins (ISO standard)
 *  - Consistent color system (navy/slate/status colors)
 *  - Company logo loaded from AppSettings at runtime; falls back to text wordmark
 *  - All pages have branded header + footer with page numbers
 *  - Only jsPDF (already installed) — no external dependencies
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ─── Text Sanitizer ────────────────────────────────────────────────────────────
// jsPDF's built-in Helvetica covers Latin-1 only. Map every known special char
// before the final catch-all strip so nothing renders as a garbled glyph.
function s(text) {
  if (text === null || text === undefined) return '';
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
    .replace(/\u00A0/g, ' ').replace(/[\u2044\u2215]/g, '/')
    .replace(/\u00B9/g, '1').replace(/\u00B2/g, '2').replace(/\u00B3/g, '3')
    .replace(/[\u2190]/g, '<-').replace(/[\u2192]/g, '->').replace(/[\u2194]/g, '<->')
    .replace(/[\u2713\u2714]/g, '[OK]').replace(/[\u2717\u2718]/g, '[X]')
    .replace(/[\u2605\u2606]/g, '*')
    .replace(/[^\x00-\xFF]/g, '');
}

// ─── Color palette ─────────────────────────────────────────────────────────────
const C = {
  navy:    [10,  25,  60],   // deep navy — primary header bg
  navyMid: [18,  40,  90],   // slightly lighter navy for secondary header bg
  accent:  [37,  99, 235],   // bright blue accent stripe
  indigo:  [67,  56, 202],   // indigo for section headers
  red:     [220,  38,  38],
  redBg:   [254, 242, 242],
  amber:   [217, 119,   6],
  amberBg: [255, 251, 235],
  green:   [22,  163,  74],
  greenBg: [240, 253, 244],
  slate:   [71,   85, 105],
  muted:   [100, 116, 139],
  lightBg: [248, 250, 252],
  border:  [226, 232, 240],
  white:   [255, 255, 255],
  dark:    [15,  23,  42],
  subText: [148, 163, 184],
};

// ─── Fetch logo as base64 data URL ─────────────────────────────────────────────
// Returns null if the URL is missing or fetch fails — we fall back to wordmark.
async function fetchLogoAsBase64(logoUrl) {
  if (!logoUrl) return null;
  try {
    const resp = await fetch(logoUrl, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);
    const ct = resp.headers.get('content-type') || 'image/png';
    return `data:${ct};base64,${base64}`;
  } catch (_) {
    return null;
  }
}

// ─── Page layout constants ──────────────────────────────────────────────────────
const PAGE_W    = 210;  // A4 mm
const PAGE_H    = 297;  // A4 mm
const MARGIN    = 20;   // ISO standard 20mm margin
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H  = 18;   // running header height on continuation pages
const FOOTER_H  = 14;   // running footer height
const BODY_TOP  = HEADER_H + 6;
const BODY_BOT  = PAGE_H - FOOTER_H - 4;

// ─── Running header (all pages except cover) ────────────────────────────────────
function drawRunningHeader(doc, reportName, generatedDate, logoDataUrl) {
  // Background bar
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
  // Accent bottom stripe
  doc.setFillColor(...C.accent);
  doc.rect(0, HEADER_H, PAGE_W, 1.2, 'F');

  // Logo or wordmark
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', MARGIN, 3, 12, 12); } catch (_) {}
    doc.setTextColor(...C.white);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('FIBER ORACLE', MARGIN + 14, 10);
  } else {
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FIBER ORACLE', MARGIN, 11);
  }

  // Report name (center)
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(reportName), PAGE_W / 2, 11, { align: 'center', maxWidth: 100 });

  // Date (right)
  doc.setFontSize(6.5);
  doc.setTextColor(...C.subText);
  doc.text(s(generatedDate), PAGE_W - MARGIN, 11, { align: 'right' });
}

// ─── Running footer ─────────────────────────────────────────────────────────────
function drawRunningFooter(doc, pageNum, totalPages, companyName) {
  const fy = PAGE_H - FOOTER_H;
  doc.setFillColor(...C.navy);
  doc.rect(0, fy, PAGE_W, FOOTER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, fy, PAGE_W, 0.8, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(companyName || 'Fiber Oracle  |  fiberoracle.com'), MARGIN, fy + 8);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, fy + 8, { align: 'center' });
  doc.text('CONFIDENTIAL — FOR AUTHORIZED USE ONLY', PAGE_W - MARGIN, fy + 8, { align: 'right' });
}

// ─── Section header bar ─────────────────────────────────────────────────────────
function drawSectionHeader(doc, label, y, colorRGB, textColor = C.white) {
  doc.setFillColor(...colorRGB);
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F');
  doc.setTextColor(...textColor);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(s(label).toUpperCase(), MARGIN + 5, y + 5.6);
  return y + 12;
}

// ─── KPI card (small stat box) ──────────────────────────────────────────────────
function drawKpiCard(doc, x, y, w, h, value, label, valueColor) {
  doc.setFillColor(...C.lightBg);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(s(String(value)), x + w / 2, y + h * 0.58, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(s(label), x + w / 2, y + h * 0.85, { align: 'center' });
}

// ─── Horizontal divider ─────────────────────────────────────────────────────────
function drawDivider(doc, y) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
}

// ─── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportData } = await req.json();
    if (!reportData?.summary || !reportData?.onts) {
      return Response.json({ error: 'Invalid report data' }, { status: 400 });
    }

    const { summary, onts } = reportData;

    // ── Load company settings (logo URL, company name) ─────────────────────
    let logoDataUrl = null;
    let companyName = 'Fiber Oracle  |  fiberoracle.com';
    try {
      const settings = await base44.entities.AppSettings.list('-created_date', 1);
      if (settings && settings.length > 0) {
        if (settings[0].logo_url) {
          logoDataUrl = await fetchLogoAsBase64(settings[0].logo_url);
        }
        if (settings[0].company_name) {
          companyName = s(settings[0].company_name);
        }
      }
    } catch (_) { /* non-fatal — use defaults */ }

    // Fiber Oracle logo fallback
    if (!logoDataUrl) {
      logoDataUrl = await fetchLogoAsBase64(
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png'
      );
    }

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const generatedDateTime = new Date().toLocaleString('en-US');

    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    // Pre-categorize ONTs
    const criticalOnts = onts.filter(o => o._analysis?.status === 'critical');
    const warningOnts  = onts.filter(o => o._analysis?.status === 'warning');
    const okOnts       = onts.filter(o => o._analysis?.status === 'ok');
    const offlineOnts  = onts.filter(o =>
      !o._analysis?.status || o._analysis?.status === 'offline'
    );

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1 — PROFESSIONAL COVER
    // ─────────────────────────────────────────────────────────────────────────
    // Deep navy full-bleed background
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    // Accent vertical bar on left edge
    doc.setFillColor(...C.accent);
    doc.rect(0, 0, 6, PAGE_H, 'F');

    // Subtle mid-navy decorative band across upper third
    doc.setFillColor(...C.navyMid);
    doc.rect(6, 0, PAGE_W - 6, 120, 'F');

    // Company logo
    const logoX = MARGIN + 8;
    const logoY = 22;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, 22, 22);
      } catch (_) {}
      doc.setTextColor(...C.white);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('FIBER ORACLE', logoX + 26, logoY + 10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.subText);
      doc.text('fiberoracle.com', logoX + 26, logoY + 17);
    } else {
      doc.setTextColor(...C.white);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('FIBER ORACLE', logoX, logoY + 10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.subText);
      doc.text('fiberoracle.com', logoX, logoY + 17);
    }

    // Horizontal rule below logo
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.5);
    doc.line(MARGIN + 8, logoY + 27, PAGE_W - MARGIN - 8, logoY + 27);

    // Report type label
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text('PON PERFORMANCE MANAGEMENT', MARGIN + 8, logoY + 38);

    // Report title
    const reportTitle = s(summary.reportName || 'PON PM Analysis Report');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    const titleLines = doc.splitTextToSize(reportTitle, CONTENT_W - 8);
    doc.text(titleLines, MARGIN + 8, logoY + 48);

    // Date of report
    const uploadStr = summary.uploadDate
      ? new Date(summary.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : generatedDate;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text(`Report Date: ${uploadStr}`, MARGIN + 8, logoY + 48 + titleLines.length * 10 + 4);
    doc.text(`Generated:   ${generatedDateTime}`, MARGIN + 8, logoY + 48 + titleLines.length * 10 + 11);

    // ── KPI summary cards on cover ──────────────────────────────────────────
    const kpiTop = 140;
    const kpiItems = [
      { label: 'Total ONTs',  val: summary.totalOnts    || 0, color: C.accent },
      { label: 'Critical',    val: criticalOnts.length,        color: C.red   },
      { label: 'Warnings',    val: warningOnts.length,         color: C.amber },
      { label: 'Healthy',     val: okOnts.length,              color: C.green },
      { label: 'Offline',     val: offlineOnts.length,         color: C.muted },
    ];
    const kw = (CONTENT_W - 4 * 3) / 5;
    kpiItems.forEach((k, i) => {
      drawKpiCard(doc, MARGIN + i * (kw + 3), kpiTop, kw, 26, k.val, k.label, k.color);
    });

    // ── OLT list ────────────────────────────────────────────────────────────
    const oltListY = kpiTop + 32;
    doc.setFillColor(18, 40, 90);
    doc.roundedRect(MARGIN, oltListY, CONTENT_W, 18, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.subText);
    doc.text('OLTs IN REPORT', MARGIN + 4, oltListY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.white);
    const oltStr = (summary.olts || []).join('   |   ');
    const oltLines = doc.splitTextToSize(s(oltStr), CONTENT_W - 8);
    doc.text(oltLines.slice(0, 2), MARGIN + 4, oltListY + 12);

    // ── Signal stats bar ────────────────────────────────────────────────────
    const sigY = oltListY + 24;
    if (summary.avgOntRx != null) {
      doc.setFillColor(12, 30, 70);
      doc.roundedRect(MARGIN, sigY, CONTENT_W, 14, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.subText);
      doc.text('SIGNAL STATISTICS', MARGIN + 4, sigY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.white);
      const sigText = `Avg ONT Rx: ${(summary.avgOntRx || 0).toFixed(2)} dBm   |   Min: ${(summary.minOntRx || 0).toFixed(2)} dBm   |   Max: ${(summary.maxOntRx || 0).toFixed(2)} dBm`;
      doc.text(s(sigText), MARGIN + 4, sigY + 11);
    }

    // ── Technology breakdown ────────────────────────────────────────────────
    const techY = (summary.avgOntRx != null) ? sigY + 20 : sigY + 4;
    if ((summary.gpon_count > 0 || summary.xgs_count > 0) &&
        (summary.gpon_count !== undefined || summary.xgs_count !== undefined)) {
      const tw = (CONTENT_W - 4) / 2;
      const techItems = [
        { label: 'GPON ONTs',    val: summary.gpon_count || 0, color: C.accent },
        { label: 'XGS-PON ONTs', val: summary.xgs_count  || 0, color: C.indigo },
      ];
      techItems.forEach((t, i) => {
        doc.setFillColor(18, 40, 90);
        doc.roundedRect(MARGIN + i * (tw + 4), techY, tw, 14, 2, 2, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...t.color);
        doc.text(String(t.val), MARGIN + i * (tw + 4) + tw / 2, techY + 9, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.subText);
        doc.text(t.label, MARGIN + i * (tw + 4) + tw / 2, techY + 13, { align: 'center' });
      });
    }

    // Cover footer
    doc.setFillColor(...C.navy);
    doc.rect(6, PAGE_H - 18, PAGE_W - 6, 18, 'F');
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.5);
    doc.line(6, PAGE_H - 18, PAGE_W, PAGE_H - 18);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text(s(companyName), MARGIN, PAGE_H - 8);
    doc.text('CONFIDENTIAL — FOR AUTHORIZED USE ONLY', PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2 — EXECUTIVE SUMMARY + OLT BREAKDOWN
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();
    let y = BODY_TOP;

    // Executive summary section
    y = drawSectionHeader(doc, 'Executive Summary', y, C.indigo);

    // Health score donut (text-based approximation)
    const totalIssues = criticalOnts.length + warningOnts.length + offlineOnts.length;
    const healthPct = summary.totalOnts > 0
      ? Math.round((okOnts.length / summary.totalOnts) * 100)
      : 0;

    // Two-column summary layout
    const col1X = MARGIN;
    const col2X = MARGIN + CONTENT_W / 2 + 4;
    const colW  = CONTENT_W / 2 - 4;

    // Left col — health overview
    doc.setFillColor(...C.lightBg);
    doc.roundedRect(col1X, y, colW, 46, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(col1X, y, colW, 46, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text('Network Health Score', col1X + 4, y + 8);
    doc.setFontSize(30);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(healthPct >= 90 ? C.green[0] : healthPct >= 70 ? C.amber[0] : C.red[0],
                     healthPct >= 90 ? C.green[1] : healthPct >= 70 ? C.amber[1] : C.red[1],
                     healthPct >= 90 ? C.green[2] : healthPct >= 70 ? C.amber[2] : C.red[2]);
    doc.text(`${healthPct}%`, col1X + colW / 2, y + 30, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(`${okOnts.length} of ${summary.totalOnts || 0} ONTs operating normally`, col1X + colW / 2, y + 38, { align: 'center' });
    doc.text(`${totalIssues} total issues requiring attention`, col1X + colW / 2, y + 43, { align: 'center' });

    // Right col — quick issue list
    doc.setFillColor(...C.lightBg);
    doc.roundedRect(col2X, y, colW, 46, 2, 2, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(col2X, y, colW, 46, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text('Issue Breakdown', col2X + 4, y + 8);

    const issueRows = [
      { label: 'Critical',   val: criticalOnts.length, color: C.red   },
      { label: 'Warning',    val: warningOnts.length,  color: C.amber },
      { label: 'Offline',    val: offlineOnts.length,  color: C.muted },
      { label: 'Healthy',    val: okOnts.length,       color: C.green },
    ];
    issueRows.forEach((r, i) => {
      const ry = y + 14 + i * 8;
      // Mini bar
      const barW = colW - 8;
      const fillW = summary.totalOnts > 0 ? Math.max(2, (r.val / summary.totalOnts) * barW) : 0;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(col2X + 4, ry + 1.5, barW, 4, 1, 1, 'F');
      doc.setFillColor(...r.color);
      if (fillW > 0) doc.roundedRect(col2X + 4, ry + 1.5, fillW, 4, 1, 1, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.text(r.label, col2X + 4, ry);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...r.color);
      doc.text(String(r.val), col2X + colW - 4, ry, { align: 'right' });
    });

    y += 52;

    // Signal statistics table
    if (summary.avgOntRx != null) {
      y = drawSectionHeader(doc, 'Signal Statistics', y, C.slate);
      const sigCols = [
        ['Avg ONT Rx Power',  `${(summary.avgOntRx || 0).toFixed(2)} dBm`],
        ['Min ONT Rx Power',  `${(summary.minOntRx || 0).toFixed(2)} dBm`],
        ['Max ONT Rx Power',  `${(summary.maxOntRx || 0).toFixed(2)} dBm`],
        ['GPON ONTs',         String(summary.gpon_count || 0)],
        ['XGS-PON ONTs',      String(summary.xgs_count || 0)],
        ['OLT Count',         String(summary.oltCount || (summary.olts || []).length)],
      ];
      const scw = (CONTENT_W - 10) / 3;
      sigCols.forEach(([lbl, val], i) => {
        const sx = MARGIN + (i % 3) * (scw + 5);
        const sy = y + Math.floor(i / 3) * 14;
        doc.setFillColor(...C.lightBg);
        doc.roundedRect(sx, sy, scw, 12, 1.5, 1.5, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.muted);
        doc.text(s(lbl), sx + 3, sy + 5);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.dark);
        doc.text(s(val), sx + 3, sy + 10.5);
      });
      y += 32;
    }

    // OLT/Port breakdown table
    if (reportData.oltBreakdown && Object.keys(reportData.oltBreakdown).length > 0) {
      y = drawSectionHeader(doc, 'OLT & Port Breakdown', y, C.indigo);

      // Table header
      doc.setFillColor(...C.navyMid);
      doc.roundedRect(MARGIN, y, CONTENT_W, 7, 1, 1, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.white);
      const colOlt = MARGIN + 3, colPort = MARGIN + 45, colOnts = MARGIN + 90,
            colOk = MARGIN + 110, colWarn = MARGIN + 128, colCrit = MARGIN + 148, colRx = MARGIN + 165;
      doc.text('OLT', colOlt, y + 5);
      doc.text('Port', colPort, y + 5);
      doc.text('ONTs', colOnts, y + 5);
      doc.text('OK', colOk, y + 5);
      doc.text('Warn', colWarn, y + 5);
      doc.text('Crit', colCrit, y + 5);
      doc.text('Avg Rx', colRx, y + 5);
      y += 9;

      let rowIdx = 0;
      for (const [oltName, portMap] of Object.entries(reportData.oltBreakdown)) {
        for (const [portKey, portData] of Object.entries(portMap)) {
          if (y > BODY_BOT - 8) {
            doc.text('(continued on next page)', MARGIN, y + 4);
            break;
          }
          if (rowIdx % 2 === 0) {
            doc.setFillColor(...C.lightBg);
            doc.rect(MARGIN, y, CONTENT_W, 6.5, 'F');
          }
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...C.dark);
          doc.text(s(oltName), colOlt, y + 4.5, { maxWidth: 40 });
          doc.text(s(portKey), colPort, y + 4.5, { maxWidth: 42 });
          doc.text(String(portData.total || 0), colOnts, y + 4.5);
          doc.setTextColor(...C.green);
          doc.text(String(portData.ok || 0), colOk, y + 4.5);
          doc.setTextColor(...C.amber);
          doc.text(String(portData.warning || 0), colWarn, y + 4.5);
          doc.setTextColor(...C.red);
          doc.text(String(portData.critical || 0), colCrit, y + 4.5);
          doc.setTextColor(...C.dark);
          doc.text(portData.avgRx != null ? `${Number(portData.avgRx).toFixed(1)} dBm` : 'N/A', colRx, y + 4.5);
          y += 6.5;
          rowIdx++;
        }
      }
      y += 4;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRITICAL ISSUES SECTION
    // ─────────────────────────────────────────────────────────────────────────
    const renderOntBlock = (ont, bgColor, borderColor, titleColor, statusLabel) => {
      const issues = [
        ...(ont._analysis?.issues   || []),
        ...(ont._analysis?.warnings || []),
      ];
      const blockH = 10 + Math.min(issues.length, 4) * 8 + 4;
      if (y > BODY_BOT - blockH) { doc.addPage(); y = BODY_TOP; }

      // Card background
      doc.setFillColor(...bgColor);
      doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F');
      // Left accent bar
      doc.setFillColor(...borderColor);
      doc.roundedRect(MARGIN, y, 3, blockH, 1, 0, 'F');

      // ONT identity row
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...titleColor);
      const ontLabel = `ONT ${s(ont.OntID || ont.ont_id || 'N/A')}  |  Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}`;
      doc.text(ontLabel, MARGIN + 5, y + 6.5);

      // Right side: OLT/port + model
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...C.muted);
      const rightLabel = `${s(ont._oltName || ont.olt_name || 'N/A')}  /  ${s(ont._port || ont.shelf_slot_port || 'N/A')}  |  Model: ${s(ont.model || ont.subscriber_model || 'N/A')}`;
      doc.text(rightLabel, PAGE_W - MARGIN - 2, y + 6.5, { align: 'right', maxWidth: CONTENT_W / 2 });

      // Subscriber info (if available)
      const subName    = ont.subscriber_account_name || ont._subscriber?.name || '';
      const subAddress = ont.subscriber_address      || ont._subscriber?.address || '';
      if (subName || subAddress) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...C.slate);
        doc.text(s(`${subName}${subAddress ? '  |  ' + subAddress : ''}`), MARGIN + 5, y + 11.5, { maxWidth: CONTENT_W - 8 });
      }

      // Issues list
      issues.slice(0, 4).forEach((issue, i) => {
        const iy = y + (subName || subAddress ? 15 : 11) + i * 7.5;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.dark);
        doc.text(`• ${s(issue.field)}: ${s(String(issue.value))}`, MARGIN + 5, iy);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        const msgLines = doc.splitTextToSize(s(issue.message || ''), CONTENT_W - 14);
        doc.text(msgLines.slice(0, 2), MARGIN + 9, iy + 4.5);
      });
      if (issues.length > 4) {
        doc.setFontSize(6);
        doc.setTextColor(...C.muted);
        doc.text(`  + ${issues.length - 4} more issues`, MARGIN + 5, y + blockH - 2);
      }
      y += blockH + 3;
    };

    if (criticalOnts.length > 0) {
      doc.addPage();
      y = BODY_TOP;
      y = drawSectionHeader(doc, `Critical Issues  (${criticalOnts.length} ONTs)`, y, C.red);
      criticalOnts.slice(0, 80).forEach(ont => {
        renderOntBlock(ont, C.redBg, C.red, [153, 27, 27], 'CRITICAL');
      });
      if (criticalOnts.length > 80) {
        if (y > BODY_BOT - 10) { doc.addPage(); y = BODY_TOP; }
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${criticalOnts.length - 80} additional critical records omitted. Download the CSV export for the full list.`, MARGIN, y);
        y += 8;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WARNINGS SECTION
    // ─────────────────────────────────────────────────────────────────────────
    if (warningOnts.length > 0) {
      doc.addPage();
      y = BODY_TOP;
      y = drawSectionHeader(doc, `Warnings  (${warningOnts.length} ONTs)`, y, [180, 100, 0]);
      warningOnts.slice(0, 80).forEach(ont => {
        renderOntBlock(ont, C.amberBg, C.amber, [146, 64, 14], 'WARNING');
      });
      if (warningOnts.length > 80) {
        if (y > BODY_BOT - 10) { doc.addPage(); y = BODY_TOP; }
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${warningOnts.length - 80} additional warnings omitted. Download the CSV export for the full list.`, MARGIN, y);
        y += 8;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HEALTHY SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    if (okOnts.length > 0) {
      if (y > BODY_BOT - 30) { doc.addPage(); y = BODY_TOP; }
      y = drawSectionHeader(doc, `Healthy ONTs  (${okOnts.length})`, y, C.green);
      doc.setFillColor(...C.greenBg);
      doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, 'F');
      doc.setFillColor(...C.green);
      doc.roundedRect(MARGIN, y, 3, 14, 1, 0, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(21, 128, 61);
      doc.text(
        `${okOnts.length} ONTs are operating within all normal parameters. No corrective action required.`,
        MARGIN + 6, y + 9
      );
      y += 18;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OFFLINE / NO-STATUS SECTION
    // ─────────────────────────────────────────────────────────────────────────
    if (offlineOnts.length > 0) {
      if (y > BODY_BOT - 20) { doc.addPage(); y = BODY_TOP; }
      y = drawSectionHeader(doc, `Offline / No Signal  (${offlineOnts.length})`, y, C.slate);
      offlineOnts.slice(0, 40).forEach(ont => {
        if (y > BODY_BOT - 10) { doc.addPage(); y = BODY_TOP; }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.dark);
        const offlineStr = `• ONT ${s(ont.OntID || ont.ont_id || 'N/A')}  |  Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}  |  ${s(ont._oltName || ont.olt_name || '')} / ${s(ont._port || ont.shelf_slot_port || '')}`;
        doc.text(offlineStr, MARGIN, y, { maxWidth: CONTENT_W });
        y += 6;
      });
      if (offlineOnts.length > 40) {
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${offlineOnts.length - 40} more offline ONTs not shown.`, MARGIN, y);
        y += 6;
      }
      y += 4;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPLY RUNNING HEADERS + FOOTERS (skip cover = page 1)
    // ─────────────────────────────────────────────────────────────────────────
    const totalPages = doc.internal.pages.length - 1; // pages array is 1-indexed, index 0 is empty
    const shortReportName = s(summary.reportName || 'PON PM Report');

    for (let p = 2; p <= totalPages; p++) {
      doc.setPage(p);
      drawRunningHeader(doc, shortReportName, generatedDate, logoDataUrl);
      drawRunningFooter(doc, p - 1, totalPages - 1, companyName);
    }

    return new Response(doc.output('arraybuffer'), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=FiberOracle-PON-PM-${new Date().toISOString().slice(0, 10)}.pdf`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[generatePonPmPDF] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});