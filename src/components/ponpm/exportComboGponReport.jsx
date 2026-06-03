import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * COMBO / EXT-COMBO GPON Side Report
 *
 * Business rules:
 *  - Only include LCP entries whose optic_type is COMBO or EXT-COMBO
 *    (optic_type values: 'XGS-COMBO', 'XGS-COMBO-EXT', or model strings
 *     containing 'COMBO').
 *  - On a COMBO port the GPON side maps to the EVEN port number in the
 *    combo port alias (e.g. port 2 = GPON side, port 1 = XGS side).
 *  - Produces two outputs: a detail CSV (sorted by DeviceName/OLT) and an
 *    embedded summary section showing port-level GPON ONT counts with a
 *    7-day delta pulled from the nearest saved report ~1 week ago.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function buildCsv(rows) {
  return rows.map(r => r.map(esc).join(',')).join('\n');
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Returns true if the optic_type or optic_model indicates a COMBO or EXT-COMBO port.
 */
function isComboOptic(lcpEntry) {
  const t = (lcpEntry.optic_type || '').toUpperCase();
  const m = (lcpEntry.optic_model || '').toUpperCase();
  return (
    t.includes('COMBO') ||
    m.includes('COMBO') ||
    // Cisco/Calix model numbers associated with COMBO optics
    m.includes('100-05674') || // XGS-COMBO
    m.includes('100-05929')    // XGS-COMBO-EXT
  );
}

/**
 * Returns true if the port number (numeric) is even — i.e. the GPON side.
 */
function isEvenPort(portValue) {
  const raw = String(portValue || '').replace(/^xp/i, '').trim();
  const n = parseInt(raw, 10);
  return !isNaN(n) && n % 2 === 0;
}

/**
 * Parse shelf/slot/port from a "S/S/P" or "xp..." formatted string.
 * Returns { shelf, slot, port } as strings, or null on failure.
 */
function parseSsp(ssp) {
  if (!ssp) return null;
  const m = String(ssp).match(/^(\d+)\/(\d+)\/(.+)$/);
  if (!m) return null;
  return { shelf: m[1], slot: m[2], port: m[3] };
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * @param {object[]} lcpEntries   - All LCPEntry records from the DB
 * @param {object[]} onts         - Enriched ONT array from the active report (result.onts)
 * @param {object[]} subscriberRecords - Raw SubscriberRecord array (may be empty)
 * @param {object[]} savedReports - Saved PONPMReport list (for 7-day delta)
 */
export async function exportComboGponReport(lcpEntries, onts, subscriberRecords = [], savedReports = []) {
  if (!lcpEntries?.length) {
    toast.error('No LCP data available — import LCP database first');
    return;
  }
  if (!onts?.length) {
    toast.error('No PON PM data loaded');
    return;
  }

  toast.loading('Building COMBO GPON report…', { id: 'combo-report' });

  // ── 1. Identify COMBO / EXT-COMBO LCP entries with EVEN ports (GPON side) ─
  const comboGponEntries = lcpEntries.filter(e => isComboOptic(e) && isEvenPort(e.olt_port));

  if (comboGponEntries.length === 0) {
    toast.warning('No COMBO/EXT-COMBO GPON ports found in LCP database', { id: 'combo-report' });
    return;
  }

  // ── 2. Build a lookup: "oltname_lower|shelf/slot/port_normalized" → lcpEntry
  //       for fast ONT → LCP entry matching.
  const entryByPortKey = new Map();
  for (const e of comboGponEntries) {
    const oltKey = (e.olt_name || '').toLowerCase().trim();
    const portNum = String(e.olt_port || '').replace(/^xp/i, '').trim();
    const key = `${oltKey}|${e.olt_shelf}/${e.olt_slot}/${portNum}`;
    const keyXp = `${oltKey}|${e.olt_shelf}/${e.olt_slot}/xp${portNum}`;
    if (!entryByPortKey.has(key)) entryByPortKey.set(key, e);
    if (!entryByPortKey.has(keyXp)) entryByPortKey.set(keyXp, e);
  }

  // ── 3. Filter ONTs to those on COMBO GPON ports ───────────────────────────
  const resolveEntry = (ont) => {
    const oltKey = (ont._oltName || ont.OLTName || '').toLowerCase().trim();
    const ssp = ont._port || ont['Shelf/Slot/Port'] || '';
    const parsed = parseSsp(ssp);
    if (!parsed) return null;
    const portNum = parsed.port.replace(/^xp/i, '').trim();
    const key = `${oltKey}|${parsed.shelf}/${parsed.slot}/${portNum}`;
    return entryByPortKey.get(key) || null;
  };

  // Build subscriber lookup by ONT serial (from loaded subscriberRecords)
  const subBySerial = new Map();
  const subByOntId = new Map(); // fallback
  for (const s of (subscriberRecords || [])) {
    if (s.ONTSerialNo) subBySerial.set(s.ONTSerialNo.toUpperCase().trim(), s);
    if (s.OntID) subByOntId.set(String(s.OntID).trim(), s);
  }

  // Collect matching ONTs with their LCP entry reference
  const matchedOnts = [];
  for (const ont of onts) {
    const entry = resolveEntry(ont);
    if (!entry) continue;

    // Prefer subscriber data already attached to the ONT (_subscriber),
    // then fall back to the subscriberRecords lookup.
    const subFromOnt = ont._subscriber || {};
    const subFromLookup = subBySerial.get((ont.SerialNumber || '').toUpperCase().trim())
      || subByOntId.get(String(ont.OntID || '').trim())
      || {};

    const sub = {
      SubscriberName: subFromOnt.name || subFromOnt.SubscriberName || subFromLookup.SubscriberName || '',
      AccountName:    subFromOnt.account || subFromOnt.AccountName || subFromLookup.AccountName || '',
      Address:        subFromOnt.address || subFromLookup.Address || '',
      LinkedPon:      subFromLookup.LinkedPon || ont['Shelf/Slot/Port'] || '',
      ONTModel:       subFromLookup.ONTModel || ont.model || '',
    };

    matchedOnts.push({ ont, entry, sub });
  }

  // ── 4. Sort by DeviceName (OLT), then Shelf/Slot/Port ─────────────────────
  matchedOnts.sort((a, b) => {
    const oltCmp = (a.ont._oltName || '').localeCompare(b.ont._oltName || '', undefined, { numeric: true });
    if (oltCmp !== 0) return oltCmp;
    return (a.ont['Shelf/Slot/Port'] || '').localeCompare(b.ont['Shelf/Slot/Port'] || '', undefined, { numeric: true });
  });

  // ── 5. Fetch ~7-day-ago report for GPON ONT count delta ──────────────────
  const currentReportDate = savedReports.length > 0
    ? new Date(savedReports[0].upload_date).getTime()
    : Date.now();
  const targetWeekAgo = currentReportDate - 7 * 24 * 60 * 60 * 1000;

  // Find saved report closest to 7 days ago
  const weekReport = savedReports
    .filter(r => r.id !== savedReports[0]?.id && r.upload_date)
    .sort((a, b) => {
      const da = Math.abs(new Date(a.upload_date).getTime() - targetWeekAgo);
      const db = Math.abs(new Date(b.upload_date).getTime() - targetWeekAgo);
      return da - db;
    })[0] || null;

  // Pull historical per-port ONT counts for COMBO GPON ports if we have a week report
  // Key: "oltname_lower|shelf/slot/port_normalized" → count
  const weekCountByPortKey = new Map();
  if (weekReport?.id) {
    try {
      // Query ONTPerformanceRecord for that report, scoped to just the combo ports
      // We pull all records for the report — no backend function supports per-port queries —
      // and filter client-side. Use pagination to handle large reports.
      let page = 0;
      const PAGE = 2000;
      while (true) {
        const records = await base44.entities.ONTPerformanceRecord.filter(
          { report_id: weekReport.id },
          'shelf_slot_port',
          PAGE,
          page * PAGE
        );
        for (const r of records) {
          const oltKey = (r.olt_name || '').toLowerCase().trim();
          const parsed = parseSsp(r.shelf_slot_port || '');
          if (!parsed) continue;
          const portNum = parsed.port.replace(/^xp/i, '').trim();
          const k = `${oltKey}|${parsed.shelf}/${parsed.slot}/${portNum}`;
          if (entryByPortKey.has(k) || entryByPortKey.has(`${oltKey}|${parsed.shelf}/${parsed.slot}/xp${portNum}`)) {
            weekCountByPortKey.set(k, (weekCountByPortKey.get(k) || 0) + 1);
          }
        }
        if (records.length < PAGE) break;
        page++;
      }
    } catch (err) {
      // Non-fatal — delta will show 'N/A'
      console.warn('Could not load week-ago report for delta:', err.message);
    }
  }

  // ── 6. Build current port-level summary ──────────────────────────────────
  // Group matched ONTs by "DeviceName|shelf/slot/port"
  const portSummary = new Map();
  for (const { ont, entry } of matchedOnts) {
    const ssp = ont['Shelf/Slot/Port'] || '';
    const oltName = ont._oltName || '';
    const parsed = parseSsp(ssp);
    const portNum = parsed ? parsed.port.replace(/^xp/i, '').trim() : '';
    const mapKey = `${oltName.toLowerCase()}|${parsed ? parsed.shelf + '/' + parsed.slot + '/' + portNum : ssp}`;

    if (!portSummary.has(mapKey)) {
      portSummary.set(mapKey, {
        deviceName: oltName,
        shelfSlotPort: ssp,
        opticType: entry.optic_type || entry.optic_model || '',
        lcpNumber: entry.lcp_number || '',
        currentCount: 0,
        weekKey: mapKey,
      });
    }
    portSummary.get(mapKey).currentCount++;
  }

  const weekReportLabel = weekReport?.upload_date
    ? new Date(weekReport.upload_date).toLocaleDateString()
    : 'No prior report';

  // ── 7. Build CSV rows ─────────────────────────────────────────────────────

  // === SUMMARY SECTION (top of file) ===
  const summaryRows = [
    [`COMBO/EXT-COMBO GPON Port Summary — Generated ${new Date().toLocaleDateString()}`],
    [],
    [`DeviceName`, `Shelf/Slot/Port (GPON Even Port)`, `Optic Type`, `# GPON ONTs`, `7-Day Delta (vs ${weekReportLabel})`],
    ...[...portSummary.values()]
      .sort((a, b) => {
        const c = a.deviceName.localeCompare(b.deviceName, undefined, { numeric: true });
        return c !== 0 ? c : a.shelfSlotPort.localeCompare(b.shelfSlotPort, undefined, { numeric: true });
      })
      .map(p => {
        const weekCount = weekCountByPortKey.get(p.weekKey) ?? null;
        const delta = weekCount === null
          ? 'N/A'
          : p.currentCount - weekCount === 0
          ? '0 (no change)'
          : `${p.currentCount - weekCount > 0 ? '+' : ''}${p.currentCount - weekCount}`;
        return [p.deviceName, p.shelfSlotPort, p.opticType, p.currentCount, delta];
      }),
    [],
    [], // blank separator between summary and detail
  ];

  // === DETAIL SECTION ===
  const detailHeaders = [
    `DeviceName`, `LinkedPon / Shelf/Slot/Port`, `OntID`, `ONT Model`,
    `Subscriber Name`, `Account Name`, `Address`,
    `Optic Type`, `LCP`,
  ];

  const detailRows = matchedOnts.map(({ ont, entry, sub }) => [
    ont._oltName || '',
    sub.LinkedPon || ont['Shelf/Slot/Port'] || '',
    ont.OntID || '',
    sub.ONTModel || ont.model || '',
    sub.SubscriberName,
    sub.AccountName,
    sub.Address,
    entry.optic_type || entry.optic_model || '',
    entry.lcp_number || '',
  ]);

  const allRows = [
    ...summaryRows,
    detailHeaders,
    ...detailRows,
  ];

  const csv = buildCsv(allRows);
  const filename = `combo-gpon-report-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(csv, filename);

  toast.success(
    `COMBO GPON report: ${matchedOnts.length} ONTs across ${portSummary.size} ports`,
    { id: 'combo-report' }
  );
}