/**
 * generateOntBirthCertificate
 *
 * Generates a professional "birth certificate" PDF for up to 32 ONTs.
 * Each page contains one certificate showing:
 *   - ONT's first-ever appearance on any saved report ("birth date")
 *   - Subscriber information, device identity, network location, optical readings
 *   - Fill-in lines for actual install date and supervisor sign-off
 *
 * Payload: { serialNumbers: string[], timezone?: string }
 * Returns: PDF binary (application/pdf)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ── Text sanitizer (Latin-1 only — jsPDF default fonts don't ship Unicode) ───
function s(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00B0/g, 'deg')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x00-\xFF]/g, '');
}

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  navy:      [10,  25,  60],
  navyMid:   [18,  40,  90],
  accent:    [37,  99, 235],
  gold:      [161, 115,   8],
  goldLight: [254, 249, 215],
  amber:     [180, 100,   0],
  muted:     [100, 116, 139],
  lightBg:   [248, 250, 252],
  sectionBg: [241, 245, 249],
  border:    [203, 213, 225],
  borderDark:[148, 163, 184],
  white:     [255, 255, 255],
  dark:      [15,  23,  42],
  subText:   [148, 163, 184],
};

const PAGE_W = 210;
const PAGE_H = 297;
const M     = 14;
const CW    = PAGE_W - M * 2;

const DEFAULT_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png';

// ── Logo fetch ────────────────────────────────────────────────────────────────
async function fetchLogoAsBase64(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    const ct = r.headers.get('content-type') || 'image/png';
    return `data:${ct};base64,${btoa(bin)}`;
  } catch (_) { return null; }
}

// ── Logo plate ────────────────────────────────────────────────────────────────
function drawLogoOnPlate(doc, logoDataUrl, x, y, plateW, plateH) {
  doc.setFillColor(...C.white);
  doc.roundedRect(x, y, plateW, plateH, 1.5, 1.5, 'F');
  if (!logoDataUrl) return;
  try {
    const props = doc.getImageProperties(logoDataUrl);
    const padX = 1.5, padY = 1.5;
    const maxW = plateW - padX * 2, maxH = plateH - padY * 2;
    const ratio = props.width / props.height;
    let dw = maxW, dh = dw / ratio;
    if (dh > maxH) { dh = maxH; dw = dh * ratio; }
    doc.addImage(logoDataUrl, props.fileType || 'PNG', x + (plateW - dw) / 2, y + (plateH - dh) / 2, dw, dh);
  } catch (_) {}
}

// ── Page header ───────────────────────────────────────────────────────────────
function drawHeader(doc, customerLogo, customerName) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, 24, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 24, PAGE_W, 1.2, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, 25.2, PAGE_W, 0.5, 'F');

  let cx = M;
  if (customerLogo) {
    drawLogoOnPlate(doc, customerLogo, cx, 3, 20, 18);
    cx += 24;
  }

  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(s(customerName || 'FIBER ORACLE'), cx, 12);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text('Powered by FiberOracle.com', cx, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.gold);
  doc.text('ONT INSTALLATION RECORD', PAGE_W - M, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.subText);
  doc.text('Birth Certificate Series', PAGE_W - M, 17, { align: 'right' });
}

// ── Page footer ───────────────────────────────────────────────────────────────
function drawFooter(doc, pageNum, totalPages, generatedDateTime, customerName) {
  const fy = PAGE_H - 12;
  doc.setFillColor(...C.navy);
  doc.rect(0, fy, PAGE_W, 12, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, fy, PAGE_W, 0.6, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.subText);
  doc.text(s(customerName || 'FiberOracle.com'), M, fy + 7.5);
  doc.text('Generated: ' + s(generatedDateTime), PAGE_W / 2, fy + 7.5, { align: 'center' });
  doc.text(pageNum + ' / ' + totalPages, PAGE_W - M, fy + 7.5, { align: 'right' });
}

// ── Section header band ───────────────────────────────────────────────────────
function sectionHeader(doc, label, y) {
  doc.setFillColor(...C.sectionBg);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.15);
  doc.rect(M, y, CW, 6.5, 'FD');
  doc.setFillColor(...C.navyMid);
  doc.rect(M, y, 2.5, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.navyMid);
  doc.text(s(label).toUpperCase(), M + 5.5, y + 4.6);
  return y + 9;
}

// ── Label + value pair ────────────────────────────────────────────────────────
function labelValue(doc, label, value, x, y, maxWidth) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(s(label), x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const hasVal = value !== null && value !== undefined && s(value).trim() !== '';
  doc.setTextColor(...(hasVal ? C.dark : C.subText));
  doc.text(hasVal ? s(value) : '\u2014', x, y + 4.8, { maxWidth: maxWidth - 2 });
}

// ── Optical metric tile ───────────────────────────────────────────────────────
function metricTile(doc, label, value, unit, x, y, w) {
  const v = parseFloat(value);
  const hasVal = !isNaN(v) && value !== null && value !== undefined;

  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, 15, 1.5, 1.5, 'FD');
  doc.setFillColor(...C.navyMid);
  doc.roundedRect(x, y, w, 2, 1, 0, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...(hasVal ? C.dark : C.subText));
  doc.text(hasVal ? v.toFixed(2) : 'N/A', x + w / 2, y + 9.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);
  doc.text(s(unit) + '  \u2022  ' + s(label), x + w / 2, y + 13, { align: 'center' });
}

// ── Horizontal rule ───────────────────────────────────────────────────────────
function divider(doc, y) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.15);
  doc.line(M + 1, y, PAGE_W - M - 1, y);
  return y + 2;
}

// ── Fill-in line ──────────────────────────────────────────────────────────────
function fillLine(doc, label, x, y, lineW) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(s(label), x, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.35);
  doc.line(x, y + 7, x + lineW, y + 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CERTIFICATE BUILDER — one page per ONT
// ─────────────────────────────────────────────────────────────────────────────
function drawCertificate(doc, serial, record, sub, customerName, customerLogo, generatedDateTime, tz, pageNum, totalPages) {
  drawHeader(doc, customerLogo, customerName);
  drawFooter(doc, pageNum, totalPages, generatedDateTime, customerName);

  // ── Title ────────────────────────────────────────────────────────────────
  let y = 29;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.navy);
  doc.text('CERTIFICATE OF INSTALLATION RECORD', PAGE_W / 2, y + 5, { align: 'center' });

  // Gold ornamental rule
  y += 13;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.7);
  doc.line(M + 8, y, PAGE_W / 2 - 8, y);
  doc.line(PAGE_W / 2 + 8, y, PAGE_W - M - 8, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.gold);
  doc.text('*', PAGE_W / 2, y + 1.5, { align: 'center' });

  y += 5;
  const year = new Date().getFullYear();
  const safeSN = String(serial).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6).padStart(6, '0');
  const certNo = 'FO-' + year + '-' + safeSN;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Document No. ' + certNo, PAGE_W / 2, y, { align: 'center' });
  y += 5;

  // ── Birth date display box ────────────────────────────────────────────────
  const birthDate = record && record.report_date
    ? new Date(record.report_date).toLocaleDateString('en-US', {
        timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const bdBoxH = 17;
  doc.setFillColor(...C.goldLight);
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.roundedRect(M + 28, y, CW - 56, bdBoxH, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.amber);
  doc.text('FIRST OBSERVED ON NETWORK', PAGE_W / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(birthDate ? 12 : 9);
  doc.setTextColor(...C.navy);
  doc.text(s(birthDate || 'Not Yet Recorded in Database'), PAGE_W / 2, y + 13, { align: 'center' });
  y += bdBoxH + 4;

  // ── Outer certificate border box ──────────────────────────────────────────
  const boxTop = y;
  const boxBot = PAGE_H - 12 - 4;
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.9);
  doc.roundedRect(M, boxTop, CW, boxBot - boxTop, 2, 2, 'S');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(M + 1, boxTop + 1, CW - 2, boxBot - boxTop - 2, 1.5, 1.5, 'S');

  y += 4;

  // ── SUBSCRIBER INFORMATION ────────────────────────────────────────────────
  y = sectionHeader(doc, 'Subscriber Information', y);
  const hw = (CW - 8) / 2;

  const subName  = s(sub && sub.SubscriberName ? sub.SubscriberName : (record && record.subscriber_account_name ? record.subscriber_account_name : ''));
  const acctName = s(sub && sub.AccountName    ? sub.AccountName    : (record && record.subscriber_account_name ? record.subscriber_account_name : ''));
  const addrParts = [];
  if (sub && sub.Address) addrParts.push(sub.Address);
  const cityState = [sub && sub.City, sub && sub.State, sub && sub.Zip].filter(Boolean).join(', ');
  if (cityState) addrParts.push(cityState);
  const fullAddr = addrParts.length ? addrParts.join(', ') : s(record && record.subscriber_address ? record.subscriber_address : '');

  labelValue(doc, 'Subscriber Name', subName, M + 4, y, hw);
  labelValue(doc, 'Account Name', acctName, M + 4 + hw + 4, y, hw);
  y += 10;
  labelValue(doc, 'Service Address', fullAddr, M + 4, y, CW - 8);
  y += 10;
  y = divider(doc, y);

  // ── DEVICE IDENTIFICATION ─────────────────────────────────────────────────
  y = sectionHeader(doc, 'Device Identification', y);
  labelValue(doc, 'Serial Number (FSAN)', s(record && record.serial_number ? record.serial_number : serial), M + 4, y, hw);
  labelValue(doc, 'ONT ID', s(record && record.ont_id ? record.ont_id : ''), M + 4 + hw + 4, y, hw);
  y += 10;
  labelValue(doc, 'ONT Model', s(record && record.model ? record.model : (sub && sub.ONTModel ? sub.ONTModel : '')), M + 4, y, hw);
  labelValue(doc, 'Technology Type', s(record && record.technology_type ? record.technology_type : ''), M + 4 + hw + 4, y, hw);
  y += 10;
  y = divider(doc, y);

  // ── NETWORK LOCATION ──────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Network Location', y);
  labelValue(doc, 'OLT / Chassis', s(record && record.olt_name ? record.olt_name : ''), M + 4, y, hw);
  labelValue(doc, 'Port (Shelf / Slot / Port)', s(record && record.shelf_slot_port ? record.shelf_slot_port : ''), M + 4 + hw + 4, y, hw);
  y += 10;
  labelValue(doc, 'LCP', s(record && record.lcp_number ? record.lcp_number : ''), M + 4, y, hw);
  labelValue(doc, 'Splitter', s(record && record.splitter_number ? record.splitter_number : ''), M + 4 + hw + 4, y, hw);
  y += 10;
  y = divider(doc, y);

  // ── OPTICAL READINGS AT FIRST REPORT ─────────────────────────────────────
  y = sectionHeader(doc, 'Optical Readings at First Report', y);
  const tileGap = 3;
  const tileW   = (CW - 8 - tileGap * 2) / 3;
  metricTile(doc, 'ONT Rx Power', record && record.ont_rx_power, 'dBm', M + 4, y, tileW);
  metricTile(doc, 'OLT Rx Power', record && record.olt_rx_power, 'dBm', M + 4 + tileW + tileGap, y, tileW);
  metricTile(doc, 'ONT Tx Power', record && record.ont_tx_power, 'dBm', M + 4 + (tileW + tileGap) * 2, y, tileW);
  y += 17;
  y = divider(doc, y);

  // ── INSTALLATION DATES ────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Installation Dates', y);

  // Date first seen — pre-filled
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Date First Seen on Report:', M + 4, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...(birthDate ? C.dark : C.subText));
  doc.text(s(birthDate || 'Not yet recorded'), M + 58, y);
  y += 9;

  // Actual install date — hand-fill
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Actual Date of Installation:', M + 4, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.35);
  doc.line(M + 58, y, M + 58 + 88, y);
  y += 7;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(...C.subText);
  doc.text('(Fill in actual installation date if different from first report date above)', M + 4, y);
  y += 7;
  y = divider(doc, y);

  // ── AUTHORIZATION & SIGN-OFF ──────────────────────────────────────────────
  y = sectionHeader(doc, 'Authorization & Sign-Off', y);

  // Technician row
  fillLine(doc, 'Technician / Installer:', M + 4, y, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Date:', M + 122, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.35);
  doc.line(M + 133, y + 7, M + 133 + 40, y + 7);
  y += 12;

  // Supervisor row
  fillLine(doc, 'Supervisor Signature:', M + 4, y, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Date:', M + 122, y);
  doc.line(M + 133, y + 7, M + 133 + 40, y + 7);
  y += 12;

  // Print name
  fillLine(doc, 'Print Supervisor Name:', M + 4, y, 140);
  y += 12;

  // Notes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('Notes:', M + 4, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.35);
  doc.line(M + 18, y, M + 18 + 158, y);
  y += 8;
  doc.line(M + 4, y, M + 4 + 172, y);
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const serials = (Array.isArray(body.serialNumbers) ? body.serialNumbers : []).slice(0, 32);
    if (!serials.length) {
      return Response.json({ error: 'serialNumbers must be a non-empty array (max 32)' }, { status: 400 });
    }

    const tz = body.timezone || 'America/New_York';

    // ── Customer branding ─────────────────────────────────────────────────────
    let customerName = null, customerLogoUrl = null;
    if (user.preferences) {
      if (user.preferences.companyName) customerName = s(user.preferences.companyName);
      if (user.preferences.logoUrl) customerLogoUrl = user.preferences.logoUrl;
    }
    if (customerName === 'Fiber Oracle') customerName = null;
    const customerLogo = await fetchLogoAsBase64(customerLogoUrl || DEFAULT_LOGO);

    // ── Fetch birth records in parallel ───────────────────────────────────────
    // Sorting ascending (no '-' prefix) by report_date and limit 1 gives the
    // very first report record for this serial — the "birth" reading.
    const birthData = await Promise.all(
      serials.map(async (serial) => {
        const [records, subs] = await Promise.all([
          base44.asServiceRole.entities.ONTPerformanceRecord.filter(
            { serial_number: serial }, 'report_date', 1
          ),
          base44.asServiceRole.entities.SubscriberRecord.filter(
            { ONTSerialNo: serial }, 'created_date', 1
          ),
        ]);
        return { serial, record: records[0] || null, sub: subs[0] || null };
      })
    );

    const generatedDateTime = new Date().toLocaleString('en-US', { timeZone: tz });
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    birthData.forEach(({ serial, record, sub }, idx) => {
      if (idx > 0) doc.addPage();
      drawCertificate(
        doc, serial, record, sub,
        customerName, customerLogo, generatedDateTime, tz,
        idx + 1, birthData.length
      );
    });

    const date = new Date().toISOString().slice(0, 10);
    const filename = 'FiberOracle-ONT-Certificates-' + date + '.pdf';

    return new Response(new Uint8Array(doc.output('arraybuffer')), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[generateOntBirthCertificate] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});