/**
 * generateExecutiveReport
 *
 * Admin-only. Aggregates ONTPerformanceRecord data across two time windows
 * (current week vs previous week) and produces a branded PDF with:
 *   1. Executive KPI strip (total ONTs, critical %, week-over-week delta)
 *   2. Saturation Report — top zip codes
 *   3. OLT Shelf comparison — avg Rx, critical count, health % per OLT
 *   4. Week-over-week trend section (with report dates)
 *
 * IMPORTANT — parity with PON PM Analysis page:
 *   - status counts are pulled from PONPMReport.{critical,warning,ok,ont}_count
 *     when available (authoritative — written by processPonPmRecords) and only
 *     fall back to record-level tally if the report row is missing them.
 *   - eero matching uses normalizeHomeId() — same canonical 16-digit account
 *     lookup the UI uses (EeroUpload.js). Without this, prefixed/suffixed
 *     account numbers (e.g. "FD-8275…") miss every match.
 *   - GPON / XGS-PON technology detection uses the same model whitelist as
 *     processPonPmRecords.detectTechType() — never blanket-classifies unknown
 *     models as GPON.
 *   - Zip codes are extracted from the LAST comma-segment of subscriber_address
 *     (which is always "street, city, zip" when populated by the subscriber
 *     join), not from any 5-digit run anywhere in the string.
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

// ─── Account normalization (mirrors components/ponpm/EeroUpload.normalizeHomeId)
// CRITICAL: must stay byte-for-byte identical to the UI logic so eero match counts
// in the exec report align with what the PON PM Analysis page displays.
function normalizeHomeId(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, '');
  if (!digits) return null;
  const canonical = digits.match(/8275\d{12}/);
  return canonical ? canonical[0] : digits;
}

// ─── Technology detection (mirrors processPonPmRecords.detectTechType)
// Whitelist-based — never blanket-classifies unrecognized models. Records with
// no recognized model are returned as null and counted as "Unknown" in the exec
// report rather than being silently bucketed into GPON.
function detectTechType(model) {
  if (!model) return null;
  const m = String(model).toUpperCase().trim().replace(/\s/g, '');
  if (m.includes('DZS')) return 'XGS-PON';
  const xgsModels = ['GP1101X', 'GP4201X', 'GP4201XH', '5222XG', '5228XG'];
  const gponModels = ['711GE', '717GE', '725G', '725GE', '725', '812G-1', '844G-1', '844GE-1', '803G'];
  for (const x of xgsModels) if (m.includes(x)) return 'XGS-PON';
  for (const g of gponModels) if (m.includes(g)) return 'GPON';
  // FSAN serial fallback for DZS XGS units written by processPonPmRecords as "DZS 522x XG"
  return null;
}

// Parse a "street, city, zip" address into components. The zip is taken from
// the LAST comma-segment if it contains a 5-digit number — never via a global
// regex over the whole address (house numbers like "12345 Main St" would
// otherwise be misread as zip codes).
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
    // Could be "street, city" or "street, zip"
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

  // Scale font down for wide values (e.g. "7,140") so they don't overflow the tile
  const valStr = s(String(value));
  const baseFontSize = delta !== undefined ? 16 : 20;
  const fontSize = valStr.length > 5 ? Math.min(baseFontSize, 15) : baseFontSize;
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(valStr, x + w / 2, y + h * (delta !== undefined ? 0.50 : 0.62), { align: 'center' });

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

    // ── Fetch Reports ────────────────────────────────────────────────────────
    const reports = await base44.asServiceRole.entities.PONPMReport.list('-upload_date', 50);
    const currentReport = reports[0];
    let prevReport = null;

    if (currentReport) {
      const currentMs = new Date(currentReport.upload_date).getTime();
      const targetMs = currentMs - weeks_back * msPerWeek;
      let minDiff = Infinity;
      for (let i = 1; i < reports.length; i++) {
        const diff = Math.abs(new Date(reports[i].upload_date).getTime() - targetMs);
        if (diff < 4 * 24 * 60 * 60 * 1000) { // +/- 4 days tolerance
          if (diff < minDiff) {
            minDiff = diff;
            prevReport = reports[i];
          }
        }
      }
    }

    const [currentRecs, prevRecs] = await Promise.all([
      currentReport ? fetchAllFiltered('ONTPerformanceRecord', { report_id: currentReport.id }, '-report_date') : Promise.resolve([]),
      prevReport ? fetchAllFiltered('ONTPerformanceRecord', { report_id: prevReport.id }, '-report_date') : Promise.resolve([])
    ]);

    // ── Fetch active Eeros ───────────────────────────────────────────────────
    const activeEeroUploads = await base44.asServiceRole.entities.EeroUploadMeta.filter({ status: 'active' }, '-upload_date', 1);
    let eeroHomes = new Set();
    if (activeEeroUploads.length > 0) {
      const eeros = await fetchAllFiltered('EeroRecord', { upload_id: activeEeroUploads[0].id }, '-created_date');
      for (const e of eeros) { if (e.home_identifier) eeroHomes.add(e.home_identifier); }
    }

    // ── Build a normalized eero home_id Set for fast lookup ─────────────────
    // Mirrors the UI's buildEeroLookup → normalizeHomeId pipeline so match
    // counts here equal what the user sees on the PON PM Analysis page.
    const eeroHomeKeys = new Set();
    for (const home of eeroHomes) {
      const k = normalizeHomeId(home);
      if (k) eeroHomeKeys.add(k);
    }

    // ── Aggregate Current Report ──────────────────────────────────────────────
    // Prefer the authoritative summary counts written by processPonPmRecords
    // onto PONPMReport — they are exactly what the PON PM Analysis page shows.
    // Fall back to a record-level tally only if the report row is missing them
    // (older reports created before the counts column was populated).
    const records = currentRecs;
    const recCritical = records.filter(r => r.status === 'critical').length;
    const recWarning  = records.filter(r => r.status === 'warning').length;
    const recOk       = records.filter(r => r.status === 'ok').length;
    const recOffline  = records.filter(r => r.status === 'offline').length;

    const totalCurrent = currentReport?.ont_count      ?? records.length;
    const critCurrent  = currentReport?.critical_count ?? recCritical;
    const warnCurrent  = currentReport?.warning_count  ?? recWarning;
    const okCurrent    = currentReport?.ok_count       ?? recOk;
    const offCurrent   = recOffline; // not stored on PONPMReport — always tally

    // GPON / XGS-PON via the SAME whitelist used at ingest time. Records with
    // no recognized model are NOT counted as either tech (kept as Unknown).
    let gponCurrent = 0, xgsCurrent = 0, eeroCountCurrent = 0;
    for (const r of records) {
      const tech = detectTechType(r.model) || detectTechType(r.subscriber_model);
      if (tech === 'XGS-PON') xgsCurrent++;
      else if (tech === 'GPON') gponCurrent++;
      // else: unknown → not counted in either bucket

      const acctKey = normalizeHomeId(r.subscriber_account_name);
      if (acctKey && eeroHomeKeys.has(acctKey)) eeroCountCurrent++;
    }

    // ── Aggregate Prev Report ─────────────────────────────────────────────────
    const prevRecCritical = prevRecs.filter(r => r.status === 'critical').length;
    const prevRecWarning  = prevRecs.filter(r => r.status === 'warning').length;
    const prevRecOk       = prevRecs.filter(r => r.status === 'ok').length;
    const prevRecOffline  = prevRecs.filter(r => r.status === 'offline').length;

    const totalPrev = prevReport?.ont_count      ?? prevRecs.length;
    const critPrev  = prevReport?.critical_count ?? prevRecCritical;
    const warnPrev  = prevReport?.warning_count  ?? prevRecWarning;
    const okPrev    = prevReport?.ok_count       ?? prevRecOk;
    const offPrev   = prevRecOffline;

    let gponPrev = 0, xgsPrev = 0, eeroCountPrev = 0;
    for (const r of prevRecs) {
      const tech = detectTechType(r.model) || detectTechType(r.subscriber_model);
      if (tech === 'XGS-PON') xgsPrev++;
      else if (tech === 'GPON') gponPrev++;

      const acctKey = normalizeHomeId(r.subscriber_account_name);
      if (acctKey && eeroHomeKeys.has(acctKey)) eeroCountPrev++;
    }

    const critDelta = totalPrev > 0 ? critCurrent - critPrev : null;
    const healthPct = totalCurrent > 0 ? ((okCurrent / totalCurrent) * 100).toFixed(1) : '0.0';

    // ── Aggregate by city + zip in a single pass via parseAddress ───────────
    // parseAddress takes the LAST comma-segment for the zip (avoids matching
    // house numbers) and the second segment for the city.
    const cityMap = new Map();
    const zipMap  = new Map();
    let unknownZipCount = 0;
    for (const r of records) {
      const { city, zip } = parseAddress(r.subscriber_address);

      if (!cityMap.has(city)) cityMap.set(city, { total: 0, critical: 0, warning: 0, ok: 0, offline: 0 });
      const c = cityMap.get(city);
      c.total++;
      if (r.status) c[r.status] = (c[r.status] || 0) + 1;

      if (zip === 'Unknown') {
        unknownZipCount++;
      } else {
        if (!zipMap.has(zip)) zipMap.set(zip, { total: 0, critical: 0, warning: 0 });
        const z = zipMap.get(zip);
        z.total++;
        if (r.status === 'critical') z.critical++;
        if (r.status === 'warning')  z.warning++;
      }
    }
    const cityRows = [...cityMap.entries()]
      .map(([city, v]) => ({ city, ...v, critPct: v.total > 0 ? ((v.critical / v.total) * 100).toFixed(1) : '0.0' }))
      .sort((a, b) => b.critical - a.critical)
      .slice(0, 20);

    // Zip saturation report — top 10 REAL zip codes (Unknown excluded from the
    // ranked list and shown separately as a coverage note so it doesn't
    // dominate the table when many records lack subscriber join data).
    const zipRows = [...zipMap.entries()]
      .map(([zip, v]) => ({ zip, ...v, critPct: v.total > 0 ? ((v.critical / v.total) * 100).toFixed(1) : '0.0' }))
      .sort((a, b) => b.total - a.total) // sort by saturation (total ONTs), not critical
      .slice(0, 10);

    // ── Aggregate by OLT ────────────────────────────────────────────────────
    const oltMap = new Map();
    for (const r of records) {
      const olt = r.olt_name || 'Unknown';
      if (!oltMap.has(olt)) oltMap.set(olt, { total: 0, critical: 0, warning: 0, ok: 0, offline: 0 });
      const o = oltMap.get(olt);
      o.total++;
      if (r.status) o[r.status] = (o[r.status] || 0) + 1;
    }
    const oltRows = [...oltMap.entries()]
      .map(([olt, v]) => ({
        olt, ...v,
        avgRx: v.rxCount > 0 ? (v.rxSum / v.rxCount).toFixed(1) : 'N/A',
        healthPct: v.total > 0 ? ((v.ok / v.total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.critical - a.critical);

    // ── Customer branding ───────────────────────────────────────────────────
    // Sources (priority):
    //   1. AppSettings.company_name / logo_url  (set in app Settings → Branding)
    //   2. Fiber Oracle defaults
    // The previous version silently fell back to defaults if AppSettings was
    // empty AND skipped the customer name when it equalled the literal default
    // string — which made it impossible to override only the logo. Both
    // behaviours are now independent.
    const settingsArr = await base44.asServiceRole.entities.AppSettings.list('-created_date', 1);
    const appSettings = settingsArr[0] || {};
    const customerName = s(appSettings.company_name || 'Fiber Oracle');
    const rawLogo = appSettings.logo_url
      || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png';
    const customerLogo = await fetchLogo(rawLogo);
    console.log(`[generateExecutiveReport] Branding — name: "${customerName}", logo: ${appSettings.logo_url ? 'custom' : 'default Fiber Oracle'}`);

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
    doc.text('Executive Network Performance Sheet', M, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text('Comprehensive analysis of optical network health, performance metrics, and subscriber saturation.', M, y + 10, { maxWidth: CW });
    doc.text(`Generated: ${reportDateTime}`, M, y + 15);
    y += 22;

    // KPI strip (2 rows)
    y = sectionTitle(doc, 'Network Health Overview', y, C.navy);
    const kpiInset = 3;
    const kw5 = (CW - 4 * 3) / 5;
    
    // Row 1 (5 tiles)
    const kpis1 = [
      { value: totalCurrent.toLocaleString(), label: 'Total ONTs', vc: C.dark, ac: C.accent, delta: null },
      { value: critCurrent.toLocaleString(),  label: 'Critical',    vc: C.red,   ac: C.red,   delta: critDelta },
      { value: warnCurrent.toLocaleString(),  label: 'Warning',     vc: C.amber, ac: C.amber, delta: null },
      { value: okCurrent.toLocaleString(),    label: 'Healthy', vc: C.green, ac: C.green, delta: null },
      { value: `${healthPct}%`, label: 'Health %',  vc: C.green, ac: C.indigo, delta: null },
    ];
    kpis1.forEach((k, i) => {
      kpiTile(doc, M + kpiInset + i * (kw5 - 1.2 + 3), y + kpiInset, kw5 - 1.2, 26,
              k.value, k.label, k.vc, k.ac, k.delta);
    });
    
    // Row 2 (3 tiles)
    y += 26 + kpiInset * 2;
    const kw3 = (CW - 2 * 3) / 3;
    const kpis2 = [
      { value: eeroCountCurrent.toLocaleString(), label: 'ONTs with Eero', vc: C.dark, ac: C.accent, delta: null },
      { value: gponCurrent.toLocaleString(),  label: 'GPON ONTs',    vc: C.dark, ac: C.slate, delta: null },
      { value: xgsCurrent.toLocaleString(),   label: 'XGS-PON ONTs', vc: C.dark, ac: C.slate, delta: null },
    ];
    kpis2.forEach((k, i) => {
      kpiTile(doc, M + kpiInset + i * (kw3 - 1.2 + 3), y, kw3 - 1.2, 26,
              k.value, k.label, k.vc, k.ac, k.delta);
    });
    
    y += 26 + kpiInset + 6;

    // ── Saturation Report Section ──────────────────────────────────────────
    // Shows the top 10 zip codes by ONT count. Unknown zips (records with no
    // subscriber join or addresses missing a parseable zip) are reported
    // separately as a coverage note — they're a data-quality signal, not a
    // saturation result, and including them in the ranked list misleads.
    y = maybeNewPage(doc, y, 60, customerLogo, customerName, reportDate);
    y = sectionTitle(doc, `Saturation Report — Top ${zipRows.length} Zip Codes`, y, C.accent);

    if (zipRows.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(
        'No subscriber addresses with parseable zip codes were found. Upload subscriber data on the PON PM Analysis page to populate this section.',
        M + 4, y + 2, { maxWidth: CW - 8 }
      );
      y += 12;
    } else {
      const cols = [
        { label: 'Zip Code',     x: M + 5   },
        { label: 'Total ONTs',   x: M + 60  },
        { label: 'Critical',     x: M + 100 },
        { label: 'Warning',      x: M + 130 },
        { label: '% of Network', x: M + 158 },
      ];
      y = tableHeader(doc, y, cols);

      for (let i = 0; i < zipRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerLogo, customerName, reportDate);
        const r = zipRows[i];
        const pct = totalCurrent > 0 ? ((r.total / totalCurrent) * 100).toFixed(1) : '0.0';
        y = tableRow(doc, y, [
          { value: r.zip,                                       x: M + 5   },
          { value: r.total.toLocaleString(),                    x: M + 60  },
          { value: String(r.critical), color: r.critical > 0 ? C.red : C.dark, x: M + 100 },
          { value: String(r.warning),  color: r.warning  > 0 ? C.amber : C.dark, x: M + 130 },
          { value: `${pct}%`,                                   x: M + 158 },
        ], i % 2 === 0);
      }

      // Data-coverage note for unmatched / Unknown zips
      if (unknownZipCount > 0) {
        y += 1;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...C.muted);
        const pctUnknown = totalCurrent > 0 ? ((unknownZipCount / totalCurrent) * 100).toFixed(1) : '0.0';
        doc.text(
          `Note: ${unknownZipCount.toLocaleString()} ONTs (${pctUnknown}%) have no parseable zip code in their subscriber address and are excluded from the table.`,
          M + 4, y + 4, { maxWidth: CW - 8 }
        );
        y += 8;
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
        { label: 'Offline',       x: M + 130 },
        { label: 'Health %',      x: M + 158 },
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
          { value: String(r.offline),            x: M + 130, color: r.offline > 0 ? C.slate : C.dark },
          { value: `${r.healthPct}%`,            x: M + 158, color: hColor },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ── Week-over-week summary section ─────────────────────────────────────
    if (totalPrev > 0) {
      y = maybeNewPage(doc, y, 80, customerLogo, customerName, reportDate);
      y = sectionTitle(doc, 'Week-over-Week Summary', y, C.purple);

      // Show the actual report dates so readers can see exactly which two
      // snapshots the comparison is built from. Falls back gracefully if
      // either upload_date is missing.
      const fmtReportDate = (iso) => {
        if (!iso) return 'N/A';
        try {
          return new Date(iso).toLocaleDateString('en-US', {
            timeZone: tz, year: 'numeric', month: 'short', day: 'numeric',
          });
        } catch { return 'N/A'; }
      };
      const currentLabel = fmtReportDate(currentReport?.upload_date);
      const prevLabel    = fmtReportDate(prevReport?.upload_date);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.muted);
      doc.text(
        `Comparing report from ${currentLabel} to report from ${prevLabel}.`,
        M + 4, y - 1, { maxWidth: CW - 8 }
      );
      y += 5;

      const wowData = [
        { metric: 'Total ONTs in scope', current: totalCurrent, prev: totalPrev },
        { metric: 'Critical issues',     current: critCurrent,  prev: critPrev  },
        { metric: 'Warning issues',      current: warnCurrent,  prev: warnPrev  },
        { metric: 'Healthy ONTs',        current: okCurrent,    prev: okPrev    },
        { metric: 'Offline ONTs',        current: offCurrent,   prev: offPrev   },
        { metric: 'GPON ONTs',           current: gponCurrent,  prev: gponPrev  },
        { metric: 'XGS-PON ONTs',        current: xgsCurrent,   prev: xgsPrev   },
        { metric: 'ONTs with Eero',      current: eeroCountCurrent, prev: eeroCountPrev },
      ];

      // Column headers now include the actual report dates so each value
      // column is unambiguous in the printed report.
      const cols = [
        { label: 'Metric',                x: M + 5   },
        { label: currentLabel,            x: M + 90  },
        { label: prevLabel,               x: M + 130 },
        { label: 'Delta',                 x: M + 168 },
      ];
      y = tableHeader(doc, y, cols);

      for (let i = 0; i < wowData.length; i++) {
        const r = wowData[i];
        const delta = r.current - r.prev;
        const sign = delta > 0 ? '+' : '';
        const isGoodMetric = r.metric.includes('Healthy') || r.metric.includes('Total') || r.metric.includes('Eero') || r.metric.includes('PON');
        const deltaColor = delta === 0 ? C.muted
          : isGoodMetric
            ? (delta > 0 ? C.green : C.red)
            : (delta > 0 ? C.red   : C.green);

        y = tableRow(doc, y, [
          { value: r.metric,                          x: M + 5   },
          { value: r.current.toLocaleString(),        x: M + 90  },
          { value: r.prev.toLocaleString(),           x: M + 130 },
          { value: `${sign}${delta}`,                 x: M + 168, color: deltaColor },
        ], i % 2 === 0);
      }
      y += 4;
    } else if (currentReport) {
      // No prior report found in the lookback window — make this explicit so
      // the user doesn't think the section is silently broken.
      y = maybeNewPage(doc, y, 30, customerLogo, customerName, reportDate);
      y = sectionTitle(doc, 'Week-over-Week Summary', y, C.purple);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text(
        'No prior report was found within the lookback window. Upload a second report to enable week-over-week comparison.',
        M + 4, y + 2, { maxWidth: CW - 8 }
      );
      y += 12;
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