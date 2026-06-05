import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * syncWeather
 * -----------
 * Forward-only weather collection for temperature/signal correlation.
 *
 * Flow:
 *   1. Collect the set of unique 5-digit zip codes currently in the system
 *      (from SubscriberRecord — the authoritative source of customer zips).
 *   2. Geocode each zip ONCE to lat/lng via the Open-Meteo geocoding API
 *      (free, no key). Geocoding for a zip is cached implicitly because we
 *      only ever look up zips we don't already have weather for.
 *   3. For each zip, pull daily high/low for the target date window from the
 *      Open-Meteo archive API and upsert into WeatherHistory.
 *
 * Idempotent: a (zip_code, weather_date) pair that already exists is skipped,
 * so re-running after a re-upload is a cheap no-op.
 *
 * Open-Meteo notes:
 *   - Geocoding: https://geocoding-api.open-meteo.com/v1/search?name=ZIP&country=US
 *   - Archive:   https://archive-api.open-meteo.com/v1/archive
 *     The archive API has a ~5 day lag for "final" data, so by default we
 *     request a window ending 1 day ago to ensure data is available.
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

// Geocode a US zip code to { latitude, longitude }. Open-Meteo's geocoding
// supports postal-code lookups when the name is the zip and country is US.
async function geocodeZip(zip) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(zip)}&count=1&country=US&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const hit = json?.results?.[0];
  if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') {
    return null;
  }
  return { latitude: hit.latitude, longitude: hit.longitude };
}

// Fetch daily high/low (Fahrenheit) for a coordinate over a date window.
// Returns a map: { 'YYYY-MM-DD': { high, low } }
async function fetchDailyTemps(lat, lng, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit',
    timezone: 'America/New_York',
  });
  const res = await fetch(`${ARCHIVE_URL}?${params.toString()}`);
  if (!res.ok) return {};
  const json = await res.json();
  const days = json?.daily?.time || [];
  const highs = json?.daily?.temperature_2m_max || [];
  const lows = json?.daily?.temperature_2m_min || [];
  const out = {};
  for (let i = 0; i < days.length; i += 1) {
    const high = highs[i];
    const low = lows[i];
    if (high == null && low == null) continue;
    out[days[i]] = {
      high: high == null ? null : Math.round(high),
      low: low == null ? null : Math.round(low),
    };
  }
  return out;
}

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

    // Optional override window. Default: last `days` days ending 1 day ago
    // (archive API has a short lag for finalized data).
    const body = await req.json().catch(() => ({}));
    const lookbackDays = Math.min(Math.max(parseInt(body.days, 10) || 14, 1), 92);

    const end = new Date();
    end.setDate(end.getDate() - 1); // yesterday — last day archive reliably has
    const start = new Date(end);
    start.setDate(start.getDate() - (lookbackDays - 1));
    const startStr = ymd(start);
    const endStr = ymd(end);

    // 1. Collect unique zips from SubscriberRecord (paged to be safe).
    const zipSet = new Set();
    let skip = 0;
    const pageSize = 500;
    // SubscriberRecord can be large — page until exhausted.
    // We only need the Zip field, but the SDK returns full rows.
    // Loop is bounded by the dataset size; in practice a handful of pages.
    while (true) {
      const page = await base44.asServiceRole.entities.SubscriberRecord.list('-created_date', pageSize, skip);
      if (!page || page.length === 0) break;
      for (const row of page) {
        const zip = (row.Zip || '').toString().trim().slice(0, 5);
        if (/^\d{5}$/.test(zip)) zipSet.add(zip);
      }
      if (page.length < pageSize) break;
      skip += pageSize;
    }

    const zips = [...zipSet];
    if (zips.length === 0) {
      return Response.json({
        success: true,
        message: 'No valid zip codes found in subscriber data.',
        zips_processed: 0,
        records_created: 0,
      });
    }

    let recordsCreated = 0;
    let recordsSkipped = 0;
    const failedZips = [];

    for (const zip of zips) {
      // Which dates in the window do we already have for this zip?
      const existing = await base44.asServiceRole.entities.WeatherHistory.filter({ zip_code: zip }, '-weather_date', 500);
      const existingDates = new Set(
        existing
          .filter((r) => r.weather_date >= startStr && r.weather_date <= endStr)
          .map((r) => r.weather_date)
      );

      const geo = await geocodeZip(zip);
      if (!geo) {
        failedZips.push(zip);
        continue;
      }

      const temps = await fetchDailyTemps(geo.latitude, geo.longitude, startStr, endStr);

      const toCreate = [];
      for (const [date, { high, low }] of Object.entries(temps)) {
        if (existingDates.has(date)) {
          recordsSkipped += 1;
          continue;
        }
        toCreate.push({
          zip_code: zip,
          weather_date: date,
          high_temp_f: high,
          low_temp_f: low,
          source: 'open-meteo',
        });
      }

      if (toCreate.length > 0) {
        await base44.asServiceRole.entities.WeatherHistory.bulkCreate(toCreate);
        recordsCreated += toCreate.length;
      }
    }

    return Response.json({
      success: true,
      window: { start: startStr, end: endStr },
      zips_processed: zips.length,
      records_created: recordsCreated,
      records_skipped: recordsSkipped,
      failed_zips: failedZips,
    });
  } catch (error) {
    console.error('syncWeather error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});