import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';

// Validation helpers
function validateCoordinate(lat, lng) {
  const issues = [];
  
  if (lat === null || lng === null) {
    return { valid: false, issues: ['Missing coordinates'] };
  }
  
  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, issues: ['Invalid coordinate format (not a number)'] };
  }
  
  if (lat < -90 || lat > 90) {
    issues.push(`Latitude ${lat} out of range (-90 to 90)`);
  }
  
  if (lng < -180 || lng > 180) {
    issues.push(`Longitude ${lng} out of range (-180 to 180)`);
  }
  
  // Check for likely swapped coordinates
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    issues.push('Coordinates may be swapped (lat/lng reversed)');
  }
  
  // Check for zero coordinates (often indicates missing data)
  if (lat === 0 && lng === 0) {
    issues.push('Coordinates are 0,0 (null island - likely placeholder)');
  }
  
  return { valid: issues.length === 0, issues };
}

function validateKmlStructure(content) {
  const issues = [];
  
  // Check for basic KML structure
  if (!content.includes('<kml')) {
    issues.push('Missing <kml> root element - file may not be valid KML');
  }
  
  if (!content.includes('<Document') && !content.includes('<Folder') && !content.includes('<Placemark')) {
    issues.push('No Document, Folder, or Placemark elements found');
  }
  
  // Check for malformed XML indicators
  const openTags = (content.match(/<Placemark/gi) || []).length;
  const closeTags = (content.match(/<\/Placemark>/gi) || []).length;
  if (openTags !== closeTags) {
    issues.push(`Mismatched Placemark tags: ${openTags} opening vs ${closeTags} closing`);
  }
  
  // Check for encoding issues
  if (content.includes('�') || content.includes('&#')) {
    issues.push('Possible character encoding issues detected');
  }
  
  return issues;
}

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
      return Response.json({ 
        error: `Failed to fetch file: HTTP ${fileResponse.status}`,
        details: 'The file could not be downloaded. It may have expired or been deleted.'
      }, { status: 400 });
    }

    let kmlContent = '';
    const contentType = fileResponse.headers.get('content-type') || '';
    const isKmz = file_url.toLowerCase().includes('.kmz') || contentType.includes('kmz');

    if (isKmz) {
      // Handle KMZ (zipped KML)
      try {
        const arrayBuffer = await fileResponse.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
          return Response.json({ 
            error: 'Empty file',
            details: 'The uploaded KMZ file is empty (0 bytes).'
          }, { status: 400 });
        }
        
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Find the .kml file inside the KMZ
        let kmlFound = false;
        for (const filename of Object.keys(zip.files)) {
          if (filename.toLowerCase().endsWith('.kml')) {
            kmlContent = await zip.files[filename].async('string');
            kmlFound = true;
            break;
          }
        }
        
        if (!kmlFound) {
          const fileList = Object.keys(zip.files).join(', ') || 'none';
          return Response.json({ 
            error: 'No KML file found inside KMZ',
            details: `The KMZ archive does not contain a .kml file. Found files: ${fileList}`
          }, { status: 400 });
        }
      } catch (zipError) {
        return Response.json({ 
          error: 'Invalid KMZ file',
          details: `Could not extract KMZ archive: ${zipError.message}. The file may be corrupted or not a valid ZIP/KMZ file.`
        }, { status: 400 });
      }
    } else {
      // Handle KML directly
      kmlContent = await fileResponse.text();
      
      if (!kmlContent || kmlContent.trim().length === 0) {
        return Response.json({ 
          error: 'Empty KML file',
          details: 'The uploaded KML file is empty or contains only whitespace.'
        }, { status: 400 });
      }
    }

    // Validate KML structure
    const structureIssues = validateKmlStructure(kmlContent);
    
    // Parse KML to extract placemarks
    const placemarks = [];
    const warnings = [];
    const skippedPlacemarks = [];
    
    // Match all Placemark elements
    const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
    let placemarkMatch;
    let placemarkIndex = 0;
    
    while ((placemarkMatch = placemarkRegex.exec(kmlContent)) !== null) {
      placemarkIndex++;
      const placemarkContent = placemarkMatch[1];
      
      // Extract name
      const nameMatch = placemarkContent.match(/<name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/name>/i);
      let name = nameMatch ? nameMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '') : '';
      const hasName = name.length > 0;
      if (!hasName) {
        name = `Unnamed #${placemarkIndex}`;
      }
      
      // Extract description
      const descMatch = placemarkContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const description = descMatch ? descMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '') : '';
      
      // Extract coordinates - handle Point, LineString, and Polygon
      let lat = null;
      let lng = null;
      let altitude = null;
      let geometryType = 'unknown';
      
      // Try Point coordinates first
      const pointMatch = placemarkContent.match(/<Point[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/i);
      if (pointMatch) {
        geometryType = 'Point';
        const coordStr = pointMatch[1].trim();
        const parts = coordStr.split(',').map(p => parseFloat(p.trim()));
        if (parts.length >= 2) {
          lng = parts[0];
          lat = parts[1];
          altitude = parts[2] || 0;
        }
      }
      
      // If no Point, try LineString (use first point)
      if (lat === null) {
        const lineMatch = placemarkContent.match(/<LineString[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/i);
        if (lineMatch) {
          geometryType = 'LineString';
          const coordStr = lineMatch[1].trim();
          const firstCoord = coordStr.split(/\s+/)[0];
          const parts = firstCoord.split(',').map(p => parseFloat(p.trim()));
          if (parts.length >= 2) {
            lng = parts[0];
            lat = parts[1];
            altitude = parts[2] || 0;
          }
        }
      }
      
      // If no LineString, try Polygon (use first point)
      if (lat === null) {
        const polygonMatch = placemarkContent.match(/<Polygon[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
        if (polygonMatch) {
          geometryType = 'Polygon';
          const coordStr = polygonMatch[1].trim();
          const firstCoord = coordStr.split(/\s+/)[0];
          const parts = firstCoord.split(',').map(p => parseFloat(p.trim()));
          if (parts.length >= 2) {
            lng = parts[0];
            lat = parts[1];
            altitude = parts[2] || 0;
          }
        }
      }
      
      // If still no coordinates, try general coordinates tag
      if (lat === null) {
        const coordMatch = placemarkContent.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
        if (coordMatch) {
          geometryType = 'Other';
          const coordStr = coordMatch[1].trim();
          const firstCoord = coordStr.split(/\s+/)[0];
          const parts = firstCoord.split(',').map(p => parseFloat(p.trim()));
          if (parts.length >= 2) {
            lng = parts[0];
            lat = parts[1];
            altitude = parts[2] || 0;
          }
        }
      }
      
      // Validate coordinates
      const validation = validateCoordinate(lat, lng);
      
      if (!validation.valid || lat === null || lng === null) {
        skippedPlacemarks.push({
          name,
          index: placemarkIndex,
          reason: validation.issues.length > 0 ? validation.issues.join('; ') : 'No coordinates found',
          rawCoords: lat !== null ? `${lat}, ${lng}` : 'none'
        });
        continue;
      }
      
      // Track warnings for valid but potentially problematic coordinates
      const placemarkWarnings = [];
      if (!hasName) {
        placemarkWarnings.push('Missing name');
      }
      if (validation.issues.length > 0) {
        placemarkWarnings.push(...validation.issues);
      }
      if (geometryType !== 'Point') {
        placemarkWarnings.push(`Extracted from ${geometryType} (using first point)`);
      }
      
      placemarks.push({
        name: name.substring(0, 200),
        description: description.substring(0, 500),
        latitude: lat,
        longitude: lng,
        altitude: altitude || 0,
        geometryType,
        warnings: placemarkWarnings,
        hasWarnings: placemarkWarnings.length > 0
      });
    }

    // Build summary
    const summary = {
      totalPlacemarkTags: placemarkIndex,
      validPlacemarks: placemarks.length,
      skippedPlacemarks: skippedPlacemarks.length,
      withWarnings: placemarks.filter(p => p.hasWarnings).length,
      byGeometryType: {},
      structureIssues
    };
    
    // Count by geometry type
    placemarks.forEach(p => {
      summary.byGeometryType[p.geometryType] = (summary.byGeometryType[p.geometryType] || 0) + 1;
    });

    if (placemarks.length === 0) {
      return Response.json({ 
        error: 'No valid placemarks with coordinates found',
        details: placemarkIndex === 0 
          ? 'The file does not contain any <Placemark> elements.'
          : `Found ${placemarkIndex} placemark(s) but none had valid coordinates.`,
        skippedPlacemarks: skippedPlacemarks.slice(0, 10), // Show first 10
        structureIssues
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      count: placemarks.length,
      placemarks,
      summary,
      skippedPlacemarks: skippedPlacemarks.slice(0, 20) // Limit to first 20
    });

  } catch (error) {
    console.error('KML Parse Error:', error);
    return Response.json({ 
      error: 'Failed to parse file',
      details: error.message,
      hint: 'The file may be corrupted, use an unsupported format, or contain invalid XML.'
    }, { status: 500 });
  }
});