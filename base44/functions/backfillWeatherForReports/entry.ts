import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

/**
 * backfillWeatherForReports
 * -------------------------
 * ONE-TIME admin backfill. Populates WeatherHistory for every distinct report
 * date that already exists in PONPMReport, across the fixed service-area zip
 * list. Unlike syncWeather (which only does a rolling lookback from yesterday),
 * this targets the exact historical dates the user has submitted reports for.
 *
 * Strategy:
 *   1. Collect distinct report days (YYYY-MM-DD) from PONPMReport.upload_date.
 *      Clamp to "yesterday" — the archive API does not have today's data yet.
 *   2. Compute one bounded [min..max] window covering those days. We request the
 *      full window from the Open-Meteo archive per zip (one request each), then
 *      only KEEP the rows that fall on an actual report day. This is far fewer
 *      HTTP calls than per-date requests, while still only storing report-day
 *      rows.
 *   3. Idempotent: skip any (zip, date) already present in WeatherHistory.
 *
 * Mirrors syncWeather's geocoding + archive logic exactly so data is consistent.
 */

// Fixed service-area zip codes — kept in sync with syncWeather.
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

const ZIP_COORDS_FALLBACK = {
  '12171': { latitude: 42.39036, longitude: -73.78151 },
  '12479': { latitude: 41.85593, longitude: -73.97708 },
  '12535': { latitude: 41.58398, longitude: -73.80874 },
};

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const GEO_BATCH = 12;
const ARCHIVE_BATCH = 10;

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

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

    // 3. Geocode zips (batched).
    const geos = await mapLimit(zips, GEO_BATCH, async (zip) => ({ zip, geo: await geocodeZip(zip) }));
    const failedZips = geos.filter((g) => !g.geo).map((g) => g.zip);
    const valid = geos.filter((g) => g.geo);

    // 4. One archive request per zip across [start..end]; keep only report days.
    const created = [];
    await mapLimit(valid, ARCHIVE_BATCH, async ({ zip, geo }) => {
      const temps = await fetchDailyTemps(geo.latitude, geo.longitude, startStr, endStr);
      for (const [date, { high, low }] of Object.entries(temps)) {
        if (!targetSet.has(date)) continue; // only store actual report days
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

    // 5. Bulk insert in chunks.
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
      failed_zips: failedZips,
    });
  } catch (error) {
    console.error('backfillWeatherForReports error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});