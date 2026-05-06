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

// ─── Branded running header (used on every page in critical-only mode) ────────
function drawBrandedHeader(doc, customerLogo, customerName, generatedDate) {
  // Background band
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HEADER_H, PAGE_W, 1.2, 'F');

  // Customer logo (left side, large)
  let cursorX = MARGIN;
  if (customerLogo) {
    try {
      doc.addImage(customerLogo, 'PNG', cursorX, 4, 14, 14);
      cursorX += 18;
    } catch (_) {}
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
function drawSectionTitle(doc, label, y, colorRGB) {
  doc.setFillColor(...colorRGB);
  doc.roundedRect(MARGIN, y, CONTENT_W, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(s(label).toUpperCase(), MARGIN + 4, y + 5.2);
  return y + 11;
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
  kpis.forEach((k, i) => {
    drawKpiTile(doc, MARGIN + i * (kw + 3), y, kw, 24, k.val, k.label, k.color, k.accent);
  });
  y += 28;

  // ── OLTs in System (per-chassis critical pie) ───────────────────────────
  // Group critical ONTs by OLT/chassis (e.g. "xgs-shelf1") and count.
  const chassisCounts = {};
  criticalOnts.forEach(ont => {
    const chassis = s(ont._oltName || ont.olt_name || 'Unknown');
    chassisCounts[chassis] = (chassisCounts[chassis] || 0) + 1;
  });
  const chassisEntries = Object.entries(chassisCounts).sort((a, b) => b[1] - a[1]);

  y = drawSectionTitle(doc, `OLTs in System  -  Critical Issues by Chassis  (${chassisEntries.length})`, y, C.indigo);

  if (chassisEntries.length > 0) {
    const segments = chassisEntries.map(([name, count], i) => ({
      value: count,
      color: CHASSIS_COLORS[i % CHASSIS_COLORS.length],
      label: name,
    }));

    const pieR  = 26;
    const pieCX = MARGIN + pieR + 4;
    const pieCY = y + pieR + 2;
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
        MARGIN, y, { maxWidth: CONTENT_W }
      );
      y += 6;
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text('No critical issues found.', MARGIN, y + 4);
    y += 10;
  }

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

    // Header row
    doc.setFillColor(...C.navyMid);
    doc.roundedRect(MARGIN, y, CONTENT_W, 6.5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    const colOlt   = MARGIN + 3;
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
        doc.rect(MARGIN, y - 0.5, CONTENT_W, 6, 'F');
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
    y += 4;
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

// ─── Per-ONT critical card ────────────────────────────────────────────────────
function drawCriticalOntCard(doc, ont, y, newPageFn) {
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
  doc.setFillColor(...C.redBg);
  doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F');
  doc.setFillColor(...C.red);
  doc.roundedRect(MARGIN, y, 3, blockH, 1, 0, 'F');

  // CRITICAL pill
  doc.setFillColor(...C.red);
  doc.roundedRect(PAGE_W - MARGIN - 22, y + 2, 20, 5, 1, 1, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('CRITICAL', PAGE_W - MARGIN - 12, y + 5.4, { align: 'center' });

  // ONT identity row
  const ix = MARGIN + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.redDark);
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
    doc.setTextColor(...(isErr ? C.redDark : C.amberDark));
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
// FULL REPORT LAYOUT (legacy — preserved)
// ──────────────────────────────────────────────────────────────────────────────
function drawRunningHeader(doc, reportName, generatedDate, logoDataUrl) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HEADER_H, PAGE_W, 1.2, 'F');
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', MARGIN, 4, 14, 14); } catch (_) {}
    doc.setTextColor(...C.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FIBER ORACLE', MARGIN + 16, 12);
  } else {
    doc.setTextColor(...C.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FIBER ORACLE', MARGIN, 12);
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(reportName), PAGE_W / 2, 12, { align: 'center', maxWidth: 100 });
  doc.text(s(generatedDate), PAGE_W - MARGIN, 12, { align: 'right' });
}

function drawRunningFooter(doc, pageNum, totalPages, companyName) {
  const fy = PAGE_H - FOOTER_H;
  doc.setFillColor(...C.navy);
  doc.rect(0, fy, PAGE_W, FOOTER_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, fy, PAGE_W, 0.6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(companyName || 'Fiber Oracle  |  fiberoracle.com'), MARGIN, fy + 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W / 2, fy + 7, { align: 'center' });
  doc.text('CONFIDENTIAL', PAGE_W - MARGIN, fy + 7, { align: 'right' });
}

function buildFullReport(doc, ctx) {
  const {
    reportData, summary, criticalOnts, warningOnts, okOnts, offlineOnts,
    customerLogo, customerName, generatedDate, generatedDateTime,
  } = ctx;
  const onts = reportData.onts;

  // Cover
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 6, PAGE_H, 'F');

  const logoX = MARGIN + 6, logoY = 24;
  if (customerLogo) {
    try { doc.addImage(customerLogo, 'PNG', logoX, logoY, 22, 22); } catch (_) {}
  }
  doc.setTextColor(...C.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(s(customerName || 'FIBER ORACLE'), logoX + (customerLogo ? 26 : 0), logoY + 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text('Powered by FiberOracle.com', logoX + (customerLogo ? 26 : 0), logoY + 19);

  const reportTitle = s(summary.reportName || 'PON PM Analysis Report');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  const titleLines = doc.splitTextToSize(reportTitle, CONTENT_W - 8);
  doc.text(titleLines, MARGIN + 6, logoY + 50);

  const titleBottom = logoY + 50 + titleLines.length * 9;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(`Generated: ${generatedDateTime}`, MARGIN + 6, titleBottom + 6);

  // KPI cards on cover
  const kpiTop = 130;
  const kpiItems = [
    { label: 'Total ONTs',  val: summary.totalOnts || 0,    color: C.accent },
    { label: 'Critical',    val: criticalOnts.length,        color: C.red   },
    { label: 'Warnings',    val: warningOnts.length,         color: C.amber },
    { label: 'Healthy',     val: okOnts.length,              color: C.green },
    { label: 'Offline',     val: offlineOnts.length,         color: C.muted },
  ];
  const kw = (CONTENT_W - 4 * 3) / 5;
  kpiItems.forEach((k, i) => {
    drawKpiTile(doc, MARGIN + i * (kw + 3), kpiTop, kw, 26, k.val, k.label, k.color, k.color);
  });

  // Detail pages
  const renderOntCard = (ont, statusColor, statusBg, statusDark, statusLabel) => {
    let y = doc.internal.pages[doc.internal.getCurrentPageInfo().pageNumber] ? null : null;
    // simple: track y via a closure stored on doc
    if (typeof doc._fullY === 'undefined') doc._fullY = BODY_TOP;
    y = doc._fullY;

    const issues = [...(ont._analysis?.issues || []), ...(ont._analysis?.warnings || [])];
    const hasSubscriber = !!(ont.subscriber_account_name || ont._subscriber?.name);
    const subH = hasSubscriber ? 6 : 0;
    const issueH = Math.min(issues.length, 5) * 6.5;
    const blockH = 8 + 7 + 7 + subH + 13 + issueH + 4;

    if (y > BODY_BOT - blockH) { doc.addPage(); y = BODY_TOP; }

    doc.setFillColor(...statusBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, blockH, 2, 2, 'F');
    doc.setFillColor(...statusColor);
    doc.roundedRect(MARGIN, y, 3, blockH, 1, 0, 'F');

    const ix = MARGIN + 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusDark);
    doc.text(`ONT ${s(ont.OntID || ont.ont_id || 'N/A')}`, ix, y + 6);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(`Serial: ${s(ont.SerialNumber || ont.serial_number || 'N/A')}`, ix + 26, y + 6);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(...statusColor);
    doc.roundedRect(PAGE_W - MARGIN - 20, y + 2, 18, 5, 1, 1, 'F');
    doc.setTextColor(...C.white);
    doc.text(statusLabel, PAGE_W - MARGIN - 11, y + 5.4, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.slate);
    doc.text(`${s(ont._oltName || 'N/A')} / Port ${s(ont._port || 'N/A')}`, ix, y + 12);

    let cardY = y + 16;
    if (hasSubscriber) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.indigo);
      doc.text(s(ont.subscriber_account_name || ont._subscriber?.name || ''), ix, cardY + 3, { maxWidth: CONTENT_W - 12 });
      cardY += 6;
    }

    const pItems = [
      { label: 'ONT Rx', val: ont.OntRxOptPwr, threshold: -27, low: true },
      { label: 'OLT Rx', val: ont.OLTRXOptPwr, threshold: -28, low: true },
      { label: 'ONT Tx', val: ont.OntTxPwr },
    ];
    const pw = (CONTENT_W - 14) / pItems.length;
    pItems.forEach((p, pi) => {
      const px = ix + pi * pw;
      const v = parseFloat(p.val);
      const bad = !isNaN(v) && p.threshold != null && (p.low ? v < p.threshold : v > p.threshold);
      doc.setFillColor(bad ? 254 : 255, bad ? 226 : 255, bad ? 226 : 255);
      doc.setDrawColor(...(bad ? C.red : C.border));
      doc.setLineWidth(0.3);
      doc.roundedRect(px - 1, cardY, pw - 2, 11, 1, 1, 'FD');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(bad ? C.red : C.dark));
      doc.text(isNaN(v) ? 'N/A' : v.toFixed(2), px + (pw - 4) / 2, cardY + 6, { align: 'center' });
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(`dBm  ${p.label}`, px + (pw - 4) / 2, cardY + 9.5, { align: 'center' });
    });
    cardY += 13;

    issues.slice(0, 5).forEach(issue => {
      if (cardY + 6 > y + blockH - 1) return;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...statusDark);
      doc.text(`* ${s(issue.field)}: ${s(String(issue.value))}`, ix, cardY + 3.5);
      cardY += 6.5;
    });

    doc._fullY = y + blockH + 3;
  };

  if (criticalOnts.length > 0) {
    doc.addPage();
    doc._fullY = drawSectionTitle(doc, `Critical Issues (${criticalOnts.length})`, BODY_TOP, C.red);
    criticalOnts.slice(0, 100).forEach(ont => renderOntCard(ont, C.red, C.redBg, C.redDark, 'CRIT'));
  }
  if (warningOnts.length > 0) {
    doc.addPage();
    doc._fullY = drawSectionTitle(doc, `Warnings (${warningOnts.length})`, BODY_TOP, [180, 100, 0]);
    warningOnts.slice(0, 100).forEach(ont => renderOntCard(ont, C.amber, C.amberBg, C.amberDark, 'WARN'));
  }
  if (offlineOnts.length > 0) {
    doc.addPage();
    let y = drawSectionTitle(doc, `Offline (${offlineOnts.length})`, BODY_TOP, C.slate);
    offlineOnts.slice(0, 80).forEach(ont => {
      if (y > BODY_BOT - 6) { doc.addPage(); y = BODY_TOP; }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.text(`* ONT ${s(ont.OntID || 'N/A')}  |  ${s(ont._oltName || '')} / ${s(ont._port || '')}  |  Serial: ${s(ont.SerialNumber || '')}`, MARGIN, y, { maxWidth: CONTENT_W });
      y += 5.5;
    });
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportData, criticalOnly = false } = await req.json();
    if (!reportData?.summary || !reportData?.onts) {
      return Response.json({ error: 'Invalid report data' }, { status: 400 });
    }

    const { summary, onts } = reportData;

    // ── Customer branding from AppSettings ──────────────────────────────────
    let customerLogo = null;
    let customerName = null;
    try {
      const settings = await base44.entities.AppSettings.list('-created_date', 1);
      if (settings?.[0]) {
        if (settings[0].logo_url)     customerLogo = await fetchLogoAsBase64(settings[0].logo_url);
        if (settings[0].company_name) customerName = s(settings[0].company_name);
      }
    } catch (_) {}

    // Fallback to default Fiber Oracle logo if no customer logo set
    if (!customerLogo) {
      customerLogo = await fetchLogoAsBase64(
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png'
      );
    }

    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const generatedDateTime = new Date().toLocaleString('en-US');

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

    // ── Full report (legacy layout) ─────────────────────────────────────────
    buildFullReport(doc, ctx);

    const totalPages = doc.internal.pages.length - 1;
    const shortReportName = s(summary.reportName || 'PON PM Report');
    for (let p = 2; p <= totalPages; p++) {
      doc.setPage(p);
      drawRunningHeader(doc, shortReportName, generatedDate, customerLogo);
      drawRunningFooter(doc, p - 1, totalPages - 1, customerName || 'Fiber Oracle  |  fiberoracle.com');
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