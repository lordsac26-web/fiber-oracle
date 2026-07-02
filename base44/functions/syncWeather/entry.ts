import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

/**
 * syncWeather
 * -----------
 * Forward-only weather collection for temperature/signal correlation.
 *
 * Flow:
 *   1. Use the fixed list of service-area zip codes (SERVICE_ZIPS). This avoids
 *      scanning the ~20k-row SubscriberRecord table, which was the cause of the
 *      request timeouts.
 *   2. Load existing WeatherHistory for the window ONCE and index (zip|date)
 *      pairs we already have, so we never re-fetch them.
 *   3. Geocode each zip ONCE to lat/lng via Open-Meteo geocoding (free, no key),
 *      run in small concurrent batches.
 *   4. Pull daily high/low (Fahrenheit) for the window from the Open-Meteo
 *      archive API (also batched) and bulk-insert missing (zip, date) rows.
 *
 * Idempotent: existing (zip_code, weather_date) pairs are skipped, so a re-run
 * is a cheap no-op.
 *
 * Open-Meteo:
 *   - Geocoding: https://geocoding-api.open-meteo.com/v1/search?name=ZIP&country=US
 *   - Archive:   https://archive-api.open-meteo.com/v1/archive  (~1–5 day lag)
 */

// Fixed list of the 61 unique service-area zip codes. Hardcoded so the sync
// never has to scan the full 20k-row SubscriberRecord table (that scan was the
// cause of the request timeouts). Update this list if the service area changes.
const SERVICE_ZIPS = [
  '12534', '12173', '12172', '12565', '12526', '12541', '12414', '12050',
  '12075', '12529', '12513', '12544', '12521', '12543', '12477', '12083',
  '12422', '12496', '12451', '12015', '12058', '12463', '12473', '12413',
  '12431', '12470', '12418', '12439', '12423', '12405', '12482', '12468',
  '12046', '12193', '12460', '12454', '12407', '12192', '12913', '12514',
  '12042', '12051', '12469', '12007', '12087', '12571', '12124', '12143',
  '12158', '12535', '12530', '12435', '12479', '12171', '12444', '12564',
  '12523', '12141', '12524', '12107', '12567',
];

// Static coordinate fallback for zips Open-Meteo's geocoder cannot resolve.
// (Small NY hamlets that have no postal-code entry in the geocoding dataset.)
const ZIP_COORDS_FALLBACK = {
  '12171': { latitude: 42.39036, longitude: -73.78151 }, // Stuyvesant
  '12479': { latitude: 41.85593, longitude: -73.97708 }, // Ulster Park
  '12535': { latitude: 41.58398, longitude: -73.80874 }, // Hopewell Junction
};

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const GEO_BATCH = 12; // concurrent geocode requests
const ARCHIVE_BATCH = 10; // concurrent archive requests

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

// Geocode a US zip to { latitude, longitude } via Open-Meteo postal lookup.
async function geocodeZip(zip) {
  if (ZIP_COORDS_FALLBACK[zip]) return ZIP_COORDS_FALLBACK[zip];
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(zip)}&count=1&country=US&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const hit = json?.results?.[0];
  if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') return null;
  return { latitude: hit.latitude, longitude: hit.longitude };
}

// Fetch daily high/low (Fahrenheit) over a window. Returns { 'YYYY-MM-DD': { high, low } }.
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

// Run an async mapper over items with a fixed concurrency limit.
async function mapLimit(items, limit, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const slice = items.slice(i, i + limit);
    // eslint-disable-next-line no-await-in-loop
    const settled = await Promise.all(slice.map(fn));
    results.push(...settled);
  }
  return results;
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

    // Geocode all zips concurrently (batched).
    const geos = await mapLimit(zips, GEO_BATCH, async (zip) => ({ zip, geo: await geocodeZip(zip) }));
    const failedZips = geos.filter((g) => !g.geo).map((g) => g.zip);
    const valid = geos.filter((g) => g.geo);

    // Archive fetch + collect missing rows (batched).
    const created = [];
    await mapLimit(valid, ARCHIVE_BATCH, async ({ zip, geo }) => {
      const temps = await fetchDailyTemps(geo.latitude, geo.longitude, startStr, endStr);
      for (const [date, { high, low }] of Object.entries(temps)) {
        if (existingHave.has(`${zip}|${date}`)) continue;
        created.push({
          zip_code: zip,
          weather_date: date,
          high_temp_f: high,
          low_temp_f: low,
          source: 'open-meteo',
        });
      }
    });

    // Bulk insert in chunks.
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
      failed_zips: failedZips,
    });
  } catch (error) {
    console.error('syncWeather error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});