import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';
import { DOMParser } from 'npm:@xmldom/xmldom@0.8.10';
import xpath from 'npm:xpath@0.0.34';

function validateCoordinate(lat, lng) {
  const fatal = [];
  const warnings = [];

  if (lat === null || lng === null) {
    fatal.push('Missing coordinates');
    return { fatal, warnings };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    fatal.push('Invalid coordinate format (not a number)');
    return { fatal, warnings };
  }

  if (lat === 0 && lng === 0) warnings.push('Coordinates are 0,0 (null island)');
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) warnings.push('Coordinates may be swapped (lat/lng reversed)');
  if (lat < -90 || lat > 90) fatal.push(`Latitude ${lat} out of range (-90 to 90)`);
  if (lng < -180 || lng > 180) fatal.push(`Longitude ${lng} out of range (-180 to 180)`);

  return { fatal, warnings };
}

function sniffIsZip(buffer) {
  const b = new Uint8Array(buffer);
  return b.length >= 2 && b[0] === 0x50 && b[1] === 0x4b; // "PK"
}

function extractText(node) {
  if (!node) return '';
  return (node.textContent || '').trim();
}

function parseCoordinates(coordText) {
  const points = [];
  const tokens = coordText.trim().split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    const parts = t.split(',').map(p => parseFloat(p.trim()));
    if (parts.length >= 2 && parts.every(p => Number.isFinite(p))) {
      points.push([parts[0], parts[1], Number.isFinite(parts[2]) ? parts[2] : 0]); // [lng, lat, alt]
    }
  }
  return points;
}

// Haversine distance in meters
function dist(a, b) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Ramer–Douglas–Peucker simplification (meters)
function simplifyLine(points, toleranceMeters) {
  if (points.length <= 2) return points;

  const lineDist = (p, a, b) => {
    const d1 = dist(a, p);
    const d2 = dist(p, b);
    const d3 = dist(a, b);
    if (d3 === 0) return d1;
    const s = (d1 + d2 + d3) / 2;
    const area = Math.max(s * (s - d1) * (s - d2) * (s - d3), 0);
    const height = (2 * Math.sqrt(area)) / d3;
    return height;
  };

  const rdp = pts => {
    let maxDist = 0;
    let index = 0;
    const start = pts[0];
    const end = pts[pts.length - 1];

    for (let i = 1; i < pts.length - 1; i++) {
      const d = lineDist(pts[i], start, end);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }

    if (maxDist > toleranceMeters) {
      const left = rdp(pts.slice(0, index + 1));
      const right = rdp(pts.slice(index));
      return left.slice(0, -1).concat(right);
    }
    return [start, end];
  };

  return rdp(points);
}

function computeBBox(points) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  if (!Number.isFinite(minLng)) return null;
  return { minLng, minLat, maxLng, maxLat };
}

function computeRepresentativePoint(points) {
  if (!points.length) return null;
  let sumLng = 0, sumLat = 0, sumAlt = 0;
  for (const [lng, lat, alt] of points) {
    sumLng += lng; sumLat += lat; sumAlt += alt || 0;
  }
  return { lng: sumLng / points.length, lat: sumLat / points.length, alt: sumAlt / points.length };
}

function flattenGeometries(geoms) {
  const out = [];
  for (const g of geoms) {
    if (g.type === 'MultiGeometry' && Array.isArray(g.geometries)) {
      out.push(...flattenGeometries(g.geometries));
    } else {
      out.push(g);
    }
  }
  return out;
}

