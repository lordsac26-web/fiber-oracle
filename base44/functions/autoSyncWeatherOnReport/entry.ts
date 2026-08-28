import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import { SERVICE_ZIPS, REGIONAL_CENTROID, ymd, fetchDailyTemps } from '../../shared/weather.ts';

/**
 * autoSyncWeatherOnReport
 * -----------------------
 * Automation-triggered wrapper around the weather collection logic.
 *
 * Why a separate function instead of reusing `syncWeather` directly?
 *   `syncWeather` is an interactive admin endpoint — it calls `base44.auth.me()`
 *   and rejects requests without an admin user. Automation runs have no user
 *   session, so that guard would 403. This function performs the SAME idempotent
 *   forward-only sync but authorizes via the automation context (service role)
 *   instead of a user, so it can run unattended.
 *
 * This is also the function used by the daily "Daily Weather Sync" scheduled
 * automation, so weather stays current even during quiet periods with no
 * report uploads (the entity-triggered sync alone left a gap after 8/14).
 *
 * Data source: ONE Open-Meteo archive request for the service-area centroid
 * per run, applied to every service-area zip. See shared/weather.ts for why we
 * no longer fetch per-zip (Open-Meteo's per-IP daily quota + inaccurate geocoder).
 *
 * Idempotent: existing (zip_code, weather_date) pairs are skipped, so firing on
 * every report load (or re-firing daily) is a cheap no-op once data is present.
 *
 * Trigger: entity automation on PONPMReport + scheduled "Daily Weather Sync".
 */

const LOOKBACK_DAYS = 14;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // No user session in automation context — run with service role.
    const end = new Date();
    end.setDate(end.getDate() - 1); // yesterday — last reliably-available archive day
    const start = new Date(end);
    start.setDate(start.getDate() - (LOOKBACK_DAYS - 1));
    const startStr = ymd(start);
    const endStr = ymd(end);

    const zips = SERVICE_ZIPS.filter((z) => /^\d{5}$/.test(z));

    // Existing (zip|date) pairs in the window — bounded paginated read.
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
      console.error(`autoSyncWeatherOnReport: archive unavailable for ${startStr}..${endStr}, 0 records`);
      return Response.json({
        success: true,
        window: { start: startStr, end: endStr },
        zips_processed: zips.length,
        records_created: 0,
        archive_failed: 1,
      });
    }

    // Apply the regional high/low to every service-area zip for each new day.
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

    console.log(`autoSyncWeatherOnReport: window ${startStr}..${endStr}, created ${recordsCreated}`);

    return Response.json({
      success: true,
      window: { start: startStr, end: endStr },
      zips_processed: zips.length,
      records_created: recordsCreated,
      archive_failed: 0,
    });
  } catch (error) {
    console.error('autoSyncWeatherOnReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});