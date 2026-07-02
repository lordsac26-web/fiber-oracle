import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

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
 *   instead of a user, so it can run unattended when a daily report is loaded.
 *
 * Idempotent: existing (zip_code, weather_date) pairs are skipped, so firing on
 * every report load (or re-firing) is a cheap no-op once data is present.
 *
 * Trigger: entity automation on PONPMReport — see usage notes in the automation.
 */

// Fixed list of the 61 unique service-area zip codes — kept in sync with
// functions/syncWeather. Avoids scanning the 20k-row SubscriberRecord table.
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
const ZIP_COORDS_FALLBACK = {
  '12171': { latitude: 42.39036, longitude: -73.78151 }, // Stuyvesant
  '12479': { latitude: 41.85593, longitude: -73.97708 }, // Ulster Park
  '12535': { latitude: 41.58398, longitude: -73.80874 }, // Hopewell Junction
};

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const GEO_BATCH = 12;
const ARCHIVE_BATCH = 10;
const LOOKBACK_DAYS = 14;

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
    const settled = await Promise.all(slice.map(fn));
    results.push(...settled);
  }
  return results;
}

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

    const geos = await mapLimit(zips, GEO_BATCH, async (zip) => ({ zip, geo: await geocodeZip(zip) }));
    const failedZips = geos.filter((g) => !g.geo).map((g) => g.zip);
    const valid = geos.filter((g) => g.geo);

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

    let recordsCreated = 0;
    for (let i = 0; i < created.length; i += 200) {
      const chunk = created.slice(i, i + 200);
      await base44.asServiceRole.entities.WeatherHistory.bulkCreate(chunk);
      recordsCreated += chunk.length;
    }

    console.log(`autoSyncWeatherOnReport: window ${startStr}..${endStr}, created ${recordsCreated}, failed zips: ${failedZips.length}`);

    return Response.json({
      success: true,
      window: { start: startStr, end: endStr },
      zips_processed: zips.length,
      records_created: recordsCreated,
      failed_zips: failedZips,
    });
  } catch (error) {
    console.error('autoSyncWeatherOnReport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});