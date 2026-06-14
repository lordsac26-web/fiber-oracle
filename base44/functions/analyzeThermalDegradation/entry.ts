/**
 * analyzeThermalDegradation
 *
 * Supports two phases via the `phase` request parameter:
 *
 *   phase: "critical"
 *     Scans all status='critical' records in the full window (~5k rows).
 *     Flags ONTs with heat-correlated Rx drops ≥ drop_threshold_db on days
 *     where high_temp_f ≥ temp_threshold_f. Creates ONTAlert at medium/high
 *     priority. Writes partial stats to ThermalAnalysisRun (status stays
 *     'running' so UI shows phase 1 is done and phase 2 is pending).
 *     Returns phase1_flagged_serials for the caller to pass to phase 2.
 *
 *   phase: "warning"
 *     Same algorithm on status='warning' records. Because there are ~16k
 *     warning rows for a full Mar–Jun window, this phase accepts an optional
 *     sub_window_start / sub_window_end so the caller can chunk it into
 *     monthly slices (each ~4k rows) to stay within rate limits.
 *     Serials already flagged in phase 1 (passed via phase1_flagged_serials)
 *     and serials already seen in prior warning chunks (passed via
 *     already_warned_serials) are skipped.
 *     When is_last_chunk=true the run is finalized to status='completed'.
 *
 * Alert priority mapping:
 *   critical, drop ≥ 5 dB  → high
 *   critical, drop <  5 dB  → medium
 *   warning                 → low  (pre-critical precursor)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAGE = 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function extractZip(address) {
  if (!address) return null;
  const m = address.match(/(\d{5})(?:\s*$|-\d{4}$)/);
  return m ? m[1] : null;
}

function ymd(d) { return d.toISOString().slice(0, 10); }

function mean(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

async function fetchAll(entity, filter, sort, pageSize = PAGE) {
  const rows = [];
  let skip = 0;
  while (true) {
    const page = await entity.filter(filter, sort, pageSize, skip);
    if (!page || page.length === 0) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    skip += pageSize;
    await sleep(60);
  }
  return rows;
}

function runAnalysisPhase(candidateRecs, rxDateMap, weatherMap, zipBySerial, alreadyFlagged, dropThresholdDb, baselineDays, tempThresholdF) {
  const baselineMs = baselineDays * 86400000;
  const findings = [];
  const flaggedSerials = new Set();

  for (const rec of candidateRecs) {
    const serial = rec.serial_number;
    if (!serial || alreadyFlagged.has(serial) || flaggedSerials.has(serial)) continue;

    const eventDate = (rec.report_date || '').slice(0, 10);
    const eventRx   = rec.ont_rx_power;
    if (eventRx == null) continue;

    const dm = rxDateMap.get(serial);
    if (!dm) continue;

    const eventMs  = new Date(eventDate).getTime();
    const cutoffMs = eventMs - baselineMs;
    const baselineValues = [];
    for (const [date, rxVals] of dm.entries()) {
      const dMs = new Date(date).getTime();
      if (dMs >= cutoffMs && dMs < eventMs) baselineValues.push(...rxVals);
    }
    if (baselineValues.length < 2) continue;

    const baselineRx = mean(baselineValues);
    const drop = baselineRx - eventRx;
    if (drop < dropThresholdDb) continue;

    const zip = zipBySerial[serial];
    let highTemp = null;
    let isHotDay = false;
    if (zip && weatherMap[zip]?.[eventDate] != null) {
      highTemp = weatherMap[zip][eventDate];
      isHotDay = highTemp >= tempThresholdF;
    }
    // Weather correlation is informational — do not gate on it.
    // Flag any ONT with a significant Rx drop regardless of weather coverage.
    // If weather IS available and it's NOT a hot day, skip (heat NOT the cause).
    if (highTemp != null && !isHotDay) continue;

    flaggedSerials.add(serial);
    findings.push({
      serial_number: serial,
      olt_name: rec.olt_name,
      port: rec.shelf_slot_port,
      lcp_number: rec.lcp_number,
      splitter_number: rec.splitter_number,
      subscriber_name: rec.subscriber_account_name,
      subscriber_address: rec.subscriber_address,
      event_date: eventDate,
      event_rx: eventRx,
      baseline_rx: +baselineRx.toFixed(2),
      drop_db: +drop.toFixed(2),
      high_temp_f: highTemp,
      zip_code: zip,
      baseline_sample_count: baselineValues.length,
      _compact: {
        serial, olt: rec.olt_name, event_date: eventDate,
        drop_db: +drop.toFixed(2), high_temp_f: highTemp,
        address: rec.subscriber_address,
      },
    });
  }

  return { findings, flaggedSerials };
}

// --------------------------------------------------------------------------
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const {
      run_id,
      phase = 'critical',         // 'critical' | 'warning'
      window_start,
      window_end,
      // Warning phase: optional sub-window for chunked processing
      sub_window_start,            // if set, scan only this date range for warning
      sub_window_end,
      is_last_chunk = false,       // when true, finalize run to 'completed'
      drop_threshold_db = 2.5,
      baseline_days     = 7,
      temp_threshold_f  = 85,
      // Serials already flagged in phase 1 (skip in phase 2)
      phase1_flagged_serials = [],
      // Serials already flagged in prior warning chunks (skip in subsequent chunks)
      already_warned_serials = [],
    } = body;

    if (!run_id) return Response.json({ error: 'run_id required' }, { status: 400 });

    const startStr = window_start || `${new Date().getUTCFullYear()}-03-01`;
    const endStr   = window_end   || ymd(new Date());
    // For warning phase we scan the sub-window if provided, else the full window
    const scanStart = (phase === 'warning' && sub_window_start) ? sub_window_start : startStr;
    const scanEnd   = (phase === 'warning' && sub_window_end)   ? sub_window_end   : endStr;
    const db = base44.asServiceRole.entities;

    // ── 1. Fetch candidate records ─────────────────────────────────────────
    const statusFilter = phase === 'critical' ? 'critical' : 'warning';
    const candidateRecs = await fetchAll(
      db.ONTPerformanceRecord,
      {
        status: statusFilter,
        report_date: { $gte: `${scanStart}T00:00:00`, $lte: `${scanEnd}T23:59:59` },
      },
      'report_date',
    );

    const recordsScanned = candidateRecs.length;

    // ── 2. Unique serials ──────────────────────────────────────────────────
    const phaseSerials = [...new Set(candidateRecs.map(r => r.serial_number).filter(Boolean))];

    // ── 3. Zip lookup ──────────────────────────────────────────────────────
    const zipBySerial = {};
    for (const rec of candidateRecs) {
      if (!zipBySerial[rec.serial_number] && rec.subscriber_address) {
        const z = extractZip(rec.subscriber_address);
        if (z) zipBySerial[rec.serial_number] = z;
      }
    }

    // ── 4. Rx history for this batch of serials ────────────────────────────
    const SERIAL_CHUNK = 50;
    const historyBySerial = new Map();
    for (let i = 0; i < phaseSerials.length; i += SERIAL_CHUNK) {
      const chunk = phaseSerials.slice(i, i + SERIAL_CHUNK);
      const rows = await fetchAll(
        db.ONTPerformanceRecord,
        { serial_number: { $in: chunk }, report_date: { $lte: `${endStr}T23:59:59` } },
        'report_date',
      );
      for (const rec of rows) {
        if (rec.ont_rx_power == null) continue;
        const s = rec.serial_number;
        const d = (rec.report_date || '').slice(0, 10);
        if (!historyBySerial.has(s)) historyBySerial.set(s, []);
        historyBySerial.get(s).push({ date: d, rx: rec.ont_rx_power });
      }
      if (i + SERIAL_CHUNK < phaseSerials.length) await sleep(200);
    }

    // Build date→rxValues lookup
    const rxDateMap = new Map();
    for (const [serial, history] of historyBySerial.entries()) {
      const dm = new Map();
      for (const { date, rx } of history) {
        if (!dm.has(date)) dm.set(date, []);
        dm.get(date).push(rx);
      }
      rxDateMap.set(serial, dm);
    }

    // ── 5. Weather data ────────────────────────────────────────────────────
    const allWeather = await fetchAll(
      db.WeatherHistory,
      { weather_date: { $gte: scanStart, $lte: scanEnd } },
      'weather_date',
    );
    const weatherMap = {};
    for (const w of allWeather) {
      const z = String(w.zip_code || '').trim();
      if (!z) continue;
      if (!weatherMap[z]) weatherMap[z] = {};
      weatherMap[z][w.weather_date] = w.high_temp_f;
    }

    // ── 6. Analysis ────────────────────────────────────────────────────────
    const skipSerials = new Set([...phase1_flagged_serials, ...already_warned_serials]);
    const { findings, flaggedSerials } = runAnalysisPhase(
      candidateRecs, rxDateMap, weatherMap, zipBySerial,
      skipSerials, drop_threshold_db, baseline_days, temp_threshold_f,
    );

    // ── 7. Create ONTAlert records ─────────────────────────────────────────
    const existingAlerts = await db.ONTAlert.filter({ status: 'open' }, '-created_date', 2000, 0);
    const openSerials = new Set(existingAlerts.map(a => a.serial_number));
    const isCriticalPhase = phase === 'critical';

    let alertsCreated = 0;
    for (const f of findings) {
      if (openSerials.has(f.serial_number)) continue;
      await db.ONTAlert.create({
        serial_number: f.serial_number,
        olt_name: f.olt_name,
        port: f.port,
        lcp_number: f.lcp_number,
        splitter_number: f.splitter_number,
        ont_rx_power: f.event_rx,
        subscriber_name: f.subscriber_name,
        subscriber_account: f.subscriber_name,
        subscriber_address: f.subscriber_address,
        ont_status: isCriticalPhase ? 'critical' : 'warning',
        issue_summary: isCriticalPhase
          ? `Thermal degradation: Rx dropped ${f.drop_db} dB on ${f.event_date} (high ${f.high_temp_f}°F, baseline ${f.baseline_rx} dBm)`
          : `Thermal precursor (warning): Rx dropped ${f.drop_db} dB on ${f.event_date} (high ${f.high_temp_f}°F, baseline ${f.baseline_rx} dBm) — pre-critical heat degradation`,
        priority: isCriticalPhase ? (f.drop_db >= 5 ? 'high' : 'medium') : 'low',
        status: 'open',
        flagged_by: user.email,
      });
      alertsCreated++;
      openSerials.add(f.serial_number);
    }

    const withWeather = findings.filter(f => f.high_temp_f != null).length;
    const weatherPct  = findings.length > 0 ? Math.round((withWeather / findings.length) * 100) : 0;
    const compactFindings = findings.map(f => f._compact);

    // ── 8. Persist to ThermalAnalysisRun ──────────────────────────────────
    if (isCriticalPhase) {
      // Phase 1: write partial stats; keep status='running'
      await db.ThermalAnalysisRun.update(run_id, {
        records_scanned: recordsScanned,
        serials_analyzed: phaseSerials.length,
        flagged_count: findings.length,
        alerts_created: alertsCreated,
        weather_coverage_pct: weatherPct,
        findings: compactFindings,
      });
      return Response.json({
        success: true, run_id, phase: 'critical',
        records_scanned: recordsScanned,
        serials_analyzed: phaseSerials.length,
        flagged_count: findings.length,
        alerts_created: alertsCreated,
        weather_coverage_pct: weatherPct,
        findings: compactFindings,
        phase1_flagged_serials: [...flaggedSerials],
        next_phase: 'warning',
      });
    } else {
      // Phase 2 (warning) — may be called multiple times for different sub-windows.
      // Read current run state and accumulate.
      const prevRuns = await db.ThermalAnalysisRun.filter({ id: run_id }, '-created_date', 1);
      const prev = prevRuns?.[0] || {};
      const prevWarnFindings = prev.warning_findings || [];
      const mergedWarnFindings = [...prevWarnFindings, ...compactFindings.map(f => ({ ...f, severity: 'warning_precursor' }))];
      const totalWarningFlagged  = (prev.warning_flagged_count  || 0) + findings.length;
      const totalWarningAlerts   = (prev.warning_alerts_created || 0) + alertsCreated;
      const totalRecords = (prev.records_scanned || 0) + recordsScanned;
      const totalSerials = (prev.serials_analyzed || 0) + phaseSerials.length;

      const updatePayload = {
        records_scanned: totalRecords,
        serials_analyzed: totalSerials,
        warning_flagged_count: totalWarningFlagged,
        warning_alerts_created: totalWarningAlerts,
        warning_findings: mergedWarnFindings,
      };
      if (is_last_chunk) {
        updatePayload.status = 'completed';
      }
      await db.ThermalAnalysisRun.update(run_id, updatePayload);

      return Response.json({
        success: true, run_id, phase: 'warning',
        sub_window: { start: scanStart, end: scanEnd },
        records_scanned: recordsScanned,
        serials_analyzed: phaseSerials.length,
        warning_flagged_count: findings.length,
        warning_alerts_created: alertsCreated,
        weather_coverage_pct: weatherPct,
        warning_findings: compactFindings,
        // Return accumulated warned serials for the next chunk to skip
        warned_serials: [...skipSerials, ...flaggedSerials].filter(s => !phase1_flagged_serials.includes(s)),
        is_complete: is_last_chunk,
      });
    }

  } catch (error) {
    console.error('Thermal analysis error:', error);
    try {
      const body2 = await new Response(req.body).json().catch(() => ({}));
      if (body2?.run_id) {
        const b44 = createClientFromRequest(req);
        await b44.asServiceRole.entities.ThermalAnalysisRun.update(body2.run_id, {
          status: 'failed',
          error_message: error.message,
        });
      }
    } catch (_) { /* ignore */ }
    return Response.json({ error: error.message }, { status: 500 });
  }
});