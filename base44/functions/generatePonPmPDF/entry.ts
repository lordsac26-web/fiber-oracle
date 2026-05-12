/**
 * generatePonPmPDF
 *
 * Produces a PON PM analysis PDF report using jsPDF.
 *
 * Two modes:
 *   1. Full report (default)        — cover, breakdown, all critical/warning/offline cards
 *   2. Critical-only (criticalOnly: true) — purpose-built layout focused on actionable
 *      critical issues, with prominent customer branding and a clean reading order:
 *        a. Branded header (customer logo + FiberOracle.com)
 *        b. KPI strip (Total / Critical / Warning / Healthy / Offline)
 *        c. OLTs-in-System section: per-chassis critical-issue pie chart
 *        d. Port-level breakdown for ports with critical issues
 *        e. Per-ONT detailed cards
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ─── Text Sanitizer (Latin-1 only — jsPDF's default fonts don't ship Unicode) ─
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

// Pie chart palette for chassis breakdown (cycled if more chassis than colors)
const CHASSIS_COLORS = [
  [220, 38, 38],   // red
  [37, 99, 235],   // blue
  [124, 58, 237],  // purple
  [217, 119, 6],   // amber
  [22, 163, 74],   // green
  [219, 39, 119],  // pink
  [13, 148, 136],  // teal
  [101, 163, 13],  // lime
  [234, 88, 12],   // orange
  [79, 70, 229],   // indigo
];

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
const MARGIN    = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H  = 22;          // Taller header to fit logo prominently
const FOOTER_H  = 12;
const BODY_TOP  = HEADER_H + 6;
const BODY_BOT  = PAGE_H - FOOTER_H - 4;

// ─── Logo plate ────────────────────────────────────────────────────────────────
// Renders the customer logo on a white rounded "plate" so the artwork remains
// legible against the dark header band regardless of the logo's own background
// (transparent / dark / colored). The logo is letterboxed inside the plate
// instead of being stretched, preserving the customer's aspect ratio.
//
// jsPDF's addImage supports passing the image then querying back the natural
// pixel dimensions via getImageProperties — we use it to compute the fitted
// draw rectangle.
function drawLogoOnPlate(doc, logoDataUrl, x, y, plateW, plateH) {
  // White rounded plate
  doc.setFillColor(...C.white);
  doc.roundedRect(x, y, plateW, plateH, 1.5, 1.5, 'F');

  if (!logoDataUrl) return;
  try {
    const props = doc.getImageProperties(logoDataUrl);
    const padX = 1.2, padY = 1.2;
    const maxW = plateW - padX * 2;
    const maxH = plateH - padY * 2;
    const ratio = props.width / props.height;
    let drawW = maxW;
    let drawH = drawW / ratio;
    if (drawH > maxH) { drawH = maxH; drawW = drawH * ratio; }
    const drawX = x + (plateW - drawW) / 2;
    const drawY = y + (plateH - drawH) / 2;
    doc.addImage(logoDataUrl, props.fileType || 'PNG', drawX, drawY, drawW, drawH);
  } catch (_) { /* swallow — plate already drawn */ }
}

// ─── Branded running header (used on every page in critical-only mode) ────────
function drawBrandedHeader(doc, customerLogo, customerName, generatedDate) {
  // Background band
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HEADER_H, PAGE_W, 1.2, 'F');

  // Customer logo on a white plate — sized larger for legibility, letterboxed
  // to preserve aspect ratio. Plate is 18mm wide × 14mm tall (fits within
  // 22mm header height with 4mm top/bottom breathing room).
  let cursorX = MARGIN;
  if (customerLogo) {
    drawLogoOnPlate(doc, customerLogo, cursorX, 4, 18, 14);
    cursorX += 22; // 18mm plate + 4mm gap
  }

  // Customer name + Fiber Oracle co-branding
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (customerName) {
    doc.text(s(customerName), cursorX, 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text('Powered by FiberOracle.com', cursorX, 17);
  } else {
    doc.text('FIBER ORACLE', cursorX, 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text('fiberoracle.com', cursorX, 17);
  }

  // Right side: report tag + date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.red);
  doc.text('CRITICAL ISSUES REPORT', PAGE_W - MARGIN, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.subText);
  doc.text(s(generatedDate), PAGE_W - MARGIN, 16, { align: 'right' });
}

// ─── Footer ────────────────────────────────────────────────────────────────────
function drawBrandedFooter(doc, pageNum, totalPages, customerName) {
  const fy = PAGE_H - FOOTER_H;
  doc.setFillColor(...C.navy);
  doc.rect(0, fy, PAGE_W, FOOTER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, fy, PAGE_W, 0.6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(customerName || 'Fiber Oracle'), MARGIN, fy + 7);
  doc.text('FiberOracle.com', PAGE_W / 2, fy + 7, { align: 'center' });
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, fy + 7, { align: 'right' });
}

