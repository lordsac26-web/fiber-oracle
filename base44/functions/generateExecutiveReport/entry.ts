/**
 * generateExecutiveReport
 *
 * Admin-only. Aggregates ONTPerformanceRecord data for the most recent
 * PONPMReport and produces a branded "Comprehensive System Report" PDF.
 *
 * Sections (in order):
 *   1. Branded title block — logo, company name, report date, generation
 *      time, description.
 *   2. Network Health KPI strip — total, critical, warning, healthy,
 *      health%, eero, GPON, XGS-PON.
 *   3. OLT Breakdown — per-OLT stats (total, crit/warn/off/ok, avg Rx,
 *      health%).
 *   4. City / Zip Saturation — top 20 cities and top 10 zips by ONT count.
 *   5. ONT Model Summary — count of each model in service.
 *   6. Eero Model Summary — count of each eero model in service.
 *   7. Top 20 Critical ONTs — quick triage list.
 *   8. Top 20 OLT Ports by Corrected FEC.
 *   9. Trend Deltas — current report vs ~7-day-old report vs ~30-day-old
 *      report, picked by closest PONPMReport.upload_date to those targets
 *      (upload_date IS the report's effective date per its schema).
 *
 * Branding: pulled from user.preferences (Settings → Branding) with
 * AppSettings + FiberOracle defaults as fallbacks.
 * Footer: "Presented with FiberOracle  •  <date>" on every page.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ─── Text sanitizer (Latin-1 / jsPDF helvetica safe) ──────────────────────────
function s(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ').replace(/[^\x00-\xFF]/g, '');
}

// ─── Account / serial / port normalization (mirrors UI logic) ────────────────
function normalizeHomeId(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, '');
  if (!digits) return null;
  const canonical = digits.match(/8275\d{12}/);
  return canonical ? canonical[0] : digits;
}
function normalizePortPath(port) {
  return (port || '').trim().replace(/\s+/g, '').replace(/\/xp(\d)/gi, '/$1').toUpperCase();
}
const VENDOR_PREFIXES = ['CXNK', 'ZNTS'];
function normalizeSerial(serial) {
  if (!serial || typeof serial !== 'string') return null;
  let n = serial.trim().toUpperCase();
  for (const prefix of VENDOR_PREFIXES) {
    if (n.startsWith(prefix)) { n = n.substring(prefix.length); break; }
  }
  n = n.replace(/[^A-Z0-9]/g, '');
  return n.length > 0 ? n : null;
}

// ─── Technology detection (mirrors parsePonPm + loadSavedReport) ──────────────
function detectTechType(model) {
  if (!model) return null;
  const m = String(model).toUpperCase().trim().replace(/\s/g, '');
  if (m.includes('DZS')) return 'XGS-PON';
  const xgsModels = ['GP1101X', 'GP4201X', 'GP4201XH', '5222XG', '5228XG'];
  const gponModels = ['711GE', '717GE', '725G', '725GE', '725', '812G-1', '844G-1', '844GE-1', '803G'];
  for (const x of xgsModels) if (m.includes(x)) return 'XGS-PON';
  for (const g of gponModels) if (m.includes(g)) return 'GPON';
  return null;
}
function detectComboTech(shelfSlotPort) {
  if (!shelfSlotPort) return null;
  const m = String(shelfSlotPort).match(/(?:xp)?(\d+)-(\d+)$/i);
  if (!m) return null;
  const portNum = parseInt(m[1], 10);
  if (isNaN(portNum)) return null;
  return portNum % 2 === 1 ? 'XGS-PON' : 'GPON';
}
// Classify a record's tech type using EXACTLY the same precedence as the
// frontend's resolveTech() in components/ponpm/KPIStatistics.jsx, otherwise
// the PDF totals drift from the dashboard. The frontend uses:
//   subscriber.model (live, from current upload)
//     → subscriber_model (denormalized at ingest)
//     → record.model (OLT-reported)
//     → combo-port heuristic
// The PDF must use the same chain, with `liveSubModel` injected by the caller
// (resolveLiveSub from the active subscriber upload). Records that were
// ingested BEFORE the current subscriber upload won't have a fresh
// `subscriber_model` denormalized on them — without the live lookup we miss
// ~1000 XGS records every time a new subscriber CSV lands.
function classifyTech(record, liveSubModel) {
  return (
    detectTechType(liveSubModel) ||
    detectTechType(record.subscriber_model) ||
    detectTechType(record.model) ||
    detectComboTech(record.shelf_slot_port)
  );
}

function normalizeOpticType(entry) {
  const raw = `${entry?.optic_type || ''} ${entry?.optic_model || ''}`.toUpperCase();
  if (raw.includes('COMBO-EXT') || raw.includes('COMBO EXT') || raw.includes('100-05929')) return 'XGS-COMBO-EXT';
  if (raw.includes('COMBO') || raw.includes('100-05674')) return 'XGS-COMBO';
  if (raw.includes('XGS-DD') || raw.includes('XGSDD') || raw.includes('XGS-ONLY') || raw.includes('100-05730')) return 'XGS-DD';
  return null;
}

function cleanInventoryValue(value) {
  const str = String(value || '').trim();
  return str || 'Unknown';
}

function extractEvenGponPort(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const nums = raw.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const even = nums.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n % 2 === 0).pop();
  return even ? String(even) : null;
}

function portPathKey(olt, shelf, slot, port) {
  const o = String(olt || '').trim().toUpperCase();
  const path = normalizePortPath(`${shelf}/${slot}/xp${port}`);
  return o && path ? `${o}|${path}` : null;
}

function lcpSplitterKey(lcp, splitter) {
  const l = String(lcp || '').trim().toUpperCase();
  const sNum = String(splitter || '').trim().toUpperCase();
  return l && sNum ? `${l}|${sNum}` : null;
}

// ─── Address parser (zip from LAST comma segment only) ────────────────────────
function parseAddress(addr) {
  if (!addr) return { city: 'Unknown', zip: 'Unknown' };
  const parts = String(addr).split(',').map(p => p.trim()).filter(Boolean);
  let city = 'Unknown';
  let zip = 'Unknown';
  if (parts.length >= 3) {
    city = parts[1] || 'Unknown';
    const zipMatch = parts[parts.length - 1].match(/\b\d{5}\b/);
    if (zipMatch) zip = zipMatch[0];
  } else if (parts.length === 2) {
    const zipMatch = parts[1].match(/^\d{5}(-\d{4})?$/);
    if (zipMatch) zip = zipMatch[0].slice(0, 5);
    else city = parts[1];
  }
  return { city, zip };
}

// ─── Logo fetch ────────────────────────────────────────────────────────────────
async function fetchLogo(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    let bin = '';
    new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
    const ct = r.headers.get('content-type') || 'image/png';
    return `data:${ct};base64,${btoa(bin)}`;
  } catch { return null; }
}

// ─── Color palette ─────────────────────────────────────────────────────────────
const C = {
  navy:    [10,  25,  60],
  accent:  [37,  99, 235],
  red:     [220, 38,  38],
  amber:   [217, 119,  6],
  green:   [22,  163, 74],
  slate:   [71,   85, 105],
  muted:   [100, 116, 139],
  white:   [255, 255, 255],
  dark:    [15,  23,  42],
  lightBg: [248, 250, 252],
  border:  [226, 232, 240],
  subText: [148, 163, 184],
  indigo:  [67,  56, 202],
  purple:  [124, 58,  237],
  teal:    [13,  148, 136],
};

const PAGE_W = 210, PAGE_H = 297, M = 14, CW = PAGE_W - M * 2;
// Larger branded header — fits a prominent logo + company name as the first
// thing the reader sees. Expanded so the logo plate and company name have
// stronger visual presence without crowding the cover KPIs.
const HDR_H = 52, FTR_H = 12;
const BODY_TOP = HDR_H + 6, BODY_BOT = PAGE_H - FTR_H - 4;

// ─── Branded Header (page 1 only — full size) ──────────────────────────────────
// Sized to make the company logo + name the visual anchor of the cover page.
// Logo plate is a 38mm square; company name renders at 26pt bold.
function drawHeaderFull(doc, logo, customerName, generatedAtStr) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HDR_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HDR_H, PAGE_W, 1.5, 'F');

  // Logo on white plate — larger, centered vertically within the header band
  const plate = 38;
  const plateY = (HDR_H - plate) / 2;
  let cx = M;
  if (logo) {
    doc.setFillColor(...C.white);
    doc.roundedRect(cx, plateY, plate, plate, 2.5, 2.5, 'F');
    try {
      const props = doc.getImageProperties(logo);
      const ratio = props.width / props.height;
      const pad = 2;
      let dW = plate - pad * 2, dH = dW / ratio;
      if (dH > plate - pad * 2) { dH = plate - pad * 2; dW = dH * ratio; }
      doc.addImage(
        logo, props.fileType || 'PNG',
        cx + (plate - dW) / 2, plateY + (plate - dH) / 2, dW, dH
      );
    } catch { /* logo not critical */ }
    cx += plate + 6;
  }

  // Company name (prominent) + report label + generation timestamp
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(s(customerName || 'FIBER ORACLE'), cx, plateY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.accent);
  doc.text('COMPREHENSIVE SYSTEM REPORT', cx, plateY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.subText);
  doc.text(s(`Generated ${generatedAtStr}`), cx, plateY + 29);
  doc.text(
    'Weekly/monthly management review — KPIs, per-OLT health, saturation, model inventory, and historical deltas.',
    cx, plateY + 35,
    { maxWidth: PAGE_W - cx - M, lineHeightFactor: 1.15 }
  );
}

