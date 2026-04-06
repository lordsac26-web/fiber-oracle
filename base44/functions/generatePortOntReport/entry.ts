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
  if (m.includes('COMBO')) return 'COMBO/EXT COMBO';
  
  // Fallback to specific patterns
  if (m.includes('XGS')) return 'XGS-PON';
  if (m.includes('GPON')) return 'GPON';
  
  return 'Other';
}

// Parse COMBO port schema: "1/2/xp11-12" => extracts port numbers
function parseComboPortSchema(portStr) {
  if (!portStr) return { xgsPort: null, gponPort: null };
  const match = portStr.match(/xp?(\d+)[-/]?(\d+)?/i);
  if (!match) return { xgsPort: null, gponPort: null };
  const port1 = parseInt(match[1]);
  const port2 = match[2] ? parseInt(match[2]) : null;
  // Odd = XGS, Even = GPON
  if (port2) {
    return {
      xgsPort: port1 % 2 === 1 ? port1 : port2,
      gponPort: port1 % 2 === 0 ? port1 : port2,
    };
  }
  return { xgsPort: port1 % 2 === 1 ? port1 : null, gponPort: port1 % 2 === 0 ? port1 : null };
}

// Determine if ONT is on XGS or GPON side of COMBO port
function determineComboOntType(ontPort, comboSchema) {
  if (!ontPort || !comboSchema.xgsPort && !comboSchema.gponPort) return null;
  const portNum = parseInt(ontPort);
  if (comboSchema.xgsPort && portNum === comboSchema.xgsPort) return 'xgs';
  if (comboSchema.gponPort && portNum === comboSchema.gponPort) return 'gpon';
  // Default based on odd/even
  return portNum % 2 === 1 ? 'xgs' : 'gpon';
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
      const comboSchema = opticType === 'COMBO/EXT COMBO' ? parseComboPortSchema(port) : null;
      
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
          comboSchema,
          opticMake: entry.optic_make || '',
          opticModel: entry.optic_model || '',
          ontCounts: { total: 0, xgs: 0, gpon: 0 },
          entries: [],
        });
      }
      
      portMap.get(key).entries.push(entry);
    }

    // Load ONT records and deduplicate by serial number per port (get unique ONTs)
    const ontRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.list('-updated_date', 50000);
    
    // Track unique ONT serial numbers per port to avoid counting duplicates
    const ontsByPort = new Map(); // key: "OLT|port", value: Set of serial numbers

    if (ontRecords?.length) {
      for (const ont of ontRecords) {
        const shelfSlotPort = ont.shelf_slot_port || '';
        const serialNumber = ont.serial_number || '';
        
        if (!shelfSlotPort || !serialNumber) continue;
        
        // Parse port from ONT record
        const ontParts = shelfSlotPort.split('/').map(p => p.trim());
        const ontPort = ontParts[ontParts.length - 1];
        const oltName = ont.olt_name || '';
        
        if (!oltName || !ontPort) continue;
        
        const portKey = `${oltName}|${ontPort}`;
        
        // Track this unique ONT per port
        if (!ontsByPort.has(portKey)) {
          ontsByPort.set(portKey, new Set());
        }
        // Add serial number (deduplicates if same ONT seen multiple times)
        ontsByPort.get(portKey).add(serialNumber);
      }
    }

    // Now update port counts based on unique ONTs
    for (const [key, portInfo] of portMap.entries()) {
      const keyParts = key.split('|');
      const [oltName, shelf, slot, port] = keyParts;
      const portKey = `${oltName}|${port}`;
      
      const uniqueOntSerials = ontsByPort.get(portKey) || new Set();
      const totalOnts = uniqueOntSerials.size;
      
      portInfo.ontCounts.total = totalOnts;
      
      // For COMBO ports, we'd need to track which side each ONT is on
      // For now, split evenly or use heuristics if needed
      if (portInfo.opticType === 'COMBO/EXT COMBO' && totalOnts > 0) {
        // Simple approach: assume ONTs alternate or use serial pattern
        // This is a placeholder; ideal would be to track per ONT which side it's on
        portInfo.ontCounts.xgs = Math.ceil(totalOnts / 2);
        portInfo.ontCounts.gpon = Math.floor(totalOnts / 2);
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

      typeCount[opticType] = (typeCount[opticType] || 0) + 1;

      reports.push({
        oltName: portInfo.oltName,
        shelf: portInfo.shelf,
        slot: portInfo.slot,
        port: portInfo.port,
        ontCounts: portInfo.ontCounts,
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