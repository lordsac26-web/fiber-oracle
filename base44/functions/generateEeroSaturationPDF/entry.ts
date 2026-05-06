/**
 * generateEeroSaturationPDF
 *
 * Generates a branded PDF showing eero saturation across the network:
 *   1. Title page + KPI strip (total ONTs, with eero, % overall saturation,
 *      chassis count, ports count).
 *   2. "Saturation per Chassis/Device" — horizontal bar chart, sorted by
 *      saturation %.
 *   3. "Saturation per Port" — table grouped by chassis, sorted by
 *      saturation %, color-coded.
 *
 * Payload: { reportData: { onts: [...] }, reportName? }
 * Each ONT must have _oltName, _port, and (optionally) _eero attached client-
 * side BEFORE the call — we don't re-do enrichment server-side because the
 * frontend already has subscriber + eero lookups loaded.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ─── Sanitize text for jsPDF helvetica (Latin-1 only) ─────────────────────
function s(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2012\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u00B7\u2027]/g, '*')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x00-\xFF]/g, '');
}

// Logo fetch for branding
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

// ─── Saturation aggregation (mirrors components/ponpm/eeroExports.js) ─────
function computeSaturation(onts) {
  const chassisMap = new Map();
  const portMap    = new Map();

  for (const ont of onts || []) {
    const olt  = ont._oltName || ont.olt_name || 'Unknown';
    const port = ont._port    || ont.shelf_slot_port || 'Unknown';
    const hasEero = !!ont._eero;

    if (!chassisMap.has(olt)) chassisMap.set(olt, { total: 0, withEero: 0 });
    const c = chassisMap.get(olt);
    c.total++;
    if (hasEero) c.withEero++;

    const portKey = `${olt}|${port}`;
    if (!portMap.has(portKey)) portMap.set(portKey, { olt, port, total: 0, withEero: 0 });
    const p = portMap.get(portKey);
    p.total++;
    if (hasEero) p.withEero++;
  }

  const chassis = [...chassisMap.entries()]
    .map(([olt, v]) => ({ olt, total: v.total, withEero: v.withEero, saturation: v.total > 0 ? v.withEero / v.total : 0 }))
    .sort((a, b) => b.saturation - a.saturation || b.withEero - a.withEero);

  const ports = [...portMap.values()]
    .map(p => ({ ...p, saturation: p.total > 0 ? p.withEero / p.total : 0 }))
    .sort((a, b) => {
      const oltCmp = a.olt.localeCompare(b.olt, undefined, { numeric: true });
      if (oltCmp !== 0) return oltCmp;
      return b.saturation - a.saturation;
    });

  return { chassis, ports };
}

// Color picker by saturation level (RGB tuples)
function satColor(sat) {
  if (sat >= 0.75) return [16, 185, 129]; // emerald
  if (sat >= 0.50) return [59, 130, 246]; // blue
  if (sat >= 0.25) return [245, 158, 11]; // amber
  return [148, 163, 184]; // slate
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportData, reportName } = await req.json();
    if (!reportData?.onts) {
      return Response.json({ error: 'Missing reportData.onts' }, { status: 400 });
    }

    // Resolve customer branding from user.preferences (Settings → Branding)
    let customerName = null;
    let customerLogoUrl = null;
    if (user?.preferences) {
      if (user.preferences.companyName) customerName    = s(user.preferences.companyName);
      if (user.preferences.logoUrl)     customerLogoUrl = user.preferences.logoUrl;
    }
    if (customerName === 'Fiber Oracle') customerName = null;
    let customerLogo = customerLogoUrl ? await fetchLogoAsBase64(customerLogoUrl) : null;
    if (!customerLogo) {
      customerLogo = await fetchLogoAsBase64(
        'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png'
      );
    }

    // ─── Build aggregations ─────────────────────────────────────────────
    const { chassis, ports } = computeSaturation(reportData.onts);
    const totalOnts    = reportData.onts.length;
    const totalEero    = reportData.onts.filter(o => o._eero).length;
    const overallSat   = totalOnts > 0 ? (totalEero / totalOnts) : 0;

    // ─── PDF setup ──────────────────────────────────────────────────────
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 16;
    const CW = W - 2 * M;

    const COLORS = {
      navy:    [15, 23, 42],
      accent:  [16, 185, 129], // eero-emerald
      white:   [255, 255, 255],
      sub:     [180, 195, 220],
      slate:   [71, 85, 105],
      muted:   [100, 116, 139],
      light:   [241, 245, 249],
      dark:    [30, 41, 59],
      border:  [203, 213, 225],
    };

    // Header
    function drawHeader() {
      doc.setFillColor(...COLORS.navy);
      doc.rect(0, 0, W, 26, 'F');
      doc.setFillColor(...COLORS.accent);
      doc.rect(0, 26, W, 1.5, 'F');

      let cursorX = M;
      if (customerLogo) {
        // Logo on white plate so it's legible against navy
        const plateX = M, plateY = 4, plateW = 24, plateH = 18;
        doc.setFillColor(...COLORS.white);
        doc.roundedRect(plateX, plateY, plateW, plateH, 1.5, 1.5, 'F');
        try {
          const props = doc.getImageProperties(customerLogo);
          const ratio = props.width / props.height;
          const maxW = plateW - 3, maxH = plateH - 3;
          let dW = maxW, dH = dW / ratio;
          if (dH > maxH) { dH = maxH; dW = dH * ratio; }
          doc.addImage(customerLogo, props.fileType || 'PNG',
            plateX + (plateW - dW) / 2, plateY + (plateH - dH) / 2, dW, dH);
        } catch (_) {}
        cursorX = M + plateW + 4;
      }

      doc.setTextColor(...COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(s(customerName || 'FIBER ORACLE'), cursorX, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.sub);
      doc.text(customerName ? 'Powered by FiberOracle.com' : 'fiberoracle.com', cursorX, 18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.accent);
      doc.text('EERO SATURATION REPORT', W - M, 11, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.sub);
      doc.text(new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }),
        W - M, 17, { align: 'right' });
    }

    function drawFooter(pageNum, totalPages) {
      const fy = H - 10;
      doc.setFillColor(...COLORS.navy);
      doc.rect(0, fy, W, 10, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.sub);
      doc.text(s(customerName ? `${customerName}  |  FiberOracle.com` : 'fiberoracle.com'), M, fy + 6);
      doc.text(`Page ${pageNum} of ${totalPages}`, W / 2, fy + 6, { align: 'center' });
      doc.text('CONFIDENTIAL', W - M, fy + 6, { align: 'right' });
    }

    function sectionTitle(label, y, color) {
      doc.setFillColor(...(color || COLORS.accent));
      doc.roundedRect(M, y, CW, 7, 1, 1, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(s(label).toUpperCase(), M + 4, y + 4.8);
      return y + 11;
    }

    function kpiTile(x, y, w, h, value, label, accentColor) {
      doc.setFillColor(...COLORS.white);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 2, 2, 'FD');
      doc.setFillColor(...accentColor);
      doc.roundedRect(x, y, 2.5, h, 1, 0, 'F');
      doc.setTextColor(...accentColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(String(value), x + w / 2, y + h * 0.55, { align: 'center' });
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(s(label), x + w / 2, y + h - 2.5, { align: 'center' });
    }

    // ─── PAGE 1 ─────────────────────────────────────────────────────────
    drawHeader();
    let y = 34;

    // Title block
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('eero Saturation Overview', M, y + 4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(s(reportName || 'PON PM Analysis'), M, y + 10, { maxWidth: CW });
    doc.text(`Generated: ${new Date().toLocaleString()}`, M, y + 15);
    y += 22;

    // KPI strip
    y = sectionTitle('Network Snapshot', y, COLORS.navy);
    const kpis = [
      { value: totalOnts.toLocaleString(),  label: 'Total ONTs',           color: [59, 130, 246] },
      { value: totalEero.toLocaleString(),  label: 'ONTs with eero',       color: COLORS.accent  },
      { value: `${(overallSat * 100).toFixed(1)}%`, label: 'Overall saturation', color: [124, 58, 237] },
      { value: chassis.length.toLocaleString(), label: 'Chassis / OLTs',   color: [14, 165, 233] },
      { value: ports.length.toLocaleString(),   label: 'PON Ports',        color: [245, 158, 11] },
    ];
    const kw = (CW - 4 * 3) / 5;
    kpis.forEach((k, i) => {
      kpiTile(M + i * (kw + 3), y, kw, 22, k.value, k.label, k.color);
    });
    y += 28;

    // ─── Chassis saturation bar chart ────────────────────────────────────
    y = sectionTitle(`Saturation per Chassis / Device  (${chassis.length})`, y, COLORS.accent);

    if (chassis.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text('No chassis data available.', M + 4, y + 6);
      y += 12;
    } else {
      // Layout: label (left, 50mm) | bar (middle) | value text (right, 32mm)
      const labelW = 50;
      const valueW = 38;
      const barX   = M + labelW + 2;
      const barW   = CW - labelW - valueW - 4;
      const barH   = 5.5;
      const gap    = 2.5;

      chassis.forEach((c, i) => {
        // Page-break guard — leave room for footer
        if (y + barH + gap > H - 14) {
          drawFooter(doc.internal.getCurrentPageInfo().pageNumber, 0);
          doc.addPage();
          drawHeader();
          y = 34;
          y = sectionTitle('Saturation per Chassis / Device  (continued)', y, COLORS.accent);
        }

        // Label
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.dark);
        doc.text(s(c.olt), M, y + barH * 0.7, { maxWidth: labelW });

        // Track
        doc.setFillColor(...COLORS.light);
        doc.roundedRect(barX, y, barW, barH, 1, 1, 'F');

        // Filled bar
        const fillW = Math.max(0.5, c.saturation * barW);
        doc.setFillColor(...satColor(c.saturation));
        doc.roundedRect(barX, y, fillW, barH, 1, 1, 'F');

        // Value text
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.dark);
        const valStr = `${(c.saturation * 100).toFixed(1)}%  (${c.withEero}/${c.total})`;
        doc.text(valStr, M + CW, y + barH * 0.7, { align: 'right' });

        y += barH + gap;
      });
    }

    // ─── Per-port saturation table ───────────────────────────────────────
    if (y > H - 60) {
      doc.addPage();
      drawHeader();
      y = 34;
    } else {
      y += 4;
    }
    y = sectionTitle(`Saturation per Port  (${ports.length})`, y, [124, 58, 237]);

    if (ports.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.muted);
      doc.text('No port data available.', M + 4, y + 6);
    } else {
      // Table header
      doc.setFillColor(...COLORS.navy);
      doc.roundedRect(M, y, CW, 6.5, 1, 1, 'F');
      doc.setTextColor(...COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('OLT / Chassis',     M + 3,                    y + 4.5);
      doc.text('Port',               M + CW * 0.30,            y + 4.5);
      doc.text('Total ONTs',         M + CW * 0.50,            y + 4.5, { align: 'left' });
      doc.text('With eero',          M + CW * 0.65,            y + 4.5, { align: 'left' });
      doc.text('Saturation',         M + CW - 2,               y + 4.5, { align: 'right' });
      y += 8;

      ports.forEach((p, i) => {
        if (y + 5.5 > H - 14) {
          drawFooter(doc.internal.getCurrentPageInfo().pageNumber, 0);
          doc.addPage();
          drawHeader();
          y = 34;
          y = sectionTitle('Saturation per Port  (continued)', y, [124, 58, 237]);
          // re-draw header row
          doc.setFillColor(...COLORS.navy);
          doc.roundedRect(M, y, CW, 6.5, 1, 1, 'F');
          doc.setTextColor(...COLORS.white);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text('OLT / Chassis', M + 3,             y + 4.5);
          doc.text('Port',           M + CW * 0.30,    y + 4.5);
          doc.text('Total ONTs',     M + CW * 0.50,    y + 4.5);
          doc.text('With eero',      M + CW * 0.65,    y + 4.5);
          doc.text('Saturation',     M + CW - 2,       y + 4.5, { align: 'right' });
          y += 8;
        }

        // Zebra
        if (i % 2 === 0) {
          doc.setFillColor(...COLORS.light);
          doc.rect(M, y - 0.5, CW, 5.5, 'F');
        }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.dark);
        doc.text(s(p.olt),  M + 3,             y + 3.7, { maxWidth: CW * 0.27 });
        doc.text(s(p.port), M + CW * 0.30,     y + 3.7, { maxWidth: CW * 0.18 });
        doc.text(String(p.total),     M + CW * 0.50, y + 3.7);
        doc.text(String(p.withEero),  M + CW * 0.65, y + 3.7);

        // Saturation pill
        const pillW = 26;
        const pillX = M + CW - pillW;
        const pillY = y - 0.2;
        const [r, g, b] = satColor(p.saturation);
        doc.setFillColor(r, g, b);
        doc.roundedRect(pillX, pillY, pillW, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...COLORS.white);
        doc.text(`${(p.saturation * 100).toFixed(1)}%`, pillX + pillW / 2, pillY + 3.1, { align: 'center' });

        y += 5.5;
      });
    }

    // ─── Stamp footer on every page ──────────────────────────────────────
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    return new Response(new Uint8Array(doc.output('arraybuffer')), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=FiberOracle-Eero-Saturation-${new Date().toISOString().slice(0, 10)}.pdf`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[generateEeroSaturationPDF] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});