// ─── Continuation Header (page 2+ — compact) ──────────────────────────────────
function drawHeaderCompact(doc, customerName) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, 12, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 12, PAGE_W, 1, 'F');
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(s(customerName || 'FIBER ORACLE'), M, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.subText);
  doc.text('Comprehensive System Report', PAGE_W - M, 8, { align: 'right' });
}

function drawFooter(doc, dateStr) {
  const fy = PAGE_H - FTR_H;
  doc.setFillColor(...C.navy);
  doc.rect(0, fy, PAGE_W, FTR_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, fy, PAGE_W, 0.6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Presented with FiberOracle', M, fy + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(dateStr), PAGE_W - M, fy + 7, { align: 'right' });
}

// ─── Section title bar ─────────────────────────────────────────────────────────
function sectionTitle(doc, label, y, color) {
  const yt = y + 4;
  doc.setFillColor(...color);
  doc.roundedRect(M, yt, CW, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(s(label).toUpperCase(), M + 4, yt + 5.2);
  return yt + 11;
}

// ─── KPI tile ──────────────────────────────────────────────────────────────────
function kpiTile(doc, x, y, w, h, value, label, valueColor, accentColor) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, w, 2, 1, 1, 'F');

  const valStr = s(String(value));
  const fontSize = valStr.length > 5 ? 15 : 20;
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(valStr, x + w / 2, y + h * 0.62, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text(s(label).toUpperCase(), x + w / 2, y + h - 3, { align: 'center' });
}

// ─── Table helpers ─────────────────────────────────────────────────────────────
// `align: 'right'` on a column right-aligns BOTH the header label and every
// cell value to `col.x`, which keeps wide right-most labels (e.g. "ONTs on
// Port", "Δ 30d") inside the table border instead of overflowing past it.
function tableHeader(doc, y, cols) {
  doc.setFillColor(...C.navy);
  doc.roundedRect(M + 1.5, y + 1.5, CW - 3, 6.5, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  cols.forEach(col => {
    const opts = col.align === 'right' ? { align: 'right' } : undefined;
    doc.text(s(col.label), col.x, y + 5.5, opts);
  });
  return y + 9.5;
}

// Truncate text with an ellipsis so it always fits on a single line within
// `maxW` millimeters. Prevents jsPDF's automatic word-wrap from spilling into
// the next row (which made values appear cut-off in the previous build).
function fitText(doc, text, maxW) {
  const str = s(text);
  if (!str) return '';
  if (doc.getTextWidth(str) <= maxW) return str;
  // Binary-search the longest prefix that fits with an ellipsis appended.
  let lo = 0, hi = str.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (doc.getTextWidth(str.slice(0, mid) + '...') <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? str.slice(0, lo) + '...' : '';
}

function tableRow(doc, y, cols, isEven) {
  if (isEven) {
    doc.setFillColor(...C.lightBg);
    doc.rect(M + 1.5, y - 0.5, CW - 3, 6, 'F');
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.dark);
  cols.forEach(col => {
    if (col.color) doc.setTextColor(...col.color);
    else doc.setTextColor(...C.dark);
    // Force single-line render: truncate-with-ellipsis to maxW (default 50mm)
    // instead of letting jsPDF wrap into the next row.
    const txt = fitText(doc, col.value, col.maxW || 50);
    const opts = col.align === 'right' ? { align: 'right' } : undefined;
    doc.text(txt, col.x, y + 4, opts);
  });
  return y + 6;
}

function miniTableHeader(doc, x, y, w, cols, color = C.navy) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y + 1.5, w, 6.5, 1, 1, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  cols.forEach(col => {
    const opts = col.align === 'right' ? { align: 'right' } : undefined;
    doc.text(s(col.label), x + col.x, y + 5.5, opts);
  });
  return y + 9.5;
}

function miniTableRow(doc, x, y, w, cols, isEven) {
  if (isEven) {
    doc.setFillColor(...C.lightBg);
    doc.rect(x, y - 0.5, w, 6, 'F');
  }
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  cols.forEach(col => {
    doc.setTextColor(...(col.color || C.dark));
    const txt = fitText(doc, col.value, col.maxW || 30);
    const opts = col.align === 'right' ? { align: 'right' } : undefined;
    doc.text(txt, x + col.x, y + 4, opts);
  });
  return y + 6;
}

// Force the next section to start on a fresh page (compact header).
function startSectionPage(doc, customerName) {
  doc.addPage();
  drawHeaderCompact(doc, customerName);
  return 18;
}

// ─── Simple bar chart (horizontal) ─────────────────────────────────────────────
// Renders a horizontal bar chart in the document. `items` is an array of
// { label, value } pairs. Used for "Top OLTs by Critical Count" and similar.
function drawHorizBarChart(doc, x, y, w, h, items, color) {
  if (items.length === 0) return y;
  const maxVal = Math.max(...items.map(i => i.value), 1);
  const labelW = 50;
  const valueW = 18;
  const barX = x + labelW;
  const barW = w - labelW - valueW - 2;
  const rowH = Math.min(5.5, (h - 2) / items.length);

  items.forEach((it, i) => {
    const yy = y + i * rowH;
    // Label
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.text(s(it.label), x, yy + rowH * 0.7, { maxWidth: labelW - 2 });

    // Track
    doc.setFillColor(...C.lightBg);
    doc.roundedRect(barX, yy + 0.5, barW, rowH - 1.5, 0.6, 0.6, 'F');

    // Filled bar
    const fillW = Math.max(0.4, (it.value / maxVal) * barW);
    doc.setFillColor(...color);
    doc.roundedRect(barX, yy + 0.5, fillW, rowH - 1.5, 0.6, 0.6, 'F');

    // Value
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(String(it.value), barX + barW + 1, yy + rowH * 0.7);
  });
  return y + items.length * rowH;
}

// ─── Page-break guard ──────────────────────────────────────────────────────────
function maybeNewPage(doc, y, needed, customerName) {
  if (y > BODY_BOT - needed) {
    doc.addPage();
    drawHeaderCompact(doc, customerName);
    return 18;
  }
  return y;
}

function drawTrendComparisonSection(doc, y, {
  customerName,
  tz,
  curLabel,
  weekLabel,
  monthLabel,
  week1Report,
  month1Report,
  currentAgg,
  week1Agg,
  month1Agg,
  ontTrendPoints,
}) {
  y = sectionTitle(doc, 'Trend Comparison', y, C.purple);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(
    `Current report: ${curLabel}    |    ~7 days ago: ${weekLabel}    |    ~30 days ago: ${monthLabel}`,
    M + 4, y - 1, { maxWidth: CW - 8 }
  );
  y += 5;

  if (!week1Report && !month1Report) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text(
      'No prior reports found in the database. Trend comparison will populate as more reports are uploaded.',
      M + 4, y + 2, { maxWidth: CW - 8 }
    );
    return y + 12;
  }

  const metrics = [
    { metric: 'Total ONTs',     cur: currentAgg.total,    w: week1Agg.total,    m: month1Agg.total,    good: true  },
    { metric: 'Critical',       cur: currentAgg.critical, w: week1Agg.critical, m: month1Agg.critical, good: false },
    { metric: 'Warning',        cur: currentAgg.warning,  w: week1Agg.warning,  m: month1Agg.warning,  good: false },
    { metric: 'Healthy',        cur: currentAgg.ok,       w: week1Agg.ok,       m: month1Agg.ok,       good: true  },
    { metric: 'Offline',        cur: currentAgg.offline,  w: week1Agg.offline,  m: month1Agg.offline,  good: false },
    { metric: 'GPON ONTs',      cur: currentAgg.gpon,     w: week1Agg.gpon,     m: month1Agg.gpon,     good: true  },
    { metric: 'XGS-PON ONTs',   cur: currentAgg.xgs,      w: week1Agg.xgs,      m: month1Agg.xgs,      good: true  },
    { metric: 'ONTs w/ Eero',   cur: currentAgg.eeroCount,w: week1Agg.eeroCount,m: month1Agg.eeroCount,good: true  },
  ];
  const cols = [
    { label: 'Metric',      x: M + 5                       },
    { label: curLabel,      x: M + 80,    align: 'right'   },
    { label: weekLabel,     x: M + 108,   align: 'right'   },
    { label: 'Δ 7d',        x: M + 135,   align: 'right'   },
    { label: monthLabel,    x: M + 158,   align: 'right'   },
    { label: 'Δ 30d',       x: M + CW - 4, align: 'right'  },
  ];
  y = tableHeader(doc, y, cols);

  const deltaColor = (delta, isGood) => {
    if (delta === 0 || delta === null) return C.muted;
    if (isGood) return delta > 0 ? C.green : C.red;
    return delta > 0 ? C.red : C.green;
  };

  for (let i = 0; i < metrics.length; i++) {
    y = maybeNewPage(doc, y, 8, customerName);
    const r = metrics[i];
    const dw = week1Report ? r.cur - r.w : null;
    const dm = month1Report ? r.cur - r.m : null;
    const fmtDelta = (d) => d === null ? '—' : `${d > 0 ? '+' : ''}${d}`;
    y = tableRow(doc, y, [
      { value: r.metric,                                  x: M + 5,      maxW: 70 },
      { value: r.cur.toLocaleString(),                    x: M + 80,     align: 'right', maxW: 26 },
      { value: week1Report ? r.w.toLocaleString() : '—',  x: M + 108,    align: 'right', maxW: 26 },
      { value: fmtDelta(dw),                              x: M + 135,    align: 'right', maxW: 22, color: deltaColor(dw, r.good) },
      { value: month1Report ? r.m.toLocaleString() : '—', x: M + 158,    align: 'right', maxW: 26 },
      { value: fmtDelta(dm),                              x: M + CW - 4, align: 'right', maxW: 22, color: deltaColor(dm, r.good) },
    ], i % 2 === 0);
  }
  y += 4;

  y = maybeNewPage(doc, y, 60, customerName);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  doc.text(`Total ONT Count Over Time  (${ontTrendPoints.length} samples)`, M + 4, y);
  y += 4;

  const chartY = y;
  const chartH = 44;
  const chartW = CW - 8;
  const chartX = M + 4;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.rect(chartX, chartY, chartW, chartH);

  if (ontTrendPoints.length < 2) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text('Need at least two reports to plot a trend. Upload more reports over time to populate this chart.', chartX + 4, chartY + chartH / 2, { maxWidth: chartW - 8 });
    return chartY + chartH + 8;
  }

  const counts = ontTrendPoints.map(p => p.count);
  const maxV = Math.max(...counts, 1);
  const minV = Math.min(...counts, 0);
  const range = Math.max(1, maxV - minV);
  const yPad = range * 0.1;
  const yMax = maxV + yPad;
  const yMin = Math.max(0, minV - yPad);
  const plotX0 = chartX + 10;
  const plotX1 = chartX + chartW - 6;
  const plotY0 = chartY + 5;
  const plotY1 = chartY + chartH - 8;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);
  doc.setFont('helvetica', 'normal');
  [0, 0.5, 1].forEach(frac => {
    const gy = plotY1 - frac * (plotY1 - plotY0);
    doc.line(plotX0, gy, plotX1, gy);
    const val = Math.round(yMin + frac * (yMax - yMin));
    doc.text(val.toLocaleString(), plotX0 - 2, gy + 1.2, { align: 'right' });
  });

  const n = ontTrendPoints.length;
  const xs = ontTrendPoints.map((_, i) => plotX0 + (n === 1 ? (plotX1 - plotX0) / 2 : (i * (plotX1 - plotX0)) / (n - 1)));
  const ys = ontTrendPoints.map(p => plotY1 - ((p.count - yMin) / (yMax - yMin)) * (plotY1 - plotY0));

  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.9);
  for (let i = 1; i < n; i++) doc.line(xs[i - 1], ys[i - 1], xs[i], ys[i]);

  doc.setFillColor(...C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...C.dark);
  for (let i = 0; i < n; i++) {
    doc.circle(xs[i], ys[i], 1.2, 'F');
    const labelY = ys[i] < plotY0 + 5 ? ys[i] + 5 : ys[i] - 2;
    doc.text(ontTrendPoints[i].count.toLocaleString(), xs[i], labelY, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);
  const compactDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: '2-digit' });
    } catch { return ''; }
  };
  const axisIdxs = n >= 5 ? [0, Math.floor(n / 2), n - 1] : [0, n - 1];
  axisIdxs.forEach(i => doc.text(compactDate(ontTrendPoints[i].label), xs[i], plotY1 + 4, { align: 'center' }));

  return chartY + chartH + 8;
}

