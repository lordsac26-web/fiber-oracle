import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Batch geocode ONT addresses using free Nominatim (OpenStreetMap) API.
 * Respects the 1-request-per-second rate limit.
 * 
 * Payload: { ontRecordIds: string[] }
 * — Fetches the ONTPerformanceRecord for each ID, geocodes the subscriber_address,
 *   and writes gps_lat/gps_lng back. Skips records that already have gps_manual=true.
 * 
 * Returns: { geocoded: number, skipped: number, failed: number, errors: string[] }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ontRecordIds } = await req.json();
  if (!Array.isArray(ontRecordIds) || ontRecordIds.length === 0) {
    return Response.json({ error: 'ontRecordIds array is required' }, { status: 400 });
  }

  // Cap at 50 per call to stay well within rate limits
  const ids = ontRecordIds.slice(0, 50);
  let geocoded = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const id of ids) {
    try {
      const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter({ id });
      const record = records[0];
      if (!record) { skipped++; continue; }

      // Skip if user manually placed
      if (record.gps_manual) { skipped++; continue; }

      // Skip if already geocoded
      if (record.gps_lat && record.gps_lng) { skipped++; continue; }

      const address = record.subscriber_address;
      if (!address || address.trim().length < 5) { skipped++; continue; }

      // Rate limit: 1 req/sec for Nominatim
      await new Promise(r => setTimeout(r, 1100));

      const query = encodeURIComponent(address.trim());
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
        { headers: { 'User-Agent': 'FiberOracle/1.0 (admin@fiberoracle.com)' } }
      );

      if (!geoRes.ok) {
        failed++;
        errors.push(`HTTP ${geoRes.status} for "${address}"`);
        continue;
      }

      const results = await geoRes.json();
      if (!results || results.length === 0) {
        failed++;
        errors.push(`No results for "${address}"`);
        continue;
      }

      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);

      if (!isFinite(lat) || !isFinite(lng)) {
        failed++;
        errors.push(`Invalid coords for "${address}"`);
        continue;
      }

      await base44.asServiceRole.entities.ONTPerformanceRecord.update(id, {
        gps_lat: lat,
        gps_lng: lng,
        gps_manual: false,
      });

      geocoded++;
    } catch (err) {
      failed++;
      errors.push(`Error for ID ${id}: ${err.message}`);
    }
  }

  return Response.json({ geocoded, skipped, failed, errors: errors.slice(0, 20) });
});