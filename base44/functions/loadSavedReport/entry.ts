/**
 * loadSavedReport - Load a previously processed PONPMReport from the database.
 *
 * Instead of re-parsing the original CSV (which hits CPU limits on large files),
 * this function reconstructs the full analysis result from the already-indexed
 * ONTPerformanceRecord rows + the PONPMReport summary metadata.
 *
 * The returned shape mirrors parsePonPm's response so the frontend can use it
 * without any changes to how it renders the data.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Map optic model number → human-readable type label (same mapping as PortHeaderLabel)
function resolveOpticType(opticModel) {
  if (!opticModel) return '';
  const m = opticModel.trim();
  if (m === '100-05730') return 'XGS-ONLY';
  if (m === '100-05674') return 'XGS-COMBO';
  if (m === '100-05929') return 'XGS-COMBO-EXT';
  return m; // return raw model as fallback
}

function detectTechType(model) {
  if (!model) return null;
  const m = model.toUpperCase().trim().replace(/\s/g, '');
  const xgsModels = ['GP1101X', 'GP4201X', 'GP4201XH', 'DZS522', '522X', 'DZS522X', 'DZS522XX', 'DZS522XG'];
  const gponModels = ['711GE', '717GE', '725G', '725GE', '725GX', '725'];
  for (const x of xgsModels) if (m.includes(x)) return 'XGS-PON';
  for (const g of gponModels) if (m.includes(g)) return 'GPON';
  return null;
}

function detectComboPort(shelfSlotPort) {
  if (!shelfSlotPort) return { isCombo: false, techType: null, comboLabel: null };
  const comboMatch = shelfSlotPort.match(/(?:xp)?(\d+)-(\d+)$/i);
  if (comboMatch) {
    const port1 = parseInt(comboMatch[1]);
    return {
      isCombo: true,
      techType: port1 % 2 === 1 ? 'XGS-PON (combo odd)' : 'GPON (combo even)',
      comboLabel: `Combo ${comboMatch[1]}-${comboMatch[2]}`,
    };
  }
  return { isCombo: false, techType: null, comboLabel: null };
}

const THRESHOLDS = {
  OntRxOptPwr:  { low: -27, marginal: -25, high: -8 },
  OLTRXOptPwr:  { low: -30, marginal: -28, high: -8 },
  UpstreamBipErrors:             { warning: 100,  critical: 1000 },
  DownstreamBipErrors:           { warning: 100,  critical: 1000 },
  UpstreamMissedBursts:          { warning: 10,   critical: 100  },
  UpstreamGemHecErrors:          { warning: 10,   critical: 100  },
  UpstreamFecUncorrectedCodeWords:   { warning: 1, critical: 10 },
  DownstreamFecUncorrectedCodeWords: { warning: 1, critical: 10 },
};

function deriveAnalysis(rec) {
  const issues = [];
  const warnings = [];
  const ontRx = rec.ont_rx_power;
  const oltRx = rec.olt_rx_power;

  const isOffline = (ontRx === 0 || ontRx == null) && (oltRx === 0 || oltRx == null);
  if (isOffline) return { issues: [], warnings: [], status: 'offline' };

  if (ontRx != null) {
    if (ontRx < THRESHOLDS.OntRxOptPwr.low)
      issues.push({ field: 'OntRxOptPwr', severity: 'critical', value: `${ontRx} dBm`, threshold: `< ${THRESHOLDS.OntRxOptPwr.low} dBm`, message: 'ONT Rx power critically low' });
    else if (ontRx < THRESHOLDS.OntRxOptPwr.marginal)
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', value: `${ontRx} dBm`, threshold: `< ${THRESHOLDS.OntRxOptPwr.marginal} dBm`, message: 'ONT Rx power marginal' });
    else if (ontRx > THRESHOLDS.OntRxOptPwr.high)
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', value: `${ontRx} dBm`, threshold: `> ${THRESHOLDS.OntRxOptPwr.high} dBm`, message: 'ONT Rx power too high' });
  }

  if (oltRx != null) {
    if (oltRx < THRESHOLDS.OLTRXOptPwr.low)
      issues.push({ field: 'OLTRXOptPwr', severity: 'critical', value: `${oltRx} dBm`, threshold: `< ${THRESHOLDS.OLTRXOptPwr.low} dBm`, message: 'OLT Rx power critically low' });
    else if (oltRx < THRESHOLDS.OLTRXOptPwr.marginal)
      warnings.push({ field: 'OLTRXOptPwr', severity: 'warning', value: `${oltRx} dBm`, threshold: `< ${THRESHOLDS.OLTRXOptPwr.marginal} dBm`, message: 'OLT Rx power marginal' });
  }

  const checkErr = (fieldKey, val) => {
    if (val == null || !THRESHOLDS[fieldKey]) return;
    if (val >= THRESHOLDS[fieldKey].critical)
      issues.push({ field: fieldKey, severity: 'critical', value: val.toLocaleString(), threshold: `>= ${THRESHOLDS[fieldKey].critical}`, message: 'High error count' });
    else if (val >= THRESHOLDS[fieldKey].warning)
      warnings.push({ field: fieldKey, severity: 'warning', value: val.toLocaleString(), threshold: `>= ${THRESHOLDS[fieldKey].warning}`, message: 'Elevated error count' });
  };

  checkErr('UpstreamBipErrors',               rec.us_bip_errors);
  checkErr('DownstreamBipErrors',              rec.ds_bip_errors);
  checkErr('UpstreamMissedBursts',             rec.us_missed_bursts);
  checkErr('UpstreamGemHecErrors',             rec.us_gem_hec_errors);
  checkErr('UpstreamFecUncorrectedCodeWords',  rec.us_fec_uncorrected);
  checkErr('DownstreamFecUncorrectedCodeWords', rec.ds_fec_uncorrected);

  return {
    issues,
    warnings,
    status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok',
  };
}

function recordToOnt(rec) {
  // Use the status stored in the DB at ingest time — it was computed by processPonPmRecords
  // using the full threshold set including BER rates. Re-deriving it here would be inaccurate
  // because we don't store BER columns and can't apply segment-peer comparison.
  // Build a minimal analysis object that matches the shape the UI expects.
  const storedStatus = rec.status || 'ok';
  const analysis = deriveAnalysis(rec); // still used for issue detail messages in the UI
  // Override the re-derived status with the authoritative stored value
  analysis.status = storedStatus;

  const modelTech = detectTechType(rec.model);
  const comboInfo = detectComboPort(rec.shelf_slot_port);

  return {
    OLTName:          rec.olt_name || '',
    'Shelf/Slot/Port': rec.shelf_slot_port || '',
    OntID:            rec.ont_id || '',
    SerialNumber:     rec.serial_number || '',
    model:            rec.model || '',
    OntRxOptPwr:      rec.ont_rx_power != null  ? String(rec.ont_rx_power)  : null,
    OLTRXOptPwr:      rec.olt_rx_power != null  ? String(rec.olt_rx_power)  : null,
    OntTxPwr:         rec.ont_tx_power != null  ? String(rec.ont_tx_power)  : null,
    UpstreamBipErrors:             rec.us_bip_errors   != null ? String(rec.us_bip_errors)   : '0',
    DownstreamBipErrors:           rec.ds_bip_errors   != null ? String(rec.ds_bip_errors)   : '0',
    UpstreamFecUncorrectedCodeWords:   rec.us_fec_uncorrected  != null ? String(rec.us_fec_uncorrected)  : '0',
    DownstreamFecUncorrectedCodeWords: rec.ds_fec_uncorrected  != null ? String(rec.ds_fec_uncorrected)  : '0',
    UpstreamFecCorrectedCodeWords:     rec.us_fec_corrected    != null ? String(rec.us_fec_corrected)    : '0',
    DownstreamFecCorrectedCodeWords:   rec.ds_fec_corrected    != null ? String(rec.ds_fec_corrected)    : '0',
    UpstreamGemHecErrors:  rec.us_gem_hec_errors  != null ? String(rec.us_gem_hec_errors)  : '0',
    UpstreamMissedBursts:  rec.us_missed_bursts   != null ? String(rec.us_missed_bursts)   : '0',
    upTime:           rec.ont_uptime || null,
    // Subscriber fields stored at ingest time — no UI-side enrichment needed for saved reports
    _subscriberAccountName: rec.subscriber_account_name || '',
    _subscriberAddress:     rec.subscriber_address      || '',
    _subscriberModel:       rec.subscriber_model        || '',
    // Expose as _subscriber shape so the UI subscriber block works
    _subscriber: (rec.subscriber_account_name || rec.subscriber_address) ? {
      account:  rec.subscriber_account_name || '',
      address:  rec.subscriber_address      || '',
      name:     rec.subscriber_account_name || '',
    } : null,
    _lcpNumber:       rec.lcp_number     || '',
    _splitterNumber:  rec.splitter_number || '',
    _lcpLocation:     '',
    _lcpAddress:      '',
    _opticModel:      rec.optic_model    || '',
    _opticType:       rec.optic_model ? resolveOpticType(rec.optic_model) : '',
    _analysis:   analysis,
    _oltName:    rec.olt_name        || 'Unknown OLT',
    _port:       rec.shelf_slot_port || 'Unknown',
    _trends:     null,
    _techType:   modelTech || comboInfo.techType || null,
    _isCombo:    comboInfo.isCombo,
    _comboLabel: comboInfo.comboLabel,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { report_id } = await req.json();
    if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });

    // 1. Load report summary metadata (service role bypasses RLS)
    const reports = await base44.asServiceRole.entities.PONPMReport.filter({ id: report_id });
    const report = reports[0];
    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    // 2. Stream all ONT records in pages of 1000 to avoid memory spikes
    const PAGE_SIZE = 1000;
    let allRecords = [];
    let page = 0;

    while (true) {
      const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id },
        'shelf_slot_port',
        PAGE_SIZE,
        page * PAGE_SIZE
      );
      if (!batch || batch.length === 0) break;
      allRecords = allRecords.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      page++;
    }

    console.log(`[loadSavedReport] Loaded ${allRecords.length} ONT records for report ${report_id}`);

    // Deduplicate by DB record id — use the record's own unique id as the key.
    // Deduplicating by serial_number|shelf_slot_port|ont_id silently drops valid ONTs
    // that have blank serial numbers (some OLTs report no FSAN), collapsing them all
    // to a single record per port. Use the DB-assigned id which is always unique.
    const seenIds = new Set();
    allRecords = allRecords.filter(rec => {
      if (seenIds.has(rec.id)) return false;
      seenIds.add(rec.id);
      return true;
    });
    console.log(`[loadSavedReport] After dedup: ${allRecords.length} records`);

    if (allRecords.length === 0) {
      return Response.json({ error: 'NO_RECORDS', message: 'ONT records not yet indexed for this report.' }, { status: 404 });
    }

    // 3. Map DB rows to ont objects
    const onts = allRecords.map(recordToOnt);

    // 4. Rebuild olts/ports segment stats
    const olts = {};
    for (const ont of onts) {
      const oltName = ont._oltName;
      const portKey = ont._port;
      if (!olts[oltName]) olts[oltName] = { ports: {}, portCount: 0, totalOnts: 0, avgOntRxOptPwr: null, _rxSum: 0, _rxCount: 0 };
      if (!olts[oltName].ports[portKey]) {
        olts[oltName].ports[portKey] = {
          count: 0,
          avgOntRxOptPwr: null, minOntRxOptPwr: null, maxOntRxOptPwr: null,
          avgOLTRXOptPwr: null, minOLTRXOptPwr: null, maxOLTRXOptPwr: null,
          _ontRxSum: 0, _ontRxCount: 0,
          _oltRxSum: 0, _oltRxCount: 0,
        };
      }
      const port = olts[oltName].ports[portKey];
      port.count++;
      olts[oltName].totalOnts++;

      const rx = ont.OntRxOptPwr != null ? parseFloat(ont.OntRxOptPwr) : NaN;
      if (!isNaN(rx) && rx !== 0) {
        port._ontRxSum += rx; port._ontRxCount++;
        if (port.minOntRxOptPwr == null || rx < port.minOntRxOptPwr) port.minOntRxOptPwr = rx;
        if (port.maxOntRxOptPwr == null || rx > port.maxOntRxOptPwr) port.maxOntRxOptPwr = rx;
        olts[oltName]._rxSum += rx; olts[oltName]._rxCount++;
      }

      const oltRx = ont.OLTRXOptPwr != null ? parseFloat(ont.OLTRXOptPwr) : NaN;
      if (!isNaN(oltRx) && oltRx !== 0) {
        port._oltRxSum += oltRx; port._oltRxCount++;
        if (port.minOLTRXOptPwr == null || oltRx < port.minOLTRXOptPwr) port.minOLTRXOptPwr = oltRx;
        if (port.maxOLTRXOptPwr == null || oltRx > port.maxOLTRXOptPwr) port.maxOLTRXOptPwr = oltRx;
      }
    }

    // Finalize averages and clean up temp accumulators
    for (const oltName of Object.keys(olts)) {
      const olt = olts[oltName];
      olt.portCount = Object.keys(olt.ports).length;
      olt.avgOntRxOptPwr = olt._rxCount > 0 ? olt._rxSum / olt._rxCount : null;
      delete olt._rxSum; delete olt._rxCount;

      for (const portKey of Object.keys(olt.ports)) {
        const p = olt.ports[portKey];
        p.avgOntRxOptPwr = p._ontRxCount > 0 ? p._ontRxSum / p._ontRxCount : null;
        p.avgOLTRXOptPwr = p._oltRxCount > 0 ? p._oltRxSum / p._oltRxCount : null;
        delete p._ontRxSum; delete p._ontRxCount;
        delete p._oltRxSum; delete p._oltRxCount;
      }
    }

    // 5. Build summary counts from stored status (authoritative — matches what was saved at ingest)
    const criticalCount = allRecords.filter(r => r.status === 'critical').length;
    const warningCount  = allRecords.filter(r => r.status === 'warning').length;
    const okCount       = allRecords.filter(r => r.status === 'ok').length;
    const offlineCount  = allRecords.filter(r => r.status === 'offline').length;

    console.log(`[loadSavedReport] Counts from stored status — total: ${allRecords.length}, critical: ${criticalCount}, warning: ${warningCount}, ok: ${okCount}, offline: ${offlineCount}`);

    const summary = {
      totalOnts:     allRecords.length,
      criticalCount,
      warningCount,
      okCount,
      offlineCount,
      oltCount:      Object.keys(olts).length,
      portCount:     Object.values(olts).reduce((s, o) => s + Object.keys(o.ports).length, 0),
    };

    return Response.json({ success: true, summary, olts, onts, source: 'database' });

  } catch (error) {
    console.error('[loadSavedReport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});