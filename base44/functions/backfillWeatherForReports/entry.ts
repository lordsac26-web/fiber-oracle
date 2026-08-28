import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import { SERVICE_ZIPS, REGIONAL_CENTROID, ymd, fetchDailyTemps } from '../../shared/weather.ts';

/**
 * backfillWeatherForReports
 * -------------------------
 * ONE-TIME admin backfill. Populates WeatherHistory for every distinct report
 * date that already exists in PONPMReport, across the service-area zip list.
 *
 * Strategy:
 *   1. Collect distinct report days (YYYY-MM-DD) from PONPMReport.upload_date.
 *      Clamp to "yesterday" — the archive API does not have today's data yet.
 *   2. Compute one bounded [min..max] window covering those days. Fetch the
 *      full window from the Open-Meteo archive ONCE for the service-area
 *      centroid, then KEEP only the rows that fall on an actual report day.
 *   3. Idempotent: skip any (zip, date) already present in WeatherHistory.
 *
 * Data source: ONE regional archive call per run (see shared/weather.ts for
 * why we no longer fetch per-zip). The historical window can span months, so
 * the single call is both faster and far less likely to trip Open-Meteo's
 * per-IP quota than the old 61-call burst.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Latest archive-available day (yesterday). Report days after this are clamped out.
    const maxAllowed = new Date();
    maxAllowed.setDate(maxAllowed.getDate() - 1);
    const maxAllowedStr = ymd(maxAllowed);

    // 1. Distinct report days from PONPMReport.upload_date (paginated read).
    const reportDays = new Set();
    let rSkip = 0;
    while (true) {
      const page = await base44.asServiceRole.entities.PONPMReport.list('-upload_date', 500, rSkip);
      if (!page || page.length === 0) break;
      for (const r of page) {
        if (!r.upload_date) continue;
        const day = String(r.upload_date).slice(0, 10);
        if (day <= maxAllowedStr) reportDays.add(day);
      }
      if (page.length < 500) break;
      rSkip += 500;
    }

    const targetDays = [...reportDays].sort();
    if (targetDays.length === 0) {
      return Response.json({ success: true, message: 'No report days available to backfill.', records_created: 0 });
    }

    const startStr = targetDays[0];
    const endStr = targetDays[targetDays.length - 1];
    const targetSet = new Set(targetDays);
    const zips = SERVICE_ZIPS.filter((z) => /^\d{5}$/.test(z));

    // 2. Existing (zip|date) pairs across the window — bounded paginated read.
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

    // 3. Single regional archive call across [start..end]; keep only report days.
    const temps = await fetchDailyTemps(REGIONAL_CENTROID.latitude, REGIONAL_CENTROID.longitude, startStr, endStr);
    if (!temps) {
      return Response.json({
        success: true,
        window: { start: startStr, end: endStr },
        report_days: targetDays.length,
        zips_processed: zips.length,
        records_created: 0,
        archive_failed: 1,
      });
    }

    const created = [];
    for (const [date, { high, low }] of Object.entries(temps)) {
      if (!targetSet.has(date)) continue; // only store actual report days
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

    // 4. Bulk insert in chunks.
    let recordsCreated = 0;
    for (let i = 0; i < created.length; i += 200) {
      const chunk = created.slice(i, i + 200);
      await base44.asServiceRole.entities.WeatherHistory.bulkCreate(chunk);
      recordsCreated += chunk.length;
    }

    return Response.json({
      success: true,
      window: { start: startStr, end: endStr },
      report_days: targetDays.length,
      zips_processed: zips.length,
      records_created: recordsCreated,
      archive_failed: 0,
    });
  } catch (error) {
    console.error('backfillWeatherForReports error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});