/**
 * analyzeThermalDegradation
 *
 * Strategy: only look at ONTs that were already flagged 'critical' within the
 * analysis window.  This keeps the dataset small (~5 k rows for March–June vs
 * millions of total records) while still capturing every signal degradation
 * event that matters operationally.
 *
 * Algorithm
 * 1.  Fetch all ONTPerformanceRecord rows with status='critical' inside
 *     [window_start … window_end].
 * 2.  Collect the distinct set of serial numbers from those rows.
 * 3.  For each serial, fetch its full Rx-power history so we can build a
 *     7-day trailing rolling baseline on every critical date.
 * 4.  Extract zip code from subscriber_address (last 5-digit token).
 * 5.  Load WeatherHistory for the window (60 zips × ~130 days = ~7 800 rows).
 * 6.  For each critical event:
 *       baseline_rx = mean(Rx of that serial over [date-baseline_days … date-1])
 *       drop        = baseline_rx – event_rx          (positive = worse)
 *       hot_day     = weather high_temp_f ≥ temp_threshold for that zip on that date
 *     Flag the ONT when drop ≥ drop_threshold_db AND hot_day is true.
 * 7.  Create ONTAlert records for new findings (dedup by serial+open status).
 * 8.  Persist results on ThermalAnalysisRun and return JSON.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PAGE = 1000;

// Extract zip code from denormalized subscriber_address field.
// Expected format examples:
//   "123 Main St, Catskill, NY, 12414"
//   "123 Main St, Catskill, NY 12414"
function extractZip(address) {
  if (!address) return null;
  const m = address.match(/(\d{5})(?:\s*$|-\d{4}$)/);
  return m ? m[1] : null;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function mean(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
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
      window_start,
      window_end,
      drop_threshold_db = 2.5,
      baseline_days = 7,
      temp_threshold_f = 85,   // "hot day" cutoff in °F
    } = body;

    if (!run_id) return Response.json({ error: 'run_id required' }, { status: 400 });

    const startStr = window_start || `${new Date().getUTCFullYear()}-03-01`;
    const endStr   = window_end   || ymd(new Date());

    // ── 1.  Fetch all critical records in the window ──────────────────────
    const criticalRecs = [];
    let skip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        {
          status: 'critical',
          report_date: { $gte: `${startStr}T00:00:00`, $lte: `${endStr}T23:59:59` },
        },
        'report_date',
        PAGE,
        skip,
      );
      if (!page || page.length === 0) break;
      criticalRecs.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }

    const recordsScanned = criticalRecs.length;

    if (recordsScanned === 0) {
      await base44.asServiceRole.entities.ThermalAnalysisRun.update(run_id, {
        status: 'completed',
        records_scanned: 0,
        serials_analyzed: 0,
        flagged_count: 0,
        alerts_created: 0,
        findings: [],
      });
      return Response.json({ success: true, run_id, records_scanned: 0, flagged_count: 0 });
    }

    // ── 2.  Collect distinct serials ──────────────────────────────────────
    const uniqueSerials = [...new Set(criticalRecs.map(r => r.serial_number).filter(Boolean))];

    // ── 3.  Fetch full Rx history for those serials ───────────────────────
    // We fetch everything for those serials (not just the window) so the
    // baseline can look back from window_start.  Chunk into batches of 50
    // serials to stay within query size limits.
    const SERIAL_CHUNK = 50;
    const historyBySerial = new Map(); // serial → [{date: 'YYYY-MM-DD', rx: number}]

    for (let i = 0; i < uniqueSerials.length; i += SERIAL_CHUNK) {
      const chunk = uniqueSerials.slice(i, i + SERIAL_CHUNK);
      let hSkip = 0;
      while (true) {
        const page = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          {
            serial_number: { $in: chunk },
            report_date: { $lte: `${endStr}T23:59:59` },
          },
          'report_date',
          PAGE,
          hSkip,
        );
        if (!page || page.length === 0) break;
        for (const rec of page) {
          if (rec.ont_rx_power == null) continue;
          const serial = rec.serial_number;
          const date   = (rec.report_date || '').slice(0, 10);
          if (!historyBySerial.has(serial)) historyBySerial.set(serial, []);
          historyBySerial.get(serial).push({ date, rx: rec.ont_rx_power });
        }
        if (page.length < PAGE) break;
        hSkip += PAGE;
      }
    }

    // ── 4.  Load weather data ─────────────────────────────────────────────
    // Build a map: weatherMap[zip][date] = high_temp_f
    const allWeather = [];
    let wSkip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.WeatherHistory.filter(
        {
          weather_date: { $gte: startStr, $lte: endStr },
        },
        'weather_date',
        PAGE,
        wSkip,
      );
      if (!page || page.length === 0) break;
      allWeather.push(...page);
      if (page.length < PAGE) break;
      wSkip += PAGE;
    }

    const weatherMap = {}; // weatherMap[zip][date] = high_temp_f
    for (const w of allWeather) {
      const z = String(w.zip_code || '').trim();
      if (!z) continue;
      if (!weatherMap[z]) weatherMap[z] = {};
      weatherMap[z][w.weather_date] = w.high_temp_f;
    }

    // ── 5.  Build a zip lookup from critical records ───────────────────────
    // Most critical records have subscriber_address already denormalized.
    const zipBySerial = {};
    for (const rec of criticalRecs) {
      if (!zipBySerial[rec.serial_number] && rec.subscriber_address) {
        const z = extractZip(rec.subscriber_address);
        if (z) zipBySerial[rec.serial_number] = z;
      }
    }

    // ── 6.  Analyze each critical event ───────────────────────────────────
    const baselineMs = baseline_days * 86400000;
    const findings = []; // one entry per serial (worst event)
    const flaggedSerials = new Set();

    // Build a per-serial map of { date → [rx values] } for fast baseline lookup
    const rxDateMap = new Map(); // serial → Map<date, number[]>
    for (const [serial, history] of historyBySerial.entries()) {
      const dm = new Map();
      for (const { date, rx } of history) {
        if (!dm.has(date)) dm.set(date, []);
        dm.get(date).push(rx);
      }
      rxDateMap.set(serial, dm);
    }

    for (const rec of criticalRecs) {
      const serial = rec.serial_number;
      if (!serial || flaggedSerials.has(serial)) continue; // one finding per serial

      const eventDate = (rec.report_date || '').slice(0, 10);
      const eventRx   = rec.ont_rx_power;
      if (eventRx == null) continue;

      // Build trailing baseline: records from (eventDate - baseline_days) to (eventDate - 1 day)
      const eventMs  = new Date(eventDate).getTime();
      const cutoffMs = eventMs - baselineMs;

      const dm = rxDateMap.get(serial);
      if (!dm) continue;

      const baselineValues = [];
      for (const [date, rxVals] of dm.entries()) {
        const dMs = new Date(date).getTime();
        if (dMs >= cutoffMs && dMs < eventMs) {
          baselineValues.push(...rxVals);
        }
      }

      if (baselineValues.length < 2) continue; // not enough history

      const baselineRx = mean(baselineValues);
      const drop = baselineRx - eventRx; // positive = Rx got worse

      if (drop < drop_threshold_db) continue; // not a significant drop

      // Check temperature correlation
      const zip = zipBySerial[serial];
      let highTemp = null;
      let isHotDay = false;
      if (zip && weatherMap[zip] && weatherMap[zip][eventDate] != null) {
        highTemp = weatherMap[zip][eventDate];
        isHotDay = highTemp >= temp_threshold_f;
      }

      if (!isHotDay) continue; // drop happened but not on a hot day → not thermal

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
        // keep a compact version for the findings[] array stored on the run
        _compact: {
          serial,
          olt: rec.olt_name,
          event_date: eventDate,
          drop_db: +drop.toFixed(2),
          high_temp_f: highTemp,
          address: rec.subscriber_address,
        },
      });
    }

    // ── 7.  Create ONTAlert records (dedup against existing open alerts) ───
    let alertsCreated = 0;
    if (findings.length > 0) {
      // Fetch existing open thermal alerts to avoid duplicates
      const existingAlerts = await base44.asServiceRole.entities.ONTAlert.filter(
        { status: 'open' },
        '-created_date',
        1000,
        0,
      );
      const openSerials = new Set(existingAlerts.map(a => a.serial_number));

      for (const f of findings) {
        if (openSerials.has(f.serial_number)) continue; // already flagged

        await base44.asServiceRole.entities.ONTAlert.create({
          serial_number: f.serial_number,
          olt_name: f.olt_name,
          port: f.port,
          lcp_number: f.lcp_number,
          splitter_number: f.splitter_number,
          ont_rx_power: f.event_rx,
          subscriber_name: f.subscriber_name,
          subscriber_account: f.subscriber_name,
          subscriber_address: f.subscriber_address,
          ont_status: 'critical',
          issue_summary: `Thermal degradation: Rx dropped ${f.drop_db} dB on ${f.event_date} (high ${f.high_temp_f}°F, baseline ${f.baseline_rx} dBm)`,
          priority: f.drop_db >= 5 ? 'high' : 'medium',
          status: 'open',
          flagged_by: user.email,
        });
        alertsCreated++;
        openSerials.add(f.serial_number); // prevent duplicates within this run
      }
    }

    // ── 8.  Compute weather coverage % ────────────────────────────────────
    const serialsWithWeather = findings.filter(f => f.high_temp_f != null).length;
    const weatherPct = findings.length > 0
      ? Math.round((serialsWithWeather / findings.length) * 100)
      : 0;

    const compactFindings = findings.map(f => f._compact);

    await base44.asServiceRole.entities.ThermalAnalysisRun.update(run_id, {
      status: 'completed',
      records_scanned: recordsScanned,
      serials_analyzed: uniqueSerials.length,
      flagged_count: findings.length,
      alerts_created: alertsCreated,
      weather_coverage_pct: weatherPct,
      findings: compactFindings,
    });

    return Response.json({
      success: true,
      run_id,
      window: { start: startStr, end: endStr },
      records_scanned: recordsScanned,
      serials_analyzed: uniqueSerials.length,
      flagged_count: findings.length,
      alerts_created: alertsCreated,
      weather_coverage_pct: weatherPct,
      findings: compactFindings,
    });

  } catch (error) {
    console.error('Thermal analysis error:', error);

    // Try to mark the run as failed
    try {
      const body2 = await new Response(req.body).json().catch(() => ({}));
      if (body2.run_id) {
        const b44 = createClientFromRequest(req);
        await b44.asServiceRole.entities.ThermalAnalysisRun.update(body2.run_id, {
          status: 'failed',
          error_message: error.message,
        });
      }
    } catch (_) { /* best-effort */ }

    return Response.json({ error: error.message }, { status: 500 });
  }
});