// ─── Section title bar ─────────────────────────────────────────────────────────
// Adds a 4mm top gap before the title so consecutive sections never touch.
// Returns the y at which body content should start (under the title bar with
// a small breathing line).
function drawSectionTitle(doc, label, y, colorRGB) {
  const topGap = 4;
  const yt = y + topGap;
  doc.setFillColor(...colorRGB);
  doc.roundedRect(MARGIN, yt, CONTENT_W, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(s(label).toUpperCase(), MARGIN + 4, yt + 5.2);
  return yt + 10;
}

// ─── Section panel ────────────────────────────────────────────────────────────
// Draws a subtle bordered container behind a section's body content. Use
// AFTER laying out the body (when the final content height is known) by
// calling with the section's start-y and the actual content height — a thin
// border separates it visually from the next section. Returns the y just
// below the panel's bottom edge with built-in spacing.
function drawSectionPanel(doc, yTop, contentH, padBottom = 6) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, yTop, CONTENT_W, contentH, 1.5, 1.5, 'S');
  return yTop + contentH + padBottom;
}

// ─── Pie chart (filled wedges) ─────────────────────────────────────────────────
function drawPieChart(doc, cx, cy, r, segments) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;
  segments.forEach(seg => {
    if (seg.value === 0) return;
    const sweep = (seg.value / total) * 2 * Math.PI;
    const steps = Math.max(8, Math.ceil(sweep * 24));
    const pts = [[cx, cy]];
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (sweep * i) / steps;
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    doc.setFillColor(...seg.color);
    doc.setDrawColor(...C.white);
    doc.setLineWidth(0.4);
    doc.lines(
      pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]),
      pts[0][0], pts[0][1],
      [1, 1], 'FD', true
    );
    startAngle += sweep;
  });

  // Donut hole
  doc.setFillColor(...C.white);
  doc.circle(cx, cy, r * 0.40, 'F');
}

// ─── KPI tile ──────────────────────────────────────────────────────────────────
function drawKpiTile(doc, x, y, w, h, value, label, valueColor, accentColor) {
  // Card body
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  // Top accent bar
  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, w, 2, 1, 1, 'F');
  // Value
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(s(String(value)), x + w / 2, y + h * 0.62, { align: 'center' });
  // Label
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text(s(label).toUpperCase(), x + w / 2, y + h - 3, { align: 'center' });
}

