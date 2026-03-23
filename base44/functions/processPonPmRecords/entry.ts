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
 *  3. Enrich with LCP data.
 *  4. bulkCreate ONTPerformanceRecord in configurable batches (default 500).
 *  5. Update PONPMReport.processing_progress after each batch.
 *  6. Mark report as 'completed' or 'failed' when done.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
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
  'OLTName', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'model',
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

function detectTechType(model) {
  if (!model) return null;
  const m = model.toUpperCase().trim();
  const xgsModels = ['GP1101X', 'GP4201X', 'GP4201XH', 'DZS522', '522X', 'DZS522X', 'DZS522XX', 'DZS522XG'];
  const gponModels = ['711GE', '717GE', '725G', '725GE', '725GX', '725'];
  for (const x of xgsModels) if (m.includes(x.replace(/\s/g, ''))) return 'XGS-PON';
  for (const g of gponModels) if (m.includes(g.replace(/\s/g, ''))) return 'GPON';
  return null;
}

function analyzeOnt(ont) {
  const issues = [];
  const warnings = [];
  const ontRx = parseNumeric(ont.OntRxOptPwr);
  const oltRx = parseNumeric(ont.OLTRXOptPwr);

  const isOffline = (ontRx === 0 || ontRx === null) && (oltRx === 0 || oltRx === null);
  if (isOffline) return { status: 'offline', issues, warnings };

  if (ontRx !== null) {
    if (ontRx < THRESHOLDS.OntRxOptPwr.low) issues.push('OntRxOptPwr');
    else if (ontRx < THRESHOLDS.OntRxOptPwr.marginal) warnings.push('OntRxOptPwr');
  }
  if (oltRx !== null) {
    if (oltRx < THRESHOLDS.OLTRXOptPwr.low) issues.push('OLTRXOptPwr');
    else if (oltRx < THRESHOLDS.OLTRXOptPwr.marginal) warnings.push('OLTRXOptPwr');
  }

  const checkErr = (field, val) => {
    const n = parseNumeric(val);
    if (n !== null && THRESHOLDS[field]) {
      if (n >= THRESHOLDS[field].critical) issues.push(field);
      else if (n >= THRESHOLDS[field].warning) warnings.push(field);
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
    if (usBer >= THRESHOLDS.UsSdberRate.critical) issues.push('UsSdberRate');
    else if (usBer >= THRESHOLDS.UsSdberRate.warning) warnings.push('UsSdberRate');
  }
  const dsBer = parseNumeric(ont.DsSdberRate);
  if (dsBer !== null && dsBer > 0) {
    if (dsBer >= THRESHOLDS.DsSdberRate.critical) issues.push('DsSdberRate');
    else if (dsBer >= THRESHOLDS.DsSdberRate.warning) warnings.push('DsSdberRate');
  }

  return {
    status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok',
    issues,
    warnings,
  };
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

      if (user.role !== 'admin') {
        const matchingReports = await base44.entities.PONPMReport.filter({ id: reportId }, null, 1);
        const report = matchingReports?.[0];

        if (!report || report.created_by !== user.email) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
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

    // ── Load LCP lookup ──────────────────────────────────────────────────────
    let lcpEntries = [];
    try {
      lcpEntries = await base44.asServiceRole.entities.LCPEntry.list();
    } catch (_) {
      // Non-fatal: proceed without LCP enrichment
    }

    const lcpLookup = {};
    for (const lcp of lcpEntries) {
      if (!lcp.olt_name || lcp.olt_shelf === undefined || lcp.olt_slot === undefined || !lcp.olt_port) continue;
      const oltName = lcp.olt_name.toLowerCase().trim();
      const shelf = lcp.olt_shelf.toString().trim();
      const slot = lcp.olt_slot.toString().trim();
      const rawPort = lcp.olt_port.toString().trim();
      const opticType = (lcp.optic_type || '').toUpperCase();
      const isCombo = opticType.includes('COMBO');
      const data = {
        lcp_number: lcp.lcp_number,
        splitter_number: lcp.splitter_number,
        location: lcp.location,
        address: lcp.address,
        optic_type: lcp.optic_type || '',
      };

      // Store literal key
      lcpLookup[`${oltName}|${shelf}/${slot}/${rawPort.toLowerCase()}`] = data;

      // Strip xp prefix for numeric processing
      const numericPort = rawPort.replace(/^xp/i, '');

      // Check for range: handles "3-4", "xp3-4", etc.
      const rng = numericPort.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rng) {
        const lo = parseInt(rng[1], 10);
        const hi = parseInt(rng[2], 10);
        for (let p = lo; p <= hi; p++) {
          lcpLookup[`${oltName}|${shelf}/${slot}/${p}`] = data;
          lcpLookup[`${oltName}|${shelf}/${slot}/xp${p}`] = data;
        }
      } else {
        // Single port — store both numeric and xp-prefixed variants
        lcpLookup[`${oltName}|${shelf}/${slot}/${numericPort}`] = data;
        lcpLookup[`${oltName}|${shelf}/${slot}/xp${numericPort}`] = data;
      }
    }
    console.log(`[processPonPmRecords] Built LCP lookup with ${Object.keys(lcpLookup).length} keys from ${lcpEntries.length} LCP entries`);

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
    console.log(`[processPonPmRecords] Report ${reportId}: processing ${total} ONT rows`);

    // ── Batch insert ─────────────────────────────────────────────────────────
    const BATCH_SIZE = 500;
    let savedCount = 0;

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

        // DZS model detection from FSAN prefix
        let model = ont.model;
        if ((!model || model === 'Unknown' || model === 'N/A' || model === '') && serial) {
          if (serial.startsWith('050') || serial.startsWith('051') || serial.startsWith('053')) {
            model = 'DZS 522x XG';
          }
        }

        // LCP lookup
        const oltName = (ont.OLTName || '').toLowerCase().trim();
        const shelfSlotPort = ont['Shelf/Slot/Port'] || '';
        let lcpData = lcpLookup[`${oltName}|${shelfSlotPort}`.toLowerCase()];
        if (!lcpData && shelfSlotPort) {
          const pm = shelfSlotPort.match(/^(\d+)\/(\d+)\/(?:xp)?(\d+)(?:-\d+)?$/i);
          if (pm) {
            lcpData = lcpLookup[`${oltName}|${pm[1]}/${pm[2]}/${pm[3]}`]
                   || lcpLookup[`${oltName}|${pm[1]}/${pm[2]}/xp${pm[3]}`];
          }
        }

        // Analyse
        const analysis = analyzeOnt(ont);

        return {
          report_id: reportId,
          report_date: reportDate,
          serial_number: serial || '',
          ont_id: ont.OntID?.toString() || '',
          olt_name: ont.OLTName || '',
          shelf_slot_port: shelfSlotPort,
          model: model || '',
          ont_rx_power: parseNumeric(ont.OntRxOptPwr),
          olt_rx_power: parseNumeric(ont.OLTRXOptPwr),
          ont_tx_power: parseNumeric(ont.OntTxPwr),
          us_bip_errors: parseInt(ont.UpstreamBipErrors) || 0,
          ds_bip_errors: parseInt(ont.DownstreamBipErrors) || 0,
          us_fec_uncorrected: parseInt(ont.UpstreamFecUncorrectedCodeWords) || 0,
          ds_fec_uncorrected: parseInt(ont.DownstreamFecUncorrectedCodeWords) || 0,
          us_fec_corrected: parseInt(ont.UpstreamFecCorrectedCodeWords) || 0,
          ds_fec_corrected: parseInt(ont.DownstreamFecCorrectedCodeWords) || 0,
          us_gem_hec_errors: parseInt(ont.UpstreamGemHecErrors) || 0,
          us_missed_bursts: parseInt(ont.UpstreamMissedBursts) || 0,
          ont_uptime: ont.upTime || null,
          status: analysis.status,
          lcp_number: lcpData?.lcp_number || '',
          splitter_number: lcpData?.splitter_number || '',
        };
      });

      await base44.asServiceRole.entities.ONTPerformanceRecord.bulkCreate(records);
      savedCount += chunk.length;

      const progress = Math.round((savedCount / total) * 100);
      console.log(`[processPonPmRecords] ${savedCount}/${total} (${progress}%)`);

      // Update progress on the report record after every batch
      await base44.asServiceRole.entities.PONPMReport.update(reportId, {
        processing_progress: progress,
        processing_saved_count: savedCount,
      });
    }

    // Mark completed
    await base44.asServiceRole.entities.PONPMReport.update(reportId, {
      processing_status: 'completed',
      processing_progress: 100,
      processing_saved_count: savedCount,
    });

    console.log(`[processPonPmRecords] Done — saved ${savedCount} records for report ${reportId}`);
    return Response.json({ success: true, savedCount });

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