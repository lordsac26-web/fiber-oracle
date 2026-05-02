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

    const body = await req.json();
    const { serial_numbers, limit_per_ont = 10 } = body;

    if (!Array.isArray(serial_numbers) || serial_numbers.length === 0) {
      return Response.json({ error: 'serial_numbers must be a non-empty array' }, { status: 400 });
    }

    // Cap inputs to avoid abuse
    const serials = serial_numbers.slice(0, 200);
    const perOnt = Math.min(Math.max(1, limit_per_ont), 20);

    // We'll accumulate results per serial number.
    // To keep this efficient we query in serial batches of 50 at a time
    // since the entity API doesn't support IN queries directly —
    // but we CAN fetch ALL records for a report_id or by serial.
    // Since individual ONT history queries would be N calls, we instead
    // fetch ONTPerformanceRecord ordered by report_date desc with a high limit
    // and filter client-side to collect up to perOnt points per serial.

    // Determine max fetch size: serials.length * perOnt, bounded to 2000 to stay fast
    const fetchLimit = Math.min(serials.length * perOnt * 2, 2000);

    // Build a Set for O(1) membership checks
    const serialSet = new Set(serials.map(s => s.toUpperCase()));

    // Fetch recent records ordered newest-first
    // We use asServiceRole to bypass RLS restrictions on cross-user queries
    const records = await base44.asServiceRole.entities.ONTPerformanceRecord.list('-report_date', fetchLimit);

    // Group into buckets: serial → [records sorted newest first]
    const buckets = {};
    for (const rec of records) {
      const sn = (rec.serial_number || '').toUpperCase();
      if (!serialSet.has(sn)) continue;
      if (!buckets[sn]) buckets[sn] = [];
      if (buckets[sn].length < perOnt) {
        buckets[sn].push(rec);
      }
    }

    // Build the response — reverse each bucket so it's oldest-first (correct for sparklines)
    const history = {};
    for (const [sn, recs] of Object.entries(buckets)) {
      const sorted = [...recs].reverse(); // oldest first
      history[sn] = {
        rx:  sorted.map(r => (r.ont_rx_power != null ? Number(r.ont_rx_power) : null)).filter(v => v !== null),
        fec: sorted.map(r => (r.us_fec_uncorrected != null ? Number(r.us_fec_uncorrected) : null)).filter(v => v !== null),
      };
    }

    return Response.json({
      success: true,
      history,
      fetched_records: records.length,
      covered_serials: Object.keys(history).length,
    });

  } catch (error) {
    console.error('getBatchOntHistory error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});