import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'No file URL provided' }, { status: 400 });
    }

    // Fetch the file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    }

    let kmlContent = '';
    const contentType = fileResponse.headers.get('content-type') || '';
    const isKmz = file_url.toLowerCase().includes('.kmz') || contentType.includes('kmz');

    if (isKmz) {
      // Handle KMZ (zipped KML)
      const arrayBuffer = await fileResponse.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Find the .kml file inside the KMZ
      for (const filename of Object.keys(zip.files)) {
        if (filename.toLowerCase().endsWith('.kml')) {
          kmlContent = await zip.files[filename].async('string');
          break;
        }
      }
      
      if (!kmlContent) {
        return Response.json({ error: 'No KML file found inside KMZ' }, { status: 400 });
      }
    } else {
      // Handle KML directly
      kmlContent = await fileResponse.text();
    }

    // Parse KML to extract placemarks
    const placemarks = [];
    
    // Match all Placemark elements
    const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
    let placemarkMatch;
    
    while ((placemarkMatch = placemarkRegex.exec(kmlContent)) !== null) {
      const placemarkContent = placemarkMatch[1];
      
      // Extract name
      const nameMatch = placemarkContent.match(/<name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/name>/i);
      const name = nameMatch ? nameMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '') : 'Unnamed';
      
      // Extract description
      const descMatch = placemarkContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const description = descMatch ? descMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '') : '';
      
      // Extract coordinates - handle Point, LineString, and Polygon
      let coordinates = null;
      let lat = null;
      let lng = null;
      let altitude = null;
      
      // Try Point coordinates first
      const pointMatch = placemarkContent.match(/<Point[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/i);
      if (pointMatch) {
        const coordStr = pointMatch[1].trim();
        const parts = coordStr.split(',').map(p => parseFloat(p.trim()));
        if (parts.length >= 2) {
          lng = parts[0];
          lat = parts[1];
          altitude = parts[2] || 0;
        }
      }
      
      // If no Point, try general coordinates (first coordinate pair)
      if (lat === null) {
        const coordMatch = placemarkContent.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
        if (coordMatch) {
          const coordStr = coordMatch[1].trim();
          // Take first coordinate pair
          const firstCoord = coordStr.split(/\s+/)[0];
          const parts = firstCoord.split(',').map(p => parseFloat(p.trim()));
          if (parts.length >= 2) {
            lng = parts[0];
            lat = parts[1];
            altitude = parts[2] || 0;
          }
        }
      }
      
      // Extract folder/category if available
      let folder = '';
      
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        placemarks.push({
          name: name.substring(0, 200), // Limit name length
          description: description.substring(0, 500), // Limit description length
          latitude: lat,
          longitude: lng,
          altitude: altitude || 0,
          folder
        });
      }
    }

    if (placemarks.length === 0) {
      return Response.json({ error: 'No valid placemarks with coordinates found in file' }, { status: 400 });
    }

    return Response.json({
      success: true,
      count: placemarks.length,
      placemarks
    });

  } catch (error) {
    console.error('KML Parse Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});