// ──────────────────────────────────────────────────────────────────────────────
// CRITICAL-ONLY REPORT LAYOUT
// ──────────────────────────────────────────────────────────────────────────────
function buildCriticalOnlyReport(doc, ctx) {
  const {
    reportData, summary, criticalOnts,
    customerLogo, customerName, generatedDate, generatedDateTime,
  } = ctx;

  // Use full-report counts from `summary` (the caller filters onts but keeps
  // the original summary so totals reflect the entire dataset).
  const totalOnts    = summary.totalOnts    ?? reportData.onts.length;
  const criticalCnt  = summary.criticalCount ?? criticalOnts.length;
  const warningCnt   = summary.warningCount  ?? 0;
  const okCnt        = summary.okCount       ?? 0;
  const offlineCnt   = summary.offlineCount  ?? 0;

  // ── Page 1 ──────────────────────────────────────────────────────────────
  drawBrandedHeader(doc, customerLogo, customerName, generatedDate);
  let y = BODY_TOP;

  // Title block
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text('Critical Issues Report', MARGIN, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  const reportLine = s(summary.reportName || 'PON PM Analysis');
  doc.text(reportLine, MARGIN, y + 10, { maxWidth: CONTENT_W });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${generatedDateTime}`, MARGIN, y + 15);
  y += 20;

  // ── KPI strip ───────────────────────────────────────────────────────────
  y = drawSectionTitle(doc, 'Network Status Overview', y, C.navy);

  const kpis = [
    { label: 'Total ONTs', val: totalOnts,    color: C.dark,   accent: C.accent },
    { label: 'Critical',   val: criticalCnt,  color: C.red,    accent: C.red    },
    { label: 'Warning',    val: warningCnt,   color: C.amber,  accent: C.amber  },
    { label: 'Healthy',    val: okCnt,        color: C.green,  accent: C.green  },
    { label: 'Offline',    val: offlineCnt,   color: C.slate,  accent: C.slate  },
  ];
  const kw = (CONTENT_W - 4 * 3) / 5;
  // Inset the tiles inside the panel for clear margin from the bordered edge
  const kpiPanelTop = y;
  const kpiInset = 3;
  kpis.forEach((k, i) => {
    drawKpiTile(doc, MARGIN + kpiInset + i * (kw - 1.2 + 3), y + kpiInset, kw - 1.2, 22, k.val, k.label, k.color, k.accent);
  });
  y = drawSectionPanel(doc, kpiPanelTop, 22 + kpiInset * 2, 6);

  // ── OLTs in System (per-chassis critical pie) ───────────────────────────
  // Group critical ONTs by OLT/chassis (e.g. "xgs-shelf1") and count.
  const chassisCounts = {};
  criticalOnts.forEach(ont => {
    const chassis = s(ont._oltName || ont.olt_name || 'Unknown');
    chassisCounts[chassis] = (chassisCounts[chassis] || 0) + 1;
  });
  const chassisEntries = Object.entries(chassisCounts).sort((a, b) => b[1] - a[1]);

  y = drawSectionTitle(doc, `OLTs in System  -  Critical Issues by Chassis  (${chassisEntries.length})`, y, C.indigo);
  const chassisPanelTop = y;

  if (chassisEntries.length > 0) {
    const segments = chassisEntries.map(([name, count], i) => ({
      value: count,
      color: CHASSIS_COLORS[i % CHASSIS_COLORS.length],
      label: name,
    }));

    const pieR  = 26;
    const pieCX = MARGIN + pieR + 6;   // +2mm extra inset from panel edge
    const pieCY = y + pieR + 4;        // +2mm extra inset from panel top
    drawPieChart(doc, pieCX, pieCY, pieR, segments);

    // Center label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.red);
    doc.text(String(criticalCnt), pieCX, pieCY - 0.5, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('CRITICAL', pieCX, pieCY + 4, { align: 'center' });

    // Legend on right side — name, count, percentage
    const legendX = pieCX + pieR + 12;
    const legendW = PAGE_W - MARGIN - legendX;
    let legendY = y + 2;
    const itemH = 6;
    segments.forEach((seg, i) => {
      if (legendY + itemH > y + pieR * 2 + 4) return; // limit to pie height
      // Color swatch
      doc.setFillColor(...seg.color);
      doc.roundedRect(legendX, legendY, 4, 4, 0.5, 0.5, 'F');
      // Name
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.dark);
      doc.text(s(seg.label), legendX + 6, legendY + 3.3, { maxWidth: legendW - 30 });
      // Count + pct
      const pct = ((seg.value / criticalCnt) * 100).toFixed(1);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`${seg.value}  (${pct}%)`, PAGE_W - MARGIN, legendY + 3.3, { align: 'right' });
      legendY += itemH;
    });

    y += pieR * 2 + 8;

    // If too many chassis to fit in legend, append overflow as a small list
    if (chassisEntries.length > Math.floor((pieR * 2 + 4) / itemH)) {
      const overflow = chassisEntries.slice(Math.floor((pieR * 2 + 4) / itemH));
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(
        `+ ${overflow.length} more: ${overflow.map(([n, c]) => `${n} (${c})`).join(', ')}`,
        MARGIN + 4, y, { maxWidth: CONTENT_W - 8 }
      );
      y += 6;
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text('No critical issues found.', MARGIN + 4, y + 6);
    y += 12;
  }
  // Close the chassis section panel
  y = drawSectionPanel(doc, chassisPanelTop, y - chassisPanelTop, 6);

  // ── Port-level breakdown (only ports with critical issues) ──────────────
  const portMap = {}; // "OLT|PORT" → { olt, port, critCount, ontIds: [] }
  criticalOnts.forEach(ont => {
    const olt  = s(ont._oltName || ont.olt_name || 'Unknown');
    const port = s(ont._port || ont.shelf_slot_port || 'Unknown');
    const key  = `${olt}|${port}`;
    if (!portMap[key]) portMap[key] = { olt, port, critCount: 0, rxSum: 0, rxCount: 0 };
    portMap[key].critCount++;
    const rx = parseFloat(ont.OntRxOptPwr ?? ont.ont_rx_power);
    if (!isNaN(rx)) { portMap[key].rxSum += rx; portMap[key].rxCount++; }
  });
  const portRows = Object.values(portMap).sort((a, b) => b.critCount - a.critCount);

  if (portRows.length > 0) {
    if (y > BODY_BOT - 30) { doc.addPage(); drawBrandedHeader(doc, customerLogo, customerName, generatedDate); y = BODY_TOP; }
    y = drawSectionTitle(doc, `Ports with Critical Issues  (${portRows.length})`, y, C.red);
    const portsPanelTop = y;

    // Header row — inset 1.5mm so table sits cleanly inside the panel border
    doc.setFillColor(...C.navyMid);
    doc.roundedRect(MARGIN + 1.5, y + 1.5, CONTENT_W - 3, 6.5, 1, 1, 'F');
    y += 1.5; // shift table content down to match the inset
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    const colOlt   = MARGIN + 5;     // extra 2mm inset from panel border
    const colPort  = MARGIN + 60;
    const colCrit  = MARGIN + 120;
    const colRx    = MARGIN + 150;
    doc.text('OLT / Chassis', colOlt,  y + 4.5);
    doc.text('Port',          colPort, y + 4.5);
    doc.text('Critical',      colCrit, y + 4.5);
    doc.text('Avg ONT Rx',    colRx,   y + 4.5);
    y += 8;

    portRows.forEach((row, idx) => {
      if (y > BODY_BOT - 6) {
        doc.addPage();
        drawBrandedHeader(doc, customerLogo, customerName, generatedDate);
        y = BODY_TOP;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(...C.lightBg);
        // Inset 1.5mm so zebra stripes don't overlap the panel border
        doc.rect(MARGIN + 1.5, y - 0.5, CONTENT_W - 3, 6, 'F');
      }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.text(s(row.olt),  colOlt,  y + 4, { maxWidth: 55 });
      doc.text(s(row.port), colPort, y + 4, { maxWidth: 55 });
      doc.setTextColor(...C.red);
      doc.setFont('helvetica', 'bold');
      doc.text(String(row.critCount), colCrit, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      const avgRx = row.rxCount > 0 ? `${(row.rxSum / row.rxCount).toFixed(1)} dBm` : 'N/A';
      doc.text(avgRx, colRx, y + 4);
      y += 6;
    });
    // Close the ports section panel with a clean bottom pad
    y = drawSectionPanel(doc, portsPanelTop, y - portsPanelTop + 1.5, 6);
  }

  // ── Per-ONT detailed cards ──────────────────────────────────────────────
  if (criticalOnts.length > 0) {
    if (y > BODY_BOT - 40) {
      doc.addPage();
      drawBrandedHeader(doc, customerLogo, customerName, generatedDate);
      y = BODY_TOP;
    }
    y = drawSectionTitle(doc, `Critical ONT Details  (${criticalOnts.length})`, y, C.red);

    // Sort by OLT then port for technician readability
    const sorted = [...criticalOnts].sort((a, b) => {
      const oa = s(a._oltName || a.olt_name || '');
      const ob = s(b._oltName || b.olt_name || '');
      if (oa !== ob) return oa.localeCompare(ob, undefined, { numeric: true });
      const pa = s(a._port || a.shelf_slot_port || '');
      const pb = s(b._port || b.shelf_slot_port || '');
      return pa.localeCompare(pb, undefined, { numeric: true });
    });

    const MAX_CARDS = 200;
    sorted.slice(0, MAX_CARDS).forEach(ont => {
      y = drawCriticalOntCard(doc, ont, y, () => {
        doc.addPage();
        drawBrandedHeader(doc, customerLogo, customerName, generatedDate);
        return BODY_TOP;
      });
    });

    if (sorted.length > MAX_CARDS) {
      if (y > BODY_BOT - 8) {
        doc.addPage();
        drawBrandedHeader(doc, customerLogo, customerName, generatedDate);
        y = BODY_TOP;
      }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(
        `... ${sorted.length - MAX_CARDS} additional critical ONTs not shown. Use CSV export for the full list.`,
        MARGIN, y + 4, { maxWidth: CONTENT_W }
      );
      y += 8;
    }
  }
}

// ─── Per-ONT status card ──────────────────────────────────────────────────────
// Used for both critical and warning ONTs — palette argument controls colors.
// Default palette is critical/red. Pass a warning palette for warnings.
function drawCriticalOntCard(doc, ont, y, newPageFn, palette = null) {
  const pal = palette || {
    bg: C.redBg, accent: C.red, dark: C.redDark, label: 'CRITICAL',
  };
  const issues = [
    ...(ont._analysis?.issues   || []),
    ...(ont._analysis?.warnings || []),
  ];
  const hasSubscriber = !!(ont.subscriber_account_name || ont._subscriber?.name || ont._subscriber?.address);
  const subH      = hasSubscriber ? 6 : 0;
  const issueH    = Math.min(issues.length, 5) * 6.5;
  const blockH    = 8 + 7 + 7 + subH + 13 + issueH + 4; // header + ids + loc + sub + power + issues + pad

  if (y > BODY_BOT - blockH) y = newPageFn();

  // Card
  doc.setFillColor(...pal.bg);
  doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F');
  doc.setFillColor(...pal.accent);
  doc.roundedRect(MARGIN, y, 3, blockH, 1, 0, 'F');

  // Status pill
  const pillW = Math.max(20, pal.label.length * 2.5 + 6);
  doc.setFillColor(...pal.accent);
  doc.roundedRect(PAGE_W - MARGIN - pillW - 2, y + 2, pillW, 5, 1, 1, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(pal.label, PAGE_W - MARGIN - pillW / 2 - 2, y + 5.4, { align: 'center' });

  // ONT identity row
  const ix = MARGIN + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...pal.dark);
  doc.text(`ONT ${s(ont.OntID || ont.ont_id || 'N/A')}`, ix, y + 6);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}`, ix + 28, y + 6);
  doc.text(`Model: ${s(ont.model || ont.subscriber_model || 'N/A')}`, PAGE_W - MARGIN - 28, y + 6, { align: 'right' });

  // Location row
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.slate);
  const loc = `${s(ont._oltName || ont.olt_name || 'N/A')}  /  Port ${s(ont._port || ont.shelf_slot_port || 'N/A')}`;
  doc.text(loc, ix, y + 12);

  if (ont._lcpNumber) {
    const lcp = `LCP ${s(ont._lcpNumber)}${ont._splitterNumber ? ' / Spl ' + s(ont._splitterNumber) : ''}`;
    doc.text(lcp, PAGE_W - MARGIN - 4, y + 12, { align: 'right' });
  }

  let cardY = y + 16;

  // Subscriber line
  if (hasSubscriber) {
    const subName = s(ont.subscriber_account_name || ont._subscriber?.name || '');
    const subAddr = s(ont.subscriber_address      || ont._subscriber?.address || '');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.indigo);
    doc.text([subName, subAddr].filter(Boolean).join('  |  '), ix, cardY + 3.5, { maxWidth: CONTENT_W - 12 });
    cardY += 6;
  }

  // Power readings strip (3 metrics)
  const pItems = [
    { label: 'ONT Rx',  val: ont.OntRxOptPwr ?? ont.ont_rx_power, threshold: -27, low: true  },
    { label: 'OLT Rx',  val: ont.OLTRXOptPwr ?? ont.olt_rx_power, threshold: -28, low: true  },
    { label: 'ONT Tx',  val: ont.OntTxPwr     ?? ont.ont_tx_power,                          },
  ];
  const pw = (CONTENT_W - 14) / pItems.length;
  pItems.forEach((p, pi) => {
    const px = ix + pi * pw;
    const v  = parseFloat(p.val);
    const bad = !isNaN(v) && p.threshold != null && (p.low ? v < p.threshold : v > p.threshold);
    doc.setFillColor(bad ? 254 : 255, bad ? 226 : 255, bad ? 226 : 255);
    doc.setDrawColor(...(bad ? C.red : C.border));
    doc.setLineWidth(0.3);
    doc.roundedRect(px - 1, cardY, pw - 2, 11, 1, 1, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(bad ? C.red : C.dark));
    doc.text(isNaN(v) ? 'N/A' : `${v.toFixed(2)}`, px + (pw - 4) / 2, cardY + 6, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(`dBm  ${p.label}`, px + (pw - 4) / 2, cardY + 9.5, { align: 'center' });
  });
  cardY += 13;

  // Issues list (max 5)
  issues.slice(0, 5).forEach(issue => {
    if (cardY + 6.5 > y + blockH - 1) return;
    const isErr = ont._analysis?.issues?.includes(issue);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(isErr ? pal.dark : C.amberDark));
    doc.text(`* ${s(issue.field)}: ${s(String(issue.value))}`, ix, cardY + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    const msg = doc.splitTextToSize(s(issue.message || ''), CONTENT_W - 80);
    doc.text(msg.slice(0, 1), ix + 80, cardY + 3.5);
    cardY += 6.5;
  });

  if (issues.length > 5) {
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text(`+ ${issues.length - 5} more issue(s)`, ix, y + blockH - 1.5);
  }

  return y + blockH + 3;
}

