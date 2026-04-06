/**
 * generatePortOntReport - Generate a detailed port & ONT report with optic type breakdown
 * 
 * Returns: Array of port summaries grouped by OLT with columns:
 * - System Name (OLT)
 * - Shelf/Slot/Port
 * - ONT Count
 * - LCP/CLCP
 * - Splitter
 * - Technology Type (optic model)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Detect optic technology from model name
function detectOpticType(model) {
  if (!model) return 'Unknown';
  const m = model.toUpperCase().trim().replace(/\s/g, '');
  
  // XGS-DD models
  if (m.includes('XGS') && m.includes('DD')) return 'XGS-DD';
  
  // COMBO variants
  if (m.includes('COMBO')) {
    if (m.includes('EXT')) return 'COMBO/EXT COMBO';
    return 'COMBO/EXT COMBO';
  }
  
  // Fallback to specific patterns
  if (m.includes('XGS')) return 'XGS-PON';
  if (m.includes('GPON')) return 'GPON';
  
  return 'Other';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { filterType = 'all' } = await req.json();
    // filterType: 'all' | 'xgs-dd' | 'combo'

    // Load all LCP entries
    const lcpEntries = await base44.asServiceRole.entities.LCPEntry.list('-created_date', 5000);
    if (!lcpEntries?.length) {
      return Response.json({ 
        success: true, 
        filterType, 
        portReports: [], 
        summary: { totalPorts: 0, totalOnts: 0, byType: {} } 
      });
    }

    // Aggregate by OLT / Port / Optic type
    const portMap = new Map(); // key: "OLT|Shelf|Slot|Port"

    for (const entry of lcpEntries) {
      const oltName = entry.olt_name || 'Unknown';
      const shelf = entry.olt_shelf || '-';
      const slot = entry.olt_slot || '-';
      const port = entry.olt_port || '-';
      const opticType = detectOpticType(entry.optic_type || entry.optic_model);
      
      const key = `${oltName}|${shelf}|${slot}|${port}`;
      
      if (!portMap.has(key)) {
        portMap.set(key, {
          oltName,
          shelf,
          slot,
          port,
          lcpNumber: entry.lcp_number || '',
          splitterNumber: entry.splitter_number || '',
          opticType,
          opticMake: entry.optic_make || '',
          opticModel: entry.optic_model || '',
          entries: [],
        });
      }
      
      portMap.get(key).entries.push(entry);
    }

    // Now load ONT records to count ONTs per port
    const ontRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.list('-created_date', 50000);
    const ontCountByPort = new Map(); // key: "OLT|Shelf|Slot|Port"

    if (ontRecords?.length) {
      for (const ont of ontRecords) {
        const parts = (ont.shelf_slot_port || '').split('/');
        if (parts.length < 3) continue;
        
        // Try to match the port key - this is a best-effort lookup
        // ONT records may have limited port info, so we aggregate by OLT + port pattern
        const portPattern = parts[parts.length - 1]; // Last part is the port number
        
        // Find matching entry in portMap
        for (const [key, portInfo] of portMap.entries()) {
          if (key.endsWith(`|${portPattern}`)) {
            const count = ontCountByPort.get(key) || 0;
            ontCountByPort.set(key, count + 1);
            break;
          }
        }
      }
    }

    // Build report
    const reports = [];
    const typeCount = {};

    for (const [key, portInfo] of portMap.entries()) {
      const opticType = portInfo.opticType;
      
      // Apply filter
      if (filterType === 'xgs-dd' && opticType !== 'XGS-DD') continue;
      if (filterType === 'combo' && !opticType.includes('COMBO')) continue;

      const ontCount = ontCountByPort.get(key) || 0;
      typeCount[opticType] = (typeCount[opticType] || 0) + 1;

      reports.push({
        oltName: portInfo.oltName,
        shelf: portInfo.shelf,
        slot: portInfo.slot,
        port: portInfo.port,
        ontCount,
        lcpNumber: portInfo.lcpNumber,
        splitterNumber: portInfo.splitterNumber,
        opticType,
        opticMake: portInfo.opticMake,
        opticModel: portInfo.opticModel,
      });
    }

    // Sort by OLT name, then port
    reports.sort((a, b) => {
      if (a.oltName !== b.oltName) return a.oltName.localeCompare(b.oltName);
      const aPort = parseInt(a.port) || 0;
      const bPort = parseInt(b.port) || 0;
      return aPort - bPort;
    });

    const totalOnts = reports.reduce((s, r) => s + r.ontCount, 0);
    const summary = {
      totalPorts: reports.length,
      totalOnts,
      byType: typeCount,
    };

    return Response.json({
      success: true,
      filterType,
      portReports: reports,
      summary,
    });
  } catch (error) {
    console.error('[generatePortOntReport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});