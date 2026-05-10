/**
 * generateExecutiveReport
 *
 * Admin-only. Aggregates ONTPerformanceRecord data across two time windows
 * (current week vs previous week) and produces a branded PDF with:
 *   1. Executive KPI strip (total ONTs, critical %, week-over-week delta)
 *   2. Issues by City — table sorted by critical count desc
 *   3. Issues by Zip Code — top 15 zips
 *   4. OLT Shelf comparison — avg Rx, critical count, health % per OLT
 *   5. Week-over-week trend section
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
};

const PAGE_W = 210, PAGE_H = 297, M = 18, CW = PAGE_W - M * 2;
const HDR_H = 22, FTR_H = 12;
const BODY_TOP = HDR_H + 6, BODY_BOT = PAGE_H - FTR_H - 4;

// ─── Header / Footer ──────────────────────────────────────────────────────────
function drawHeader(doc, logo, customerName, reportDate) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HDR_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HDR_H, PAGE_W, 1.2, 'F');

  let cx = M;
  if (logo) {
    doc.setFillColor(...C.white);
    doc.roundedRect(cx, 4, 18, 14, 1.5, 1.5, 'F');
    try {
      const props = doc.getImageProperties(logo);
      const ratio = props.width / props.height;
      let dW = 16, dH = dW / ratio;
      if (dH > 12) { dH = 12; dW = dH * ratio; }
      doc.addImage(logo, props.fileType || 'PNG', cx + (18 - dW) / 2, 4 + (14 - dH) / 2, dW, dH);
    } catch {}
    cx += 22;
  }

  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(s(customerName || 'FIBER ORACLE'), cx, 11);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(customerName ? 'Powered by FiberOracle.com' : 'fiberoracle.com', cx, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.accent);
  doc.text('EXECUTIVE PERFORMANCE REPORT', PAGE_W - M, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.subText);
  doc.text(s(reportDate), PAGE_W - M, 16, { align: 'right' });
}

function drawFooter(doc, pageNum, totalPages, customerName) {
  const fy = PAGE_H - FTR_H;
  doc.setFillColor(...C.navy);
  doc.rect(0, fy, PAGE_W, FTR_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, fy, PAGE_W, 0.6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(customerName || 'Fiber Oracle'), M, fy + 7);
  doc.text('FiberOracle.com', PAGE_W / 2, fy + 7, { align: 'center' });
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - M, fy + 7, { align: 'right' });
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
function kpiTile(doc, x, y, w, h, value, label, valueColor, accentColor, delta) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, w, 2, 1, 1, 'F');

  doc.setFontSize(delta !== undefined ? 16 : 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(s(String(value)), x + w / 2, y + h * (delta !== undefined ? 0.50 : 0.62), { align: 'center' });

  if (delta !== undefined && delta !== null) {
    const sign = delta > 0 ? '+' : '';
    const col = delta > 0 ? C.red : C.green; // more issues = red, fewer = green
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...col);
    doc.text(`${sign}${delta} vs last week`, x + w / 2, y + h * 0.73, { align: 'center' });
  }

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text(s(label).toUpperCase(), x + w / 2, y + h - 3, { align: 'center' });
}

// ─── Table helpers ─────────────────────────────────────────────────────────────
function tableHeader(doc, y, cols) {
  doc.setFillColor(...C.navy);
  doc.roundedRect(M + 1.5, y + 1.5, CW - 3, 6.5, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  cols.forEach(col => doc.text(s(col.label), col.x, y + 5.5));
  return y + 9.5;
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
    doc.text(s(col.value), col.x, y + 4, { maxWidth: col.maxW || 50 });
  });
  return y + 6;
}

// ─── Page-break guard ──────────────────────────────────────────────────────────
function maybeNewPage(doc, y, needed, logo, customerName, reportDate) {
  if (y > BODY_BOT - needed) {
    doc.addPage();
    drawHeader(doc, logo, customerName, reportDate);
    return BODY_TOP;
  }
  return y;
}

// ─── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { timezone, weeks_back = 1 } = await req.json().catch(() => ({}));
    const tz = timezone || 'America/New_York';

    // ── Date windows ────────────────────────────────────────────────────────
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const currentStart = new Date(now.getTime() - weeks_back * msPerWeek).toISOString();
    const prevStart    = new Date(now.getTime() - (weeks_back + 1) * msPerWeek).toISOString();
    const prevEnd      = currentStart;

    // ── Fetch ONT records (latest report) from DB ────────────────────────────
    // We load up to 10k records from the most recent reports by using the
    // report_date index. Admins can see all records (RLS allows).
    const [currentRecs, prevRecs] = await Promise.all([
      base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_date: { $gte: currentStart } }, '-report_date', 5000
      ),
      base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_date: { $gte: prevStart, $lt: prevEnd } }, '-report_date', 5000
      ),
    ]);

    // ── If no current records, fall back to the single latest report ─────────
    let records = currentRecs;
    if (records.length === 0) {
      const latestReports = await base44.asServiceRole.entities.PONPMReport.list('-upload_date', 1);
      if (latestReports.length > 0) {
        records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { report_id: latestReports[0].id }, '-report_date', 5000
        );
      }
    }

    const totalCurrent  = records.length;
    const critCurrent   = records.filter(r => r.status === 'critical').length;
    const warnCurrent   = records.filter(r => r.status === 'warning').length;
    const okCurrent     = records.filter(r => r.status === 'ok').length;
    const offCurrent    = records.filter(r => r.status === 'offline').length;

    const totalPrev     = prevRecs.length;
    const critPrev      = prevRecs.filter(r => r.status === 'critical').length;

    const critDelta     = totalPrev > 0 ? critCurrent - critPrev : null;
    const healthPct     = totalCurrent > 0 ? ((okCurrent / totalCurrent) * 100).toFixed(1) : '0.0';

    // ── Aggregate by city ───────────────────────────────────────────────────
    const cityMap = new Map(); // city → { total, critical, warning, ok, offline }
    for (const r of records) {
      const city = r.subscriber_address?.split(',')[1]?.trim() ||
                   r.subscriber_address?.match(/[A-Za-z\s]+/)?.[0]?.trim() || 'Unknown';
      if (!cityMap.has(city)) cityMap.set(city, { total: 0, critical: 0, warning: 0, ok: 0, offline: 0 });
      const c = cityMap.get(city);
      c.total++;
      if (r.status) c[r.status] = (c[r.status] || 0) + 1;
    }
    const cityRows = [...cityMap.entries()]
      .map(([city, v]) => ({ city, ...v, critPct: v.total > 0 ? ((v.critical / v.total) * 100).toFixed(1) : '0.0' }))
      .sort((a, b) => b.critical - a.critical)
      .slice(0, 20);

    // ── Aggregate by zip ────────────────────────────────────────────────────
    const zipMap = new Map();
    for (const r of records) {
      const zip = r.subscriber_address?.match(/\b\d{5}\b/)?.[0] || 'Unknown';
      if (!zipMap.has(zip)) zipMap.set(zip, { total: 0, critical: 0, warning: 0 });
      const z = zipMap.get(zip);
      z.total++;
      if (r.status === 'critical') z.critical++;
      if (r.status === 'warning')  z.warning++;
    }
    const zipRows = [...zipMap.entries()]
      .map(([zip, v]) => ({ zip, ...v, critPct: v.total > 0 ? ((v.critical / v.total) * 100).toFixed(1) : '0.0' }))
      .sort((a, b) => b.critical - a.critical)
      .slice(0, 15);

    // ── Aggregate by OLT ────────────────────────────────────────────────────
    const oltMap = new Map();
    for (const r of records) {
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

    // ── Customer branding ───────────────────────────────────────────────────
    let customerName = null, customerLogo = null;
    if (user?.preferences?.companyName && user.preferences.companyName !== 'Fiber Oracle') {
      customerName = s(user.preferences.companyName);
    }
    const rawLogo = user?.preferences?.logoUrl
      || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png';
    customerLogo = await fetchLogo(rawLogo);

    const reportDate = new Date().toLocaleDateString('en-US', {
      timeZone: tz, year: 'numeric', month: 'long', day: 'numeric',
    });
    const reportDateTime = new Date().toLocaleString('en-US', { timeZone: tz });

    // ── PDF BUILD ────────────────────────────────────────────────────────────
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    // Page 1 — header + title + KPI strip
    drawHeader(doc, customerLogo, customerName, reportDate);
    let y = BODY_TOP;

    // Title block
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.dark);
    doc.text('Executive Network Performance Report', M, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(`Generated: ${reportDateTime}`, M, y + 10);
    doc.text(
      totalPrev > 0
        ? `Current period vs prior week  |  ${totalCurrent.toLocaleString()} ONTs in scope`
        : `Latest available data  |  ${totalCurrent.toLocaleString()} ONTs in scope`,
      M, y + 15, { maxWidth: CW }
    );
    y += 22;

    // KPI strip (5 tiles)
    y = sectionTitle(doc, 'Network Health Overview', y, C.navy);
    const kpiPanelTop = y;
    const kpiInset = 3;
    const kw = (CW - 4 * 3) / 5;
    const kpis = [
      { value: totalCurrent.toLocaleString(), label: 'Total ONTs', vc: C.dark, ac: C.accent, delta: null },
      { value: critCurrent,   label: 'Critical',    vc: C.red,   ac: C.red,   delta: critDelta },
      { value: warnCurrent,   label: 'Warning',     vc: C.amber, ac: C.amber, delta: null },
      { value: okCurrent.toLocaleString(), label: 'Healthy', vc: C.green, ac: C.green, delta: null },
      { value: `${healthPct}%`, label: 'Health %',  vc: C.green, ac: C.indigo, delta: null },
    ];
    kpis.forEach((k, i) => {
      kpiTile(doc, M + kpiInset + i * (kw - 1.2 + 3), y + kpiInset, kw - 1.2, 26,
              k.value, k.label, k.vc, k.ac, k.delta);
    });
    y += 26 + kpiInset * 2 + 6;

    // ── Issues by City ─────────────────────────────────────────────────────
    if (cityRows.length > 0) {
      y = maybeNewPage(doc, y, 60, customerLogo, customerName, reportDate);
      y = sectionTitle(doc, `Issues by City  (top ${cityRows.length})`, y, C.red);

      const cols = [
        { label: 'City',     x: M + 5     },
        { label: 'Total',    x: M + 75    },
        { label: 'Critical', x: M + 95    },
        { label: 'Crit %',   x: M + 120   },
        { label: 'Warning',  x: M + 145   },
        { label: 'Healthy',  x: M + 165   },
      ];
      y = tableHeader(doc, y, cols);

      for (let i = 0; i < cityRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerLogo, customerName, reportDate);
        const r = cityRows[i];
        const critCol = r.critical > 0 ? C.red : C.dark;
        y = tableRow(doc, y, [
          { value: r.city,              x: M + 5,   maxW: 68 },
          { value: String(r.total),     x: M + 75  },
          { value: String(r.critical),  x: M + 95,  color: critCol },
          { value: `${r.critPct}%`,     x: M + 120, color: critCol },
          { value: String(r.warning),   x: M + 145, color: r.warning > 0 ? C.amber : C.dark },
          { value: String(r.ok),        x: M + 165, color: C.green },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ── Issues by Zip ──────────────────────────────────────────────────────
    if (zipRows.length > 0) {
      y = maybeNewPage(doc, y, 50, customerLogo, customerName, reportDate);
      y = sectionTitle(doc, `Issues by Zip Code  (top ${zipRows.length})`, y, C.amber);

      const cols = [
        { label: 'Zip Code',  x: M + 5  },
        { label: 'Total',     x: M + 50 },
        { label: 'Critical',  x: M + 75 },
        { label: 'Crit %',    x: M + 100 },
        { label: 'Warning',   x: M + 130 },
      ];
      y = tableHeader(doc, y, cols);

      for (let i = 0; i < zipRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerLogo, customerName, reportDate);
        const r = zipRows[i];
        y = tableRow(doc, y, [
          { value: r.zip,               x: M + 5  },
          { value: String(r.total),     x: M + 50 },
          { value: String(r.critical),  x: M + 75,  color: r.critical > 0 ? C.red : C.dark },
          { value: `${r.critPct}%`,     x: M + 100, color: r.critical > 0 ? C.red : C.dark },
          { value: String(r.warning),   x: M + 130, color: r.warning > 0 ? C.amber : C.dark },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ── OLT Shelf Comparison ───────────────────────────────────────────────
    if (oltRows.length > 0) {
      y = maybeNewPage(doc, y, 60, customerLogo, customerName, reportDate);
      y = sectionTitle(doc, `OLT Shelf Comparison  (${oltRows.length} chassis)`, y, C.indigo);

      const cols = [
        { label: 'OLT / Chassis', x: M + 5  },
        { label: 'ONTs',          x: M + 60 },
        { label: 'Critical',      x: M + 82 },
        { label: 'Warning',       x: M + 106 },
        { label: 'Health %',      x: M + 130 },
        { label: 'Avg ONT Rx',    x: M + 158 },
      ];
      y = tableHeader(doc, y, cols);

      for (let i = 0; i < oltRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerLogo, customerName, reportDate);
        const r = oltRows[i];
        const hpct = parseFloat(r.healthPct);
        const hColor = hpct >= 90 ? C.green : hpct >= 70 ? C.amber : C.red;
        y = tableRow(doc, y, [
          { value: r.olt,                        x: M + 5,   maxW: 52 },
          { value: String(r.total),              x: M + 60  },
          { value: String(r.critical),           x: M + 82,  color: r.critical > 0 ? C.red : C.dark },
          { value: String(r.warning),            x: M + 106, color: r.warning > 0 ? C.amber : C.dark },
          { value: `${r.healthPct}%`,            x: M + 130, color: hColor },
          { value: r.avgRx !== 'N/A' ? `${r.avgRx} dBm` : 'N/A', x: M + 158 },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ── Week-over-week summary section ─────────────────────────────────────
    if (totalPrev > 0) {
      y = maybeNewPage(doc, y, 50, customerLogo, customerName, reportDate);
      y = sectionTitle(doc, 'Week-over-Week Summary', y, C.purple);

      const wowData = [
        { metric: 'Total ONTs in scope', current: totalCurrent, prev: totalPrev },
        { metric: 'Critical issues',     current: critCurrent,  prev: critPrev  },
        { metric: 'Warning issues',       current: warnCurrent,  prev: prevRecs.filter(r => r.status === 'warning').length },
        { metric: 'Healthy ONTs',        current: okCurrent,    prev: prevRecs.filter(r => r.status === 'ok').length },
        { metric: 'Offline ONTs',        current: offCurrent,   prev: prevRecs.filter(r => r.status === 'offline').length },
      ];

      const cols = [
        { label: 'Metric',       x: M + 5  },
        { label: 'This Period',  x: M + 95 },
        { label: 'Prior Period', x: M + 125 },
        { label: 'Delta',        x: M + 158 },
      ];
      y = tableHeader(doc, y, cols);

      for (let i = 0; i < wowData.length; i++) {
        const r = wowData[i];
        const delta = r.current - r.prev;
        const sign = delta > 0 ? '+' : '';
        // For critical/warning/offline: increase is bad (red); for healthy: increase is good (green)
        const isGoodMetric = r.metric.includes('Healthy');
        const deltaColor = delta === 0 ? C.muted
          : isGoodMetric
            ? (delta > 0 ? C.green : C.red)
            : (delta > 0 ? C.red   : C.green);

        y = tableRow(doc, y, [
          { value: r.metric,                   x: M + 5   },
          { value: String(r.current),          x: M + 95  },
          { value: String(r.prev),             x: M + 125 },
          { value: `${sign}${delta}`,          x: M + 158, color: deltaColor },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ── Stamp header + footer on every page ────────────────────────────────
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(doc, p, totalPages, customerName);
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(doc.output('arraybuffer')), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=FiberOracle-Executive-Report-${dateStr}.pdf`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[generateExecutiveReport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});