// ──────────────────────────────────────────────────────────────────────────────
// FULL REPORT LAYOUT — uses the same branded style as the critical-only report.
// ──────────────────────────────────────────────────────────────────────────────

// Branded header for the full report (slightly different label than critical).
function drawFullReportHeader(doc, customerLogo, customerName, generatedDate) {
  // Background band
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HEADER_H, PAGE_W, 1.2, 'F');

  // Customer logo plate
  let cursorX = MARGIN;
  if (customerLogo) {
    drawLogoOnPlate(doc, customerLogo, cursorX, 4, 18, 14);
    cursorX += 22;
  }

  // Customer name + co-brand
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (customerName) {
    doc.text(s(customerName), cursorX, 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text('Powered by FiberOracle.com', cursorX, 17);
  } else {
    doc.text('FIBER ORACLE', cursorX, 11);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.subText);
    doc.text('fiberoracle.com', cursorX, 17);
  }

  // Right-side report tag + date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.accent);
  doc.text('PON PM ANALYSIS REPORT', PAGE_W - MARGIN, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.subText);
  doc.text(s(generatedDate), PAGE_W - MARGIN, 16, { align: 'right' });
}

// Horizontal bar chart for "Top N OLT Ports by FEC Corrected Errors".
// Renders the bars + labels; returns the y just below the chart.
function drawHorizontalBarChart(doc, x, y, w, rows, opts = {}) {
  const {
    barH        = 6,
    gap         = 2.5,
    barColor    = C.accent,
    labelMaxW   = 70,    // mm reserved for left-side labels
    valueWidth  = 22,    // mm reserved for right-side value text
  } = opts;

  if (rows.length === 0) return y;

  const max     = Math.max(...rows.map(r => r.value), 1);
  const trackX  = x + labelMaxW + 2;
  const trackW  = w - labelMaxW - valueWidth - 4;

  rows.forEach((row, i) => {
    const yi = y + i * (barH + gap);

    // Label (left)
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(s(row.label), x, yi + barH * 0.7, { maxWidth: labelMaxW });

    // Sub-label (e.g., port path) — small line below the label, if present
    if (row.sublabel) {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      // Render after main label: same line, faded, separated by " - "
      const mainW = doc.getTextWidth(s(row.label));
      doc.text(`  ${s(row.sublabel)}`, x + Math.min(mainW, labelMaxW - 20), yi + barH * 0.7);
    }

    // Track background
    doc.setFillColor(...C.lightBg);
    doc.roundedRect(trackX, yi, trackW, barH, 1, 1, 'F');

    // Filled bar
    const fillW = Math.max(1, (row.value / max) * trackW);
    doc.setFillColor(...(row.color || barColor));
    doc.roundedRect(trackX, yi, fillW, barH, 1, 1, 'F');

    // Value (right)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    const formatted = row.value.toLocaleString('en-US');
    doc.text(formatted, x + w, yi + barH * 0.7, { align: 'right' });
  });

  return y + rows.length * (barH + gap);
}

