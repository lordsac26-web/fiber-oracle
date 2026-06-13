/**
 * processPonPmRecords - Async background function to parse and save ONT records
 * from a large CSV (supports 28,000+ records) by processing in batches.
 *
 * Triggered automatically via entity automation when a PONPMReport is created
 * with processing_status = 'pending'.
 *
 * Flow:
 *  1. Fetch the raw CSV from file_url stored on the PONPMReport record.
 *  2. Parse & analyse every ONT row (same logic as parsePonPm).
 *  3. Enrich with LCP data at ingest time (no second pass needed).
 *  4. bulkCreate ONTPerformanceRecord in configurable batches (default 500).
 *  5. Update PONPMReport.processing_progress after each batch.
 *  6. Mark report as 'completed' or 'failed' when done.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { parse } from 'npm:csv-parse@5.5.2/sync';

// ─── Thresholds (mirror of parsePonPm) ───────────────────────────────────────
const THRESHOLDS = {
  OntRxOptPwr: { low: -27, marginal: -25, high: -8 },
  OLTRXOptPwr: { low: -30, marginal: -28, high: -8 },
  UsSdberRate: { warning: 1e-9, critical: 1e-6 },
  DsSdberRate: { warning: 1e-9, critical: 1e-6 },
  UpstreamBipErrors: { warning: 100, critical: 1000 },
  DownstreamBipErrors: { warning: 100, critical: 1000 },
  UpstreamMissedBursts: { warning: 10, critical: 100 },
  UpstreamGemHecErrors: { warning: 10, critical: 100 },
  UpstreamFecUncorrectedCodeWords: { warning: 1, critical: 10 },
  DownstreamFecUncorrectedCodeWords: { warning: 1, critical: 10 },
};

const FIELDS = [
  'OLTName', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'ONTModel', 'model',
  'OntRxOptPwr', 'OntTxPwr', 'OLTRXOptPwr',
  'UsSdberRate', 'DsSdberRate',
  'UpstreamBipErrors', 'UpstreamMissedBursts', 'UpstreamGemHecErrors',
  'UpstreamFecUncorrectedCodeWords', 'UpstreamFecCorrectedCodeWords',
  'DownstreamBipErrors', 'DownstreamFecUncorrectedCodeWords',
  'DownstreamFecCorrectedCodeWords', 'upTime',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseNumeric(value) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function normalizeSerial(serial) {
  if (!serial || typeof serial !== 'string') return null;
  const n = serial.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return n.length > 0 ? n : null;
}

// ─── Data-driven technology classification ───────────────────────────────────
// Tech type is now resolved from the `TechnologyStandards` entity (registry)
// rather than hardcoded lists, so new hardware (e.g. Calix 50G-PON triple-combo
// E7 cards) is added as a data row — no code change required. The hardcoded
// list below is kept ONLY as a fallback if the registry is empty/unreachable,
// preserving behaviour on a fresh DB.
const FALLBACK_STANDARDS = [
  { pattern: 'DZS', tech: 'XGS-PON', priority: 200 },
  { pattern: 'GP1101X', tech: 'XGS-PON', priority: 50 },
  { pattern: 'GP4201XH', tech: 'XGS-PON', priority: 50 },
  { pattern: 'GP4201X', tech: 'XGS-PON', priority: 60 },
  { pattern: '5222XG', tech: 'XGS-PON', priority: 50 },
  { pattern: '5228XG', tech: 'XGS-PON', priority: 50 },
  { pattern: '711GE', tech: 'GPON', priority: 50 },
  { pattern: '717GE', tech: 'GPON', priority: 50 },
  { pattern: '725GE', tech: 'GPON', priority: 50 },
  { pattern: '725G', tech: 'GPON', priority: 60 },
  { pattern: '725', tech: 'GPON', priority: 80 },
  { pattern: '812G-1', tech: 'GPON', priority: 50 },
  { pattern: '844GE-1', tech: 'GPON', priority: 50 },
  { pattern: '844G-1', tech: 'GPON', priority: 60 },
  { pattern: '803G', tech: 'GPON', priority: 50 },
];

// Sort standards into deterministic evaluation order: lower priority first,
// then longer pattern first (more specific substring wins ties).
function sortStandards(list) {
  return [...list].sort((a, b) => (a.priority - b.priority) || (b.pattern.length - a.pattern.length));
}

// Load active standards from the registry, falling back to the built-in list.
async function loadTechStandards(base44) {
  try {
    const rows = await base44.asServiceRole.entities.TechnologyStandards.filter(
      { is_active: true }, '-created_date', 1000
    );
    const mapped = (rows || [])
      .map((r) => ({
        pattern: (r.model_pattern || '').toUpperCase().trim().replace(/\s/g, ''),
        tech: r.technology_type,
        priority: typeof r.match_priority === 'number' ? r.match_priority : 100,
      }))
      .filter((r) => r.pattern && r.tech);
    if (mapped.length > 0) {
      console.log(`[processPonPmRecords] Loaded ${mapped.length} tech standards from registry`);
      return sortStandards(mapped);
    }
    console.log('[processPonPmRecords] Registry empty — using fallback tech standards');
  } catch (err) {
    console.log(`[processPonPmRecords] Tech standards load failed (using fallback): ${err.message}`);
  }
  return sortStandards(FALLBACK_STANDARDS);
}

// Classify a model against the ordered standards list (substring match).
function detectTechType(model, standards) {
  if (!model) return null;
  const m = model.toUpperCase().trim().replace(/\s/g, '');
  for (const s of standards) {
    if (m.includes(s.pattern)) return s.tech;
  }
  return null;
}

function buildThresholds(customThresholds) {
  const thresholds = structuredClone(THRESHOLDS);
  if (!customThresholds || typeof customThresholds !== 'object') return thresholds;

  for (const [field, values] of Object.entries(customThresholds)) {
    if (!thresholds[field] || !values || typeof values !== 'object') continue;
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        thresholds[field][key] = value;
      }
    }
  }
  return thresholds;
}

function analyzeOnt(ont, segmentStats, thresholds = THRESHOLDS) {
  const issues = [];
  const warnings = [];
  const ontRx = parseNumeric(ont.OntRxOptPwr);
  const oltRx = parseNumeric(ont.OLTRXOptPwr);

  const isOffline = (ontRx === 0 || ontRx === null) && (oltRx === 0 || oltRx === null);
  if (isOffline) return { status: 'offline', issues, warnings };

  if (ontRx !== null) {
    if (ontRx < thresholds.OntRxOptPwr.low) {
      issues.push({ field: 'OntRxOptPwr', severity: 'critical', value: `${ontRx} dBm`, threshold: `< ${thresholds.OntRxOptPwr.low} dBm`, message: 'ONT Rx power critically low' });
    } else if (ontRx < thresholds.OntRxOptPwr.marginal) {
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', value: `${ontRx} dBm`, threshold: `< ${thresholds.OntRxOptPwr.marginal} dBm`, message: 'ONT Rx power marginal' });
    } else if (ontRx > thresholds.OntRxOptPwr.high) {
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', value: `${ontRx} dBm`, threshold: `> ${thresholds.OntRxOptPwr.high} dBm`, message: 'ONT Rx power too high (may need attenuator)' });
    }

    if (segmentStats?.avgOntRxOptPwr !== null && segmentStats?.avgOntRxOptPwr !== undefined) {
      const diff = ontRx - segmentStats.avgOntRxOptPwr;
      if (diff < -3) {
        warnings.push({ field: 'OntRxOptPwr', severity: 'info', value: `${ontRx} dBm`, threshold: `Avg: ${segmentStats.avgOntRxOptPwr.toFixed(1)} dBm`, message: `${Math.abs(diff).toFixed(1)} dB below segment average` });
      }
    }
  }

  if (oltRx !== null) {
    if (oltRx < thresholds.OLTRXOptPwr.low) {
      issues.push({ field: 'OLTRXOptPwr', severity: 'critical', value: `${oltRx} dBm`, threshold: `< ${thresholds.OLTRXOptPwr.low} dBm`, message: 'OLT Rx power critically low' });
    } else if (oltRx < thresholds.OLTRXOptPwr.marginal) {
      warnings.push({ field: 'OLTRXOptPwr', severity: 'warning', value: `${oltRx} dBm`, threshold: `< ${thresholds.OLTRXOptPwr.marginal} dBm`, message: 'OLT Rx power marginal' });
    }
  }

  const checkErr = (field, val) => {
    const n = parseNumeric(val);
    if (n !== null && thresholds[field]) {
      if (n >= thresholds[field].critical) {
        issues.push({ field, severity: 'critical', value: n.toLocaleString(), threshold: `≥ ${thresholds[field].critical.toLocaleString()}`, message: 'High error count' });
      } else if (n >= thresholds[field].warning) {
        warnings.push({ field, severity: 'warning', value: n.toLocaleString(), threshold: `≥ ${thresholds[field].warning.toLocaleString()}`, message: 'Elevated error count' });
      }
    }
  };
  checkErr('UpstreamBipErrors', ont.UpstreamBipErrors);
  checkErr('DownstreamBipErrors', ont.DownstreamBipErrors);
  checkErr('UpstreamMissedBursts', ont.UpstreamMissedBursts);
  checkErr('UpstreamGemHecErrors', ont.UpstreamGemHecErrors);
  checkErr('UpstreamFecUncorrectedCodeWords', ont.UpstreamFecUncorrectedCodeWords);
  checkErr('DownstreamFecUncorrectedCodeWords', ont.DownstreamFecUncorrectedCodeWords);

  const usBer = parseNumeric(ont.UsSdberRate);
  if (usBer !== null && usBer > 0) {
    if (usBer >= thresholds.UsSdberRate.critical) {
      issues.push({ field: 'UsSdberRate', severity: 'critical', value: usBer.toExponential(2), threshold: `≥ ${thresholds.UsSdberRate.critical.toExponential(0)}`, message: 'Critical upstream BER' });
    } else if (usBer >= thresholds.UsSdberRate.warning) {
      warnings.push({ field: 'UsSdberRate', severity: 'warning', value: usBer.toExponential(2), threshold: `≥ ${thresholds.UsSdberRate.warning.toExponential(0)}`, message: 'Elevated upstream BER' });
    }
  }

  const dsBer = parseNumeric(ont.DsSdberRate);
  if (dsBer !== null && dsBer > 0) {
    if (dsBer >= thresholds.DsSdberRate.critical) {
      issues.push({ field: 'DsSdberRate', severity: 'critical', value: dsBer.toExponential(2), threshold: `≥ ${thresholds.DsSdberRate.critical.toExponential(0)}`, message: 'Critical downstream BER' });
    } else if (dsBer >= thresholds.DsSdberRate.warning) {
      warnings.push({ field: 'DsSdberRate', severity: 'warning', value: dsBer.toExponential(2), threshold: `≥ ${thresholds.DsSdberRate.warning.toExponential(0)}`, message: 'Elevated downstream BER' });
    }
  }

  return {
    status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok',
    issues,
    warnings,
  };
}

// ─── Delta-Based Status Analysis ─────────────────────────────────────────────
// The user clears port errors manually to create a "fresh" baseline (no live-pull
// system yet). Static absolute thresholds therefore don't reflect real health.
// Instead we compare the NEW report against the most-recent PREVIOUS report for the
// same ONT and compute a per-DAY rate of change for each error metric. This stays
// accurate whether reports come daily or after a multi-day gap.
//
// Criteria (per day):
//   - Uncorrected FEC rate  > 0           → CRITICAL
//   - BIP / GEM HEC / Missed Bursts >= 5  → CRITICAL
//   - BIP / GEM HEC / Missed Bursts > 0 and < 5 → WARNING
//   - Corrected FEC rate    > 10,000      → WARNING
//   - Any metric that decreased / zeroed out (manual reset) or is unchanged → OK
const DELTA_CRITERIA = {
  uncorFecCriticalPerDay: 0,      // any positive un-cor FEC growth is critical
  burstErrCriticalPerDay: 5,      // bip/gem-hec/missed-bursts >= 5/day is critical
  corFecWarningPerDay: 10000,     // corrected FEC > 10k/day is a warning
};

function dayDiff(newDateStr, oldDateStr) {
  const newD = new Date(newDateStr).getTime();
  const oldD = new Date(oldDateStr).getTime();
  if (!Number.isFinite(newD) || !Number.isFinite(oldD)) return 1;
  const days = (newD - oldD) / 86400000;
  // Clamp to a minimum of 1 day so same-day re-uploads don't divide by ~0 and
  // explode the rate. Reports arriving < 1 day apart are treated as "1 day".
  return days >= 1 ? days : 1;
}

// Returns the per-day rate of growth for a metric. A negative delta means the
// counter was reset/cleared (manual fresh-start) → returned as <= 0 so it reads OK.
function perDayRate(currentVal, previousVal, days) {
  const cur = Number(currentVal) || 0;
  const prev = Number(previousVal) || 0;
  const delta = cur - prev;
  if (delta <= 0) return 0; // reset, zeroed, or unchanged → no growth
  return delta / days;
}

// Computes delta-based status for one ONT given its previous record.
// When there is NO previous record (first time this ONT is seen), we cannot
// compute a delta — treat absolute counts as the baseline using the same rules,
// so a brand-new ONT that already shows growth still surfaces.
function analyzeOntDelta(current, previous) {
  const issues = [];
  const warnings = [];

  // Offline detection mirrors the optical-power logic: if both Rx readings are
  // zero/null the unit is down and we don't run error-delta analysis.
  const ontRx = current.ont_rx_power;
  const oltRx = current.olt_rx_power;
  const isOffline = (ontRx === 0 || ontRx === null || ontRx === undefined) &&
                    (oltRx === 0 || oltRx === null || oltRx === undefined);
  if (isOffline) return { status: 'offline', issues, warnings };

  // If no previous record exists, baseline against zero (first observation).
  const days = previous ? dayDiff(current.report_date, previous.report_date) : 1;
  const prev = previous || {};

  // Burst-style error metrics: BIP (us+ds), GEM HEC, Missed Bursts.
  const burstMetrics = [
    { field: 'us_bip_errors',    label: 'Upstream BIP Errors' },
    { field: 'ds_bip_errors',    label: 'Downstream BIP Errors' },
    { field: 'us_gem_hec_errors',label: 'Upstream GEM HEC Errors' },
    { field: 'us_missed_bursts', label: 'Upstream Missed Bursts' },
  ];
  for (const { field, label } of burstMetrics) {
    const rate = perDayRate(current[field], prev[field], days);
    if (rate >= DELTA_CRITERIA.burstErrCriticalPerDay) {
      issues.push({ field, severity: 'critical', value: `${rate.toFixed(1)}/day`, threshold: `>= ${DELTA_CRITERIA.burstErrCriticalPerDay}/day`, message: `${label} growing critically` });
    } else if (rate > 0) {
      warnings.push({ field, severity: 'warning', value: `${rate.toFixed(1)}/day`, threshold: `< ${DELTA_CRITERIA.burstErrCriticalPerDay}/day`, message: `${label} growing` });
    }
  }

  // Uncorrected FEC (us+ds): ANY positive growth per day is critical.
  for (const { field, label } of [
    { field: 'us_fec_uncorrected', label: 'Upstream Uncorrected FEC' },
    { field: 'ds_fec_uncorrected', label: 'Downstream Uncorrected FEC' },
  ]) {
    const rate = perDayRate(current[field], prev[field], days);
    if (rate > DELTA_CRITERIA.uncorFecCriticalPerDay) {
      issues.push({ field, severity: 'critical', value: `${rate.toFixed(1)}/day`, threshold: `> ${DELTA_CRITERIA.uncorFecCriticalPerDay}/day`, message: `${label} codewords growing` });
    }
  }

  // Corrected FEC (us+ds): > 10,000/day is a warning (correctable but elevated).
  for (const { field, label } of [
    { field: 'us_fec_corrected', label: 'Upstream Corrected FEC' },
    { field: 'ds_fec_corrected', label: 'Downstream Corrected FEC' },
  ]) {
    const rate = perDayRate(current[field], prev[field], days);
    if (rate > DELTA_CRITERIA.corFecWarningPerDay) {
      warnings.push({ field, severity: 'warning', value: `${Math.round(rate).toLocaleString()}/day`, threshold: `> ${DELTA_CRITERIA.corFecWarningPerDay.toLocaleString()}/day`, message: `${label} correction rate elevated` });
    }
  }

  return {
    status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok',
    issues,
    warnings,
  };
}

function calculatePortStats(records) {
  const stats = new Map();

  for (const row of records) {
    const oltName = row.OLTName || row.oltname || row.OLTNAME || 'Unknown OLT';
    const portKey = row['Shelf/Slot/Port'] || row['shelf/slot/port'] || row['SHELF/SLOT/PORT'] || 'Unknown';
    const key = `${oltName}|${portKey}`;
    const ontRx = parseNumeric(row.OntRxOptPwr ?? row.ontrxoptpwr ?? row.ONTRXOPTPWR);

    if (!stats.has(key)) stats.set(key, { values: [], avgOntRxOptPwr: null });
    if (ontRx !== null && ontRx !== 0) stats.get(key).values.push(ontRx);
  }

  for (const port of stats.values()) {
    port.avgOntRxOptPwr = port.values.length > 0
      ? port.values.reduce((sum, value) => sum + value, 0) / port.values.length
      : null;
    delete port.values;
  }

  return stats;
}

// ─── LCP Lookup Builder (robust version) ─────────────────────────────────────
// Builds a Map keyed by "oltname|shelf/slot/port" with LCP metadata.
// Handles port ranges (e.g. "3-4"), xp prefixes, and case-insensitive matching.
function buildLcpLookup(lcpEntries) {
  const map = new Map();

  for (const lcp of lcpEntries) {
    if (!lcp.olt_name || lcp.olt_shelf === undefined || lcp.olt_slot === undefined || !lcp.olt_port) {
      continue;
    }

    const oltBase = lcp.olt_name.toLowerCase().trim();
    const shelf   = String(lcp.olt_shelf).trim();
    const slot    = String(lcp.olt_slot).trim();
    const rawPort = String(lcp.olt_port).trim();
    const numericPort = rawPort.replace(/^xp/i, '');

    const payload = {
      lcp_number:      lcp.lcp_number      || '',
      splitter_number: lcp.splitter_number || '',
      location:        lcp.location        || '',
      address:         lcp.address         || '',
      optic_type:      lcp.optic_type      || '',
      optic_model:     lcp.optic_model     || '',
    };

    // Handle port ranges like "1-4"
    const rng = numericPort.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rng) {
      const lo = parseInt(rng[1], 10);
      const hi = parseInt(rng[2], 10);
      for (let p = lo; p <= hi; p++) {
        const keyNumeric = `${oltBase}|${shelf}/${slot}/${p}`;
        const keyXp      = `${oltBase}|${shelf}/${slot}/xp${p}`;
        if (!map.has(keyNumeric)) map.set(keyNumeric, payload);
        if (!map.has(keyXp))      map.set(keyXp, payload);
      }
    } else {
      const keyNumeric = `${oltBase}|${shelf}/${slot}/${numericPort}`;
      const keyXp      = `${oltBase}|${shelf}/${slot}/xp${numericPort}`;
      if (!map.has(keyNumeric)) map.set(keyNumeric, payload);
      if (!map.has(keyXp))      map.set(keyXp, payload);
    }

    // Also store literal key for exact matches
    const literalKey = `${oltBase}|${shelf}/${slot}/${rawPort.toLowerCase()}`;
    if (!map.has(literalKey)) map.set(literalKey, payload);
  }

  return map;
}

// Look up LCP data for a given ONT row using the Map
function lookupLcp(lcpMap, oltName, shelfSlotPort) {
  if (!oltName || !shelfSlotPort) return null;

  const base = oltName.toLowerCase().trim();

  // Try literal key first
  const literalKey = `${base}|${shelfSlotPort.toLowerCase()}`;
  if (lcpMap.has(literalKey)) return lcpMap.get(literalKey);

  // Parse shelf/slot/port and try normalized keys
  const pm = shelfSlotPort.match(/^(\d+)\/(\d+)\/(?:xp)?(\d+)(?:-\d+)?$/i);
  if (!pm) return null;

  const numericKey = `${base}|${pm[1]}/${pm[2]}/${pm[3]}`;
  if (lcpMap.has(numericKey)) return lcpMap.get(numericKey);

  const xpKey = `${base}|${pm[1]}/${pm[2]}/xp${pm[3]}`;
  if (lcpMap.has(xpKey)) return lcpMap.get(xpKey);

  return null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is invoked either:
    //   A) Directly by the entity automation (no user, uses service role for reads)
    //   B) Manually from the UI by an admin user
    // We accept both — just require the report_id in the body.
    const body = await req.json();
    const reportThresholds = buildThresholds(body.thresholds || body.data?.thresholds_used);
    const isAutomation = !!body.event;
    const user = !isAutomation ? await base44.auth.me().catch(() => null) : null;

    // Support two call shapes:
    //   { report_id, file_url }  — direct call or automation payload
    //   { data: { id, file_url }, event: { ... } } — entity automation wrapping
    let reportId = body.report_id;
    let fileUrl = body.file_url;
    let reportDate = body.report_date || new Date().toISOString();

    // Entity automation shape
    if (!reportId && body.data) {
      reportId = body.data.id || body.event?.entity_id;
      fileUrl = body.data.file_url;
      reportDate = body.data.upload_date || reportDate;
    }

    if (!reportId || !fileUrl) {
      return Response.json({ error: 'Missing report_id or file_url' }, { status: 400 });
    }

    if (!isAutomation) {
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Admin-only when invoked directly: this function performs bulk writes of
      // sensitive ONT performance records and uses service-role DB access.
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Guard against double-processing: if records already exist for this report, abort early.
    const existingCheck = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
      { report_id: reportId }, 'id', 1
    );
    if (existingCheck && existingCheck.length > 0) {
      console.log(`[processPonPmRecords] Records already exist for report ${reportId} — skipping to avoid duplicates.`);
      await base44.asServiceRole.entities.PONPMReport.update(reportId, {
        processing_status: 'completed',
        processing_progress: 100,
      });
      return Response.json({ success: true, skipped: true, reason: 'already_processed' });
    }

    // Mark report as saving so the UI can show a spinner
    await base44.asServiceRole.entities.PONPMReport.update(reportId, {
      processing_status: 'saving',
      processing_progress: 0,
      processing_saved_count: 0,
    });

    // ── Load Subscriber lookup for enrichment at ingest time ─────────────────
    // Build two maps: composite (OLT|PORT|ONTID) and serial fallback
    const subCompositeMap = new Map();
    const subSerialMap = new Map();
    try {
      const activeMetas = await base44.asServiceRole.entities.SubscriberUploadMeta.filter({ status: 'active' }, '-created_date', 1);
      const activeMeta = activeMetas?.[0] || null;
      let allSubs = [];
      if (activeMeta?.id) {
        const PAGE = 5000;
        let offset = 0;
        while (true) {
          const batch = await base44.asServiceRole.entities.SubscriberRecord.filter(
            { upload_id: activeMeta.id },
            'id',
            PAGE,
            offset
          );
          if (!batch || batch.length === 0) break;
          allSubs = allSubs.concat(batch);
          if (batch.length < PAGE) break;
          offset += batch.length;
        }
      }
      // Normalize ONT IDs identically on both sides so "01" matches "1".
      // Purely-numeric IDs have leading zeros stripped; alphanumeric IDs are
      // preserved (uppercased) so vendor-specific IDs still match exactly.
      const normalizeOntIdLocal = (id) => {
        if (id === null || id === undefined) return null;
        const s = String(id).trim().toUpperCase();
        if (!s) return null;
        if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
        return s;
      };
      for (const rec of allSubs) {
        // Compose full address with city + state + zip for accurate geocoding.
        // State disambiguates ambiguous town names (e.g. multiple "Hudson"s).
        const streetAddr = (rec.Address || '').trim();
        const city = (rec.City || '').trim();
        const state = (rec.State || '').trim();
        const zip = (rec.Zip || '').trim();
        const fullAddress = [streetAddr, city, state, zip].filter(Boolean).join(', ');
        const fields = {
          subscriber_account_name: rec.AccountName || '',
          subscriber_address:      fullAddress,
          subscriber_model:        rec.ONTModel      || '',
        };
        // Composite key: normalize OLT + PON port (strip xp prefix) + ONT ID
        const oltNorm = rec.DeviceName ? rec.DeviceName.trim().toUpperCase() : null;
        const sspNorm = rec.LinkedPon  ? rec.LinkedPon.trim().toUpperCase().replace(/\/XP(\d)/g, '/$1') : null;
        const ontId   = normalizeOntIdLocal(rec.OntID);
        if (oltNorm && sspNorm && ontId !== null) {
          subCompositeMap.set(`${oltNorm}|${sspNorm}|${ontId}`, fields);
          // Cross-system OLT-name mismatch fallback (port + ONT ID only)
          subCompositeMap.set(`|${sspNorm}|${ontId}`, fields);
        }
        // Serial fallback
        const serial = rec.ONTSerialNo ? rec.ONTSerialNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : null;
        if (serial && !subSerialMap.has(serial)) subSerialMap.set(serial, fields);
      }
      console.log(`[processPonPmRecords] Subscriber lookup: ${subCompositeMap.size} composite, ${subSerialMap.size} serial keys from ${allSubs.length} records`);
    } catch (err) {
      console.log(`[processPonPmRecords] Subscriber lookup failed (non-fatal): ${err.message}`);
    }

    // ── Load technology standards registry (data-driven classification) ──────
    const techStandards = await loadTechStandards(base44);

    // ── Load LCP lookup (robust Map-based version) ───────────────────────────
    let lcpMap = new Map();
    try {
      const lcpEntries = await base44.asServiceRole.entities.LCPEntry.list('-created_date', 5000);
      if (lcpEntries && lcpEntries.length > 0) {
        lcpMap = buildLcpLookup(lcpEntries);
        console.log(`[processPonPmRecords] Built LCP lookup: ${lcpMap.size} keys from ${lcpEntries.length} entries`);
      } else {
        console.log('[processPonPmRecords] No LCPEntry records found — proceeding without LCP enrichment');
      }
    } catch (err) {
      console.log(`[processPonPmRecords] LCP lookup failed (non-fatal): ${err.message}`);
    }

    // ── Load PREVIOUS report records for delta-based status analysis ─────────
    // We compare this new report against the most-recent prior report for each
    // ONT (keyed by serial, with OLT|port|ontId fallback). Building one lookup
    // map up front avoids a per-row DB query during the insert loop.
    const prevBySerial = new Map();
    const prevByComposite = new Map();
    try {
      // Find the most-recent prior report (strictly before this one) so we have
      // a clean single-report baseline rather than mixing multiple generations.
      const priorReports = await base44.asServiceRole.entities.PONPMReport.filter(
        { processing_status: 'completed' }, '-upload_date', 25
      );
      const newTime = new Date(reportDate).getTime();
      const prevReport = (priorReports || [])
        .filter(r => r.id !== reportId && new Date(r.upload_date).getTime() < newTime)
        .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))[0] || null;

      if (prevReport?.id) {
        const PAGE = 5000;
        let offset = 0;
        let loaded = 0;
        while (true) {
          const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
            { report_id: prevReport.id }, 'id', PAGE, offset
          );
          if (!batch || batch.length === 0) break;
          for (const rec of batch) {
            const sn = rec.serial_number ? rec.serial_number.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : null;
            if (sn && !prevBySerial.has(sn)) prevBySerial.set(sn, rec);
            const oltN = rec.olt_name ? rec.olt_name.trim().toUpperCase() : '';
            const sspN = rec.shelf_slot_port ? rec.shelf_slot_port.trim().toUpperCase().replace(/\/XP(\d)/g, '/$1') : '';
            const oid = rec.ont_id ? String(rec.ont_id).trim().toUpperCase().replace(/^0+/, '') || '0' : '';
            if (sspN && oid) {
              const ckey = `${oltN}|${sspN}|${oid}`;
              if (!prevByComposite.has(ckey)) prevByComposite.set(ckey, rec);
            }
          }
          loaded += batch.length;
          if (batch.length < PAGE) break;
          offset += batch.length;
        }
        console.log(`[processPonPmRecords] Loaded ${loaded} previous records from report ${prevReport.id} for delta analysis (${prevBySerial.size} serial, ${prevByComposite.size} composite keys)`);
      } else {
        console.log('[processPonPmRecords] No previous completed report found — delta analysis baselines against zero');
      }
    } catch (err) {
      console.log(`[processPonPmRecords] Previous-record lookup failed (non-fatal): ${err.message}`);
    }

    // ── Fetch & parse CSV ────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const fileResp = await fetch(fileUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!fileResp.ok) throw new Error(`Failed to fetch file: HTTP ${fileResp.status}`);
    const csvContent = await fileResp.text();

    const rawRecords = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (!rawRecords || rawRecords.length === 0) throw new Error('CSV is empty or unreadable');

    const total = rawRecords.length;
    const portStats = calculatePortStats(rawRecords);
    let lcpMatched = 0;
    let lcpUnmatched = 0;
    console.log(`[processPonPmRecords] Report ${reportId}: processing ${total} ONT rows`);

    // ── Batch insert ─────────────────────────────────────────────────────────
    const BATCH_SIZE = 500;
    let savedCount = 0;

    // Accumulate authoritative status/tech tallies during the insert loop itself.
    // This avoids a second full-table DB scan after all inserts complete — the
    // analysis status and technology type are already computed per record below.
    let finalCritical = 0, finalWarning = 0, finalOk = 0, finalOffline = 0, finalGpon = 0, finalXgs = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = rawRecords.slice(i, i + BATCH_SIZE);

      const records = chunk.map((row) => {
        // Extract fields
        const ont = {};
        for (const field of FIELDS) {
          ont[field] = row[field] ?? row[field.toLowerCase()] ?? row[field.toUpperCase()] ?? null;
        }

        // Normalize serial number
        const serial = normalizeSerial(ont.SerialNumber);

        // SMx exports commonly use ONTModel; older exports may use model.
        // Subscriber enrichment below remains authoritative when available.
        const model = ont.ONTModel || ont.model || '';

        // LCP lookup using robust Map-based matcher
        const oltName = ont.OLTName || '';
        const shelfSlotPort = ont['Shelf/Slot/Port'] || '';
        const lcpData = lookupLcp(lcpMap, oltName, shelfSlotPort);

        if (lcpData) lcpMatched++;
        else if (oltName && shelfSlotPort) lcpUnmatched++;

        // Subscriber enrichment: normalize ONT ID identically to the lookup
        // build path (leading zeros stripped, uppercased) so "01" matches "1".
        const oltNorm = oltName.trim().toUpperCase();
        const sspNorm = shelfSlotPort.trim().toUpperCase().replace(/\/XP(\d)/g, '/$1');
        let ontIdNorm = null;
        if (ont.OntID !== null && ont.OntID !== undefined) {
          const s = String(ont.OntID).trim().toUpperCase();
          ontIdNorm = s && /^\d+$/.test(s) ? (s.replace(/^0+/, '') || '0') : (s || null);
        }
        let subFields = null;
        if (oltNorm && sspNorm && ontIdNorm) {
          subFields = subCompositeMap.get(`${oltNorm}|${sspNorm}|${ontIdNorm}`) || null;
        }
        // Cross-system OLT-name mismatch fallback (port + ONT ID only)
        if (!subFields && sspNorm && ontIdNorm) {
          subFields = subCompositeMap.get(`|${sspNorm}|${ontIdNorm}`) || null;
        }
        if (!subFields && serial) {
          subFields = subSerialMap.get(serial) || null;
        }

        // If subscriber provides an authoritative model (e.g. "5222XG"), prefer
        // it over the OLT-reported model. This is the same precedence used in
        // the frontend enrichOntsWithSubscriber() — keeps DB rows consistent.
        const resolvedModel = subFields?.subscriber_model || model || '';
        const resolvedTechnology = detectTechType(resolvedModel, techStandards) || 'unknown';

        // Build the numeric record first so we can run delta analysis against
        // the previous report's matching ONT.
        const currentRecord = {
          report_date: reportDate,
          serial_number: serial || '',
          olt_name: oltName,
          shelf_slot_port: shelfSlotPort,
          ont_rx_power: parseNumeric(ont.OntRxOptPwr),
          olt_rx_power: parseNumeric(ont.OLTRXOptPwr),
          us_bip_errors: parseInt(ont.UpstreamBipErrors) || 0,
          ds_bip_errors: parseInt(ont.DownstreamBipErrors) || 0,
          us_fec_uncorrected: parseInt(ont.UpstreamFecUncorrectedCodeWords) || 0,
          ds_fec_uncorrected: parseInt(ont.DownstreamFecUncorrectedCodeWords) || 0,
          us_fec_corrected: parseInt(ont.UpstreamFecCorrectedCodeWords) || 0,
          ds_fec_corrected: parseInt(ont.DownstreamFecCorrectedCodeWords) || 0,
          us_gem_hec_errors: parseInt(ont.UpstreamGemHecErrors) || 0,
          us_missed_bursts: parseInt(ont.UpstreamMissedBursts) || 0,
        };

        // Look up the previous-report match: serial first, composite fallback.
        let prevRecord = serial ? prevBySerial.get(serial) : null;
        if (!prevRecord && sspNorm && ontIdNorm) {
          prevRecord = prevByComposite.get(`${oltNorm}|${sspNorm}|${ontIdNorm}`) || null;
        }

        // Delta-based status (manual-reset aware, per-day normalized).
        const analysis = analyzeOntDelta(currentRecord, prevRecord);

        return {
          report_id: reportId,
          report_date: reportDate,
          serial_number: serial || '',
          ont_id: ont.OntID?.toString() || '',
          olt_name: oltName,
          shelf_slot_port: shelfSlotPort,
          model: resolvedModel,
          technology_type: resolvedTechnology,
          ont_rx_power: currentRecord.ont_rx_power,
          olt_rx_power: currentRecord.olt_rx_power,
          ont_tx_power: parseNumeric(ont.OntTxPwr),
          us_bip_errors: currentRecord.us_bip_errors,
          ds_bip_errors: currentRecord.ds_bip_errors,
          us_fec_uncorrected: currentRecord.us_fec_uncorrected,
          ds_fec_uncorrected: currentRecord.ds_fec_uncorrected,
          us_fec_corrected: currentRecord.us_fec_corrected,
          ds_fec_corrected: currentRecord.ds_fec_corrected,
          us_gem_hec_errors: currentRecord.us_gem_hec_errors,
          us_missed_bursts: currentRecord.us_missed_bursts,
          ont_uptime: ont.upTime || null,
          status: analysis.status,
          analysis_issues: analysis.issues,
          analysis_warnings: analysis.warnings,
          lcp_number: lcpData?.lcp_number || '',
          splitter_number: lcpData?.splitter_number || '',
          optic_model: lcpData?.optic_model || '',
          // Subscriber fields — empty string if no match (keeps field consistent)
          subscriber_account_name: subFields?.subscriber_account_name || '',
          subscriber_address:      subFields?.subscriber_address      || '',
          subscriber_model:        subFields?.subscriber_model         || '',
        };
      });

      await base44.asServiceRole.entities.ONTPerformanceRecord.bulkCreate(records);
      savedCount += chunk.length;

      // Tally status/tech counts from this batch's already-analysed records.
      for (const r of records) {
        if (r.status === 'critical') finalCritical++;
        else if (r.status === 'warning') finalWarning++;
        else if (r.status === 'offline') finalOffline++;
        else finalOk++;
        if (r.technology_type === 'GPON') finalGpon++;
        else if (r.technology_type === 'XGS-PON') finalXgs++;
      }

      const progress = Math.round((savedCount / total) * 100);
      console.log(`[processPonPmRecords] ${savedCount}/${total} (${progress}%)`);

      // Update progress on the report record after every batch
      await base44.asServiceRole.entities.PONPMReport.update(reportId, {
        processing_progress: progress,
        processing_saved_count: savedCount,
      });
    }

    // Counts were accumulated during the insert loop above (no extra DB scan).
    console.log(`[processPonPmRecords] Final counts — critical: ${finalCritical}, warning: ${finalWarning}, ok: ${finalOk}, offline: ${finalOffline}, GPON: ${finalGpon}, XGS-PON: ${finalXgs}`);

    // Mark completed and write accurate summary counts back to the report record
    await base44.asServiceRole.entities.PONPMReport.update(reportId, {
      processing_status: 'completed',
      processing_progress: 100,
      processing_saved_count: savedCount,
      // Overwrite the preliminary counts that parsePonPm wrote — these are now accurate
      ont_count:      savedCount,
      critical_count: finalCritical,
      warning_count:  finalWarning,
      ok_count:       finalOk,
      gpon_count:     finalGpon,
      xgs_count:      finalXgs,
    });

    console.log(`[processPonPmRecords] Done — saved ${savedCount} records (LCP matched: ${lcpMatched}, unmatched: ${lcpUnmatched})`);
    return Response.json({ success: true, savedCount, lcpMatched, lcpUnmatched });

  } catch (error) {
    console.error('[processPonPmRecords] Error:', error);

    // Best-effort: mark report as failed
    try {
      const base44Err = createClientFromRequest(req);
      const bodyErr = await req.clone().json().catch(() => ({}));
      const failId = bodyErr.report_id || bodyErr.data?.id || bodyErr.event?.entity_id;
      if (failId) {
        await base44Err.asServiceRole.entities.PONPMReport.update(failId, {
          processing_status: 'failed',
        });
      }
    } catch (_) { /* ignore secondary error */ }

    return Response.json({ error: error.message }, { status: 500 });
  }
});