// ─── Closest-report picker for trend deltas ────────────────────────────────────
// Given a list of PONPMReports (newest first), find the report whose
// upload_date is closest to `target`. Returns null if none found.
function findClosestReport(reports, targetMs, excludeId) {
  let best = null;
  let bestDiff = Infinity;
  for (const r of reports) {
    if (excludeId && r.id === excludeId) continue;
    const t = new Date(r.upload_date).getTime();
    if (isNaN(t)) continue;
    const diff = Math.abs(t - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best;
}

// ─── Aggregate a record array into the stats bundle used in the report ────────
// `resolveSub` (optional) returns { account, model } from the live subscriber
// lookup; passing it ensures tech-type counts match the live dashboard even
// when records were ingested before the most recent subscriber upload.
function aggregateRecords(recs, eeroHomeKeys, resolveAccount, resolveSub) {
  const agg = {
    total: 0, critical: 0, warning: 0, ok: 0, offline: 0,
    gpon: 0, xgs: 0, eeroCount: 0,
  };
  for (const r of recs) {
    agg.total++;
    if (r.status === 'critical')      agg.critical++;
    else if (r.status === 'warning')  agg.warning++;
    else if (r.status === 'offline')  agg.offline++;
    else                              agg.ok++;
    const liveSubModel = resolveSub ? (resolveSub(r)?.model || null) : null;
    const tech = classifyTech(r, liveSubModel);
    if (tech === 'XGS-PON')      agg.xgs++;
    else if (tech === 'GPON')    agg.gpon++;
    if (eeroHomeKeys && resolveAccount) {
      const acct = normalizeHomeId(resolveAccount(r));
      if (acct && eeroHomeKeys.has(acct)) agg.eeroCount++;
    }
  }
  return agg;
}

// ─── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { timezone } = await req.json().catch(() => ({}));
    const tz = timezone || 'America/New_York';

    // ── Paginated fetch helper ─────────────────────────────────────────────
    const PAGE = 5000;
    async function fetchAllFiltered(entityName, filterObj, sort) {
      let all = [];
      let offset = 0;
      while (true) {
        const batch = await base44.asServiceRole.entities[entityName].filter(
          filterObj, sort, PAGE, offset
        );
        if (!batch || batch.length === 0) break;
        all = all.concat(batch);
        if (batch.length < PAGE) break;
        offset += batch.length;
        await new Promise(r => setTimeout(r, 150));
      }
      return all;
    }

    // ── Fetch Reports, pick current + ~7d + ~30d historical ─────────────────
    // upload_date IS the report's effective date (file's lastModified at upload
    // time per the schema), so we use it directly for both "current report"
    // selection and trend window matching.
    const reports = await base44.asServiceRole.entities.PONPMReport.list('-upload_date', 200);
    const currentReport = reports[0] || null;

    let week1Report = null;
    let month1Report = null;
    if (currentReport) {
      const currentMs = new Date(currentReport.upload_date).getTime();
      const msPerDay = 24 * 60 * 60 * 1000;
      week1Report  = findClosestReport(reports, currentMs - 7  * msPerDay, currentReport.id);
      month1Report = findClosestReport(reports, currentMs - 30 * msPerDay, currentReport.id);
      // Guard: if the closest "week" report ended up being the same as the
      // "month" report (only one historical report exists), null out the
      // month slot so we don't show identical deltas twice.
      if (week1Report && month1Report && week1Report.id === month1Report.id) {
        month1Report = null;
      }
    }

    // ── Total-ONT-count trend series (10 evenly-spaced samples) ─────────────
    // Builds a 10-point series for the "Total ONT Count Over Time" chart on
    // page 1. Sampling strategy: take all reports sorted oldest-first, then
    // pick the report closest to each of 10 evenly-spaced target timestamps
    // between the first report's upload_date and the current report's
    // upload_date (inclusive on both ends). This gives a visually-balanced
    // sparkline regardless of upload cadence. Each point uses
    // PONPMReport.ont_count so no extra DB reads are required.
    const ontTrendPoints = (() => {
      if (!currentReport || reports.length < 2) {
        // Single report — just show one point so the chart still renders.
        return currentReport
          ? [{ ms: new Date(currentReport.upload_date).getTime(), count: currentReport.ont_count || 0 }]
          : [];
      }
      const oldestFirst = [...reports]
        .filter(r => r.upload_date && r.ont_count != null)
        .sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));
      if (oldestFirst.length < 2) {
        return oldestFirst.map(r => ({
          ms: new Date(r.upload_date).getTime(),
          count: r.ont_count || 0,
          label: r.upload_date,
        }));
      }
      const startMs = new Date(oldestFirst[0].upload_date).getTime();
      const endMs   = new Date(oldestFirst[oldestFirst.length - 1].upload_date).getTime();
      const N = 10;
      // De-dupe: if two adjacent target timestamps both snap to the same
      // report, only emit it once — gives a clean series for sparse data.
      const seen = new Set();
      const out = [];
      for (let i = 0; i < N; i++) {
        const target = startMs + (i * (endMs - startMs)) / (N - 1);
        const r = findClosestReport(oldestFirst, target, null);
        if (!r || seen.has(r.id)) continue;
        seen.add(r.id);
        out.push({
          ms: new Date(r.upload_date).getTime(),
          count: r.ont_count || 0,
          label: r.upload_date,
        });
      }
      // Sort the emitted points chronologically (findClosestReport may pick
      // the same neighbour for adjacent targets which then gets skipped, so
      // order can drift slightly).
      out.sort((a, b) => a.ms - b.ms);
      return out;
    })();

    // ── Fetch ONT records (current + historical for trend) ──────────────────
    // CRITICAL: sort by `id` for stable pagination — records share report_date.
    const [currentRecsRaw, week1RecsRaw, month1RecsRaw] = await Promise.all([
      currentReport ? fetchAllFiltered('ONTPerformanceRecord', { report_id: currentReport.id }, 'id') : Promise.resolve([]),
      week1Report   ? fetchAllFiltered('ONTPerformanceRecord', { report_id: week1Report.id   }, 'id') : Promise.resolve([]),
      month1Report  ? fetchAllFiltered('ONTPerformanceRecord', { report_id: month1Report.id  }, 'id') : Promise.resolve([]),
    ]);

    const currentRecs = currentRecsRaw;
    console.log(`[generateExecutiveReport] Records — current=${currentRecs.length}, week=${week1RecsRaw.length}, month=${month1RecsRaw.length}`);

    if (!currentReport) {
      return Response.json({ error: 'No PON PM report available — upload one first.' }, { status: 400 });
    }

    // ── Fetch active Eeros ───────────────────────────────────────────────────
    const activeEeroUploads = await base44.asServiceRole.entities.EeroUploadMeta.filter({ status: 'active' }, '-upload_date', 1);
    const eeroHomeKeys = new Set();
    const eeroByAccount = new Map(); // normalized account → eero record (for model summary)
    const eeroModelCounts = new Map();
    if (activeEeroUploads.length > 0) {
      const eeros = await fetchAllFiltered('EeroRecord', { upload_id: activeEeroUploads[0].id }, 'id');
      for (const e of eeros) {
        const k = normalizeHomeId(e.home_identifier);
        if (k) {
          eeroHomeKeys.add(k);
          if (!eeroByAccount.has(k)) eeroByAccount.set(k, e);
        }
      }
    }

    // ── Build subscriber lookup (mirrors UI) ────────────────────────────────
    // Lookups now store { account, model } so we can also resolve the
    // authoritative ONT model the same way the live UI's global filter does.
    // (The frontend overwrites ont.model with sub.ONTModel during enrichment;
    // mirroring that here makes the ONT Model Summary match the global filter.)
    const subByComposite = new Map();
    const subBySerial    = new Map();
    const subByAccount   = new Map();
    // Tech counts driven directly off the subscriber CSV (ONTModel column) —
    // this is the authoritative inventory list per product decision (2026-05).
    let subGponCount = 0;
    let subXgsCount  = 0;
    try {
      const activeSubUploads = await base44.asServiceRole.entities.SubscriberUploadMeta
        .filter({ status: 'active' }, '-created_date', 1);
      const subUploadId = activeSubUploads[0]?.id;
      const subFilter = subUploadId ? { upload_id: subUploadId } : {};
      const subs = await fetchAllFiltered('SubscriberRecord', subFilter, 'id');

      for (const sub of subs) {
        // Tech tally — only count RANGED ONTs (ONTRanged === true). Un-ranged
        // rows represent provisioned-but-not-yet-active service and should not
        // appear in the deployed inventory totals. Mirrors the spreadsheet
        // filter the ops team uses as ground truth.
        const rangedRaw = String(sub.ONTRanged ?? '').trim().toLowerCase();
        const isRanged = rangedRaw === 'true' || rangedRaw === 'yes' || rangedRaw === '1';
        if (isRanged) {
          const t = detectTechType(sub.ONTModel);
          if (t === 'XGS-PON') subXgsCount++;
          else if (t === 'GPON') subGponCount++;
        }

        const account = (sub.AccountName || '').trim();
        const model   = (sub.ONTModel || '').trim();
        const payload = { account, model };
        if (sub.DeviceName && sub.LinkedPon && sub.OntID) {
          const oltName = sub.DeviceName.trim().toUpperCase();
          const port    = normalizePortPath(sub.LinkedPon);
          const ontId   = String(sub.OntID).trim().toUpperCase();
          // Composite keys store account+model; either may be empty.
          subByComposite.set(`${oltName}|${port}|${ontId}`, payload);
          subByComposite.set(`|${port}|${ontId}`, payload);
        }
        const ns = normalizeSerial(sub.ONTSerialNo);
        if (ns && !subBySerial.has(ns)) subBySerial.set(ns, payload);

        const acctKey = normalizeHomeId(account) || account;
        if (acctKey && !subByAccount.has(acctKey)) {
          subByAccount.set(acctKey, {
            city: (sub.City || '').trim() || 'Unknown',
          });
        }
      }
      console.log(`[generateExecutiveReport] Subscriber lookup — rows=${subs.length}`);
    } catch (err) {
      console.log(`[generateExecutiveReport] SubscriberRecord lookup failed (non-fatal): ${err.message}`);
    }

    // Resolve {account, model} for a record, mirroring the frontend's
    // enrichment priority (composite OLT|port|ontId → composite |port|ontId
    // → serial → fallback to whatever was denormalized at ingest).
    function resolveLiveSub(rec) {
      const oltName = (rec.olt_name || '').trim().toUpperCase();
      const port    = normalizePortPath(rec.shelf_slot_port || '');
      const ontId   = String(rec.ont_id || '').trim().toUpperCase();
      if (oltName && port && ontId) {
        const v = subByComposite.get(`${oltName}|${port}|${ontId}`);
        if (v) return v;
      }
      if (port && ontId) {
        const v = subByComposite.get(`|${port}|${ontId}`);
        if (v) return v;
      }
      const ns = normalizeSerial(rec.serial_number);
      if (ns) {
        const v = subBySerial.get(ns);
        if (v) return v;
      }
      return {
        account: rec.subscriber_account_name || null,
        model:   rec.subscriber_model || null,
      };
    }

    // Back-compat shim — most call sites only want the account string.
    function resolveLiveAccount(rec) {
      return resolveLiveSub(rec).account || null;
    }

    // Resolve the authoritative ONT model for a record. Subscriber-side wins
    // (matches what the live UI displays); falls back to OLT-reported model.
    function resolveLiveModel(rec) {
      const sub = resolveLiveSub(rec);
      const m = (sub.model || '').trim();
      if (m) return m;
      return (rec.model || '').trim() || 'Unknown';
    }

    // ── Aggregate current + historical ──────────────────────────────────────
    // Pass resolveLiveSub so classifyTech can pull the FRESH subscriber-side
    // model for every record. Without it the function falls back to whatever
    // was denormalized onto the record at ingest time, which routinely misses
    // ~1000 XGS-PON records whenever a new subscriber CSV is uploaded.
    const currentAgg = aggregateRecords(currentRecs,   eeroHomeKeys, resolveLiveAccount, resolveLiveSub);
    const week1Agg   = aggregateRecords(week1RecsRaw,  eeroHomeKeys, resolveLiveAccount, resolveLiveSub);
    const month1Agg  = aggregateRecords(month1RecsRaw, eeroHomeKeys, resolveLiveAccount, resolveLiveSub);

    // ── Override GPON / XGS-PON counts from subscriber CSV ──────────────────
    // Per product decision (2026-05): the GPON / XGS-PON KPI tiles count
    // directly off the subscriber CSV's ONTModel column — this is the
    // authoritative provisioned inventory and includes ONTs that didn't
    // report on the most recent PON PM run. Historical aggregates
    // (week1/month1) keep the per-record tech classification because we
    // can't time-travel the subscriber CSV; only current totals are swapped.
    currentAgg.gpon = subGponCount;
    currentAgg.xgs  = subXgsCount;
    console.log(`[generateExecutiveReport] Subscriber-CSV tech counts — GPON=${subGponCount}, XGS-PON=${subXgsCount}`);

    const healthPct = currentAgg.total > 0
      ? ((currentAgg.ok / currentAgg.total) * 100).toFixed(1)
      : '0.0';

    // ── Per-OLT breakdown ───────────────────────────────────────────────────
    const oltMap = new Map();
    for (const r of currentRecs) {
      const olt = r.olt_name || 'Unknown';
      if (!oltMap.has(olt)) oltMap.set(olt, { total: 0, critical: 0, warning: 0, ok: 0, offline: 0, rxSum: 0, rxCount: 0 });
      const o = oltMap.get(olt);
      o.total++;
      if (r.status) o[r.status] = (o[r.status] || 0) + 1;
      if (r.ont_rx_power != null && !isNaN(r.ont_rx_power)) { o.rxSum += r.ont_rx_power; o.rxCount++; }
    }
    const oltRows = [...oltMap.entries()]
      .map(([olt, v]) => ({
        olt, ...v,
        avgRx: v.rxCount > 0 ? (v.rxSum / v.rxCount).toFixed(1) : 'N/A',
        healthPct: v.total > 0 ? ((v.ok / v.total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.critical - a.critical);

    // ── City saturation ─────────────────────────────────────────────────────
    // Zip saturation removed — city-level reporting is sufficient.
    const cityMap = new Map();
    for (const r of currentRecs) {
      let city = 'Unknown';
      const liveAccount = resolveLiveAccount(r);
      const acctKey = normalizeHomeId(liveAccount);
      const subInfo = acctKey ? subByAccount.get(acctKey) : null;
      if (subInfo) {
        city = subInfo.city;
      } else {
        city = parseAddress(r.subscriber_address).city;
      }
      if (!cityMap.has(city)) cityMap.set(city, { total: 0, critical: 0, warning: 0 });
      const c = cityMap.get(city); c.total++;
      if (r.status === 'critical') c.critical++;
      if (r.status === 'warning')  c.warning++;
    }
    const cityRows = [...cityMap.entries()]
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // ── ONT Model Summary ───────────────────────────────────────────────────
    // Use resolveLiveModel so the count matches the GlobalFilterBar in the UI
    // (subscriber-provided model wins over OLT-reported model).
    const ontModelCounts = new Map();
    for (const r of currentRecs) {
      const m = resolveLiveModel(r) || 'Unknown';
      ontModelCounts.set(m, (ontModelCounts.get(m) || 0) + 1);
    }
    const ontModelRows = [...ontModelCounts.entries()]
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    // ── Eero Model Summary (only eeros matched to current ONTs) ─────────────
    for (const r of currentRecs) {
      const acct = normalizeHomeId(resolveLiveAccount(r));
      if (!acct) continue;
      const eero = eeroByAccount.get(acct);
      if (!eero) continue;
      const model = (eero.model || 'Unknown').trim() || 'Unknown';
      eeroModelCounts.set(model, (eeroModelCounts.get(model) || 0) + 1);
    }
    const eeroModelRows = [...eeroModelCounts.entries()]
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    // ── Top 20 Critical ONTs ────────────────────────────────────────────────
    const topCritical = currentRecs
      .filter(r => r.status === 'critical')
      // Worst-first: lowest Rx (most negative), then highest US BIP
      .sort((a, b) => {
        const ra = parseFloat(a.ont_rx_power); const rb = parseFloat(b.ont_rx_power);
        const va = isNaN(ra) ? 0 : ra; const vb = isNaN(rb) ? 0 : rb;
        if (va !== vb) return va - vb;
        return (b.us_bip_errors || 0) - (a.us_bip_errors || 0);
      })
      .slice(0, 20);

    // ── Top 20 OLT Ports by Corrected FEC (us + ds) ─────────────────────────
    const portFec = new Map();
    for (const r of currentRecs) {
      const key = `${r.olt_name || 'Unknown'}|${r.shelf_slot_port || 'Unknown'}`;
      if (!portFec.has(key)) {
        portFec.set(key, { olt: r.olt_name || 'Unknown', port: r.shelf_slot_port || 'Unknown', total: 0, ontCount: 0 });
      }
      const p = portFec.get(key);
      p.total += (r.us_fec_corrected || 0) + (r.ds_fec_corrected || 0);
      p.ontCount++;
    }
    const topFecPorts = [...portFec.values()]
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // ── Remaining GPON swaps: GPON side of combo optics only ────────────────
    const GPON_SWAP_TYPES = ['XGS-COMBO', 'XGS-COMBO-EXT'];
    const ontByPonPort = new Map();
    for (const r of currentRecs) {
      const olt = String(r.olt_name || '').trim().toUpperCase();
      const path = normalizePortPath(r.shelf_slot_port || '');
      if (olt && path) ontByPonPort.set(`${olt}|${path}`, (ontByPonPort.get(`${olt}|${path}`) || 0) + 1);
    }

    const lcpEntries = await fetchAllFiltered('LCPEntry', {}, 'id');
    const opticPortMap = new Map();
    for (const entry of lcpEntries) {
      const opticType = normalizeOpticType(entry);
      if (!opticType || !GPON_SWAP_TYPES.includes(opticType)) continue;

      const olt = cleanInventoryValue(entry.olt_name);
      const shelf = cleanInventoryValue(entry.olt_shelf);
      const slot = cleanInventoryValue(entry.olt_slot);
      const gponPort = extractEvenGponPort(entry.olt_port);
      if (!gponPort) continue;

      const ponKey = portPathKey(olt, shelf, slot, gponPort);
      const portKey = `${olt}|${shelf}|${slot}|${gponPort}|${opticType}`;
      if (!opticPortMap.has(portKey)) {
        opticPortMap.set(portKey, {
          olt,
          shelf,
          slot,
          port: gponPort,
          displayPort: `${shelf}/${slot}/xp${gponPort}`,
          opticType,
          ontCount: ponKey ? (ontByPonPort.get(ponKey) || 0) : 0,
        });
      }
    }

    const opticPortRows = [...opticPortMap.values()]
      .sort((a, b) =>
        b.ontCount - a.ontCount ||
        a.olt.localeCompare(b.olt, undefined, { numeric: true }) ||
        a.shelf.localeCompare(b.shelf, undefined, { numeric: true }) ||
        a.slot.localeCompare(b.slot, undefined, { numeric: true }) ||
        a.port.localeCompare(b.port, undefined, { numeric: true })
      );

    const opticShelfMap = new Map();
    for (const row of opticPortRows) {
      const shelfKey = `${row.olt}|${row.shelf}`;
      if (!opticShelfMap.has(shelfKey)) {
        opticShelfMap.set(shelfKey, {
          olt: row.olt,
          shelf: row.shelf,
          types: Object.fromEntries(GPON_SWAP_TYPES.map(t => [t, { ports: 0, onts: 0 }])),
          totalPorts: 0,
          totalOnts: 0,
        });
      }
      const shelfRow = opticShelfMap.get(shelfKey);
      shelfRow.types[row.opticType].ports++;
      shelfRow.types[row.opticType].onts += row.ontCount;
      shelfRow.totalPorts++;
      shelfRow.totalOnts += row.ontCount;
    }
    const opticShelfRows = [...opticShelfMap.values()]
      .sort((a, b) =>
        b.totalOnts - a.totalOnts ||
        a.olt.localeCompare(b.olt, undefined, { numeric: true }) ||
        a.shelf.localeCompare(b.shelf, undefined, { numeric: true })
      );

    // ── Top 20 utilized LCP / CLCP locations ────────────────────────────────
    const SPLITTER_CAP = 32;
    const getSplitterStatus = (remaining) => {
      if (remaining <= 0) return 'full';
      if (remaining <= 4) return 'critical';
      if (remaining <= 10) return 'warning';
      return 'available';
    };
    const lcpUtilMap = new Map();
    for (const r of currentRecs) {
      const lcp = (r.lcp_number || '').trim().toUpperCase();
      if (!lcp) continue;
      const splitter = (r.splitter_number || '').trim().toUpperCase() || 'UNKNOWN';
      if (!lcpUtilMap.has(lcp)) {
        lcpUtilMap.set(lcp, { lcp, splitters: new Map(), location: '', oltName: '' });
      }
      const item = lcpUtilMap.get(lcp);
      item.splitters.set(splitter, (item.splitters.get(splitter) || 0) + 1);
      if (!item.oltName && r.olt_name) item.oltName = r.olt_name;
    }
    const topLcpUtilization = [...lcpUtilMap.values()]
      .map(item => {
        const splitterRows = [...item.splitters.entries()].map(([splitter, count]) => {
          const remaining = Math.max(0, SPLITTER_CAP - count);
          return {
            splitter,
            count,
            remaining,
            utilizationPct: Math.min(100, (count / SPLITTER_CAP) * 100),
            status: getSplitterStatus(remaining),
          };
        }).sort((a, b) => a.remaining - b.remaining || b.count - a.count);
        const totalSplitters = splitterRows.length || 1;
        const totalOnts = splitterRows.reduce((sum, row) => sum + row.count, 0);
        const totalCapacity = totalSplitters * SPLITTER_CAP;
        const totalRemaining = Math.max(0, totalCapacity - totalOnts);
        const utilizationPct = totalCapacity > 0 ? (totalOnts / totalCapacity) * 100 : 0;
        return {
          lcp: item.lcp,
          oltName: item.oltName,
          splitterRows,
          totalSplitters,
          totalOnts,
          totalCapacity,
          totalRemaining,
          utilizationPct,
          fullCount: splitterRows.filter(r => r.status === 'full').length,
          criticalCount: splitterRows.filter(r => r.status === 'critical').length,
          warningCount: splitterRows.filter(r => r.status === 'warning').length,
          availableCount: splitterRows.filter(r => r.status === 'available').length,
        };
      })
      .sort((a, b) => b.utilizationPct - a.utilizationPct || b.totalOnts - a.totalOnts)
      .slice(0, 20);

    // ── Customer branding ───────────────────────────────────────────────────
    const userPrefs = user?.preferences || {};
    let appSettings = {};
    try {
      const settingsArr = await base44.asServiceRole.entities.AppSettings.list('-created_date', 1);
      appSettings = settingsArr[0] || {};
    } catch { /* non-fatal */ }

    const customerName = s(
      userPrefs.companyName
      || appSettings.company_name
      || 'Fiber Oracle'
    );
    const rawLogo =
      userPrefs.logoUrl
      || appSettings.logo_url
      || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png';
    const customerLogo = await fetchLogo(rawLogo);

    const fmtDate = (iso) => {
      if (!iso) return 'N/A';
      try {
        return new Date(iso).toLocaleDateString('en-US', {
          timeZone: tz, year: 'numeric', month: 'short', day: 'numeric',
        });
      } catch { return 'N/A'; }
    };
    const reportDateLong = new Date().toLocaleDateString('en-US', {
      timeZone: tz, year: 'numeric', month: 'long', day: 'numeric',
    });
    const generatedAtStr = new Date().toLocaleString('en-US', { timeZone: tz });
    const curLabel   = fmtDate(currentReport.upload_date);
    const weekLabel  = week1Report  ? fmtDate(week1Report.upload_date)  : 'N/A';
    const monthLabel = month1Report ? fmtDate(month1Report.upload_date) : 'N/A';

    // ── PDF BUILD ────────────────────────────────────────────────────────────
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    // ─── Page 1: Branded header + KPI strip + OLT breakdown ───────────────
    drawHeaderFull(doc, customerLogo, customerName, generatedAtStr);
    let y = BODY_TOP;

    // KPI strip — 2 rows × 4 columns, sized to fit the page comfortably with
    // generous breathing room below the (now larger) header.
    y = sectionTitle(doc, 'Network Health Overview', y, C.navy);
    const kpiInset = 2;
    const tileGap = 4;
    const tileW = (CW - tileGap * 3 - kpiInset * 2) / 4;
    const tileH = 24;

    const kpis = [
      { value: currentAgg.total.toLocaleString(),    label: 'Total ONTs',   vc: C.dark,  ac: C.accent },
      { value: currentAgg.critical.toLocaleString(), label: 'Critical',     vc: C.red,   ac: C.red    },
      { value: currentAgg.warning.toLocaleString(),  label: 'Warning',      vc: C.amber, ac: C.amber  },
      { value: currentAgg.ok.toLocaleString(),       label: 'Healthy',      vc: C.green, ac: C.green  },
      { value: `${healthPct}%`,                      label: 'Health %',     vc: C.green, ac: C.indigo },
      { value: currentAgg.eeroCount.toLocaleString(),label: 'ONTs w/ Eero', vc: C.dark,  ac: C.teal   },
      { value: currentAgg.gpon.toLocaleString(),     label: 'GPON ONTs',    vc: C.dark,  ac: C.slate  },
      { value: currentAgg.xgs.toLocaleString(),      label: 'XGS-PON ONTs', vc: C.dark,  ac: C.slate  },
    ];
    kpis.forEach((k, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      kpiTile(doc,
        M + kpiInset + col * (tileW + tileGap),
        y + row * (tileH + tileGap),
        tileW, tileH, k.value, k.label, k.vc, k.ac);
    });
    y += 2 * tileH + tileGap + 6;

    y = drawTrendComparisonSection(doc, y, {
      customerName,
      tz,
      curLabel,
      weekLabel,
      monthLabel,
      week1Report,
      month1Report,
      currentAgg,
      week1Agg,
      month1Agg,
      ontTrendPoints,
    });

    // OLT Breakdown — starts on its own page
    if (oltRows.length > 0) {
      y = startSectionPage(doc, customerName);
      y = sectionTitle(doc, `OLT Breakdown  (${oltRows.length} chassis)`, y, C.indigo);
      const cols = [
        { label: 'OLT / Chassis', x: M + 5  },
        { label: 'ONTs',          x: M + 65,  align: 'right' },
        { label: 'Critical',      x: M + 92,  align: 'right' },
        { label: 'Warning',       x: M + 120, align: 'right' },
        { label: 'Offline',       x: M + 146, align: 'right' },
        { label: 'Avg Rx',        x: M + 166, align: 'right' },
        { label: 'Health %',      x: M + CW - 4, align: 'right' },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < oltRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = oltRows[i];
        const hpct = parseFloat(r.healthPct);
        const hColor = hpct >= 90 ? C.green : hpct >= 70 ? C.amber : C.red;
        y = tableRow(doc, y, [
          { value: r.olt,                x: M + 5,   maxW: 54 },
          { value: String(r.total),      x: M + 65,  maxW: 18, align: 'right' },
          { value: String(r.critical),   x: M + 92,  maxW: 20, align: 'right', color: r.critical > 0 ? C.red : C.dark },
          { value: String(r.warning),    x: M + 120, maxW: 20, align: 'right', color: r.warning > 0 ? C.amber : C.dark },
          { value: String(r.offline),    x: M + 146, maxW: 18, align: 'right', color: r.offline > 0 ? C.slate : C.dark },
          { value: r.avgRx,              x: M + 166, maxW: 18, align: 'right' },
          { value: `${r.healthPct}%`,    x: M + CW - 4, maxW: 18, align: 'right', color: hColor },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Remaining GPON swaps ─── starts on its own page
    y = startSectionPage(doc, customerName);
    y = sectionTitle(doc, `Remaining GPON swaps  (${opticPortRows.length} GPON-side combo ports)`, y, C.teal);
    if (opticShelfRows.length === 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text('No GPON-side XGS-COMBO or XGS-COMBO-EXT ports found in LCP records.', M + 4, y + 2, { maxWidth: CW - 8 });
      y += 10;
    } else {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text('Only even-numbered GPON-side ports from XGS-COMBO and XGS-COMBO-EXT optics are included, sorted by ONTs descending.', M + 4, y - 1, { maxWidth: CW - 8 });
      y += 4;

      const shelfCols = [
        { label: 'OLT / Shelf',  x: M + 5 },
        { label: 'Combo Ports',  x: M + 70, align: 'right' },
        { label: 'Combo ONTs',   x: M + 100, align: 'right' },
        { label: 'Ext Ports',    x: M + 130, align: 'right' },
        { label: 'Ext ONTs',     x: M + 158, align: 'right' },
        { label: 'Total ONTs',   x: M + CW - 4, align: 'right' },
      ];
      y = tableHeader(doc, y, shelfCols);
      for (let i = 0; i < opticShelfRows.length; i++) {
        const before = y;
        y = maybeNewPage(doc, y, 8, customerName);
        if (y < before) y = tableHeader(doc, y, shelfCols);
        const r = opticShelfRows[i];
        y = tableRow(doc, y, [
          { value: `${r.olt} / Shelf ${r.shelf}`, x: M + 5, maxW: 60 },
          { value: String(r.types['XGS-COMBO'].ports), x: M + 70, maxW: 20, align: 'right' },
          { value: r.types['XGS-COMBO'].onts.toLocaleString(), x: M + 100, maxW: 22, align: 'right' },
          { value: String(r.types['XGS-COMBO-EXT'].ports), x: M + 130, maxW: 20, align: 'right' },
          { value: r.types['XGS-COMBO-EXT'].onts.toLocaleString(), x: M + 158, maxW: 22, align: 'right' },
          { value: r.totalOnts.toLocaleString(), x: M + CW - 4, maxW: 24, align: 'right', color: r.totalOnts > 0 ? C.dark : C.muted },
        ], i % 2 === 0);
      }

      y += 6;
      y = maybeNewPage(doc, y, 16, customerName);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.dark);
      doc.text('GPON-Side Port ONT Counts', M + 4, y);
      y += 2;
      const portCols = [
        { label: 'OLT / Shelf', x: M + 5 },
        { label: 'GPON Port',   x: M + 68 },
        { label: 'Optic Type',  x: M + 108 },
        { label: 'ONTs on Port', x: M + CW - 4, align: 'right' },
      ];
      y = tableHeader(doc, y, portCols);
      for (let i = 0; i < opticPortRows.length; i++) {
        const before = y;
        y = maybeNewPage(doc, y, 8, customerName);
        if (y < before) y = tableHeader(doc, y, portCols);
        const r = opticPortRows[i];
        y = tableRow(doc, y, [
          { value: `${r.olt} / Shelf ${r.shelf}`, x: M + 5, maxW: 60 },
          { value: r.displayPort, x: M + 68, maxW: 36 },
          { value: r.opticType, x: M + 108, maxW: 48, color: r.opticType === 'XGS-COMBO-EXT' ? C.purple : C.indigo },
          { value: r.ontCount.toLocaleString(), x: M + CW - 4, maxW: 28, align: 'right', color: r.ontCount > 0 ? C.dark : C.muted },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── City Saturation ─── starts on its own page
    y = startSectionPage(doc, customerName);
    y = sectionTitle(doc, `City Saturation  (Top ${cityRows.length})`, y, C.accent);
    if (cityRows.length === 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text('No subscriber city data available.', M + 4, y + 2);
      y += 8;
    } else {
      const cols = [
        { label: 'City',         x: M + 5   },
        { label: 'Total ONTs',   x: M + 98,  align: 'right' },
        { label: 'Critical',     x: M + 125, align: 'right' },
        { label: 'Warning',      x: M + 150, align: 'right' },
        { label: '% of Network', x: M + CW - 4, align: 'right' },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < cityRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = cityRows[i];
        const pct = currentAgg.total > 0 ? ((r.total / currentAgg.total) * 100).toFixed(1) : '0.0';
        y = tableRow(doc, y, [
          { value: r.city,                   x: M + 5,      maxW: 86 },
          { value: r.total.toLocaleString(), x: M + 98,     maxW: 24, align: 'right' },
          { value: String(r.critical),       x: M + 125,    maxW: 20, align: 'right', color: r.critical > 0 ? C.red : C.dark },
          { value: String(r.warning),        x: M + 150,    maxW: 20, align: 'right', color: r.warning > 0 ? C.amber : C.dark },
          { value: `${pct}%`,                x: M + CW - 4, maxW: 24, align: 'right' },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Model Summaries ─── combined on one page with a clear separator
    y = startSectionPage(doc, customerName);
    y = sectionTitle(doc, 'Model Summaries', y, C.teal);
    const halfGap = 8;
    const halfW = (CW - halfGap) / 2;
    const leftX = M + 1.5;
    const rightX = leftX + halfW + halfGap;
    const modelTop = y;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text(`ONT Model Summary (${ontModelRows.length} models)`, leftX, modelTop);
    doc.text(`Eero Model Summary (${eeroModelRows.length} models)`, rightX, modelTop);
    y = modelTop + 2;

    let ontY = miniTableHeader(doc, leftX, y, halfW, [
      { label: 'Model', x: 3 },
      { label: 'Count', x: halfW - 28, align: 'right' },
      { label: '%', x: halfW - 4, align: 'right' },
    ], C.teal);
    ontModelRows.slice(0, 28).forEach((r, i) => {
      const pct = currentAgg.total > 0 ? ((r.count / currentAgg.total) * 100).toFixed(1) : '0.0';
      ontY = miniTableRow(doc, leftX, ontY, halfW, [
        { value: r.model, x: 3, maxW: halfW - 36 },
        { value: r.count.toLocaleString(), x: halfW - 28, maxW: 20, align: 'right' },
        { value: `${pct}%`, x: halfW - 4, maxW: 18, align: 'right' },
      ], i % 2 === 0);
    });
    if (ontModelRows.length === 0) {
      doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text('No ONT model data available.', leftX + 3, ontY + 4);
      ontY += 8;
    }

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(rightX - halfGap / 2, modelTop + 2, rightX - halfGap / 2, BODY_BOT - 8);

    let eeroY = miniTableHeader(doc, rightX, y, halfW, [
      { label: 'Eero Model', x: 3 },
      { label: 'Count', x: halfW - 28, align: 'right' },
      { label: '%', x: halfW - 4, align: 'right' },
    ], C.green);
    const totalEero = currentAgg.eeroCount || 1;
    eeroModelRows.slice(0, 28).forEach((r, i) => {
      const pct = ((r.count / totalEero) * 100).toFixed(1);
      eeroY = miniTableRow(doc, rightX, eeroY, halfW, [
        { value: r.model, x: 3, maxW: halfW - 36 },
        { value: r.count.toLocaleString(), x: halfW - 28, maxW: 20, align: 'right' },
        { value: `${pct}%`, x: halfW - 4, maxW: 18, align: 'right' },
      ], i % 2 === 0);
    });
    if (eeroModelRows.length === 0) {
      doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text('No eero model data available.', rightX + 3, eeroY + 4);
      eeroY += 8;
    }
    y = Math.max(ontY, eeroY) + 4;

    // ─── Top 20 Critical ONTs ─── starts on its own page
    if (topCritical.length > 0) {
      y = startSectionPage(doc, customerName);
      y = sectionTitle(doc, `Top ${topCritical.length} Critical ONTs`, y, C.red);
      const cols = [
        { label: 'OLT',      x: M + 5   },
        { label: 'Port',     x: M + 42  },
        { label: 'ONT ID',   x: M + 75  },
        { label: 'Serial',   x: M + 96  },
        { label: 'ONT Rx',   x: M + 138, align: 'right' },
        { label: 'US BIP',   x: M + 164, align: 'right' },
        { label: 'DS BIP',   x: M + CW - 4, align: 'right' },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < topCritical.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = topCritical[i];
        y = tableRow(doc, y, [
          { value: r.olt_name || '',        x: M + 5,      maxW: 34 },
          { value: r.shelf_slot_port || '', x: M + 42,     maxW: 30 },
          { value: String(r.ont_id || ''),  x: M + 75,     maxW: 18 },
          { value: r.serial_number || '',   x: M + 96,     maxW: 38 },
          { value: r.ont_rx_power != null ? String(r.ont_rx_power) : '—', x: M + 138, maxW: 16, align: 'right', color: C.red },
          { value: String(r.us_bip_errors || 0), x: M + 164, maxW: 22, align: 'right' },
          { value: String(r.ds_bip_errors || 0), x: M + CW - 4, maxW: 22, align: 'right' },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Top 20 OLT Ports by Corrected FEC ─── starts on its own page
    // Two numeric columns are right-aligned to anchors inside the table border
    // so wide headers like "ONTs on Port" no longer spill past the right edge.
    if (topFecPorts.length > 0) {
      y = startSectionPage(doc, customerName);
      y = sectionTitle(doc, `Top ${topFecPorts.length} OLT Ports — Corrected FEC`, y, C.amber);
      const cols = [
        { label: 'OLT',                 x: M + 5                  },
        { label: 'Port',                x: M + 60                 },
        { label: 'Total Corrected FEC', x: M + 150, align: 'right' },
        { label: 'ONTs on Port',        x: M + CW - 4, align: 'right' },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < topFecPorts.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const p = topFecPorts[i];
        y = tableRow(doc, y, [
          { value: p.olt,                    x: M + 5,     maxW: 52 },
          { value: p.port,                   x: M + 60,    maxW: 85 },
          { value: p.total.toLocaleString(), x: M + 150,   maxW: 38, align: 'right' },
          { value: String(p.ontCount),       x: M + CW - 4, maxW: 22, align: 'right' },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Top utilized LCP / CLCP information — compact capacity-planning style ───
    y = startSectionPage(doc, customerName);
    y = sectionTitle(doc, `Top ${topLcpUtilization.length} Utilized LCP / CLCP Locations`, y, C.purple);
    if (topLcpUtilization.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text('No LCP / CLCP utilization data available for the current report.', M + 4, y + 2, { maxWidth: CW - 8 });
      y += 10;
    } else {
      const summaryStats = topLcpUtilization.reduce((acc, g) => {
        acc.lcps++;
        acc.splitters += g.totalSplitters;
        acc.onts += g.totalOnts;
        acc.full += g.fullCount;
        acc.critical += g.criticalCount;
        acc.warning += g.warningCount;
        acc.available += g.availableCount;
        return acc;
      }, { lcps: 0, splitters: 0, onts: 0, full: 0, critical: 0, warning: 0, available: 0 });

      const statW = (CW - 12) / 5;
      [
        { label: 'LCP/CLCPs', value: summaryStats.lcps, color: C.dark },
        { label: 'Splitters', value: summaryStats.splitters, color: C.dark },
        { label: 'Full', value: summaryStats.full, color: C.red },
        { label: 'Critical', value: summaryStats.critical, color: C.amber },
        { label: 'Warning', value: summaryStats.warning, color: C.amber },
      ].forEach((stat, i) => {
        const x = M + i * (statW + 3);
        doc.setFillColor(...C.white);
        doc.setDrawColor(...C.border);
        doc.roundedRect(x, y, statW, 17, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...stat.color);
        doc.text(String(stat.value), x + statW / 2, y + 8, { align: 'center' });
        doc.setFontSize(5.8);
        doc.setTextColor(...C.muted);
        doc.text(stat.label.toUpperCase(), x + statW / 2, y + 13.5, { align: 'center' });
      });
      y += 22;

      const drawUtilBar = (x, yy, w, h, pct) => {
        const color = pct >= 100 ? C.red : pct >= 87.5 ? C.amber : pct >= 68.75 ? [234, 179, 8] : C.green;
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(x, yy, w, h, h / 2, h / 2, 'F');
        doc.setFillColor(...color);
        doc.roundedRect(x, yy, Math.max(1.2, Math.min(w, (pct / 100) * w)), h, h / 2, h / 2, 'F');
      };

      for (let i = 0; i < topLcpUtilization.length; i++) {
        const g = topLcpUtilization[i];
        const cardH = 16 + Math.min(3, g.splitterRows.length) * 7;
        y = maybeNewPage(doc, y, cardH + 4, customerName);
        const pct = Math.round(g.utilizationPct || 0);
        const x = M + 1.5;
        const w = CW - 3;
        const ringColor = g.fullCount > 0 ? C.red : g.criticalCount > 0 ? C.amber : g.warningCount > 0 ? [234, 179, 8] : C.green;

        doc.setFillColor(...C.white);
        doc.setDrawColor(...ringColor);
        doc.setLineWidth(0.45);
        doc.roundedRect(x, y, w, cardH, 2, 2, 'FD');

        doc.setFillColor(...C.indigo);
        doc.roundedRect(x + 3, y + 3, 26, 6, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...C.white);
        doc.text(fitText(doc, g.lcp, 21), x + 16, y + 7.2, { align: 'center' });

        doc.setTextColor(...C.dark);
        doc.setFontSize(7.2);
        doc.text(`${g.totalSplitters} splitter${g.totalSplitters !== 1 ? 's' : ''} · ${g.totalOnts} ONTs · ${pct}% utilized`, x + 33, y + 6.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(...C.muted);
        const subline = `${g.totalRemaining} remaining · ${g.totalCapacity} total capacity${g.oltName ? ` · ${g.oltName}` : ''}`;
        doc.text(fitText(doc, subline, 78), x + 33, y + 11.5);

        const badgeY = y + 3.2;
        let badgeX = x + 104;
        const badges = [
          { label: `${g.fullCount} full`, value: g.fullCount, color: C.red },
          { label: `${g.criticalCount} critical`, value: g.criticalCount, color: C.amber },
          { label: `${g.warningCount} warn`, value: g.warningCount, color: [234, 179, 8] },
        ].filter(b => b.value > 0);
        if (badges.length === 0) badges.push({ label: 'All OK', value: 1, color: C.green });
        badges.forEach(b => {
          const bw = Math.max(16, doc.getTextWidth(b.label) + 5);
          doc.setFillColor(...b.color);
          doc.roundedRect(badgeX, badgeY, bw, 5.5, 1.4, 1.4, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(...C.white);
          doc.text(b.label, badgeX + bw / 2, badgeY + 3.8, { align: 'center' });
          badgeX += bw + 2;
        });

        drawUtilBar(x + w - 42, y + 10, 28, 2.8, pct);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(...C.dark);
        doc.text(`${pct}%`, x + w - 7, y + 12.7, { align: 'right' });

        let sy = y + 17;
        g.splitterRows.slice(0, 3).forEach(row => {
          const spPct = Math.round(row.utilizationPct || 0);
          const statusColor = row.status === 'full' ? C.red : row.status === 'critical' ? C.amber : row.status === 'warning' ? [234, 179, 8] : C.green;
          doc.setFillColor(...C.lightBg);
          doc.rect(x + 4, sy - 3.7, w - 8, 5.7, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.8);
          doc.setTextColor(...statusColor);
          doc.text(row.status.toUpperCase(), x + 7, sy);
          doc.setTextColor(...C.dark);
          doc.text(`Splitter ${row.splitter}`, x + 35, sy);
          doc.setFont('helvetica', 'normal');
          doc.text(`${row.count} ONTs`, x + 76, sy);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...statusColor);
          doc.text(`${row.remaining} left`, x + 100, sy);
          drawUtilBar(x + 123, sy - 2.4, 30, 2.4, spPct);
          doc.setTextColor(...C.muted);
          doc.text(`${spPct}%`, x + w - 7, sy, { align: 'right' });
          sy += 7;
        });

        if (g.splitterRows.length > 3) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(5.5);
          doc.setTextColor(...C.muted);
          doc.text(`+${g.splitterRows.length - 3} additional splitter${g.splitterRows.length - 3 !== 1 ? 's' : ''}`, x + 7, sy - 1.5);
        }
        y += cardH + 3;
      }
    }

    // ─── Stamp footer on every page ──────────────────────────────────────
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(doc, reportDateLong);
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(doc.output('arraybuffer')), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=FiberOracle-Comprehensive-Report-${dateStr}.pdf`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[generateExecutiveReport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});