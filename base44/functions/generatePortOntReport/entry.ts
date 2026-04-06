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

    // Load ONT records and get LATEST record per serial number per port
    const ontRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.list('-updated_date', 100000);
    
    // Track latest record per serial number per port
    const latestOntBySerial = new Map(); // key: "OLT|port|serial", value: ont record

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
        
        const serialKey = `${oltName}|${ontPort}|${serialNumber}`;
        
        // Keep only the latest record per serial (first in list since sorted by -updated_date)
        if (!latestOntBySerial.has(serialKey)) {
          latestOntBySerial.set(serialKey, ont);
        }
      }
    }

    // Now count unique ONTs per port from latest records only
    for (const [key, portInfo] of portMap.entries()) {
      const keyParts = key.split('|');
      const [oltName, shelf, slot, port] = keyParts;
      const portKey = `${oltName}|${port}`;
      
      // Count unique ONTs on this port from latest records
      let xgsCount = 0, gponCount = 0, totalCount = 0;
      
      for (const [serialKey, ontRecord] of latestOntBySerial.entries()) {
        const [recordOlt, recordPort, serial] = serialKey.split('|');
        
        if (recordOlt === oltName && recordPort === port) {
          totalCount++;
          
          // For COMBO, determine which side
          if (portInfo.opticType === 'COMBO/EXT COMBO' && portInfo.comboSchema) {
            const techType = determineComboOntType(recordPort, portInfo.comboSchema);
            if (techType === 'xgs') xgsCount++;
            else if (techType === 'gpon') gponCount++;
          }
        }
      }
      
      portInfo.ontCounts.total = totalCount;
      if (portInfo.opticType === 'COMBO/EXT COMBO') {
        portInfo.ontCounts.xgs = xgsCount;
        portInfo.ontCounts.gpon = gponCount;
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