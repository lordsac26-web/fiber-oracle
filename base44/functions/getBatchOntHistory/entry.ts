import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Fetches the last N historical data points for a batch of ONT serial numbers.
 * Used to power sparkline charts in the ONT table.
 *
 * Input:
 *   serial_numbers: string[]   — list of normalized serial numbers (max 200)
 *   limit_per_ont: number      — how many history points per ONT (default 10)
 *
 * Output:
 *   {
 *     success: true,
 *     history: {
 *       [serial_number]: {
 *         rx:  number[],   // ont_rx_power values, oldest first
 *         fec: number[],   // us_fec_uncorrected values, oldest first
 *       }
 *     }
 *   }
 *
 * Strategy: query ONTPerformanceRecord filtered by report_date descending,
 * then group by serial_number client-side to avoid N+1 queries.
 * We fetch a batch proportional to the number of serials × limit, capped at 2000 records.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { serial_numbers, limit_per_ont = 10 } = body;

    if (!Array.isArray(serial_numbers) || serial_numbers.length === 0) {
      return Response.json({ error: 'serial_numbers must be a non-empty array' }, { status: 400 });
    }

    // Cap inputs to avoid abuse. The frontend chunks large reports into
    // multiple calls, so 500 per request is a comfortable ceiling.
    const serials = serial_numbers.slice(0, 500);
    const perOnt = Math.min(Math.max(1, limit_per_ont), 20);

    // Per-serial history fetch.
    //
    // PRIOR IMPLEMENTATION (broken): a single `list('-report_date', 2000)` call
    //   was used and then filtered client-side. With N reports × M ONTs per
    //   report, the 2000 newest records are dominated by the most recent
    //   report(s), so most serials end up with only 1 data point — and the
    //   sparkline component requires ≥2 points to render anything. This is
    //   why the Rx/FEC Trend columns appeared empty.
    //
    // CURRENT IMPLEMENTATION: query per serial via the indexed `serial_number`
    //   field. Each call returns the last `perOnt` rows for that ONT
    //   regardless of how busy other ONTs/reports are. We run requests in
    //   small concurrency-bounded batches to stay well under platform rate
    //   limits while keeping latency acceptable for typical batches (≤200).
    // Concurrency is intentionally low — the platform's per-request rate
    // limit is the bottleneck here, not network. 4-wide waves keep us safely
    // under it for batches up to ~500 serials.
    const CONCURRENCY = 4;
    const INTER_WAVE_MS = 80;          // breathing room between waves
    const history = {};
    let coveredSerials = 0;
    let fetchedRecords = 0;

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Per-serial fetch with exponential-backoff retry on 429 rate-limit
    // errors. Most 429s recover within ~1s, so up to 3 retries is plenty.
    const fetchOne = async (serial) => {
      const sn = String(serial || '').toUpperCase();
      if (!sn) return;
      const MAX_ATTEMPTS = 4;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const recs = await base44.asServiceRole.entities.ONTPerformanceRecord
            .filter({ serial_number: sn }, '-report_date', perOnt);
          if (!recs || recs.length === 0) return;
          fetchedRecords += recs.length;
          const ordered = [...recs].reverse(); // oldest → newest
          history[sn] = {
            rx:  ordered.map(r => (r.ont_rx_power != null ? Number(r.ont_rx_power) : null)).filter(v => v !== null && !Number.isNaN(v)),
            fec: ordered.map(r => (r.us_fec_uncorrected != null ? Number(r.us_fec_uncorrected) : null)).filter(v => v !== null && !Number.isNaN(v)),
          };
          if (history[sn].rx.length > 0 || history[sn].fec.length > 0) coveredSerials++;
          return;
        } catch (err) {
          const msg = err?.message || String(err);
          const isRateLimit = /rate limit/i.test(msg) || err?.status === 429;
          if (isRateLimit && attempt < MAX_ATTEMPTS) {
            await sleep(250 * Math.pow(2, attempt - 1)); // 250, 500, 1000ms
            continue;
          }
          if (attempt === MAX_ATTEMPTS) {
            console.warn(`getBatchOntHistory: gave up on ${sn} after ${attempt} attempts:`, msg);
          }
          return;
        }
      }
    };

    // Run in fixed-size waves to bound concurrency.
    for (let i = 0; i < serials.length; i += CONCURRENCY) {
      const slice = serials.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(fetchOne));
      if (i + CONCURRENCY < serials.length) await sleep(INTER_WAVE_MS);
    }

    return Response.json({
      success: true,
      history,
      fetched_records: fetchedRecords,
      covered_serials: coveredSerials,
      total_serials: serials.length,
    });

  } catch (error) {
    console.error('getBatchOntHistory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});