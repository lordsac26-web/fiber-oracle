import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * analyzeOntTrends
 * ----------------
 * Analyst-grade trend engine for the ONT Analyst agent. Given a single ONT
 * (by serial / FSAN) OR a PON port (olt_name + shelf_slot_port), it builds a
 * report-by-report timeline and derives:
 *
 *   - issue_age:        how many consecutive recent reports the ONT has been
 *                       in a critical/warning state (is this NEW or N reports old?)
 *   - first_issue_date: when problems first appeared in the available history
 *   - status_timeline:  per-report status + key signal/error metrics
 *   - pon_correlation:  do the other ONTs on the same PON port degrade at the
 *                       same time? (points to a shared/plant issue vs. a single
 *                       subscriber drop)
 *   - weather:          daily high/low temp for the subscriber's zip, joined by
 *                       report date, so the agent can reason about thermal
 *                       correlation.
 *
 * The agent calls this instead of reading thousands of raw records directly.
 * Everything returned is compact and pre-summarized so the LLM can reason well.
 */

function normalizeSerial(serial) {
  if (!serial || typeof serial !== 'string') return null;
  const n = serial.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return n.length > 0 ? n : null;
}

function ymd(d) {
  if (!d) return null;
  return String(d).slice(0, 10);
}

// Pull a compact metric snapshot from a raw ONTPerformanceRecord.
function snapshot(r) {
  return {
    date: ymd(r.report_date),
    report_id: r.report_id,
    status: r.status || 'unknown',
    ont_rx_power: r.ont_rx_power ?? null,
    olt_rx_power: r.olt_rx_power ?? null,
    ont_tx_power: r.ont_tx_power ?? null,
    us_fec_uncorrected: r.us_fec_uncorrected ?? null,
    ds_fec_uncorrected: r.ds_fec_uncorrected ?? null,
    us_bip_errors: r.us_bip_errors ?? null,
    ds_bip_errors: r.ds_bip_errors ?? null,
    us_missed_bursts: r.us_missed_bursts ?? null,
    critical_issues: Array.isArray(r.analysis_issues) ? r.analysis_issues.length : 0,
    warnings: Array.isArray(r.analysis_warnings) ? r.analysis_warnings.length : 0,
  };
}

// Count how many of the MOST RECENT consecutive reports are non-ok.
function computeIssueAge(timeline) {
  let age = 0;
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    const s = timeline[i].status;
    if (s === 'critical' || s === 'warning' || s === 'offline') age += 1;
    else break;
  }
  return age;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const serial = normalizeSerial(body.serial_number || body.fsan || '');
    const oltName = body.olt_name || null;
    const port = body.shelf_slot_port || body.port || null;

    if (!serial && !(oltName && port)) {
      return Response.json(
        { error: 'Provide serial_number (FSAN) OR both olt_name and shelf_slot_port.' },
        { status: 400 }
      );
    }

    // ---- 1. Resolve the target ONT's records across all reports ----
    let targetRecords = [];
    if (serial) {
      targetRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { serial_number: serial },
        '-report_date',
        500
      );
    } else {
      targetRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { olt_name: oltName, shelf_slot_port: port },
        '-report_date',
        500
      );
    }

    if (!targetRecords || targetRecords.length === 0) {
      return Response.json({ success: true, found: false, message: 'No records found for that ONT/port.' });
    }

    // Use the most recent record as the identity/context anchor.
    const anchor = targetRecords[0];
    const resolvedOlt = anchor.olt_name || oltName;
    const resolvedPort = anchor.shelf_slot_port || port;
    const zip = (anchor.subscriber_address || '').match(/\b(\d{5})\b/)?.[1] || null;

    // ---- 2. Build the target timeline (oldest -> newest) ----
    const timeline = targetRecords.map(snapshot).sort((a, b) => (a.date < b.date ? -1 : 1));
    const issueAge = computeIssueAge(timeline);
    const firstIssue = timeline.find(
      (t) => t.status === 'critical' || t.status === 'warning' || t.status === 'offline'
    );
    const latest = timeline[timeline.length - 1];
    const isNewIssue = (latest.status === 'critical' || latest.status === 'warning') && issueAge === 1;

    // ---- 3. PON-mate correlation (same OLT + port) ----
    let ponCorrelation = null;
    if (resolvedOlt && resolvedPort) {
      const ponMates = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { olt_name: resolvedOlt, shelf_slot_port: resolvedPort },
        '-report_date',
        500
      );
      // Group mates' status by report date to see plant-wide degradation.
      const byDate = {};
      const serials = new Set();
      for (const r of ponMates) {
        const day = ymd(r.report_date);
        if (!day) continue;
        serials.add(r.serial_number);
        if (!byDate[day]) byDate[day] = { date: day, total: 0, critical: 0, warning: 0 };
        byDate[day].total += 1;
        if (r.status === 'critical' || r.status === 'offline') byDate[day].critical += 1;
        else if (r.status === 'warning') byDate[day].warning += 1;
      }
      const portTimeline = Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
      ponCorrelation = {
        olt_name: resolvedOlt,
        shelf_slot_port: resolvedPort,
        ont_count_on_port: serials.size,
        port_status_by_date: portTimeline,
        // Heuristic: if multiple ONTs on the port went critical in the latest
        // report, this looks like a shared plant issue, not a single drop.
        latest_port_critical_share: portTimeline.length
          ? Math.round(
              (portTimeline[portTimeline.length - 1].critical /
                Math.max(1, portTimeline[portTimeline.length - 1].total)) *
                100
            )
          : 0,
      };
    }

    // ---- 4. Weather join (subscriber zip + report dates) ----
    let weather = null;
    if (zip) {
      const dates = timeline.map((t) => t.date).filter(Boolean);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const wx = await base44.asServiceRole.entities.WeatherHistory.filter(
        { zip_code: zip, weather_date: { $gte: minDate, $lte: maxDate } },
        '-weather_date',
        500
      );
      const wxByDate = {};
      for (const w of wx) wxByDate[w.weather_date] = { high: w.high_temp_f ?? null, low: w.low_temp_f ?? null };
      weather = {
        zip_code: zip,
        by_report_date: timeline.map((t) => ({
          date: t.date,
          status: t.status,
          high_temp_f: wxByDate[t.date]?.high ?? null,
          low_temp_f: wxByDate[t.date]?.low ?? null,
        })),
      };
    }

    return Response.json({
      success: true,
      found: true,
      ont: {
        serial_number: anchor.serial_number,
        ont_id: anchor.ont_id,
        olt_name: resolvedOlt,
        shelf_slot_port: resolvedPort,
        model: anchor.model,
        technology_type: anchor.technology_type,
        lcp_number: anchor.lcp_number || null,
        subscriber_account_name: anchor.subscriber_account_name || null,
        subscriber_address: anchor.subscriber_address || null,
        zip_code: zip,
      },
      summary: {
        reports_observed: timeline.length,
        current_status: latest.status,
        issue_age_reports: issueAge,
        is_new_issue: isNewIssue,
        first_issue_date: firstIssue?.date || null,
        latest_report_date: latest.date,
      },
      status_timeline: timeline,
      pon_correlation: ponCorrelation,
      weather,
    });
  } catch (error) {
    console.error('analyzeOntTrends error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});