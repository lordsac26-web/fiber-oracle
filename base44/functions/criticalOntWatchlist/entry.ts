import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

/**
 * criticalOntWatchlist
 * --------------------
 * Admin-only. Returns the top N (default 50) CURRENTLY-critical ONTs from a
 * given report, each enriched with its current error metrics plus a trend
 * "delta" summary computed across the most recent 5 and 10 reports.
 *
 * Why server-side:
 *   - Computing per-serial history for 50 ONTs from the client would mean 50
 *     round-trips (or one huge unfiltered fetch). Doing it here lets us page
 *     the history query and aggregate once, returning a compact payload.
 *
 * Delta semantics (per metric):
 *   - current  : value in the latest report for that ONT
 *   - prev5     : value 5 reports back (or oldest available within the window)
 *   - prev10    : value 10 reports back (or oldest available within the window)
 *   - delta5    : current - prev5   (null if not enough history)
 *   - delta10   : current - prev10  (null if not enough history)
 *   - points    : how many distinct reports we actually had in each window
 *
 * Severity ranking (to pick the "top" 50): we score by the metrics that most
 * commonly drive a critical classification — low Rx power and high error
 * counters — so the worst offenders surface first.
 */

const METRICS = [
  'ont_rx_power',
  'olt_rx_power',
  'us_bip_errors',
  'ds_bip_errors',
  'us_fec_uncorrected',
  'ds_fec_uncorrected',
  'us_gem_hec_errors',
  'us_missed_bursts',
];

function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Higher = worse. Low Rx (more negative) and high error counters increase score.
function severityScore(rec) {
  let score = 0;
  const rx = num(rec.ont_rx_power);
  if (rx != null && rx < -25) score += (-25 - rx) * 10; // each dB below -25 weighs heavily
  for (const f of ['us_bip_errors', 'ds_bip_errors', 'us_fec_uncorrected', 'ds_fec_uncorrected', 'us_gem_hec_errors', 'us_missed_bursts']) {
    const n = num(rec[f]);
    if (n != null) score += n;
  }
  return score;
}

// Build a delta summary for one metric given an ascending-by-date history array.
function metricDelta(historyAsc, field) {
  const series = historyAsc
    .map(h => ({ date: h.date, value: num(h[field]) }))
    .filter(p => p.value != null);
  if (series.length === 0) return { current: null, prev5: null, prev10: null, delta5: null, delta10: null, points5: 0, points10: 0 };

  const current = series[series.length - 1].value;

  // Last 5 / last 10 windows (inclusive of current). Compare current vs the
  // oldest point within each window.
  const win5 = series.slice(-5);
  const win10 = series.slice(-10);
  const prev5 = win5.length > 1 ? win5[0].value : null;
  const prev10 = win10.length > 1 ? win10[0].value : null;

  return {
    current,
    prev5,
    prev10,
    delta5: prev5 != null ? +(current - prev5).toFixed(3) : null,
    delta10: prev10 != null ? +(current - prev10).toFixed(3) : null,
    points5: win5.length,
    points10: win10.length,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const reportId = body.report_id;
    const limit = Math.min(Math.max(parseInt(body.limit) || 50, 1), 100);
    if (!reportId) return Response.json({ error: 'Missing report_id' }, { status: 400 });

    // 1) Pull this report's records and keep only the currently-critical ones.
    //    Page through to be safe on large reports.
    const critical = [];
    let skip = 0;
    const PAGE = 500;
    // We filter by report + status to minimize payload.
    // (ONTPerformanceRecord stores computed status at ingest time.)
    while (true) {
      const page = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { report_id: reportId, status: 'critical' }, '-report_date', PAGE, skip
      );
      if (!page || page.length === 0) break;
      critical.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
      if (skip > 20000) break; // hard safety cap
    }

    if (critical.length === 0) {
      return Response.json({ success: true, report_id: reportId, count: 0, onts: [] });
    }

    // 2) Rank by severity and take the top N.
    critical.sort((a, b) => severityScore(b) - severityScore(a));
    const top = critical.slice(0, limit);
    const serials = top.map(r => r.serial_number).filter(Boolean);

    // 3) Batch-fetch history for these serials. We query the most recent ~15
    //    records per serial (10-report window + headroom) across all reports.
    //    Done with a bounded per-serial fetch to keep latency predictable.
    const historyBySerial = {};
    const CONCURRENCY = 6;
    let idx = 0;
    async function worker() {
      while (idx < serials.length) {
        const myIdx = idx++;
        const serial = serials[myIdx];
        const recs = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { serial_number: serial }, '-report_date', 15
        );
        // ascending by date for delta math
        const asc = (recs || [])
          .map(r => ({
            date: r.report_date,
            ont_rx_power: r.ont_rx_power,
            olt_rx_power: r.olt_rx_power,
            us_bip_errors: r.us_bip_errors,
            ds_bip_errors: r.ds_bip_errors,
            us_fec_uncorrected: r.us_fec_uncorrected,
            ds_fec_uncorrected: r.ds_fec_uncorrected,
            us_gem_hec_errors: r.us_gem_hec_errors,
            us_missed_bursts: r.us_missed_bursts,
          }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        historyBySerial[serial] = asc;
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, serials.length) }, worker));

    // 4) Assemble the response: current metrics + per-metric deltas.
    const onts = top.map(rec => {
      const asc = historyBySerial[rec.serial_number] || [];
      const deltas = {};
      for (const m of METRICS) deltas[m] = metricDelta(asc, m);
      return {
        serial_number: rec.serial_number,
        ont_id: rec.ont_id,
        olt_name: rec.olt_name,
        port: rec.shelf_slot_port,
        model: rec.model,
        lcp_number: rec.lcp_number,
        splitter_number: rec.splitter_number,
        subscriber_name: rec.subscriber_account_name,
        subscriber_address: rec.subscriber_address,
        status: rec.status,
        severity_score: +severityScore(rec).toFixed(2),
        report_count: asc.length,
        current: {
          ont_rx_power: num(rec.ont_rx_power),
          olt_rx_power: num(rec.olt_rx_power),
          ont_tx_power: num(rec.ont_tx_power),
          us_bip_errors: num(rec.us_bip_errors),
          ds_bip_errors: num(rec.ds_bip_errors),
          us_fec_uncorrected: num(rec.us_fec_uncorrected),
          ds_fec_uncorrected: num(rec.ds_fec_uncorrected),
          us_gem_hec_errors: num(rec.us_gem_hec_errors),
          us_missed_bursts: num(rec.us_missed_bursts),
        },
        deltas,
      };
    });

    return Response.json({
      success: true,
      report_id: reportId,
      total_critical: critical.length,
      count: onts.length,
      onts,
    });
  } catch (error) {
    console.error('criticalOntWatchlist error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});