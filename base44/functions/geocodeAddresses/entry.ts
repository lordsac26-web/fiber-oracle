import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Batch geocode ONT addresses using free Nominatim (OpenStreetMap) API.
 * Respects the 1-request-per-second rate limit.
 * 
 * Payload: { items: [{ id, address }] }
 *   — Each item is an ONT record ID + the subscriber address to geocode.
 *   — Frontend is responsible for filtering out records that already have coords or are manually placed.
 * 
 * Legacy support: { ontRecordIds: string[] } still accepted (fetches addresses from DB).
 * 
 * Returns: { geocoded: number, skipped: number, failed: number, errors: string[], updated: [{id, gps_lat, gps_lng}] }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  
  // Build work items — either from new { items } format or legacy { ontRecordIds }
  let workItems = [];
  
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    // New format: frontend sends id + address directly — no DB fetch needed
    workItems = payload.items
      .filter(item => item.id && item.address && item.address.trim().length >= 5)
      .slice(0, 50);
  } else if (Array.isArray(payload.ontRecordIds) && payload.ontRecordIds.length > 0) {
    // Legacy: fetch each record from DB (slow path, kept for backward compat)
    const ids = payload.ontRecordIds.slice(0, 50);
    for (const id of ids) {
      try {
        const records = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { serial_number: { $exists: true } }, '-created_date', 5000
        );
        const record = records.find(r => r.id === id);
        if (record && !record.gps_manual && (!record.gps_lat || !record.gps_lng) && record.subscriber_address?.trim().length >= 5) {
          workItems.push({ id: record.id, address: record.subscriber_address.trim() });
        }
      } catch (e) {
        console.error('Legacy fetch failed:', e.message);
      }
      // Only do legacy path for small batches — it's expensive
      if (workItems.length >= 10) break;
    }
  } else {
    return Response.json({ error: 'items array or ontRecordIds array is required' }, { status: 400 });
  }

  if (workItems.length === 0) {
    return Response.json({ geocoded: 0, skipped: 0, failed: 0, errors: ['No valid items to geocode'], updated: [] });
  }

  let geocoded = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];
  const updated = [];

  for (const item of workItems) {
    try {
      // Rate limit: 1 req/sec for Nominatim
      await new Promise(r => setTimeout(r, 1100));

      const query = encodeURIComponent(item.address);
      console.log(`Geocoding: "${item.address}" (ID: ${item.id})`);

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`,
        { headers: { 'User-Agent': 'FiberOracle/1.0 (admin@fiberoracle.com)' } }
      );

      if (!geoRes.ok) {
        failed++;
        errors.push(`HTTP ${geoRes.status} for "${item.address}"`);
        continue;
      }

      const results = await geoRes.json();
      if (!results || results.length === 0) {
        failed++;
        errors.push(`No results for "${item.address}"`);
        continue;
      }

      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);

      if (!isFinite(lat) || !isFinite(lng)) {
        failed++;
        errors.push(`Invalid coords for "${item.address}"`);
        continue;
      }

      await base44.asServiceRole.entities.ONTPerformanceRecord.update(item.id, {
        gps_lat: lat,
        gps_lng: lng,
        gps_manual: false,
      });

      geocoded++;
      updated.push({ id: item.id, gps_lat: lat, gps_lng: lng });
      console.log(`✓ ${item.id}: ${lat}, ${lng}`);
    } catch (err) {
      failed++;
      errors.push(`Error for "${item.address}": ${err.message}`);
      console.error(`Geocode error for ${item.id}:`, err.message);
    }
  }

  return Response.json({ geocoded, skipped, failed, errors: errors.slice(0, 20), updated });
});