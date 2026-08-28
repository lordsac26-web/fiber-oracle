/**
 * Shared weather-collection primitives.
 * -------------------------
 * Used by syncWeather (interactive admin), autoSyncWeatherOnReport (unattended
 * daily / automation sync) and backfillWeatherForReports (one-time historical
 * backfill). Extracted here so a fix to the archive logic applies once.
 *
 * Design decision — single regional archive call:
 *   The previous design fired one archive request PER zip (61 requests/run).
 *   Open-Meteo's free tier enforces a per-IP daily request quota, and Deno
 *   Deploy uses a shared egress IP — so 61 calls/run reliably exhausted the
 *   quota and every call 429'd, leaving the function reporting `success` with
 *   0 records created (the "no weather since 8/14" outage). The 61 per-zip
 *   requests were also inaccurate: Open-Meteo's geocoder matches zip strings to
 *   arbitrary place names (several zips resolved to locations in Spain).
 *
 *   The service area is a contiguous ~60-mile Hudson Valley / Catskills region,
 *   so daily high/low varies by only a degree or two across it. We now fetch
 *   ONE archive request for a regional centroid per run and write the same
 *   high/low for every service-area zip. This (a) cuts calls 61→1 so we no
 *   longer exhaust the shared quota, (b) is more accurate than the broken
 *   geocoder, and (c) keeps the per-zip row structure so zip-keyed queries
 *   still work. Archive calls retry on 429/5xx with exponential backoff.
 */

// Fixed list of the 61 unique service-area zip codes. Hardcoded so the sync
// never has to scan the full 20k-row SubscriberRecord table (that scan was the
// cause of earlier request timeouts). Update this list if the service area
// changes.
export const SERVICE_ZIPS = [
  '12534', '12173', '12172', '12565', '12526', '12541', '12414', '12050',
  '12075', '12529', '12513', '12544', '12521', '12543', '12477', '12083',
  '12422', '12496', '12451', '12015', '12058', '12463', '12473', '12413',
  '12431', '12470', '12418', '12439', '12423', '12405', '12482', '12468',
  '12046', '12193', '12460', '12454', '12407', '12192', '12913', '12514',
  '12042', '12051', '12469', '12007', '12087', '12571', '12124', '12143',
  '12158', '12535', '12530', '12435', '12479', '12171', '12444', '12564',
  '12523', '12141', '12524', '12107', '12567',
];

// Single representative coordinate for the whole service area (Hudson Valley /
// Catskills NY). All zips share the daily high/low fetched for this point.
export const REGIONAL_CENTROID = { latitude: 42.25, longitude: -73.90 };

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';

// Max retry attempts for the single archive call on 429/5xx.
const ARCHIVE_MAX_ATTEMPTS = 4;

export function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff with jitter: 500ms, 1000ms, 2000ms … + up to 400ms jitter.
function backoffDelay(attempt) {
  return 500 * 2 ** attempt + Math.random() * 400;
}

/**
 * Fetch daily high/low (Fahrenheit) over a window for a single coordinate.
 * Returns the { 'YYYY-MM-DD': { high, low } } map on success, or `null` when
 * the archive API remains unavailable after retries (callers report an
 * archive failure instead of silently treating it as "no data").
 */
export async function fetchDailyTemps(lat, lng, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit',
    timezone: 'America/New_York',
  });
  const url = `${ARCHIVE_URL}?${params.toString()}`;

  for (let attempt = 0; attempt < ARCHIVE_MAX_ATTEMPTS; attempt += 1) {
    let res;
    try {
      // eslint-disable-next-line no-await-in-loop
      res = await fetch(url);
    } catch (err) {
      if (attempt >= ARCHIVE_MAX_ATTEMPTS - 1) {
        console.error(`[weather] archive network error exhausted for ${lat},${lng}: ${err?.message}`);
        return null;
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(backoffDelay(attempt));
      continue;
    }

    if (res.ok) {
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

    // Retryable: rate-limit (429) and server errors (5xx). Other 4xx → give up.
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= ARCHIVE_MAX_ATTEMPTS - 1) {
        console.error(`[weather] archive ${res.status} exhausted for ${lat},${lng} ${startDate}..${endDate}`);
        return null;
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(backoffDelay(attempt));
      continue;
    }
    console.error(`[weather] archive ${res.status} non-retryable for ${lat},${lng}`);
    return null;
  }
  return null;
}