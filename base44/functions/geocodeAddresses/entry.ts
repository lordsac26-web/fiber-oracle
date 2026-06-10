import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Batch geocode ONT addresses using free Nominatim (OpenStreetMap) API,
 * fronted by a persistent GeocodeCache so each unique address hits Nominatim
 * AT MOST ONCE EVER (across all LCPs, sessions, and users).
 *
 * Flow per call:
 *   1. Normalize each item's address into a stable cache key.
 *   2. Batch-read GeocodeCache for all keys in this call (one bounded query).
 *   3. Cache HIT (resolved)  -> write coords straight to the ONT record, no network.
 *      Cache HIT (failed, still inside retry window) -> count as failed, no network.
 *   4. Cache MISS (or failed past retry window) -> rate-limited Nominatim lookup,
 *      then upsert the result (resolved OR failed) into the cache.
 *
 * This makes the SECOND visit to any LCP effectively instant, and keeps the
 * 1-req/sec Nominatim budget reserved only for genuinely new addresses.
 *
 * Payload: { items: [{ id, address }] }
 *   — Each item is an ONT record ID + the subscriber address to geocode.
 *   — Frontend filters out records that already have coords or are manual.
 * Legacy support: { ontRecordIds: string[] } still accepted.
 *
 * Returns: { geocoded, skipped, failed, cached, errors[], updated:[{id,gps_lat,gps_lng}] }
 *   — `geocoded` counts ALL newly-placed pins (cache hits + fresh lookups).
 *   — `cached` is how many of those came from the cache (no network), for visibility.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const UA = 'FiberOracle/1.0 (admin@fiberoracle.com)';
const RATE_LIMIT_MS = 1100;             // Nominatim: max 1 req/sec
const MAX_ITEMS = 10;                    // per-call ceiling (keeps us well under fn timeout)
const FAILED_RETRY_HOURS = 168;          // re-attempt a 'failed' address after 7 days