function buildFullReport(doc, ctx) {
  const {
    reportData, summary, criticalOnts, warningOnts, okOnts, offlineOnts,
    customerLogo, customerName, generatedDate, generatedDateTime,
  } = ctx;
  const onts = reportData.onts;

  // Use full-report counts from `summary` so totals reflect the entire dataset
  // (caller may have filtered ONTs but kept the original summary).
  const totalOnts   = summary.totalOnts    ?? onts.length;
  const criticalCnt = summary.criticalCount ?? criticalOnts.length;
  const warningCnt  = summary.warningCount  ?? warningOnts.length;
  const okCnt       = summary.okCount       ?? okOnts.length;
  const offlineCnt  = summary.offlineCount  ?? offlineOnts.length;

  // ── Page 1 ────────────────────────────────────────────────────────────────
  drawFullReportHeader(doc, customerLogo, customerName, generatedDate);
  let y = BODY_TOP;

  // Title block
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text('Full Issue Report', MARGIN, y + 4);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(s(summary.reportName || 'PON PM Analysis'), MARGIN, y + 10, { maxWidth: CONTENT_W });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${generatedDateTime}`, MARGIN, y + 15);
  y += 20;

  // ── KPI strip ─────────────────────────────────────────────────────────────
  y = drawSectionTitle(doc, 'Network Status Overview', y, C.navy);

  const kpis = [
    { label: 'Total ONTs', val: totalOnts,   color: C.dark,   accent: C.accent },
    { label: 'Critical',   val: criticalCnt, color: C.red,    accent: C.red    },
    { label: 'Warning',    val: warningCnt,  color: C.amber,  accent: C.amber  },
    { label: 'Healthy',    val: okCnt,       color: C.green,  accent: C.green  },
    { label: 'Offline',    val: offlineCnt,  color: C.slate,  accent: C.slate  },
  ];
  const kw = (CONTENT_W - 4 * 3) / 5;
  const kpiPanelTop = y;
  const kpiInset = 3;
  kpis.forEach((k, i) => {
    drawKpiTile(doc, MARGIN + kpiInset + i * (kw - 1.2 + 3), y + kpiInset, kw - 1.2, 22,
                k.val, k.label, k.color, k.accent);
  });
  y = drawSectionPanel(doc, kpiPanelTop, 22 + kpiInset * 2, 6);

  // ── OLTs in System (per-chassis issue mix pie) ────────────────────────────
  // Group ALL non-healthy ONTs by chassis (critical + warning + offline) so
  // the pie reflects total problem distribution across the network.
  const issueOnts = [...criticalOnts, ...warningOnts, ...offlineOnts];
  const chassisCounts = {};
  issueOnts.forEach(ont => {
    const chassis = s(ont._oltName || ont.olt_name || 'Unknown');
    chassisCounts[chassis] = (chassisCounts[chassis] || 0) + 1;
  });
  const chassisEntries = Object.entries(chassisCounts).sort((a, b) => b[1] - a[1]);
  const totalIssues = issueOnts.length;

  y = drawSectionTitle(
    doc,
    `OLTs in System  -  Issues by Chassis  (${chassisEntries.length})`,
    y, C.indigo
  );
  const chassisPanelTop = y;

  if (chassisEntries.length > 0 && totalIssues > 0) {
    const segments = chassisEntries.map(([name, count], i) => ({
      value: count,
      color: CHASSIS_COLORS[i % CHASSIS_COLORS.length],
      label: name,
    }));

    const pieR  = 26;
    const pieCX = MARGIN + pieR + 6;
    const pieCY = y + pieR + 4;
    drawPieChart(doc, pieCX, pieCY, pieR, segments);

    // Center label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.indigo);
    doc.text(String(totalIssues), pieCX, pieCY - 0.5, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('ISSUES', pieCX, pieCY + 4, { align: 'center' });

    // Legend on right
    const legendX = pieCX + pieR + 12;
    const legendW = PAGE_W - MARGIN - legendX;
    let legendY = y + 2;
    const itemH = 6;
    const maxItems = Math.floor((pieR * 2 + 4) / itemH);
    segments.slice(0, maxItems).forEach((seg) => {
      doc.setFillColor(...seg.color);
      doc.roundedRect(legendX, legendY, 4, 4, 0.5, 0.5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.dark);
      doc.text(s(seg.label), legendX + 6, legendY + 3.3, { maxWidth: legendW - 30 });
      const pct = ((seg.value / totalIssues) * 100).toFixed(1);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`${seg.value}  (${pct}%)`, PAGE_W - MARGIN, legendY + 3.3, { align: 'right' });
      legendY += itemH;
    });

    y += pieR * 2 + 8;

    // Overflow row if more chassis than fit in legend
    if (chassisEntries.length > maxItems) {
      const overflow = chassisEntries.slice(maxItems);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(
        `+ ${overflow.length} more: ${overflow.map(([n, c]) => `${n} (${c})`).join(', ')}`,
        MARGIN + 4, y, { maxWidth: CONTENT_W - 8 }
      );
      y += 6;
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text('No issues found - network is healthy.', MARGIN + 4, y + 6);
    y += 12;
  }
  y = drawSectionPanel(doc, chassisPanelTop, y - chassisPanelTop, 6);

  // ── Top 10 OLT Ports by FEC Corrected Errors ─────────────────────────────
  // Aggregate Downstream + Upstream FEC corrected codewords per port across
  // all ONTs on that port, then sort and take top 10.
  const portFec = {}; // "OLT|PORT" → { olt, port, total, ds, us, ontCount }
  onts.forEach(ont => {
    const olt  = s(ont._oltName || ont.olt_name || 'Unknown');
    const port = s(ont._port    || ont.shelf_slot_port || 'Unknown');
    const ds   = parseFloat(ont.DSFECCorrectedCodeWords ?? ont.ds_fec_corrected ?? 0) || 0;
    const us   = parseFloat(ont.USFECCorrectedCodeWords ?? ont.us_fec_corrected ?? 0) || 0;
    if (ds === 0 && us === 0) return;
    const key = `${olt}|${port}`;
    if (!portFec[key]) portFec[key] = { olt, port, total: 0, ds: 0, us: 0, ontCount: 0 };
    portFec[key].total   += ds + us;
    portFec[key].ds      += ds;
    portFec[key].us      += us;
    portFec[key].ontCount++;
  });
  const topFec = Object.values(portFec).sort((a, b) => b.total - a.total).slice(0, 10);

  if (topFec.length > 0) {
    if (y > BODY_BOT - 80) { doc.addPage(); drawFullReportHeader(doc, customerLogo, customerName, generatedDate); y = BODY_TOP; }
    y = drawSectionTitle(doc, 'Top 10 OLT Ports by FEC Corrected Errors', y, C.purple);
    const fecPanelTop = y;
    const fecPanelInset = 4;

    // Subtitle
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text(
      'Sum of Downstream + Upstream corrected codewords across all ONTs on each port.',
      MARGIN + fecPanelInset, y + fecPanelInset + 2
    );

    // Bars
    const barRows = topFec.map(r => ({
      label:    `${r.olt}  ${r.port}`,
      sublabel: `(${r.ontCount} ONT${r.ontCount === 1 ? '' : 's'})`,
      value:    r.total,
      color:    C.purple,
    }));
    const chartTopY = y + fecPanelInset + 6;
    const chartEndY = drawHorizontalBarChart(
      doc,
      MARGIN + fecPanelInset, chartTopY,
      CONTENT_W - fecPanelInset * 2,
      barRows,
      { barH: 5.5, gap: 2.2, barColor: C.purple, labelMaxW: 75, valueWidth: 24 }
    );

    y = drawSectionPanel(doc, fecPanelTop, chartEndY - fecPanelTop + 2, 6);
  }

  // ── Critical ONT detail cards ─────────────────────────────────────────────
  if (criticalOnts.length > 0) {
    if (y > BODY_BOT - 40) {
      doc.addPage();
      drawFullReportHeader(doc, customerLogo, customerName, generatedDate);
      y = BODY_TOP;
    }
    y = drawSectionTitle(doc, `Critical ONT Details  (${criticalOnts.length})`, y, C.red);

    const sorted = [...criticalOnts].sort((a, b) => {
      const oa = s(a._oltName || a.olt_name || ''), ob = s(b._oltName || b.olt_name || '');
      if (oa !== ob) return oa.localeCompare(ob, undefined, { numeric: true });
      const pa = s(a._port || a.shelf_slot_port || ''), pb = s(b._port || b.shelf_slot_port || '');
      return pa.localeCompare(pb, undefined, { numeric: true });
    });

    const MAX = 200;
    sorted.slice(0, MAX).forEach(ont => {
      y = drawCriticalOntCard(doc, ont, y, () => {
        doc.addPage();
        drawFullReportHeader(doc, customerLogo, customerName, generatedDate);
        return BODY_TOP;
      });
    });

    if (sorted.length > MAX) {
      if (y > BODY_BOT - 8) { doc.addPage(); drawFullReportHeader(doc, customerLogo, customerName, generatedDate); y = BODY_TOP; }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(`... ${sorted.length - MAX} additional critical ONTs not shown. Use CSV export for the full list.`,
        MARGIN, y + 4, { maxWidth: CONTENT_W });
      y += 8;
    }
  }

  // ── Warning ONT detail cards ──────────────────────────────────────────────
  if (warningOnts.length > 0) {
    if (y > BODY_BOT - 40) {
      doc.addPage();
      drawFullReportHeader(doc, customerLogo, customerName, generatedDate);
      y = BODY_TOP;
    }
    y = drawSectionTitle(doc, `Warning ONT Details  (${warningOnts.length})`, y, C.amber);

    const sorted = [...warningOnts].sort((a, b) => {
      const oa = s(a._oltName || a.olt_name || ''), ob = s(b._oltName || b.olt_name || '');
      if (oa !== ob) return oa.localeCompare(ob, undefined, { numeric: true });
      const pa = s(a._port || a.shelf_slot_port || ''), pb = s(b._port || b.shelf_slot_port || '');
      return pa.localeCompare(pb, undefined, { numeric: true });
    });

    const warnPalette = { bg: C.amberBg, accent: C.amber, dark: C.amberDark, label: 'WARNING' };
    const MAX = 200;
    sorted.slice(0, MAX).forEach(ont => {
      y = drawCriticalOntCard(doc, ont, y, () => {
        doc.addPage();
        drawFullReportHeader(doc, customerLogo, customerName, generatedDate);
        return BODY_TOP;
      }, warnPalette);
    });

    if (sorted.length > MAX) {
      if (y > BODY_BOT - 8) { doc.addPage(); drawFullReportHeader(doc, customerLogo, customerName, generatedDate); y = BODY_TOP; }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(`... ${sorted.length - MAX} additional warning ONTs not shown. Use CSV export for the full list.`,
        MARGIN, y + 4, { maxWidth: CONTENT_W });
      y += 8;
    }
  }

  // ── Offline ONT compact list ──────────────────────────────────────────────
  if (offlineOnts.length > 0) {
    if (y > BODY_BOT - 30) {
      doc.addPage();
      drawFullReportHeader(doc, customerLogo, customerName, generatedDate);
      y = BODY_TOP;
    }
    y = drawSectionTitle(doc, `Offline ONTs  (${offlineOnts.length})`, y, C.slate);
    const offPanelTop = y;

    // Compact two-column table header
    doc.setFillColor(...C.navyMid);
    doc.roundedRect(MARGIN + 1.5, y + 1.5, CONTENT_W - 3, 6.5, 1, 1, 'F');
    y += 1.5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text('ONT',         MARGIN + 5,   y + 4.5);
    doc.text('OLT / Port',  MARGIN + 30,  y + 4.5);
    doc.text('Serial',      MARGIN + 95,  y + 4.5);
    doc.text('Model',       MARGIN + 145, y + 4.5);
    y += 8;

    const MAX = 300;
    offlineOnts.slice(0, MAX).forEach((ont, idx) => {
      if (y > BODY_BOT - 6) {
        doc.addPage();
        drawFullReportHeader(doc, customerLogo, customerName, generatedDate);
        y = BODY_TOP;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(...C.lightBg);
        doc.rect(MARGIN + 1.5, y - 0.5, CONTENT_W - 3, 6, 'F');
      }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.text(s(ont.OntID || ont.ont_id || 'N/A'), MARGIN + 5, y + 4);
      doc.text(`${s(ont._oltName || ont.olt_name || '')} / ${s(ont._port || ont.shelf_slot_port || '')}`,
        MARGIN + 30, y + 4, { maxWidth: 63 });
      doc.text(s(ont.SerialNumber || ont.serial_number || ''), MARGIN + 95, y + 4, { maxWidth: 48 });
      doc.text(s(ont.model || ont.subscriber_model || ''), MARGIN + 145, y + 4, { maxWidth: 35 });
      y += 6;
    });

    if (offlineOnts.length > MAX) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(`... ${offlineOnts.length - MAX} more offline ONTs not shown.`, MARGIN + 5, y + 4);
      y += 6;
    }

    y = drawSectionPanel(doc, offPanelTop, y - offPanelTop + 1.5, 6);
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { reportData, criticalOnly = false, timezone } = await req.json();
    // Deno Deploy is UTC by default. Frontend injects the user's IANA tz so
    // dates render in their local time. Falls back to ET if missing.
    const tz = timezone || 'America/New_York';
    if (!reportData?.summary || !reportData?.onts) {
      return Response.json({ error: 'Invalid report data' }, { status: 400 });
    }

    const { summary, onts } = reportData;

    // ── Customer branding ──────────────────────────────────────────────────
    // Source: the calling user's saved preferences. The Settings → Branding tab
    // persists `companyName` and `logoUrl` to user.preferences via
    // base44.auth.updateMe — no separate DB lookup needed.
    let customerLogo = null;
    let customerName = null;
    let customerLogoUrl = null;

    if (user?.preferences) {
      if (user.preferences.companyName) customerName    = s(user.preferences.companyName);
      if (user.preferences.logoUrl)     customerLogoUrl = user.preferences.logoUrl;
    }

    // The Settings page seeds companyName with the placeholder "Fiber Oracle"
    // for users who never customized it — treat that as "not set" so the
    // report keeps its native Fiber Oracle styling instead of echoing the
    // default literally as a customer name.
    if (customerName === 'Fiber Oracle') customerName = null;

    if (customerLogoUrl) customerLogo = await fetchLogoAsBase64(customerLogoUrl);

    // Final fallback to the default Fiber Oracle logo if the user never
    // uploaded a custom one.
    if (!customerLogo) {
      customerLogo = await fetchLogoAsBase64(
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png'
      );
    }

    const generatedDate = new Date().toLocaleDateString('en-US', {
      timeZone: tz, year: 'numeric', month: 'long', day: 'numeric',
    });
    const generatedDateTime = new Date().toLocaleString('en-US', { timeZone: tz });

    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    // Categorize ONTs once
    const criticalOnts = onts.filter(o => o._analysis?.status === 'critical');
    const warningOnts  = onts.filter(o => o._analysis?.status === 'warning');
    const okOnts       = onts.filter(o => o._analysis?.status === 'ok');
    const offlineOnts  = onts.filter(o => !o._analysis?.status || o._analysis?.status === 'offline');

    const ctx = {
      reportData, summary, onts,
      criticalOnts, warningOnts, okOnts, offlineOnts,
      customerLogo, customerName, generatedDate, generatedDateTime,
    };

    if (criticalOnly) {
      buildCriticalOnlyReport(doc, ctx);

      // Apply branded header/footer to ALL pages (including page 1, which we
      // drew the header inline on — re-drawing is idempotent)
      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        // Header was already drawn during build for each page; just add footer
        drawBrandedFooter(doc, p, totalPages, customerName);
      }

      const filename = `FiberOracle-Critical-Issues-${new Date().toISOString().slice(0, 10)}.pdf`;
      return new Response(new Uint8Array(doc.output('arraybuffer')), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=${filename}`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── Full report (branded layout, matches critical-only style) ──────────
    buildFullReport(doc, ctx);

    // Stamp branded footer on every page (header is drawn inline by builder)
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawBrandedFooter(doc, p, totalPages, customerName);
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