function parseKml(kmlContent, features) {
  const issues = [];
  if (!kmlContent.includes('<kml')) issues.push('Missing <kml> root element');
  if (!kmlContent.includes('<Placemark')) issues.push('No Placemark elements detected');

  const doc = new DOMParser({
    errorHandler: { warning: null, error: null, fatalError: null }
  }).parseFromString(kmlContent, 'text/xml');

  if (!doc || !doc.documentElement) throw new Error('Failed to parse XML');

  const placemarkNodes = xpath.select("//*[local-name()='Placemark']", doc);

  const placemarks = [];
  const skipped = [];

  for (let idx = 0; idx < placemarkNodes.length; idx++) {
    const pm = placemarkNodes[idx];

    const nameNode = xpath.select1(".//*[local-name()='name']", pm);
    const descNode = xpath.select1(".//*[local-name()='description']", pm);

    let name = extractText(nameNode);
    if (!name) name = `Unnamed #${idx + 1}`;
    const description = extractText(descNode).replace(/<[^>]*>/g, '');

    const geometries = [];

    // Points
    const pointCoords = xpath.select(".//*[local-name()='Point']//*[local-name()='coordinates']", pm);
    for (const n of pointCoords) {
      const pts = parseCoordinates(extractText(n));
      if (pts.length) geometries.push({ type: 'Point', coordinates: pts.slice(0, 1) });
    }

    // LineStrings
    const lineCoords = xpath.select(".//*[local-name()='LineString']//*[local-name()='coordinates']", pm);
    for (const n of lineCoords) {
      let pts = parseCoordinates(extractText(n));
      if (features.simplifyTolerance) pts = simplifyLine(pts, features.simplifyTolerance);
      if (pts.length) geometries.push({ type: 'LineString', coordinates: pts });
    }

    // Polygons (outer + inner)
    const outerRings = xpath.select(".//*[local-name()='Polygon']//*[local-name()='outerBoundaryIs']//*[local-name()='coordinates']", pm);
    const innerRings = xpath.select(".//*[local-name()='Polygon']//*[local-name()='innerBoundaryIs']//*[local-name()='coordinates']", pm);

    if (outerRings.length || innerRings.length) {
      const outer = outerRings.map(n => {
        let pts = parseCoordinates(extractText(n));
        if (features.simplifyTolerance) pts = simplifyLine(pts, features.simplifyTolerance);
        return pts;
      });
      const inner = innerRings.map(n => {
        let pts = parseCoordinates(extractText(n));
        if (features.simplifyTolerance) pts = simplifyLine(pts, features.simplifyTolerance);
        return pts;
      });
      geometries.push({ type: 'Polygon', coordinates: { outer, inner } });
    }

    // MultiGeometry
    const multiNodes = xpath.select(".//*[local-name()='MultiGeometry']", pm);
    for (const m of multiNodes) {
      const sub = parseKml(m.toString(), features);
      geometries.push({ type: 'MultiGeometry', geometries: sub.placemarks.flatMap(p => p.geometry) });
    }

    let finalGeoms = geometries;
    if (features.flattenMultiGeometry) finalGeoms = flattenGeometries(geometries);

    if (!finalGeoms.length) {
      skipped.push({ name, index: idx + 1, reason: 'No geometry/coordinates found' });
      continue;
    }

    // Representative point from first geometry
    let rep = null;
    const g = finalGeoms[0];
    if (g.type === 'Point') {
      const [lng, lat, alt] = g.coordinates[0];
      rep = { lat, lng, alt: alt || 0 };
    } else if (g.type === 'LineString') {
      rep = computeRepresentativePoint(g.coordinates);
    } else if (g.type === 'Polygon') {
      const outer = g.coordinates.outer?.[0] || [];
      rep = computeRepresentativePoint(outer);
    }

    const { fatal, warnings } = validateCoordinate(rep?.lat ?? null, rep?.lng ?? null);
    if (fatal.length) {
      skipped.push({ name, index: idx + 1, reason: fatal.join('; ') });
      continue;
    }

    // Bounding box (optional)
    let bbox = null;
    if (features.includeBBox) {
      const allPoints = [];
      for (const geom of finalGeoms) {
        if (geom.type === 'Point') allPoints.push(...geom.coordinates);
        if (geom.type === 'LineString') allPoints.push(...geom.coordinates);
        if (geom.type === 'Polygon') {
          for (const ring of geom.coordinates.outer || []) allPoints.push(...ring);
          for (const ring of geom.coordinates.inner || []) allPoints.push(...ring);
        }
      }
      bbox = computeBBox(allPoints);
    }

    placemarks.push({
      name: name.substring(0, 200),
      description: description.substring(0, 500),
      geometry: finalGeoms,
      representativePoint: rep,
      bbox,
      warnings,
      hasWarnings: warnings.length > 0
    });
  }

  const summary = {
    totalPlacemarkTags: placemarkNodes.length,
    validPlacemarks: placemarks.length,
    skippedPlacemarks: skipped.length,
    withWarnings: placemarks.filter(p => p.hasWarnings).length,
    structureIssues: issues
  };

  return { placemarks, skipped, summary };
}

function findFirstKmlFile(zip) {
  const files = Object.keys(zip.files).filter(f => f.toLowerCase().endsWith('.kml'));
  if (!files.length) return null;
  if (files.includes('doc.kml')) return 'doc.kml';
  return files.sort((a, b) => (zip.files[b].compressedSize || 0) - (zip.files[a].compressedSize || 0))[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try { body = await req.json(); }
    catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const { file_url, features } = body || {};
    if (!file_url) return Response.json({ error: 'No file URL provided' }, { status: 400 });

    const flags = {
      flattenMultiGeometry: features?.flattenMultiGeometry ?? true,
      simplifyTolerance: features?.simplifyTolerance ?? 0,
      includeBBox: features?.includeBBox ?? true,
      streamParse: features?.streamParse ?? false
    };

    const res = await fetch(file_url);
    if (!res.ok) {
      return Response.json({
        error: `Failed to fetch file: HTTP ${res.status}`,
        details: 'The file could not be downloaded. It may have expired or been deleted.'
      }, { status: 400 });
    }

    const buffer = await res.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return Response.json({ error: 'Empty file', details: '0 bytes' }, { status: 400 });
    }

    const isZip = sniffIsZip(buffer);
    let kmlContent = '';

    if (isZip || file_url.toLowerCase().includes('.kmz')) {
      const zip = await JSZip.loadAsync(buffer);
      const kmlFile = findFirstKmlFile(zip);
      if (!kmlFile) {
        return Response.json({
          error: 'No KML file found inside KMZ',
          details: `Found files: ${Object.keys(zip.files).join(', ') || 'none'}`
        }, { status: 400 });
      }
      kmlContent = await zip.files[kmlFile].async('string');
    } else {
      kmlContent = new TextDecoder('utf-8').decode(buffer);
    }

    if (!kmlContent.trim()) {
      return Response.json({ error: 'Empty KML file' }, { status: 400 });
    }

    const { placemarks, skipped, summary } = parseKml(kmlContent, flags);

    if (placemarks.length === 0) {
      return Response.json({
        error: 'No valid placemarks with coordinates found',
        details: summary.totalPlacemarkTags === 0
          ? 'No <Placemark> elements'
          : `Found ${summary.totalPlacemarkTags} placemark(s) but none had valid coordinates.`,
        skippedPlacemarks: skipped.slice(0, 10),
        structureIssues: summary.structureIssues
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      count: placemarks.length,
      placemarks,
      summary,
      skippedPlacemarks: skipped.slice(0, 20)
    });
  } catch (err) {
    console.error('KML Parse Error:', err);
    return Response.json({
      error: 'Failed to parse file',
      details: err?.message || 'Unknown error',
      hint: 'The file may be corrupted or contain invalid XML.'
    }, { status: 500 });
  }
});