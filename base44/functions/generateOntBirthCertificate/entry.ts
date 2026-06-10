/**
 * generateOntBirthCertificate
 *
 * Generates a professional "birth certificate" PDF for up to 32 ONTs.
 * Each A4 page contains one certificate showing:
 *   - ONT's first-ever appearance on any saved report ("birth date")
 *   - Ambient temperature at install from WeatherHistory
 *   - Subscriber information, device identity, network location, optical readings
 *   - Error metrics grid, status, and fill-in sign-off section
 *
 * Payload: { serialNumbers: string[], timezone?: string }
 * Returns: PDF binary (application/pdf)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.1';

// ── Text sanitizer — Latin-1 safe, preserves degree symbol ───────────────────
function s(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00B0/g, '\u00B0')   // keep degree symbol — jsPDF Latin-1 supports it
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x00-\xFF]/g, '');
}

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  navy:      [12,  28,  70],
  navyMid:   [22,  48, 100],
  navyLight: [42,  82, 152],
  accent:    [37,  99, 235],
  gold:      [180, 130,   0],
  goldMid:   [214, 158,   0],
  goldLight: [255, 251, 230],
  goldBorder:[220, 170,  20],
  amber:     [160,  90,   0],
  green:     [22,  163,  74],
  orange:    [217, 119,   6],
  red:       [220,  38,  38],
  slate:     [100, 116, 139],
  slateLight:[148, 163, 184],
  lightBg:   [248, 250, 252],
  sectionBg: [241, 245, 249],
  border:    [210, 218, 228],
  borderDark:[160, 174, 192],
  white:     [255, 255, 255],
  dark:      [ 15,  23,  42],
  ink:       [ 30,  41,  59],
  teal:      [  6, 148, 162],
};

const PAGE_W = 210;
const PAGE_H = 297;
const M      = 13;   // page margin
const CW     = PAGE_W - M * 2;

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

// ── Logo on white plate ───────────────────────────────────────────────────────
function drawLogoOnPlate(doc, logoDataUrl, x, y, plateW, plateH) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.navyLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, plateW, plateH, 2, 2, 'FD');
  if (!logoDataUrl) return;
  try {
    const props = doc.getImageProperties(logoDataUrl);
    const pad = 2;
    const maxW = plateW - pad * 2, maxH = plateH - pad * 2;
    const ratio = props.width / props.height;
    let dw = maxW, dh = dw / ratio;
    if (dh > maxH) { dh = maxH; dw = dh * ratio; }
    doc.addImage(logoDataUrl, props.fileType || 'PNG', x + (plateW - dw) / 2, y + (plateH - dh) / 2, dw, dh);
  } catch (_) {}
}

// ── Page header ───────────────────────────────────────────────────────────────
function drawHeader(doc, customerLogo, customerName) {
  // Navy bar
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PAGE_W, 26, 'F');
  // Gold accent stripe
  doc.setFillColor(...C.goldMid);
  doc.rect(0, 26, PAGE_W, 1.5, 'F');
  // Thin accent line
  doc.setFillColor(...C.accent);
  doc.rect(0, 27.5, PAGE_W, 0.4, 'F');

  let cx = M;
  if (customerLogo) {
    drawLogoOnPlate(doc, customerLogo, cx, 3.5, 22, 19);
    cx += 27;
  }
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(s(customerName || 'FIBER ORACLE'), cx, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slateLight);
  doc.text('Powered by FiberOracle.com', cx, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.goldMid);
  doc.text('ONT INSTALLATION RECORD', PAGE_W - M, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...C.slateLight);
  doc.text('Birth Certificate Series', PAGE_W - M, 18, { align: 'right' });
}

// ── Page footer ───────────────────────────────────────────────────────────────
function drawFooter(doc, pageNum, totalPages, generatedDateTime, customerName) {
  const fy = PAGE_H - 11;
  doc.setFillColor(...C.navy);
  doc.rect(0, fy, PAGE_W, 11, 'F');
  doc.setFillColor(...C.goldMid);
  doc.rect(0, fy, PAGE_W, 0.8, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.slateLight);
  doc.text(s(customerName || 'FiberOracle.com'), M, fy + 7);
  doc.text('Generated: ' + s(generatedDateTime), PAGE_W / 2, fy + 7, { align: 'center' });
  doc.text(pageNum + ' / ' + totalPages, PAGE_W - M, fy + 7, { align: 'right' });
}

// ── Section header ────────────────────────────────────────────────────────────
function sectionHeader(doc, label, y) {
  doc.setFillColor(...C.sectionBg);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.rect(M, y, CW, 7, 'FD');
  // Left accent bar
  doc.setFillColor(...C.navyLight);
  doc.rect(M, y, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.navyMid);
  doc.text(s(label).toUpperCase(), M + 6, y + 5);
  return y + 9.5;
}

// ── Light divider ─────────────────────────────────────────────────────────────
function divider(doc, y) {
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(M + 2, y, PAGE_W - M - 2, y);
  return y + 2.5;
}

// ── Label + bold value pair ───────────────────────────────────────────────────
function labelValue(doc, label, value, x, y, maxWidth) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...C.slate);
  doc.text(s(label), x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const hasVal = value !== null && value !== undefined && s(value).trim() !== '';
  doc.setTextColor(...(hasVal ? C.ink : C.slateLight));
  doc.text(hasVal ? s(value) : '\u2014', x, y + 4.5, { maxWidth: maxWidth - 2 });
}

// ── Optical metric tile ───────────────────────────────────────────────────────
function metricTile(doc, label, value, unit, x, y, w, h) {
  const v = parseFloat(value);
  const hasVal = !isNaN(v) && value !== null && value !== undefined;

  // Tile background
  doc.setFillColor(...C.lightBg);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  // Top color bar
  doc.setFillColor(...C.navyMid);
  doc.roundedRect(x, y, w, 2.5, 1, 0, 'F');

  // Large value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...(hasVal ? C.ink : C.slateLight));
  doc.text(hasVal ? v.toFixed(2) : 'N/A', x + w / 2, y + h / 2 + 2.5, { align: 'center' });

  // Unit + label below
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.slate);
  doc.text(s(unit) + '  \u2022  ' + s(label), x + w / 2, y + h - 2.5, { align: 'center' });
}

// ── Error metric cell ─────────────────────────────────────────────────────────
function errorCell(doc, label, val, x, y, w) {
  const hasV = val !== null && val !== undefined && !isNaN(Number(val));
  const numVal = hasV ? Number(val) : null;
  const isWarning = hasV && numVal !== 0 &&
    (label.includes('Uncorrected') || label.includes('BIP') || label.includes('HEC') || label.includes('Missed'));

  // Cell background
  doc.setFillColor(...C.lightBg);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, 11, 1.5, 1.5, 'FD');

  // Label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.slate);
  doc.text(s(label), x + w / 2, y + 4, { align: 'center' });

  // Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  if (isWarning) {
    doc.setTextColor(...C.red);
  } else {
    doc.setTextColor(...(hasV ? C.ink : C.slateLight));
  }
  doc.text(hasV ? numVal.toLocaleString() : '\u2014', x + w / 2, y + 8.5, { align: 'center' });
}


// ── Fill-in line ──────────────────────────────────────────────────────────────
function fillLine(doc, label, x, y, lineW) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slate);
  doc.text(s(label), x, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.4);
  doc.line(x, y + 7.5, x + lineW, y + 7.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CERTIFICATE BUILDER — one page per ONT
// ─────────────────────────────────────────────────────────────────────────────
function drawCertificate(doc, serial, record, sub, weather, customerName, customerLogo, generatedDateTime, tz, pageNum, totalPages) {
  drawHeader(doc, customerLogo, customerName);
  drawFooter(doc, pageNum, totalPages, generatedDateTime, customerName);

  let y = 31; // below header + accent stripes

  // ── Title block ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.navy);
  doc.text('CERTIFICATE OF INSTALLATION RECORD', PAGE_W / 2, y + 5.5, { align: 'center' });

  // Gold ornamental rule — full line with centered circle accent
  y += 11;
  doc.setDrawColor(...C.goldMid);
  doc.setLineWidth(0.6);
  doc.line(M + 6, y, PAGE_W - M - 6, y);
  doc.setFillColor(...C.goldMid);
  doc.circle(PAGE_W / 2, y, 1.5, 'F');

  // Document number
  y += 4;
  const year   = new Date().getFullYear();
  const safeSN = String(serial).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6).padStart(6, '0');
  const certNo = 'FO-' + year + '-' + safeSN;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...C.slate);
  doc.text('Document No. ' + certNo, PAGE_W / 2, y, { align: 'center' });
  y += 3;

  // ── Birth date + weather combined row ────────────────────────────────────
  const birthDate = record && record.report_date
    ? new Date(record.report_date).toLocaleDateString('en-US', {
        timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const hasWeather = !!(weather && (weather.high_temp_f != null || weather.low_temp_f != null));
  const bdBoxH = 17;

  if (hasWeather) {
    // Two side-by-side boxes: date (left 60%) | weather (right 40%)
    const dateBoxW = Math.round(CW * 0.60);
    const wBoxW    = CW - dateBoxW - 3;

    // Date box (gold)
    doc.setFillColor(...C.goldLight);
    doc.setDrawColor(...C.goldBorder);
    doc.setLineWidth(0.6);
    doc.roundedRect(M, y, dateBoxW, bdBoxH, 3, 3, 'FD');
    doc.setDrawColor(...C.goldMid);
    doc.setLineWidth(0.2);
    doc.roundedRect(M + 1.5, y + 1.5, dateBoxW - 3, bdBoxH - 3, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...C.amber);
    doc.text('FIRST OBSERVED ON NETWORK', M + dateBoxW / 2, y + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(birthDate ? 10 : 8);
    doc.setTextColor(...C.navy);
    doc.text(s(birthDate || 'Not Yet Recorded'), M + dateBoxW / 2, y + 12.5, { align: 'center' });

    // Weather box (blue)
    const wx = M + dateBoxW + 3;
    doc.setFillColor(235, 245, 255);
    doc.setDrawColor(147, 197, 253);
    doc.setLineWidth(0.5);
    doc.roundedRect(wx, y, wBoxW, bdBoxH, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(30, 80, 160);
    doc.text('AMBIENT TEMP AT INSTALL', wx + wBoxW / 2, y + 4.5, { align: 'center' });

    const hi = weather.high_temp_f != null ? Math.round(weather.high_temp_f) + '\u00B0F' : 'N/A';
    const lo = weather.low_temp_f  != null ? Math.round(weather.low_temp_f)  + '\u00B0F' : 'N/A';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 50, 120);
    doc.text('High ' + s(hi), wx + wBoxW / 2, y + 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Low ' + s(lo), wx + wBoxW / 2, y + 15, { align: 'center' });

  } else {
    // No weather — centered date box only
    const bdBoxX = M + 20;
    const bdBoxW = CW - 40;
    doc.setFillColor(...C.goldLight);
    doc.setDrawColor(...C.goldBorder);
    doc.setLineWidth(0.6);
    doc.roundedRect(bdBoxX, y, bdBoxW, bdBoxH, 3, 3, 'FD');
    doc.setDrawColor(...C.goldMid);
    doc.setLineWidth(0.2);
    doc.roundedRect(bdBoxX + 1.5, y + 1.5, bdBoxW - 3, bdBoxH - 3, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...C.amber);
    doc.text('FIRST OBSERVED ON NETWORK', PAGE_W / 2, y + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(birthDate ? 12 : 9);
    doc.setTextColor(...C.navy);
    doc.text(s(birthDate || 'Not Yet Recorded in Database'), PAGE_W / 2, y + 14.5, { align: 'center' });
  }

  y += bdBoxH + 2;

  // ── Outer certificate border ──────────────────────────────────────────────
  const boxTop = y;
  const boxBot = PAGE_H - 11 - 4; // above footer with gap
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(1.0);
  doc.roundedRect(M, boxTop, CW, boxBot - boxTop, 2.5, 2.5, 'S');
  doc.setDrawColor(...C.navyLight);
  doc.setLineWidth(0.2);
  doc.roundedRect(M + 1.2, boxTop + 1.2, CW - 2.4, boxBot - boxTop - 2.4, 2, 2, 'S');

  y += 4;
  const innerX = M + 4;
  const innerW = CW - 8;
  const hw = (innerW - 4) / 2; // half-width for two-column rows

  // ── SUBSCRIBER INFORMATION ────────────────────────────────────────────────
  y = sectionHeader(doc, 'Subscriber Information', y);

  const subName  = sub && sub.SubscriberName ? sub.SubscriberName : (record && record.subscriber_account_name ? record.subscriber_account_name : '');
  const acctName = sub && sub.AccountName    ? sub.AccountName    : (record && record.subscriber_account_name ? record.subscriber_account_name : '');
  const addrParts = [];
  if (sub && sub.Address) addrParts.push(sub.Address);
  const cityState = [sub && sub.City, sub && sub.State, sub && sub.Zip].filter(Boolean).join(', ');
  if (cityState) addrParts.push(cityState);
  const fullAddr = addrParts.length ? addrParts.join(', ') : (record && record.subscriber_address ? record.subscriber_address : '');

  labelValue(doc, 'Subscriber Name', subName,  innerX,          y, hw);
  labelValue(doc, 'Account Name',    acctName,  innerX + hw + 4, y, hw);
  y += 8;
  labelValue(doc, 'Service Address', fullAddr,  innerX,          y, innerW);
  y += 8;
  y = divider(doc, y);

  // ── DEVICE IDENTIFICATION & NETWORK LOCATION (combined, 4-col) ───────────
  y = sectionHeader(doc, 'Device Identification & Network Location', y);
  const qw = (innerW - 6) / 4; // quarter-width for 4-column layout
  const qg = 2;

  // Row 1: Serial | ONT ID | OLT | Port
  labelValue(doc, 'Serial Number (FSAN)',    record && record.serial_number    ? record.serial_number    : serial,                        innerX,                 y, qw);
  labelValue(doc, 'ONT ID',                 record && record.ont_id           ? record.ont_id           : '',                            innerX + (qw + qg),     y, qw);
  labelValue(doc, 'OLT / Chassis',          record && record.olt_name         ? record.olt_name         : '',                            innerX + (qw + qg) * 2, y, qw);
  labelValue(doc, 'Port (Shelf/Slot/Port)', record && record.shelf_slot_port  ? record.shelf_slot_port  : '',                            innerX + (qw + qg) * 3, y, qw);
  y += 8;

  // Row 2: Model | Software Version | LCP | Splitter
  labelValue(doc, 'ONT Model',        record && record.model            ? record.model            : (sub && sub.ONTModel ? sub.ONTModel : ''), innerX,                 y, qw);
  labelValue(doc, 'Software Version', sub   && sub.CurrentONTSoftwareVersion ? sub.CurrentONTSoftwareVersion : '',                            innerX + (qw + qg),     y, qw);
  labelValue(doc, 'LCP',              record && record.lcp_number       ? record.lcp_number       : '',                                        innerX + (qw + qg) * 2, y, qw);
  labelValue(doc, 'Splitter',         record && record.splitter_number  ? record.splitter_number  : '',                                        innerX + (qw + qg) * 3, y, qw);
  y += 8;
  y = divider(doc, y);

  // ── OPTICAL READINGS ─────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Optical Readings at First Report', y);
  const tileGap = 3;
  const tileW   = (innerW - tileGap * 2) / 3;
  const tileH   = 14;
  metricTile(doc, 'ONT Rx Power', record && record.ont_rx_power, 'dBm', innerX,                           y, tileW, tileH);
  metricTile(doc, 'OLT Rx Power', record && record.olt_rx_power, 'dBm', innerX + tileW + tileGap,          y, tileW, tileH);
  metricTile(doc, 'ONT Tx Power', record && record.ont_tx_power, 'dBm', innerX + (tileW + tileGap) * 2,    y, tileW, tileH);
  y += tileH + 2;
  y = divider(doc, y);

  // ── ERROR METRICS ─────────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Error Metrics at First Report', y);

  const errorFields = [
    { label: 'US BIP Errors',      val: record && record.us_bip_errors },
    { label: 'DS BIP Errors',      val: record && record.ds_bip_errors },
    { label: 'US FEC Uncorrected', val: record && record.us_fec_uncorrected },
    { label: 'DS FEC Uncorrected', val: record && record.ds_fec_uncorrected },
    { label: 'US FEC Corrected',   val: record && record.us_fec_corrected },
    { label: 'DS FEC Corrected',   val: record && record.ds_fec_corrected },
    { label: 'US GEM HEC Errors',  val: record && record.us_gem_hec_errors },
    { label: 'US Missed Bursts',   val: record && record.us_missed_bursts },
  ];

  const errGap = 2;
  const errW   = (innerW - errGap * 3) / 4;
  errorFields.forEach(({ label, val }, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const ex  = innerX + col * (errW + errGap);
    const ey  = y + row * (11 + errGap);
    errorCell(doc, label, val, ex, ey, errW);
  });
  y += (11 + errGap) * 2 - errGap + 1;

  // Status chip — inline with small footprint
  if (record && record.status) {
    const statusMap = {
      ok:       { bg: [220, 252, 231], border: [74, 222, 128], text: [22, 163, 74],   label: 'OK'       },
      warning:  { bg: [255, 247, 220], border: [251, 191, 36], text: [180, 110,   0], label: 'WARNING'  },
      critical: { bg: [255, 228, 230], border: [252, 165, 165],text: [220,  38,  38], label: 'CRITICAL' },
      offline:  { bg: [241, 245, 249], border: [203, 213, 225],text: [100, 116, 139], label: 'OFFLINE'  },
    };
    const sc = statusMap[record.status] || statusMap.offline;
    const chipW = 32, chipH = 7;
    doc.setFillColor(...sc.bg);
    doc.setDrawColor(...sc.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(innerX, y, chipW, chipH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...sc.text);
    doc.text('Status: ' + sc.label, innerX + chipW / 2, y + 4.8, { align: 'center' });
    y += chipH + 2;
  }

  y = divider(doc, y);

  // ── INSTALLATION DATES ────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Installation Dates', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slate);
  doc.text('Date First Seen on Report:', innerX, y + 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...(birthDate ? C.ink : C.slateLight));
  doc.text(s(birthDate || 'Not yet recorded'), innerX + 50, y + 1);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slate);
  doc.text('Actual Date of Installation:', innerX, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.4);
  doc.line(innerX + 50, y + 1, innerX + 50 + 90, y + 1);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.slateLight);
  doc.text('(Fill in if different from first report date above)', innerX, y);
  y += 5.5;
  y = divider(doc, y);

  // ── AUTHORIZATION & SIGN-OFF ──────────────────────────────────────────────
  y = sectionHeader(doc, 'Authorization & Sign-Off', y);

  // Two-column sign-off row: Technician | Date
  fillLine(doc, 'Technician / Installer:', innerX, y, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slate);
  doc.text('Date:', innerX + 113, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.4);
  doc.line(innerX + 123, y + 7.5, innerX + 123 + 44, y + 7.5);
  y += 11;

  // Supervisor row
  fillLine(doc, 'Supervisor Signature:', innerX, y, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slate);
  doc.text('Date:', innerX + 113, y);
  doc.line(innerX + 123, y + 7.5, innerX + 123 + 44, y + 7.5);
  y += 11;

  // Print name
  fillLine(doc, 'Print Supervisor Name:', innerX, y, 148);
  y += 11;

  // Notes line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.slate);
  doc.text('Notes:', innerX, y);
  doc.setDrawColor(...C.borderDark);
  doc.setLineWidth(0.4);
  doc.line(innerX + 16, y, innerX + 16 + 154, y);
  y += 6;
  doc.line(innerX, y, innerX + 170, y);
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

    // ── ONTPerformanceRecord lookup — tries exact serial, stripped prefix, and
    //    ont_id+olt_name cross-reference as successive fallbacks ─────────────
    async function findOntRecords(base44, serial, sub) {
      let records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { serial_number: serial }, 'report_date', 10
      );
      if (records.length > 0) return records;

      if (serial.length > 8) {
        const stripped = serial.slice(4);
        records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { serial_number: stripped }, 'report_date', 10
        );
        if (records.length > 0) return records;
      }

      if (sub && sub.OntID && sub.DeviceName) {
        records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { ont_id: sub.OntID, olt_name: sub.DeviceName }, 'report_date', 10
        );
        if (records.length > 0) return records;
      }

      return [];
    }

    // ── SubscriberRecord lookup — tries exact, prefix-expanded, and stripped forms
    const VENDOR_PREFIXES = ['CXNK', 'ZTEG', 'HWTC', 'ALCA', 'GNXS', 'SCOM', 'HUMA', 'BRCM'];

    async function findSubscriber(serial) {
      let subs = await base44.asServiceRole.entities.SubscriberRecord.filter(
        { ONTSerialNo: serial }, 'created_date', 1
      );
      if (subs.length > 0) return subs[0];

      if (serial.length <= 8) {
        for (const prefix of VENDOR_PREFIXES) {
          subs = await base44.asServiceRole.entities.SubscriberRecord.filter(
            { ONTSerialNo: prefix + serial }, 'created_date', 1
          );
          if (subs.length > 0) return subs[0];
        }
      }

      if (serial.length > 8) {
        subs = await base44.asServiceRole.entities.SubscriberRecord.filter(
          { ONTSerialNo: serial.slice(4) }, 'created_date', 1
        );
        if (subs.length > 0) return subs[0];
      }

      return null;
    }

    const birthData = await Promise.all(
      serials.map(async (serial) => {
        const sub = await findSubscriber(serial);
        const allRecords = await findOntRecords(base44, serial, sub);
        allRecords.sort((a, b) => new Date(a.report_date) - new Date(b.report_date));
        const record = allRecords[0] || null;

        // Fetch ambient weather for the birth date
        let weather = null;
        const zip = sub && sub.Zip ? String(sub.Zip).trim().slice(0, 5) : null;
        if (zip && record && record.report_date) {
          const weatherDate = new Date(record.report_date).toISOString().slice(0, 10);
          const wRecs = await base44.asServiceRole.entities.WeatherHistory.filter(
            { zip_code: zip, weather_date: weatherDate }, 'created_date', 1
          );
          if (wRecs.length > 0) weather = wRecs[0];
        }

        return { serial, record, sub, weather };
      })
    );

    const generatedDateTime = new Date().toLocaleString('en-US', { timeZone: tz });
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    birthData.forEach(({ serial, record, sub, weather }, idx) => {
      if (idx > 0) doc.addPage();
      drawCertificate(
        doc, serial, record, sub, weather,
        customerName, customerLogo, generatedDateTime, tz,
        idx + 1, birthData.length
      );
    });

    const date = new Date().toISOString().slice(0, 10);
    const filename = serials.length === 1
      ? 'ONT-BirthCertificate-' + serials[0] + '.pdf'
      : 'FiberOracle-ONT-Certificates-' + date + '.pdf';

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