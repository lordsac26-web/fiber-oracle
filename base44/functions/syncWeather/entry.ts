import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import { SERVICE_ZIPS, REGIONAL_CENTROID, ymd, fetchDailyTemps } from '../../shared/weather.ts';

/**
 * syncWeather
 * -----------
 * Forward-only weather collection for temperature/signal correlation.
 *
 * Data source: ONE Open-Meteo archive request for the service-area centroid
 * per run, applied to every service-area zip (see shared/weather.ts for why we
 * no longer fetch per-zip). Idempotent: existing (zip_code, weather_date) pairs
 * are skipped, so a re-run is a cheap no-op. Archive calls retry on 429/5xx.
 *
 * Open-Meteo Archive: https://archive-api.open-meteo.com/v1/archive  (~1–5 day lag)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const lookbackDays = Math.min(Math.max(parseInt(body.days, 10) || 14, 1), 92);

    const end = new Date();
    end.setDate(end.getDate() - 1); // yesterday — last reliably-available archive day
    const start = new Date(end);
    start.setDate(start.getDate() - (lookbackDays - 1));
    const startStr = ymd(start);
    const endStr = ymd(end);

    const zips = SERVICE_ZIPS.filter((z) => /^\d{5}$/.test(z));

    // Existing (zip|date) pairs in the window — single bounded read.
    const existingHave = new Set();
    let wSkip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.WeatherHistory.filter(
        { weather_date: { $gte: startStr, $lte: endStr } },
        '-weather_date',
        1000,
        wSkip
      );
      if (!page || page.length === 0) break;
      for (const r of page) existingHave.add(`${r.zip_code}|${r.weather_date}`);
      if (page.length < 1000) break;
      wSkip += 1000;
    }

    // Single regional archive call (replaces the old 61 per-zip requests).
    const temps = await fetchDailyTemps(REGIONAL_CENTROID.latitude, REGIONAL_CENTROID.longitude, startStr, endStr);
    if (!temps) {
      return Response.json({
        success: true,
        window: { start: startStr, end: endStr },
        zips_processed: zips.length,
        records_created: 0,
        archive_failed: 1,
      });
    }

    const created = [];
    for (const [date, { high, low }] of Object.entries(temps)) {
      for (const zip of zips) {
        if (existingHave.has(`${zip}|${date}`)) continue;
        created.push({
          zip_code: zip,
          weather_date: date,
          high_temp_f: high,
          low_temp_f: low,
          source: 'open-meteo-regional',
        });
      }
    }

    let recordsCreated = 0;
    for (let i = 0; i < created.length; i += 200) {
      const chunk = created.slice(i, i + 200);
      await base44.asServiceRole.entities.WeatherHistory.bulkCreate(chunk);
      recordsCreated += chunk.length;
    }

    return Response.json({
      success: true,
      window: { start: startStr, end: endStr },
      zips_processed: zips.length,
      records_created: recordsCreated,
      archive_failed: 0,
    });
  } catch (error) {
    console.error('syncWeather error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});