import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function detectOpticType(model) {
  if (!model) return 'Unknown';
  const m = model.toUpperCase().trim().replace(/\s/g, '');
  if (m.includes('XGS') && m.includes('DD')) return 'XGS-DD';
  if (m.includes('COMBO')) return 'COMBO/EXT COMBO';
  if (m.includes('XGS')) return 'XGS-PON';
  if (m.includes('GPON')) return 'GPON';
  return 'Other';
}

// Normalize a shelf_slot_port string into {shelf, slot, port}
function parseShelfSlotPort(str) {
  if (!str) return null;
  const parts = str.split('/').map(p => p.trim());
  if (parts.length >= 3) {
    return {
      shelf: parts[parts.length - 3],
      slot:  parts[parts.length - 2],
      port:  parts[parts.length - 1],
    };
  }
  if (parts.length === 2) return { shelf: null, slot: parts[0], port: parts[1] };
  if (parts.length === 1) return { shelf: null, slot: null, port: parts[0] };
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { filterType = 'all' } = await req.json();

    const lcpEntries = await base44.asServiceRole.entities.LCPEntry.list('-created_date', 5000);
    if (!lcpEntries?.length) {
      return Response.json({
        success: true, filterType, portReports: [],
        summary: { totalPorts: 0, totalOnts: 0, byType: {} }
      });
    }

    const portMap = new Map(); // key: "oltName|shelf|slot|port"

    for (const entry of lcpEntries) {
      const oltName = entry.olt_name || 'Unknown';
      const shelf   = String(entry.olt_shelf || '-');
      const slot    = String(entry.olt_slot  || '-');
      const port    = String(entry.olt_port  || '-');
      const opticType = detectOpticType(entry.optic_type || entry.optic_model);
      const key = `${oltName}|${shelf}|${slot}|${port}`;

      if (!portMap.has(key)) {
        portMap.set(key, {
          oltName, shelf, slot, port,
          lcpNumber:     entry.lcp_number    || '',
          splitterNumber: entry.splitter_number || '',
          opticType,
          opticMake:  entry.optic_make  || '',
          opticModel: entry.optic_model || '',
          ontCounts: { total: 0, xgs: 0, gpon: 0 },
        });
      }
    }

    // Load ONTs — deduplicate by serial+port, keep latest
    const ontRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.list('-updated_date', 100000);
    
    // BUG 1+2 FIX: key includes shelf+slot so ports don't collide
    // key: "oltName|shelf|slot|port|serial"
    const latestOntBySerial = new Map();

    for (const ont of ontRecords || []) {
      const serialNumber  = ont.serial_number || '';
      const oltName       = ont.olt_name || '';
      const shelfSlotPort = ont.shelf_slot_port || '';

      if (!serialNumber || !oltName || !shelfSlotPort) continue;

      const parsed = parseShelfSlotPort(shelfSlotPort);
      if (!parsed) continue;

      // BUG 1+2 FIX: use all three segments in the key
      const serialKey = `${oltName}|${parsed.shelf}|${parsed.slot}|${parsed.port}|${serialNumber}`;
      if (!latestOntBySerial.has(serialKey)) {
        latestOntBySerial.set(serialKey, { ...ont, _parsed: parsed });
      }
    }

    // Count ONTs per port
    for (const [key, portInfo] of portMap.entries()) {
      let xgsCount = 0, gponCount = 0, totalCount = 0;

      for (const [serialKey, ontRecord] of latestOntBySerial.entries()) {
        const p = ontRecord._parsed;

        // BUG 1+2 FIX: match on olt + shelf + slot + port
        const shelfMatch = portInfo.shelf === '-' || p.shelf === null || String(p.shelf) === portInfo.shelf;
        const slotMatch  = portInfo.slot  === '-' || p.slot  === null || String(p.slot)  === portInfo.slot;

        if (
          (ontRecord.olt_name || '') === portInfo.oltName &&
          shelfMatch &&
          slotMatch &&
          String(p.port) === portInfo.port
        ) {
          totalCount++;

          // BUG 4 FIX: for COMBO, check ont_type field directly if available,
          // otherwise fall back to odd/even on the last port digit
          if (portInfo.opticType === 'COMBO/EXT COMBO') {
            const ontType = (ontRecord.ont_type || ontRecord.technology || '').toUpperCase();
            if (ontType.includes('XGS')) {
              xgsCount++;
            } else if (ontType.includes('GPON')) {
              gponCount++;
            } else {
              // fallback: odd port = XGS, even = GPON
              const portNum = parseInt(p.port);
              if (!isNaN(portNum)) {
                if (portNum % 2 === 1) xgsCount++;
                else gponCount++;
              }
            }
          }
        }
      }

      portInfo.ontCounts.total = totalCount;
      if (portInfo.opticType === 'COMBO/EXT COMBO') {
        portInfo.ontCounts.xgs  = xgsCount;
        portInfo.ontCounts.gpon = gponCount;
      }
    }

    const reports = [];
    const typeCount = {};

    for (const [, portInfo] of portMap.entries()) {
      const opticType = portInfo.opticType;
      if (filterType === 'xgs-dd' && opticType !== 'XGS-DD') continue;
      if (filterType === 'combo' && !opticType.includes('COMBO')) continue;

      typeCount[opticType] = (typeCount[opticType] || 0) + 1;
      reports.push({
        oltName:        portInfo.oltName,
        shelf:          portInfo.shelf,
        slot:           portInfo.slot,
        port:           portInfo.port,
        ontCounts:      portInfo.ontCounts,
        lcpNumber:      portInfo.lcpNumber,
        splitterNumber: portInfo.splitterNumber,
        opticType,
        opticMake:      portInfo.opticMake,
        opticModel:     portInfo.opticModel,
      });
    }

    reports.sort((a, b) => {
      if (a.oltName !== b.oltName) return a.oltName.localeCompare(b.oltName);
      return (parseInt(a.port) || 0) - (parseInt(b.port) || 0);
    });

    // BUG 3 FIX: was r.ontCount, should be r.ontCounts.total
    const totalOnts = reports.reduce((s, r) => s + (r.ontCounts?.total || 0), 0);

    return Response.json({
      success: true,
      filterType,
      portReports: reports,
      summary: { totalPorts: reports.length, totalOnts, byType: typeCount },
    });

  } catch (error) {
    console.error('[generatePortOntReport] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});