// Normalize an address into a stable cache key: lowercase, collapse whitespace,
// strip a trailing country, drop empty comma segments. Two records with the same
// real-world address resolve to the same key regardless of incidental spacing.
function normalizeAddressKey(address) {
  return String(address || '')
    .toLowerCase()
    .replace(/,\s*(usa|us|united states)\s*$/i, '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build the Nominatim URL from the comma-separated address shape.
function buildNominatimUrl(address) {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const street = encodeURIComponent(parts[0]);
    const city = encodeURIComponent(parts[1]);
    const state = encodeURIComponent(parts[2]);
    const postal = encodeURIComponent(parts.slice(3).join(' '));
    return `${NOMINATIM_BASE}?format=json&limit=1&countrycodes=us&street=${street}&city=${city}&state=${state}&postalcode=${postal}`;
  }
  if (parts.length === 3) {
    const street = encodeURIComponent(parts[0]);
    const city = encodeURIComponent(parts[1]);
    const postalOrState = encodeURIComponent(parts[2]);
    return `${NOMINATIM_BASE}?format=json&limit=1&countrycodes=us&street=${street}&city=${city}&postalcode=${postalOrState}`;
  }
  if (parts.length === 2) {
    const street = encodeURIComponent(parts[0]);
    const city = encodeURIComponent(parts[1]);
    return `${NOMINATIM_BASE}?format=json&limit=1&countrycodes=us&street=${street}&city=${city}`;
  }
  return `${NOMINATIM_BASE}?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(address)}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const payload = await req.json();

    // ── Build work items (new { items } format preferred; legacy supported) ──
    let workItems = [];
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      workItems = payload.items
        .filter((item) => item.id && item.address && item.address.trim().length >= 5)
        .slice(0, MAX_ITEMS);
    } else if (Array.isArray(payload.ontRecordIds) && payload.ontRecordIds.length > 0) {
      const ids = payload.ontRecordIds.slice(0, MAX_ITEMS);
      const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
        { serial_number: { $exists: true } }, '-created_date', 5000
      );
      const byId = new Map(records.map((r) => [r.id, r]));
      for (const id of ids) {
        const record = byId.get(id);
        if (record && !record.gps_manual && (!record.gps_lat || !record.gps_lng) && record.subscriber_address?.trim().length >= 5) {
          workItems.push({ id: record.id, address: record.subscriber_address.trim() });
        }
      }
    } else {
      return Response.json({ error: 'items array or ontRecordIds array is required' }, { status: 400 });
    }

    if (workItems.length === 0) {
      return Response.json({ geocoded: 0, skipped: 0, failed: 0, cached: 0, errors: ['No valid items to geocode'], updated: [] });
    }

    // Attach a normalized key to every work item.
    for (const item of workItems) item.key = normalizeAddressKey(item.address);

    // ── Batch-read the cache for all keys in this call (single bounded query) ──
    const uniqueKeys = [...new Set(workItems.map((i) => i.key))].filter(Boolean);
    const cacheByKey = new Map();
    if (uniqueKeys.length > 0) {
      const cached = await base44.asServiceRole.entities.GeocodeCache.filter(
        { address_key: { $in: uniqueKeys } }, '-last_attempt', 500
      );
      for (const row of cached) {
        // Keep only the most-recent row per key (defensive against dup rows).
        if (!cacheByKey.has(row.address_key)) cacheByKey.set(row.address_key, row);
      }
    }

    const nowMs = Date.now();
    const retryCutoff = nowMs - FAILED_RETRY_HOURS * 3600 * 1000;

    let geocoded = 0;
    let failed = 0;
    let cachedHits = 0;
    const errors = [];
    const updated = [];

    const applyResolved = async (item, lat, lng) => {
      await base44.asServiceRole.entities.ONTPerformanceRecord.update(item.id, {
        gps_lat: lat, gps_lng: lng, gps_manual: false,
      });
      geocoded++;
      updated.push({ id: item.id, gps_lat: lat, gps_lng: lng });
    };

    // Upsert a cache row for a key (create or update the existing row).
    const writeCache = async (key, status, lat, lng) => {
      const existing = cacheByKey.get(key);
      const data = {
        address_key: key,
        status,
        gps_lat: status === 'resolved' ? lat : null,
        gps_lng: status === 'resolved' ? lng : null,
        source: 'nominatim',
        last_attempt: new Date().toISOString(),
      };
      try {
        if (existing) {
          await base44.asServiceRole.entities.GeocodeCache.update(existing.id, data);
        } else {
          const created = await base44.asServiceRole.entities.GeocodeCache.create(data);
          cacheByKey.set(key, created);
        }
      } catch (e) {
        console.error('GeocodeCache write failed:', e.message);
      }
    };

    for (const item of workItems) {
      const cacheRow = cacheByKey.get(item.key);

      // ── Cache HIT: resolved ──
      if (cacheRow && cacheRow.status === 'resolved' && isFinite(cacheRow.gps_lat) && isFinite(cacheRow.gps_lng)) {
        try {
          await applyResolved(item, cacheRow.gps_lat, cacheRow.gps_lng);
          cachedHits++;
        } catch (e) {
          failed++;
          errors.push(`Cache-apply error for "${item.address}": ${e.message}`);
        }
        continue;
      }

      // ── Cache HIT: failed and still inside the retry window ── skip the network.
      if (cacheRow && cacheRow.status === 'failed') {
        const lastMs = cacheRow.last_attempt ? Date.parse(cacheRow.last_attempt) : 0;
        if (lastMs && lastMs > retryCutoff) {
          failed++;
          continue;
        }
      }

      // ── Cache MISS (or failed past retry window): hit Nominatim (rate-limited) ──
      try {
        await sleep(RATE_LIMIT_MS);
        console.log(`Geocoding (miss): "${item.address}" (ID: ${item.id})`);

        const parts = item.address.split(',').map((p) => p.trim()).filter(Boolean);
        let res = await fetch(buildNominatimUrl(item.address), { headers: { 'User-Agent': UA } });

        if (!res.ok) {
          failed++;
          errors.push(`HTTP ${res.status} for "${item.address}"`);
          await writeCache(item.key, 'failed');
          continue;
        }

        let results = await res.json();

        // Fallback: structured search empty -> free-form query.
        if ((!results || results.length === 0) && parts.length >= 2) {
          await sleep(RATE_LIMIT_MS);
          const fb = await fetch(
            `${NOMINATIM_BASE}?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(item.address)}`,
            { headers: { 'User-Agent': UA } }
          );
          if (fb.ok) results = await fb.json();
        }

        if (!results || results.length === 0) {
          failed++;
          errors.push(`No results for "${item.address}"`);
          await writeCache(item.key, 'failed');
          continue;
        }

        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        if (!isFinite(lat) || !isFinite(lng)) {
          failed++;
          errors.push(`Invalid coords for "${item.address}"`);
          await writeCache(item.key, 'failed');
          continue;
        }

        await applyResolved(item, lat, lng);
        await writeCache(item.key, 'resolved', lat, lng);
        console.log(`✓ ${item.id}: ${lat}, ${lng}`);
      } catch (err) {
        failed++;
        errors.push(`Error for "${item.address}": ${err.message}`);
        console.error(`Geocode error for ${item.id}:`, err.message);
      }
    }

    return Response.json({ geocoded, skipped: 0, failed, cached: cachedHits, errors: errors.slice(0, 20), updated });
  } catch (error) {
    console.error('geocodeAddresses fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});