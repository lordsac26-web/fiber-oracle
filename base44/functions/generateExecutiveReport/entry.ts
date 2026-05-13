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
function classifyTech(record) {
  return (
    detectTechType(record.model) ||
    detectTechType(record.subscriber_model) ||
    detectComboTech(record.shelf_slot_port)
  );
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
// Larger branded header — fits logo + name + description block
const HDR_H = 34, FTR_H = 12;
const BODY_TOP = HDR_H + 6, BODY_BOT = PAGE_H - FTR_H - 4;

// ─── Branded Header (page 1 only — full size) ──────────────────────────────────
function drawHeaderFull(doc, logo, customerName, generatedAtStr) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, HDR_H, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, HDR_H, PAGE_W, 1.5, 'F');

  // Logo on white plate
  let cx = M;
  if (logo) {
    doc.setFillColor(...C.white);
    doc.roundedRect(cx, 5, 24, 24, 2, 2, 'F');
    try {
      const props = doc.getImageProperties(logo);
      const ratio = props.width / props.height;
      let dW = 21, dH = dW / ratio;
      if (dH > 21) { dH = 21; dW = dH * ratio; }
      doc.addImage(logo, props.fileType || 'PNG', cx + (24 - dW) / 2, 5 + (24 - dH) / 2, dW, dH);
    } catch { /* logo not critical */ }
    cx += 30;
  }

  // Company name + report label + generation timestamp
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(s(customerName || 'FIBER ORACLE'), cx, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.accent);
  doc.text('COMPREHENSIVE SYSTEM REPORT', cx, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.subText);
  doc.text(s(`Generated ${generatedAtStr}`), cx, 25.5);
  doc.text(
    'A detailed system report intended for weekly/monthly management reviews — KPIs, per-OLT health, saturation, model inventory, and historical deltas.',
    cx, 30,
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
function aggregateRecords(recs, eeroHomeKeys, resolveAccount) {
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
    const tech = classifyTech(r);
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
    const subByComposite = new Map();
    const subBySerial    = new Map();
    const subByAccount   = new Map();
    try {
      const activeSubUploads = await base44.asServiceRole.entities.SubscriberUploadMeta
        .filter({ status: 'active' }, '-created_date', 1);
      const subUploadId = activeSubUploads[0]?.id;
      const subFilter = subUploadId ? { upload_id: subUploadId } : {};
      const subs = await fetchAllFiltered('SubscriberRecord', subFilter, 'id');

      for (const sub of subs) {
        const account = (sub.AccountName || '').trim();
        if (sub.DeviceName && sub.LinkedPon && sub.OntID && account) {
          const oltName = sub.DeviceName.trim().toUpperCase();
          const port    = normalizePortPath(sub.LinkedPon);
          const ontId   = String(sub.OntID).trim().toUpperCase();
          subByComposite.set(`${oltName}|${port}|${ontId}`, account);
          subByComposite.set(`|${port}|${ontId}`, account);
        }
        const ns = normalizeSerial(sub.ONTSerialNo);
        if (ns && account && !subBySerial.has(ns)) subBySerial.set(ns, account);

        const acctKey = normalizeHomeId(account) || account;
        if (acctKey && !subByAccount.has(acctKey)) {
          subByAccount.set(acctKey, {
            city: (sub.City || '').trim() || 'Unknown',
            zip:  (sub.Zip || '').trim().match(/^\d{5}/)?.[0] || 'Unknown',
          });
        }
      }
      console.log(`[generateExecutiveReport] Subscriber lookup — rows=${subs.length}`);
    } catch (err) {
      console.log(`[generateExecutiveReport] SubscriberRecord lookup failed (non-fatal): ${err.message}`);
    }

    function resolveLiveAccount(rec) {
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
      return rec.subscriber_account_name || null;
    }

    // ── Aggregate current + historical ──────────────────────────────────────
    const currentAgg = aggregateRecords(currentRecs,  eeroHomeKeys, resolveLiveAccount);
    const week1Agg   = aggregateRecords(week1RecsRaw, eeroHomeKeys, resolveLiveAccount);
    const month1Agg  = aggregateRecords(month1RecsRaw, eeroHomeKeys, resolveLiveAccount);

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

    // ── City + Zip saturation ───────────────────────────────────────────────
    const cityMap = new Map();
    const zipMap  = new Map();
    let unknownZipCount = 0;
    for (const r of currentRecs) {
      let city = 'Unknown';
      let zip  = 'Unknown';
      const liveAccount = resolveLiveAccount(r);
      const acctKey = normalizeHomeId(liveAccount);
      const subInfo = acctKey ? subByAccount.get(acctKey) : null;
      if (subInfo) {
        city = subInfo.city;
        zip  = subInfo.zip;
      } else {
        const parsed = parseAddress(r.subscriber_address);
        city = parsed.city;
        zip  = parsed.zip;
      }
      if (!cityMap.has(city)) cityMap.set(city, { total: 0, critical: 0, warning: 0 });
      const c = cityMap.get(city); c.total++;
      if (r.status === 'critical') c.critical++;
      if (r.status === 'warning')  c.warning++;

      if (zip === 'Unknown') { unknownZipCount++; }
      else {
        if (!zipMap.has(zip)) zipMap.set(zip, { total: 0, critical: 0, warning: 0 });
        const z = zipMap.get(zip); z.total++;
        if (r.status === 'critical') z.critical++;
        if (r.status === 'warning')  z.warning++;
      }
    }
    const cityRows = [...cityMap.entries()]
      .map(([city, v]) => ({ city, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
    const zipRows = [...zipMap.entries()]
      .map(([zip, v]) => ({ zip, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ── ONT Model Summary ───────────────────────────────────────────────────
    const ontModelCounts = new Map();
    for (const r of currentRecs) {
      const m = (r.model || r.subscriber_model || 'Unknown').trim() || 'Unknown';
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

    // ── PDF BUILD ────────────────────────────────────────────────────────────
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    // ─── Page 1: Branded header + KPI strip + OLT breakdown ───────────────
    drawHeaderFull(doc, customerLogo, customerName, generatedAtStr);
    let y = BODY_TOP;

    // KPI strip — 2 rows of 4
    y = sectionTitle(doc, 'Network Health Overview', y, C.navy);
    const kpiInset = 3;
    const tileGap = 3;
    const tileW = (CW - tileGap * 3 - kpiInset * 2) / 4;
    const tileH = 22;

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
    y += 2 * tileH + tileGap + 5;

    // OLT Breakdown
    if (oltRows.length > 0) {
      y = maybeNewPage(doc, y, 50, customerName);
      y = sectionTitle(doc, `OLT Breakdown  (${oltRows.length} chassis)`, y, C.indigo);
      const cols = [
        { label: 'OLT / Chassis', x: M + 5  },
        { label: 'ONTs',          x: M + 60 },
        { label: 'Critical',      x: M + 82 },
        { label: 'Warning',       x: M + 106 },
        { label: 'Offline',       x: M + 130 },
        { label: 'Avg Rx',        x: M + 152 },
        { label: 'Health %',      x: M + 172 },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < oltRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = oltRows[i];
        const hpct = parseFloat(r.healthPct);
        const hColor = hpct >= 90 ? C.green : hpct >= 70 ? C.amber : C.red;
        y = tableRow(doc, y, [
          { value: r.olt,                x: M + 5,   maxW: 52 },
          { value: String(r.total),      x: M + 60  },
          { value: String(r.critical),   x: M + 82,  color: r.critical > 0 ? C.red : C.dark },
          { value: String(r.warning),    x: M + 106, color: r.warning > 0 ? C.amber : C.dark },
          { value: String(r.offline),    x: M + 130, color: r.offline > 0 ? C.slate : C.dark },
          { value: r.avgRx,              x: M + 152 },
          { value: `${r.healthPct}%`,    x: M + 172, color: hColor },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── City Saturation ─────────────────────────────────────────────────
    y = maybeNewPage(doc, y, 60, customerName);
    y = sectionTitle(doc, `City Saturation  (Top ${cityRows.length})`, y, C.accent);
    if (cityRows.length === 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text('No subscriber city data available.', M + 4, y + 2);
      y += 8;
    } else {
      const cols = [
        { label: 'City',         x: M + 5   },
        { label: 'Total ONTs',   x: M + 80  },
        { label: 'Critical',     x: M + 115 },
        { label: 'Warning',      x: M + 140 },
        { label: '% of Network', x: M + 165 },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < cityRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = cityRows[i];
        const pct = currentAgg.total > 0 ? ((r.total / currentAgg.total) * 100).toFixed(1) : '0.0';
        y = tableRow(doc, y, [
          { value: r.city,                 x: M + 5,   maxW: 70 },
          { value: r.total.toLocaleString(), x: M + 80  },
          { value: String(r.critical),     x: M + 115, color: r.critical > 0 ? C.red : C.dark },
          { value: String(r.warning),      x: M + 140, color: r.warning > 0 ? C.amber : C.dark },
          { value: `${pct}%`,              x: M + 165 },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Zip Saturation ──────────────────────────────────────────────────
    y = maybeNewPage(doc, y, 60, customerName);
    y = sectionTitle(doc, `Zip Saturation  (Top ${zipRows.length})`, y, C.purple);
    if (zipRows.length === 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text('No subscriber zip data available.', M + 4, y + 2);
      y += 8;
    } else {
      const cols = [
        { label: 'Zip',          x: M + 5   },
        { label: 'Total ONTs',   x: M + 60  },
        { label: 'Critical',     x: M + 100 },
        { label: 'Warning',      x: M + 130 },
        { label: '% of Network', x: M + 158 },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < zipRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = zipRows[i];
        const pct = currentAgg.total > 0 ? ((r.total / currentAgg.total) * 100).toFixed(1) : '0.0';
        y = tableRow(doc, y, [
          { value: r.zip,                  x: M + 5   },
          { value: r.total.toLocaleString(), x: M + 60  },
          { value: String(r.critical),     x: M + 100, color: r.critical > 0 ? C.red : C.dark },
          { value: String(r.warning),      x: M + 130, color: r.warning > 0 ? C.amber : C.dark },
          { value: `${pct}%`,              x: M + 158 },
        ], i % 2 === 0);
      }
      if (unknownZipCount > 0) {
        y += 1;
        doc.setFontSize(6.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
        const pctUnknown = currentAgg.total > 0 ? ((unknownZipCount / currentAgg.total) * 100).toFixed(1) : '0.0';
        doc.text(
          `Note: ${unknownZipCount.toLocaleString()} ONTs (${pctUnknown}%) have no parseable zip and are excluded.`,
          M + 4, y + 4, { maxWidth: CW - 8 }
        );
        y += 6;
      }
      y += 4;
    }

    // ─── ONT Model Summary ───────────────────────────────────────────────
    y = maybeNewPage(doc, y, 60, customerName);
    y = sectionTitle(doc, `ONT Model Summary  (${ontModelRows.length} models)`, y, C.teal);
    if (ontModelRows.length === 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text('No ONT model data available.', M + 4, y + 2);
      y += 8;
    } else {
      // Two columns: table on left, bar chart on right
      const tableW = CW * 0.55;
      const chartX = M + tableW + 4;
      const chartW = CW - tableW - 4;
      const startY = y;

      // Table (left)
      const cols = [
        { label: 'Model',        x: M + 5   },
        { label: 'Count',        x: M + tableW - 30 },
        { label: '% of Network', x: M + tableW - 10 },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < Math.min(ontModelRows.length, 15); i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = ontModelRows[i];
        const pct = currentAgg.total > 0 ? ((r.count / currentAgg.total) * 100).toFixed(1) : '0.0';
        y = tableRow(doc, y, [
          { value: r.model, x: M + 5, maxW: tableW - 40 },
          { value: r.count.toLocaleString(), x: M + tableW - 30 },
          { value: `${pct}%`, x: M + tableW - 10 },
        ], i % 2 === 0);
      }

      // Chart (right) — top 8 models for visual readability
      drawHorizBarChart(doc, chartX, startY + 8, chartW, Math.min(50, y - startY - 8),
        ontModelRows.slice(0, 8).map(r => ({ label: r.model, value: r.count })),
        C.teal);
      y += 4;
    }

    // ─── Eero Model Summary ──────────────────────────────────────────────
    if (eeroModelRows.length > 0) {
      y = maybeNewPage(doc, y, 50, customerName);
      y = sectionTitle(doc, `Eero Model Summary  (${eeroModelRows.length} models)`, y, C.green);
      const cols = [
        { label: 'Eero Model', x: M + 5   },
        { label: 'Count',      x: M + 100 },
        { label: '% of Eeros', x: M + 140 },
      ];
      y = tableHeader(doc, y, cols);
      const totalEero = currentAgg.eeroCount || 1;
      for (let i = 0; i < eeroModelRows.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = eeroModelRows[i];
        const pct = ((r.count / totalEero) * 100).toFixed(1);
        y = tableRow(doc, y, [
          { value: r.model, x: M + 5,   maxW: 90 },
          { value: r.count.toLocaleString(), x: M + 100 },
          { value: `${pct}%`, x: M + 140 },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Top 20 Critical ONTs ────────────────────────────────────────────
    if (topCritical.length > 0) {
      y = maybeNewPage(doc, y, 60, customerName);
      y = sectionTitle(doc, `Top ${topCritical.length} Critical ONTs`, y, C.red);
      const cols = [
        { label: 'OLT',      x: M + 5   },
        { label: 'Port',     x: M + 50  },
        { label: 'ONT ID',   x: M + 88  },
        { label: 'Serial',   x: M + 105 },
        { label: 'ONT Rx',   x: M + 142 },
        { label: 'US BIP',   x: M + 158 },
        { label: 'DS BIP',   x: M + 175 },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < topCritical.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const r = topCritical[i];
        y = tableRow(doc, y, [
          { value: r.olt_name || '',     x: M + 5,   maxW: 42 },
          { value: r.shelf_slot_port || '', x: M + 50, maxW: 35 },
          { value: String(r.ont_id || ''), x: M + 88 },
          { value: r.serial_number || '', x: M + 105, maxW: 35 },
          { value: r.ont_rx_power != null ? String(r.ont_rx_power) : '—', x: M + 142, color: C.red },
          { value: String(r.us_bip_errors || 0), x: M + 158 },
          { value: String(r.ds_bip_errors || 0), x: M + 175 },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Top 20 OLT Ports by Corrected FEC ───────────────────────────────
    if (topFecPorts.length > 0) {
      y = maybeNewPage(doc, y, 60, customerName);
      y = sectionTitle(doc, `Top ${topFecPorts.length} OLT Ports — Corrected FEC`, y, C.amber);
      const cols = [
        { label: 'OLT',                   x: M + 5   },
        { label: 'Port',                  x: M + 70  },
        { label: 'Total Corrected FEC',   x: M + 120 },
        { label: 'ONTs on Port',          x: M + 165 },
      ];
      y = tableHeader(doc, y, cols);
      for (let i = 0; i < topFecPorts.length; i++) {
        y = maybeNewPage(doc, y, 8, customerName);
        const p = topFecPorts[i];
        y = tableRow(doc, y, [
          { value: p.olt,                 x: M + 5,   maxW: 60 },
          { value: p.port,                x: M + 70,  maxW: 45 },
          { value: p.total.toLocaleString(), x: M + 120 },
          { value: String(p.ontCount),    x: M + 165 },
        ], i % 2 === 0);
      }
      y += 4;
    }

    // ─── Trend Deltas (Current vs ~7d vs ~30d) ──────────────────────────
    y = maybeNewPage(doc, y, 80, customerName);
    y = sectionTitle(doc, 'Trend Comparison', y, C.purple);

    const curLabel   = fmtDate(currentReport.upload_date);
    const weekLabel  = week1Report  ? fmtDate(week1Report.upload_date)  : 'N/A';
    const monthLabel = month1Report ? fmtDate(month1Report.upload_date) : 'N/A';

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text(
      `Current report: ${curLabel}    |    ~7 days ago: ${weekLabel}    |    ~30 days ago: ${monthLabel}`,
      M + 4, y - 1, { maxWidth: CW - 8 }
    );
    y += 5;

    if (!week1Report && !month1Report) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...C.muted);
      doc.text(
        'No prior reports found in the database. Trend comparison will populate as more reports are uploaded.',
        M + 4, y + 2, { maxWidth: CW - 8 }
      );
      y += 12;
    } else {
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
        { label: 'Metric',      x: M + 5   },
        { label: curLabel,      x: M + 60  },
        { label: weekLabel,     x: M + 88  },
        { label: 'Δ 7d',        x: M + 116 },
        { label: monthLabel,    x: M + 140 },
        { label: 'Δ 30d',       x: M + 168 },
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
          { value: r.metric,                      x: M + 5   },
          { value: r.cur.toLocaleString(),        x: M + 60  },
          { value: week1Report ? r.w.toLocaleString() : '—', x: M + 88  },
          { value: fmtDelta(dw),                  x: M + 116, color: deltaColor(dw, r.good) },
          { value: month1Report ? r.m.toLocaleString() : '—', x: M + 140 },
          { value: fmtDelta(dm),                  x: M + 168, color: deltaColor(dm, r.good) },
        ], i % 2 === 0);
      }
      y += 4;

      // Trend chart for Total / Critical / Warning across the three time points
      y = maybeNewPage(doc, y, 50, customerName);
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.dark);
      doc.text('Critical & Warning Trend (snapshot comparison)', M + 4, y);
      y += 4;
      // Build a tiny 3-point series for criticals and warnings
      const series = [
        { label: 'Critical',
          points: [
            { x: '30d', v: month1Report ? month1Agg.critical : null },
            { x: '7d',  v: week1Report  ? week1Agg.critical  : null },
            { x: 'Now', v: currentAgg.critical },
          ], color: C.red },
        { label: 'Warning',
          points: [
            { x: '30d', v: month1Report ? month1Agg.warning : null },
            { x: '7d',  v: week1Report  ? week1Agg.warning  : null },
            { x: 'Now', v: currentAgg.warning },
          ], color: C.amber },
      ];
      const chartY = y;
      const chartH = 36;
      const chartW = CW - 8;
      const chartX = M + 4;
      // Frame
      doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
      doc.rect(chartX, chartY, chartW, chartH);
      // Max value across both series
      const allVals = series.flatMap(s => s.points.map(p => p.v).filter(v => v !== null));
      const maxV = Math.max(...allVals, 1);
      // X positions for 3 snapshots
      const xs = [chartX + 12, chartX + chartW / 2, chartX + chartW - 12];
      const labels = ['~30d ago', '~7d ago', 'Now'];
      // Axis labels
      doc.setFontSize(6); doc.setTextColor(...C.muted);
      labels.forEach((lab, i) => doc.text(lab, xs[i], chartY + chartH + 4, { align: 'center' }));
      // Plot each series
      series.forEach((ser, sIdx) => {
        doc.setDrawColor(...ser.color); doc.setLineWidth(0.8);
        doc.setFillColor(...ser.color);
        let prev = null;
        ser.points.forEach((p, i) => {
          if (p.v === null) { prev = null; return; }
          const xx = xs[i];
          const yy = chartY + chartH - 4 - (p.v / maxV) * (chartH - 8);
          // Point
          doc.circle(xx, yy, 1.2, 'F');
          // Value label
          doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ser.color);
          doc.text(String(p.v), xx + 2.5, yy + 1);
          if (prev) doc.line(prev.x, prev.y, xx, yy);
          prev = { x: xx, y: yy };
        });
        // Legend
        doc.setFillColor(...ser.color);
        doc.rect(chartX + 4 + sIdx * 30, chartY + 2, 3, 3, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...C.dark);
        doc.text(ser.label, chartX + 8 + sIdx * 30, chartY + 4.5);
      });
      y = chartY + chartH + 8;
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
        'Content-Disposition': `attachment; filename=FiberOracle-System-Report-${dateStr}.pdf`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[generateExecutiveReport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});