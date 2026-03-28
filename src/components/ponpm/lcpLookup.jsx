/**
 * Shared LCP lookup utility — builds a Map from LCPEntry records
 * and resolves LCP data for ONTs by matching OLT name + shelf/slot/port.
 *
 * This mirrors the backend enrichment logic in processPonPmRecords and
 * enrichOntLcpData, so the frontend can resolve LCP data in real time
 * without waiting for slow per-record DB updates.
 */

/**
 * Build a Map keyed by "oltname|shelf/slot/port" → { lcp_number, splitter_number, location, ... }
 * Handles port ranges (e.g. "1-4"), xp prefixes, and case-insensitive matching.
 */
export function buildLcpLookupMap(lcpEntries) {
  const map = new Map();
  for (const lcp of lcpEntries) {
    if (!lcp.olt_name || lcp.olt_shelf === undefined || lcp.olt_slot === undefined || !lcp.olt_port) continue;
    const oltBase = lcp.olt_name.toLowerCase().trim();
    const shelf = String(lcp.olt_shelf).trim();
    const slot = String(lcp.olt_slot).trim();
    const rawPort = String(lcp.olt_port).trim();
    const numericPort = rawPort.replace(/^xp/i, '');
    const payload = {
      lcp_number: lcp.lcp_number || '',
      splitter_number: lcp.splitter_number || '',
      location: lcp.location || lcp.address || '',
      address: lcp.address || '',
      gps_lat: lcp.gps_lat,
      gps_lng: lcp.gps_lng,
      splitter_ratio: lcp.splitter_ratio,
      fiber_count: lcp.fiber_count,
    };

    const rng = numericPort.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rng) {
      const lo = parseInt(rng[1], 10), hi = parseInt(rng[2], 10);
      for (let p = lo; p <= hi; p++) {
        if (!map.has(`${oltBase}|${shelf}/${slot}/${p}`)) map.set(`${oltBase}|${shelf}/${slot}/${p}`, payload);
        if (!map.has(`${oltBase}|${shelf}/${slot}/xp${p}`)) map.set(`${oltBase}|${shelf}/${slot}/xp${p}`, payload);
      }
    } else {
      if (!map.has(`${oltBase}|${shelf}/${slot}/${numericPort}`)) map.set(`${oltBase}|${shelf}/${slot}/${numericPort}`, payload);
      if (!map.has(`${oltBase}|${shelf}/${slot}/xp${numericPort}`)) map.set(`${oltBase}|${shelf}/${slot}/xp${numericPort}`, payload);
    }
    const literalKey = `${oltBase}|${shelf}/${slot}/${rawPort.toLowerCase()}`;
    if (!map.has(literalKey)) map.set(literalKey, payload);
  }
  return map;
}

/**
 * Resolve LCP data for a single ONT using the lookup Map.
 * Returns the LCP payload or null if no match found.
 */
export function resolveLcpForOnt(lcpMap, ont) {
  const oltName = (ont._oltName || ont.OLTName || ont.olt_name || '').toLowerCase().trim();
  const ssp = ont._port || ont['Shelf/Slot/Port'] || ont.shelf_slot_port || '';
  if (!oltName || !ssp) return null;

  // Try literal key first
  const literalKey = `${oltName}|${ssp.toLowerCase()}`;
  if (lcpMap.has(literalKey)) return lcpMap.get(literalKey);

  // Parse shelf/slot/port and try normalized keys
  const pm = ssp.match(/^(\d+)\/(\d+)\/(?:xp)?(\d+)(?:-\d+)?$/i);
  if (!pm) return null;

  const numKey = `${oltName}|${pm[1]}/${pm[2]}/${pm[3]}`;
  if (lcpMap.has(numKey)) return lcpMap.get(numKey);

  const xpKey = `${oltName}|${pm[1]}/${pm[2]}/xp${pm[3]}`;
  if (lcpMap.has(xpKey)) return lcpMap.get(xpKey);

  return null;
}

/**
 * Enrich an array of ONT objects in-place with LCP data from the Map.
 * Only enriches ONTs that don't already have _lcpNumber populated.
 * Returns the count of ONTs that were enriched.
 */
export function enrichOntsWithLcp(lcpMap, onts) {
  let enriched = 0;
  for (const ont of onts) {
    if (ont._lcpNumber) continue; // already has LCP data
    const match = resolveLcpForOnt(lcpMap, ont);
    if (match) {
      ont._lcpNumber = match.lcp_number;
      ont._splitterNumber = match.splitter_number;
      ont._lcpLocation = match.location;
      ont._lcpAddress = match.address || '';
      ont._lcpGpsLat = match.gps_lat;
      ont._lcpGpsLng = match.gps_lng;
      enriched++;
    }
  }
  return enriched;
}