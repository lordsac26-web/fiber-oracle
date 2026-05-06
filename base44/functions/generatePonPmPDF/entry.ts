/**
 * generatePonPmPDF
 *
 * Produces a professional-grade PON PM analysis PDF report using jsPDF.
 * Layout:
 *   Page 1  — Cover (KPI cards, OLT list, signal stats)
 *   Page 2  — Shelf/Port Criticality Breakdown (pie chart + bar table)
 *   Page 3+ — Critical ONTs (detailed cards, one per ONT block)
 *   Next    — Warnings (compact cards)
 *   Next    — Offline list
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ─── Text Sanitizer ────────────────────────────────────────────────────────────
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
  navy:    [10,  25,  60],
  navyMid: [18,  40,  90],
  accent:  [37,  99, 235],
  indigo:  [67,  56, 202],
  red:     [220,  38,  38],
  redBg:   [254, 242, 242],
  redDark: [153,  27,  27],
  amber:   [217, 119,   6],
  amberBg: [255, 251, 235],
  amberDark:[146, 64,  14],
  green:   [22,  163,  74],
  greenBg: [240, 253, 244],
  slate:   [71,   85, 105],
  muted:   [100, 116, 139],
  lightBg: [248, 250, 252],
  border:  [226, 232, 240],
  white:   [255, 255, 255],
  dark:    [15,  23,  42],
  subText: [148, 163, 184],
  purple:  [124,  58, 237],
  purpleBg:[245, 243, 255],
};

// ─── Logo fetch ────────────────────────────────────────────────────────────────
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
  } catch (_) { return null; }
}

// ─── Page layout constants ──────────────────────────────────────────────────────
const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN    = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H  = 18;
const FOOTER_H  = 14;
const BODY_TOP  = HEADER_H + 6;
const BODY_BOT  = PAGE_H - FOOTER_H - 4;

// ─── Running header ─────────────────────────────────────────────────────────────
function drawRunningHeader(doc, reportName, generatedDate, logoDataUrl) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HEADER_H, PAGE_W, 1.2, 'F');

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

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(reportName), PAGE_W / 2, 11, { align: 'center', maxWidth: 100 });
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
function drawSectionHeader(doc, label, y, colorRGB) {
  doc.setFillColor(...colorRGB);
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(s(label).toUpperCase(), MARGIN + 5, y + 5.6);
  return y + 12;
}

// ─── KPI card ───────────────────────────────────────────────────────────────────
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

// ─── Draw a pie chart (pure jsPDF arcs) ────────────────────────────────────────
// segments: [{ value, color, label }]
function drawPieChart(doc, cx, cy, r, segments) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2; // start at top

  segments.forEach(seg => {
    if (seg.value === 0) return;
    const sweep = (seg.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const midAngle = startAngle + sweep / 2;

    // Draw filled arc sector using polygon approximation
    const steps = Math.max(8, Math.ceil(sweep * 20));
    const pts = [[cx, cy]];
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (sweep * i) / steps;
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }

    doc.setFillColor(...seg.color);
    doc.setDrawColor(...C.white);
    doc.setLineWidth(0.5);

    // Draw as lines polygon
    doc.lines(
      pts.slice(1).map((p, i) => {
        const prev = pts[i];
        return [p[0] - prev[0], p[1] - prev[1]];
      }),
      pts[0][0], pts[0][1],
      [1, 1], 'FD', true
    );

    startAngle = endAngle;
  });

  // White circle center hole (donut effect)
  doc.setFillColor(...C.white);
  doc.circle(cx, cy, r * 0.42, 'F');
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

    // ── Company settings ────────────────────────────────────────────────────
    let logoDataUrl = null;
    let companyName = 'Fiber Oracle  |  fiberoracle.com';
    try {
      const settings = await base44.entities.AppSettings.list('-created_date', 1);
      if (settings?.[0]) {
        if (settings[0].logo_url) logoDataUrl = await fetchLogoAsBase64(settings[0].logo_url);
        if (settings[0].company_name) companyName = s(settings[0].company_name);
      }
    } catch (_) {}

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
    const offlineOnts  = onts.filter(o => !o._analysis?.status || o._analysis?.status === 'offline');

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1 — COVER
    // ─────────────────────────────────────────────────────────────────────────
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    doc.setFillColor(...C.accent);
    doc.rect(0, 0, 6, PAGE_H, 'F');
    doc.setFillColor(...C.navyMid);
    doc.rect(6, 0, PAGE_W - 6, 120, 'F');

    const logoX = MARGIN + 8, logoY = 22;
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', logoX, logoY, 22, 22); } catch (_) {}
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

    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.5);
    doc.line(MARGIN + 8, logoY + 27, PAGE_W - MARGIN - 8, logoY + 27);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text('PON PERFORMANCE MANAGEMENT', MARGIN + 8, logoY + 38);

    const reportTitle = s(summary.reportName || 'PON PM Analysis Report');
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    const titleLines = doc.splitTextToSize(reportTitle, CONTENT_W - 8);
    doc.text(titleLines, MARGIN + 8, logoY + 48);

    const uploadStr = summary.uploadDate
      ? new Date(summary.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : generatedDate;
    const titleBottom = logoY + 48 + titleLines.length * 10 + 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text(`Report Date: ${uploadStr}`, MARGIN + 8, titleBottom);
    doc.text(`Generated:   ${generatedDateTime}`, MARGIN + 8, titleBottom + 7);

    // KPI cards
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

    // OLT list
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

    // Signal stats
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

    // Technology breakdown
    const techY = (summary.avgOntRx != null) ? sigY + 20 : sigY + 4;
    if (summary.gpon_count > 0 || summary.xgs_count > 0) {
      const tw = (CONTENT_W - 4) / 2;
      [
        { label: 'GPON ONTs',    val: summary.gpon_count || 0, color: C.accent },
        { label: 'XGS-PON ONTs', val: summary.xgs_count  || 0, color: C.indigo },
      ].forEach((t, i) => {
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
    // PAGE 2 — SHELF/PORT CRITICALITY BREAKDOWN
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();
    let y = BODY_TOP;

    y = drawSectionHeader(doc, 'Criticality Breakdown by OLT & Port', y, C.indigo);

    // ── Build per-OLT and per-port stats ─────────────────────────────────────
    // Structure: { [oltName]: { critical, warning, ok, offline, ports: { [portKey]: {critical,warning,ok,offline,total,avgRx} } } }
    const oltStats = {};
    onts.forEach(ont => {
      const olt  = s(ont._oltName || ont.olt_name || 'Unknown');
      const port = s(ont._port || ont.shelf_slot_port || 'Unknown');
      const st   = ont._analysis?.status || 'offline';
      const rx   = parseFloat(ont.OntRxOptPwr ?? ont.ont_rx_power);

      if (!oltStats[olt]) oltStats[olt] = { critical: 0, warning: 0, ok: 0, offline: 0, ports: {} };
      oltStats[olt][st] = (oltStats[olt][st] || 0) + 1;

      if (!oltStats[olt].ports[port]) {
        oltStats[olt].ports[port] = { critical: 0, warning: 0, ok: 0, offline: 0, total: 0, rxSum: 0, rxCount: 0 };
      }
      const pp = oltStats[olt].ports[port];
      pp[st] = (pp[st] || 0) + 1;
      pp.total++;
      if (!isNaN(rx)) { pp.rxSum += rx; pp.rxCount++; }
    });

    // ── Donut pie chart — overall status distribution ─────────────────────────
    const pieSegments = [
      { value: criticalOnts.length, color: C.red,   label: `Critical: ${criticalOnts.length}` },
      { value: warningOnts.length,  color: C.amber,  label: `Warning: ${warningOnts.length}`  },
      { value: offlineOnts.length,  color: C.muted,  label: `Offline: ${offlineOnts.length}`  },
      { value: okOnts.length,       color: C.green,  label: `Healthy: ${okOnts.length}`       },
    ].filter(s => s.value > 0);

    const pieR  = 28;
    const pieCX = MARGIN + pieR + 6;
    const pieCY = y + pieR + 4;

    drawPieChart(doc, pieCX, pieCY, pieR, pieSegments);

    // Center label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(String(onts.length), pieCX, pieCY - 1, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('Total ONTs', pieCX, pieCY + 4, { align: 'center' });

    // Legend
    const legendX = pieCX + pieR + 8;
    const legendColors = [C.red, C.amber, C.muted, C.green];
    const legendLabels = [
      `Critical   ${criticalOnts.length}  (${onts.length > 0 ? ((criticalOnts.length / onts.length) * 100).toFixed(1) : 0}%)`,
      `Warning   ${warningOnts.length}  (${onts.length > 0 ? ((warningOnts.length / onts.length) * 100).toFixed(1) : 0}%)`,
      `Offline     ${offlineOnts.length}  (${onts.length > 0 ? ((offlineOnts.length / onts.length) * 100).toFixed(1) : 0}%)`,
      `Healthy    ${okOnts.length}  (${onts.length > 0 ? ((okOnts.length / onts.length) * 100).toFixed(1) : 0}%)`,
    ];
    legendColors.forEach((col, i) => {
      const ly = pieCY - 10 + i * 8;
      doc.setFillColor(...col);
      doc.roundedRect(legendX, ly, 4, 4, 0.5, 0.5, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.text(s(legendLabels[i]), legendX + 6, ly + 3.5);
    });

    y = pieCY + pieR + 8;

    // ── Per-OLT horizontal bar chart for criticals ────────────────────────────
    const oltNames = Object.keys(oltStats).sort();
    const maxCrit = Math.max(1, ...oltNames.map(o => oltStats[o].critical || 0));
    const barAreaW = CONTENT_W - 55;

    y = drawSectionHeader(doc, 'Critical Issues per OLT', y + 2, [90, 30, 30]);

    oltNames.forEach(oltName => {
      if (y > BODY_BOT - 8) { doc.addPage(); y = BODY_TOP; }
      const st = oltStats[oltName];
      const total = (st.critical || 0) + (st.warning || 0) + (st.ok || 0) + (st.offline || 0);
      const critPct = maxCrit > 0 ? (st.critical || 0) / maxCrit : 0;
      const warnPct = maxCrit > 0 ? (st.warning || 0) / maxCrit : 0;

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.dark);
      doc.text(s(oltName), MARGIN, y + 4);

      // Count badges
      const badgeX = MARGIN + 45;
      doc.setFontSize(5.5);
      // Crit badge
      if (st.critical > 0) {
        doc.setFillColor(...C.red);
        doc.roundedRect(badgeX, y, 14, 5.5, 0.8, 0.8, 'F');
        doc.setTextColor(...C.white);
        doc.setFont('helvetica', 'bold');
        doc.text(`${st.critical} CRIT`, badgeX + 7, y + 3.8, { align: 'center' });
      }
      if (st.warning > 0) {
        doc.setFillColor(...C.amber);
        doc.roundedRect(badgeX + 16, y, 14, 5.5, 0.8, 0.8, 'F');
        doc.setTextColor(...C.white);
        doc.text(`${st.warning} WARN`, badgeX + 23, y + 3.8, { align: 'center' });
      }
      if (st.offline > 0) {
        doc.setFillColor(...C.slate);
        doc.roundedRect(badgeX + 32, y, 14, 5.5, 0.8, 0.8, 'F');
        doc.setTextColor(...C.white);
        doc.text(`${st.offline} OFFLN`, badgeX + 39, y + 3.8, { align: 'center' });
      }

      // Horizontal bar
      const barX = MARGIN + 95;
      const barH = 5.5;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, y, barAreaW, barH, 0.8, 0.8, 'F');
      if (critPct > 0) {
        doc.setFillColor(...C.red);
        doc.roundedRect(barX, y, Math.max(1, critPct * barAreaW), barH, 0.8, 0.8, 'F');
      }
      // Stacked warning on top of critical
      const critBarW = critPct * barAreaW;
      if (warnPct > 0) {
        doc.setFillColor(...C.amber);
        doc.roundedRect(barX + critBarW, y, Math.max(1, warnPct * (barAreaW - critBarW)), barH, 0, 0, 'F');
      }

      // Total label at end
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`${total} ONTs`, barX + barAreaW + 2, y + 4);

      y += 8;
    });

    y += 4;

    // ── Per-Port breakdown table ───────────────────────────────────────────────
    if (y < BODY_BOT - 30) {
      y = drawSectionHeader(doc, 'Port-Level Breakdown (All Ports with Issues)', y, C.slate);

      // Table header
      doc.setFillColor(...C.navyMid);
      doc.roundedRect(MARGIN, y, CONTENT_W, 7, 1, 1, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.white);
      const colOlt  = MARGIN + 2;
      const colPort = MARGIN + 38;
      const colTot  = MARGIN + 82;
      const colCrit = MARGIN + 98;
      const colWarn = MARGIN + 118;
      const colOff  = MARGIN + 138;
      const colOk   = MARGIN + 154;
      const colRx   = MARGIN + 168;
      doc.text('OLT',      colOlt,  y + 5);
      doc.text('Port',     colPort, y + 5);
      doc.text('Total',    colTot,  y + 5);
      doc.text('Critical', colCrit, y + 5);
      doc.text('Warning',  colWarn, y + 5);
      doc.text('Offline',  colOff,  y + 5);
      doc.text('OK',       colOk,   y + 5);
      doc.text('Avg Rx',   colRx,   y + 5);
      y += 9;

      let rowIdx = 0;
      for (const oltName of oltNames) {
        const ports = oltStats[oltName].ports;
        const portKeys = Object.keys(ports).sort();
        for (const portKey of portKeys) {
          const pp = ports[portKey];
          if (pp.critical === 0 && pp.warning === 0) continue; // skip clean ports
          if (y > BODY_BOT - 7) { doc.addPage(); y = BODY_TOP; }
          if (rowIdx % 2 === 0) {
            doc.setFillColor(...C.lightBg);
            doc.rect(MARGIN, y, CONTENT_W, 6.5, 'F');
          }
          const avgRx = pp.rxCount > 0 ? (pp.rxSum / pp.rxCount).toFixed(1) : 'N/A';
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...C.dark);
          doc.text(s(oltName), colOlt,  y + 4.5, { maxWidth: 34 });
          doc.text(s(portKey), colPort, y + 4.5, { maxWidth: 42 });
          doc.text(String(pp.total),   colTot,  y + 4.5);
          doc.setTextColor(...C.red);
          doc.text(String(pp.critical || 0), colCrit, y + 4.5);
          doc.setTextColor(...C.amber);
          doc.text(String(pp.warning || 0),  colWarn, y + 4.5);
          doc.setTextColor(...C.slate);
          doc.text(String(pp.offline || 0),  colOff,  y + 4.5);
          doc.setTextColor(...C.green);
          doc.text(String(pp.ok || 0),       colOk,   y + 4.5);
          doc.setTextColor(...C.dark);
          doc.text(avgRx !== 'N/A' ? `${avgRx} dBm` : 'N/A', colRx, y + 4.5);
          y += 6.5;
          rowIdx++;
        }
      }
      y += 4;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRITICAL ISSUES — detailed cards
    // ─────────────────────────────────────────────────────────────────────────
    const renderOntCard = (ont, statusColor, statusBg, statusDark, statusLabel) => {
      const issues = [
        ...(ont._analysis?.issues   || []),
        ...(ont._analysis?.warnings || []),
      ];

      // Compute block height dynamically
      const hasSubscriber = !!(ont.subscriber_account_name || ont._subscriber?.name || ont._subscriber?.address);
      const subLineH = hasSubscriber ? 8 : 0;
      const issueLineH = Math.min(issues.length, 6) * 7;
      const powerRowH = 14;
      const blockH = 10 + subLineH + powerRowH + issueLineH + 4;

      if (y > BODY_BOT - blockH) { doc.addPage(); y = BODY_TOP; }

      // Card background
      doc.setFillColor(...statusBg);
      doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F');

      // Left accent bar
      doc.setFillColor(...statusColor);
      doc.roundedRect(MARGIN, y, 3.5, blockH, 1, 0, 'F');

      // Status pill top-right
      doc.setFillColor(...statusColor);
      doc.roundedRect(PAGE_W - MARGIN - 20, y + 2, 18, 5.5, 1, 1, 'F');
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.white);
      doc.text(statusLabel, PAGE_W - MARGIN - 11, y + 5.5, { align: 'center' });

      // ONT identity row
      const ix = MARGIN + 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...statusDark);
      const ontIdStr = `ONT ${s(ont.OntID || ont.ont_id || 'N/A')}`;
      doc.text(ontIdStr, ix, y + 7);

      // Serial on same line (right-aligned near status pill)
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}`, ix + 22, y + 7);

      // OLT / Port / Model row
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.slate);
      const locationStr = `${s(ont._oltName || ont.olt_name || 'N/A')}  /  ${s(ont._port || ont.shelf_slot_port || 'N/A')}`;
      const modelStr    = `Model: ${s(ont.model || ont.subscriber_model || 'N/A')}`;
      doc.text(locationStr, ix, y + 13);

      // LCP/Splitter if available
      const lcpStr = ont._lcpNumber ? `LCP: ${s(ont._lcpNumber)}${ont._splitterNumber ? ' / Spl: ' + s(ont._splitterNumber) : ''}` : '';
      if (lcpStr) {
        doc.setFontSize(5.5);
        doc.setTextColor(...C.muted);
        doc.text(lcpStr, ix + 65, y + 13);
      }
      doc.setFontSize(6.5);
      doc.setTextColor(...C.slate);
      doc.text(modelStr, PAGE_W - MARGIN - 22, y + 13, { align: 'right' });

      let cardY = y + 16;

      // Subscriber info
      if (hasSubscriber) {
        const subName    = s(ont.subscriber_account_name || ont._subscriber?.name || '');
        const subAddress = s(ont.subscriber_address      || ont._subscriber?.address || '');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...C.indigo);
        const subStr = [subName, subAddress].filter(Boolean).join('  |  ');
        doc.text(subStr, ix, cardY + 4, { maxWidth: CONTENT_W - 12 });
        cardY += 7;
      }

      // ── Power readings row ──────────────────────────────────────────────────
      const powerItems = [
        { label: 'ONT Rx',  val: ont.OntRxOptPwr   ?? ont.ont_rx_power,  unit: 'dBm', threshold: -27, low: true  },
        { label: 'OLT Rx',  val: ont.OLTRXOptPwr   ?? ont.olt_rx_power,  unit: 'dBm', threshold: -28, low: true  },
        { label: 'ONT Tx',  val: ont.OntTxPwr       ?? ont.ont_tx_power,  unit: 'dBm', threshold: null            },
      ];
      const pwW = (CONTENT_W - 8) / powerItems.length;
      powerItems.forEach((pw, pi) => {
        const px  = ix + pi * pwW;
        const val = parseFloat(pw.val);
        const bad = !isNaN(val) && pw.threshold != null && (pw.low ? val < pw.threshold : val > pw.threshold);
        doc.setFillColor(bad ? 254 : 241, bad ? 226 : 245, bad ? 226 : 251);
        doc.roundedRect(px - 2, cardY - 1, pwW - 2, 11, 1, 1, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(bad ? C.red : C.dark));
        doc.text(isNaN(val) ? 'N/A' : `${val.toFixed(2)}`, px + (pwW - 4) / 2 - 2, cardY + 5.5, { align: 'center' });
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.muted);
        doc.text(`${pw.unit}  ${pw.label}`, px + (pwW - 4) / 2 - 2, cardY + 9, { align: 'center' });
      });
      cardY += 13;

      // ── Issues list ─────────────────────────────────────────────────────────
      issues.slice(0, 6).forEach((issue, i) => {
        if (cardY + 7 > y + blockH - 1) return;
        const isErr = ont._analysis?.issues?.includes(issue);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isErr ? C.redDark[0] : C.amberDark[0], isErr ? C.redDark[1] : C.amberDark[1], isErr ? C.redDark[2] : C.amberDark[2]);
        doc.text(`• ${s(issue.field)}: ${s(String(issue.value))}`, ix, cardY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...C.muted);
        const msgLines = doc.splitTextToSize(s(issue.message || ''), CONTENT_W - 16);
        doc.text(msgLines.slice(0, 1), ix + 3, cardY + 4);
        cardY += 7;
      });

      if (issues.length > 6) {
        doc.setFontSize(5.5);
        doc.setTextColor(...C.muted);
        doc.text(`  + ${issues.length - 6} more issues`, ix, y + blockH - 2);
      }

      y += blockH + 3;
    };

    // ── Critical pages ────────────────────────────────────────────────────────
    if (criticalOnts.length > 0) {
      doc.addPage();
      y = BODY_TOP;
      y = drawSectionHeader(doc, `Critical Issues  (${criticalOnts.length} ONTs)`, y, C.red);
      criticalOnts.slice(0, 100).forEach(ont => {
        renderOntCard(ont, C.red, C.redBg, C.redDark, 'CRITICAL');
      });
      if (criticalOnts.length > 100) {
        if (y > BODY_BOT - 10) { doc.addPage(); y = BODY_TOP; }
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${criticalOnts.length - 100} additional critical records omitted. Download the CSV export for the full list.`, MARGIN, y);
        y += 8;
      }
    }

    // ── Warning pages ─────────────────────────────────────────────────────────
    if (warningOnts.length > 0) {
      doc.addPage();
      y = BODY_TOP;
      y = drawSectionHeader(doc, `Warnings  (${warningOnts.length} ONTs)`, y, [180, 100, 0]);
      warningOnts.slice(0, 100).forEach(ont => {
        renderOntCard(ont, C.amber, C.amberBg, C.amberDark, 'WARNING');
      });
      if (warningOnts.length > 100) {
        if (y > BODY_BOT - 10) { doc.addPage(); y = BODY_TOP; }
        doc.setFontSize(7.5);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${warningOnts.length - 100} additional warnings omitted. Download the CSV export for the full list.`, MARGIN, y);
        y += 8;
      }
    }

    // ── Healthy summary ───────────────────────────────────────────────────────
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

    // ── Offline section ───────────────────────────────────────────────────────
    if (offlineOnts.length > 0) {
      if (y > BODY_BOT - 20) { doc.addPage(); y = BODY_TOP; }
      y = drawSectionHeader(doc, `Offline / No Signal  (${offlineOnts.length})`, y, C.slate);
      offlineOnts.slice(0, 50).forEach(ont => {
        if (y > BODY_BOT - 10) { doc.addPage(); y = BODY_TOP; }
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.dark);
        const offlineStr = `• ONT ${s(ont.OntID || ont.ont_id || 'N/A')}  |  Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}  |  ${s(ont._oltName || ont.olt_name || '')} / ${s(ont._port || ont.shelf_slot_port || '')}${ont._lcpNumber ? '  |  LCP: ' + s(ont._lcpNumber) : ''}`;
        doc.text(offlineStr, MARGIN, y, { maxWidth: CONTENT_W });
        y += 6;
      });
      if (offlineOnts.length > 50) {
        doc.setFontSize(6);
        doc.setTextColor(...C.muted);
        doc.text(`... and ${offlineOnts.length - 50} more offline ONTs not shown.`, MARGIN, y);
        y += 6;
      }
    }

    // ── Apply running headers + footers ───────────────────────────────────────
    const totalPages = doc.internal.pages.length - 1;
    const shortReportName = s(summary.reportName || 'PON PM Report');

    for (let p = 2; p <= totalPages; p++) {
      doc.setPage(p);
      drawRunningHeader(doc, shortReportName, generatedDate, logoDataUrl);
      drawRunningFooter(doc, p - 1, totalPages - 1, companyName);
    }

    return new Response(new Uint8Array(doc.output('arraybuffer')), {
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