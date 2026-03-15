import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { parse } from 'npm:csv-parse@5.5.2/sync';

// Thresholds for analysis
const THRESHOLDS = {
  OntRxOptPwr: { low: -27, marginal: -25, high: -8 },
  OLTRXOptPwr: { low: -30, marginal: -28, high: -8 },
  OntTxPwr: { low: 0.5, high: 5 },
  UsSdberRate: { warning: 1e-9, critical: 1e-6 },
  DsSdberRate: { warning: 1e-9, critical: 1e-6 },
  UpstreamBipErrors: { warning: 100, critical: 1000 },
  DownstreamBipErrors: { warning: 100, critical: 1000 },
  UpstreamMissedBursts: { warning: 10, critical: 100 },
  UpstreamGemHecErrors: { warning: 10, critical: 100 },
  UpstreamFecUncorrectedCodeWords: { warning: 1, critical: 10 },
  DownstreamFecUncorrectedCodeWords: { warning: 1, critical: 10 },
};

// Detect technology type based on ONT model
function detectTechTypeFromModel(model) {
  if (!model) return null;
  
  const modelUpper = model.toUpperCase().trim();
  
  // XGS-PON models
  const xgsModels = [
    'GP1101X', 'GP4201X', 'GP4201XH',
    'DZS 522', 'DZS522', '522X', 'DZS 522X', 'DZS 522XX', 'DZS 522XG'
  ];
  
  // GPON models
  const gponModels = [
    '711GE', '717GE', '725G', '725GE', '725GX', '725'
  ];
  
  // Check for XGS-PON
  for (const xgsModel of xgsModels) {
    if (modelUpper.includes(xgsModel.replace(/\s/g, ''))) {
      return 'XGS-PON';
    }
  }
  
  // Check for GPON
  for (const gponModel of gponModels) {
    if (modelUpper.includes(gponModel.replace(/\s/g, ''))) {
      return 'GPON';
    }
  }
  
  return null;
}

// Detect combo port and determine technology type
// Combo ports have format like "0/1/xp3-4" where odd port = XGS-PON, even port = GPON
function detectComboPort(shelfSlotPort) {
  if (!shelfSlotPort) return { isCombo: false, techType: null };
  
  // Match patterns like "0/1/xp3-4" or "xp3-4" or "3-4"
  const comboMatch = shelfSlotPort.match(/(?:xp)?(\d+)-(\d+)$/i);
  if (comboMatch) {
    const port1 = parseInt(comboMatch[1]);
    const port2 = parseInt(comboMatch[2]);
    // Odd port = XGS-PON, Even port = GPON
    return {
      isCombo: true,
      port1,
      port2,
      techType: port1 % 2 === 1 ? 'XGS-PON (combo odd)' : 'GPON (combo even)',
      comboLabel: `Combo ${comboMatch[1]}-${comboMatch[2]}`
    };
  }
  
  return { isCombo: false, techType: null };
}

// Fields to extract from CSV
const FIELDS = [
  'OLTName',
  'Shelf/Slot/Port',
  'OntID',
  'SerialNumber',
  'model',
  'OntRxOptPwr',
  'OntTxPwr',
  'OLTRXOptPwr',
  'UsSdberRate',
  'DsSdberRate',
  'UpstreamBipErrors',
  'UpstreamMissedBursts',
  'UpstreamGemHecErrors',
  'UpstreamBip8ErrSec',
  'UpstreamBip8SeverelyErrSec',
  'UpstreamBip8UnavailSec',
  'UpstreamMissedBurstsErrSec',
  'UpstreamFecCorrectedBytes',
  'UpstreamFecCorrectedCodeWords',
  'UpstreamFecUncorrectedCodeWords',
  'DownstreamBipErrors',
  'DownstreamBip8ErrSec',
  'DownstreamBip8SeverelyErrSec',
  'DownstreamFecCorrectedBytes',
  'DownstreamFecCorrectedCodeWords',
  'DownstreamFecUncorrectedCodeWords',
  'upTime',
];

function parseNumeric(value) {
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// Normalize serial number (FSAN) for consistent matching across reports
function normalizeSerialNumber(serial) {
  if (!serial || typeof serial !== 'string') return null;
  
  // Convert to uppercase, trim whitespace, remove common OCR artifacts
  let normalized = serial.trim().toUpperCase();
  
  // Remove any non-alphanumeric characters that might be OCR errors
  // Keep only letters and numbers (typical FSAN format: 8 alphanumeric chars)
  normalized = normalized.replace(/[^A-Z0-9]/g, '');
  
  // If empty after cleaning, return null
  return normalized.length > 0 ? normalized : null;
}

function analyzeOnt(ont, segmentStats) {
  const issues = [];
  const warnings = [];
  let isOffline = false;

  // Check ONT Rx Power
  const ontRx = parseNumeric(ont.OntRxOptPwr);
  const oltRxCheck = parseNumeric(ont.OLTRXOptPwr);
  
  // Detect offline ONT (both ONT Rx and OLT Rx are 0 or null)
  if ((ontRx === 0 || ontRx === null) && (oltRxCheck === 0 || oltRxCheck === null)) {
    isOffline = true;
  }
  
  if (ontRx !== null && !isOffline) {
    if (ontRx < THRESHOLDS.OntRxOptPwr.low) {
      issues.push({ field: 'OntRxOptPwr', severity: 'critical', value: `${ontRx} dBm`, threshold: `< ${THRESHOLDS.OntRxOptPwr.low} dBm`, message: `ONT Rx power critically low` });
    } else if (ontRx < THRESHOLDS.OntRxOptPwr.marginal) {
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', value: `${ontRx} dBm`, threshold: `< ${THRESHOLDS.OntRxOptPwr.marginal} dBm`, message: `ONT Rx power marginal` });
    } else if (ontRx > THRESHOLDS.OntRxOptPwr.high) {
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', value: `${ontRx} dBm`, threshold: `> ${THRESHOLDS.OntRxOptPwr.high} dBm`, message: `ONT Rx power too high (may need attenuator)` });
    }
    
    // Compare to segment average
    if (segmentStats && segmentStats.avgOntRxOptPwr !== null) {
      const diff = ontRx - segmentStats.avgOntRxOptPwr;
      if (diff < -3) {
        warnings.push({ field: 'OntRxOptPwr', severity: 'info', value: `${ontRx} dBm`, threshold: `Avg: ${segmentStats.avgOntRxOptPwr.toFixed(1)} dBm`, message: `${Math.abs(diff).toFixed(1)} dB below segment average` });
      }
    }
  }

  // Check OLT Rx Power
  const oltRx = parseNumeric(ont.OLTRXOptPwr);
  if (oltRx !== null && !isOffline) {
    if (oltRx < THRESHOLDS.OLTRXOptPwr.low) {
      issues.push({ field: 'OLTRXOptPwr', severity: 'critical', value: `${oltRx} dBm`, threshold: `< ${THRESHOLDS.OLTRXOptPwr.low} dBm`, message: `OLT Rx power critically low` });
    } else if (oltRx < THRESHOLDS.OLTRXOptPwr.marginal) {
      warnings.push({ field: 'OLTRXOptPwr', severity: 'warning', value: `${oltRx} dBm`, threshold: `< ${THRESHOLDS.OLTRXOptPwr.marginal} dBm`, message: `OLT Rx power marginal` });
    }
  }

  // Check error rates
  const checkErrorField = (fieldName, value) => {
    const num = parseNumeric(value);
    if (num !== null && THRESHOLDS[fieldName]) {
      if (num >= THRESHOLDS[fieldName].critical) {
        issues.push({ field: fieldName, severity: 'critical', value: num.toLocaleString(), threshold: `≥ ${THRESHOLDS[fieldName].critical.toLocaleString()}`, message: `High error count` });
      } else if (num >= THRESHOLDS[fieldName].warning) {
        warnings.push({ field: fieldName, severity: 'warning', value: num.toLocaleString(), threshold: `≥ ${THRESHOLDS[fieldName].warning.toLocaleString()}`, message: `Elevated error count` });
      }
    }
  };

  checkErrorField('UpstreamBipErrors', ont.UpstreamBipErrors);
  checkErrorField('DownstreamBipErrors', ont.DownstreamBipErrors);
  checkErrorField('UpstreamMissedBursts', ont.UpstreamMissedBursts);
  checkErrorField('UpstreamGemHecErrors', ont.UpstreamGemHecErrors);
  checkErrorField('UpstreamFecUncorrectedCodeWords', ont.UpstreamFecUncorrectedCodeWords);
  checkErrorField('DownstreamFecUncorrectedCodeWords', ont.DownstreamFecUncorrectedCodeWords);

  // Check BER rates
  const usBer = parseNumeric(ont.UsSdberRate);
  if (usBer !== null && usBer > 0) {
    if (usBer >= THRESHOLDS.UsSdberRate.critical) {
      issues.push({ field: 'UsSdberRate', severity: 'critical', value: usBer.toExponential(2), threshold: `≥ ${THRESHOLDS.UsSdberRate.critical.toExponential(0)}`, message: `Critical upstream BER` });
    } else if (usBer >= THRESHOLDS.UsSdberRate.warning) {
      warnings.push({ field: 'UsSdberRate', severity: 'warning', value: usBer.toExponential(2), threshold: `≥ ${THRESHOLDS.UsSdberRate.warning.toExponential(0)}`, message: `Elevated upstream BER` });
    }
  }

  const dsBer = parseNumeric(ont.DsSdberRate);
  if (dsBer !== null && dsBer > 0) {
    if (dsBer >= THRESHOLDS.DsSdberRate.critical) {
      issues.push({ field: 'DsSdberRate', severity: 'critical', value: dsBer.toExponential(2), threshold: `≥ ${THRESHOLDS.DsSdberRate.critical.toExponential(0)}`, message: `Critical downstream BER` });
    } else if (dsBer >= THRESHOLDS.DsSdberRate.warning) {
      warnings.push({ field: 'DsSdberRate', severity: 'warning', value: dsBer.toExponential(2), threshold: `≥ ${THRESHOLDS.DsSdberRate.warning.toExponential(0)}`, message: `Elevated downstream BER` });
    }
  }

  return {
    issues,
    warnings,
    status: isOffline ? 'offline' : issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

function calculateSegmentStats(onts) {
  const olts = {};

  for (const ont of onts) {
    const oltName = ont.OLTName || 'Unknown OLT';
    const portKey = ont['Shelf/Slot/Port'] || 'Unknown';
    
    if (!olts[oltName]) {
      olts[oltName] = {
        ports: {},
        ontRxValues: [],
        oltRxValues: [],
      };
    }
    
    if (!olts[oltName].ports[portKey]) {
      olts[oltName].ports[portKey] = {
        onts: [],
        ontRxValues: [],
        oltRxValues: [],
      };
    }
    
    olts[oltName].ports[portKey].onts.push(ont);
    
    const ontRx = parseNumeric(ont.OntRxOptPwr);
    if (ontRx !== null && ontRx !== 0) {
      olts[oltName].ports[portKey].ontRxValues.push(ontRx);
      olts[oltName].ontRxValues.push(ontRx);
    }
    
    const oltRx = parseNumeric(ont.OLTRXOptPwr);
    if (oltRx !== null && oltRx !== 0) {
      olts[oltName].ports[portKey].oltRxValues.push(oltRx);
      olts[oltName].oltRxValues.push(oltRx);
    }
  }

  // Calculate stats for each OLT and port
  for (const oltName of Object.keys(olts)) {
    const olt = olts[oltName];
    
    // OLT-level stats
    olt.totalOnts = Object.values(olt.ports).reduce((sum, p) => sum + p.onts.length, 0);
    olt.portCount = Object.keys(olt.ports).length;
    
    if (olt.ontRxValues.length > 0) {
      olt.avgOntRxOptPwr = olt.ontRxValues.reduce((a, b) => a + b, 0) / olt.ontRxValues.length;
    } else {
      olt.avgOntRxOptPwr = null;
    }
    
    delete olt.ontRxValues;
    delete olt.oltRxValues;
    
    // Port-level stats
    for (const portKey of Object.keys(olt.ports)) {
      const port = olt.ports[portKey];
      port.count = port.onts.length;
      
      // Detect combo port
      const comboInfo = detectComboPort(portKey);
      port.isCombo = comboInfo.isCombo;
      port.techType = comboInfo.techType;
      port.comboLabel = comboInfo.comboLabel;
      
      if (port.ontRxValues.length > 0) {
        port.avgOntRxOptPwr = port.ontRxValues.reduce((a, b) => a + b, 0) / port.ontRxValues.length;
        port.minOntRxOptPwr = Math.min(...port.ontRxValues);
        port.maxOntRxOptPwr = Math.max(...port.ontRxValues);
      } else {
        port.avgOntRxOptPwr = null;
        port.minOntRxOptPwr = null;
        port.maxOntRxOptPwr = null;
      }

      if (port.oltRxValues.length > 0) {
        port.avgOLTRXOptPwr = port.oltRxValues.reduce((a, b) => a + b, 0) / port.oltRxValues.length;
        port.minOLTRXOptPwr = Math.min(...port.oltRxValues);
        port.maxOLTRXOptPwr = Math.max(...port.oltRxValues);
      } else {
        port.avgOLTRXOptPwr = null;
        port.minOLTRXOptPwr = null;
        port.maxOLTRXOptPwr = null;
      }

      delete port.ontRxValues;
      delete port.oltRxValues;
    }
  }

  return olts;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, skip_trends } = body;

    if (!file_url) {
      return Response.json({ error: 'No file URL provided' }, { status: 400 });
    }

    // Fetch LCP entries for integration
    let lcpEntries = [];
    try {
      lcpEntries = await base44.entities.LCPEntry.list();
    } catch (e) {
      // LCP data not available, continue without it
      console.log('LCP data not available:', e.message);
    }

    // Build LCP lookup map by OLT name + shelf/slot/port
    // Support multiple port formats for robust matching
    const lcpLookup = {};
    for (const lcp of lcpEntries) {
      if (lcp.olt_name && lcp.olt_shelf !== undefined && lcp.olt_slot !== undefined && lcp.olt_port) {
        const oltName = lcp.olt_name.toLowerCase().trim();
        const shelf = lcp.olt_shelf.toString();
        const slot = lcp.olt_slot.toString();
        const port = lcp.olt_port.toString();
        
        const lcpData = {
          lcp_number: lcp.lcp_number,
          splitter_number: lcp.splitter_number,
          location: lcp.location,
          address: lcp.address,
          gps_lat: lcp.gps_lat,
          gps_lng: lcp.gps_lng,
        };
        
        // Base key: olt_name|shelf/slot/port
        const baseKey = `${oltName}|${shelf}/${slot}/${port}`;
        lcpLookup[baseKey] = lcpData;
        
        // Handle xp prefix variations (e.g., "xp3" for port "3")
        const xpKey = `${oltName}|${shelf}/${slot}/xp${port}`;
        lcpLookup[xpKey] = lcpData;
        
        // If port contains a range (e.g., "1-4" or "3-4"), index individual ports
        const portRange = port.match(/^(\d+)-(\d+)$/);
        if (portRange) {
          const start = parseInt(portRange[1]);
          const end = parseInt(portRange[2]);
          for (let p = start; p <= end; p++) {
            lcpLookup[`${oltName}|${shelf}/${slot}/${p}`] = lcpData;
            lcpLookup[`${oltName}|${shelf}/${slot}/xp${p}`] = lcpData;
          }
        }
      }
    }
    
    console.log(`Built LCP lookup with ${Object.keys(lcpLookup).length} keys for ${lcpEntries.length} LCP entries`);

    // Fetch the CSV file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    }

    const csvContent = await fileResponse.text();

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (!records || records.length === 0) {
      return Response.json({ error: 'No data found in CSV' }, { status: 400 });
    }

    // Extract relevant fields from each record
    const parsedOnts = records.map((record, index) => {
      const ont = { _rowIndex: index };
      for (const field of FIELDS) {
        // Handle variations in column naming
        const value = record[field] || record[field.toLowerCase()] || record[field.toUpperCase()] || null;
        
        // Apply normalization to SerialNumber field
        if (field === 'SerialNumber') {
          ont[field] = normalizeSerialNumber(value);
        } else {
          ont[field] = value;
        }
      }
      
      // Match LCP data using OLT name and port information
      const oltName = (ont.OLTName || '').toLowerCase().trim();
      const shelfSlotPort = ont['Shelf/Slot/Port'] || '';
      
      // Try direct match with full path
      let lcpKey = `${oltName}|${shelfSlotPort}`.toLowerCase();
      let lcpMatch = lcpLookup[lcpKey];
      
      // If no match, try normalizing the port format
      if (!lcpMatch && shelfSlotPort) {
        // Extract shelf, slot, port from formats like "0/1/xp3", "1/2/16", "0/1/xp3-4"
        const portMatch = shelfSlotPort.match(/^(\d+)\/(\d+)\/(?:xp)?(\d+)(?:-\d+)?$/i);
        if (portMatch) {
          const shelf = portMatch[1];
          const slot = portMatch[2];
          const port = portMatch[3];
          
          // Try with and without xp prefix
          lcpKey = `${oltName}|${shelf}/${slot}/${port}`;
          lcpMatch = lcpLookup[lcpKey] || lcpLookup[`${oltName}|${shelf}/${slot}/xp${port}`];
        }
      }
      
      // Store matched LCP data on ONT record
      if (lcpMatch) {
        ont._lcpNumber = lcpMatch.lcp_number || '';
        ont._splitterNumber = lcpMatch.splitter_number || '';
        ont._lcpLocation = lcpMatch.location || '';
        ont._lcpAddress = lcpMatch.address || '';
        ont._lcpGpsLat = lcpMatch.gps_lat;
        ont._lcpGpsLng = lcpMatch.gps_lng;
      }
      
      // Detect DZS model based on FSAN prefix if model is unknown
      if ((!ont.model || ont.model === 'Unknown' || ont.model === 'N/A' || ont.model === '') && ont.SerialNumber) {
        const fsan = ont.SerialNumber;
        if (fsan.startsWith('050') || fsan.startsWith('051') || fsan.startsWith('053')) {
          ont.model = 'DZS 522x XG';
        }
      }
      
      // Detect technology type from model (primary method)
      const modelTechType = detectTechTypeFromModel(ont.model);
      
      // Add combo port detection info (secondary method for combo ports)
      const comboInfo = detectComboPort(shelfSlotPort);
      ont._isCombo = comboInfo.isCombo;
      ont._comboLabel = comboInfo.comboLabel;
      
      // Priority: Model-based detection > Combo port detection
      ont._techType = modelTechType || comboInfo.techType || null;
      
      return ont;
    });

    // Calculate segment statistics
    const segmentStats = calculateSegmentStats(parsedOnts);

    // Fetch historical data for trend analysis
    const serialNumbers = parsedOnts
      .map(ont => ont.SerialNumber)
      .filter(s => s != null);

    // Skip expensive historical trend fetching when skip_trends is set
    // (used when loading saved reports — trends were already computed on original upload)
    let historicalRecords = [];
    if (serialNumbers.length > 0 && !skip_trends) {
      try {
        // Limit trend lookback to a single batch to stay within CPU limits on large datasets
        const batch = await base44.asServiceRole.entities.ONTPerformanceRecord.filter(
          { serial_number: { $in: serialNumbers } },
          '-report_date',
          5000,
          0
        );
        historicalRecords = batch;
        console.log(`Loaded ${historicalRecords.length} historical records for trend analysis`);
      } catch (err) {
        console.log('No historical data available for trend analysis:', err.message);
      }
    }

    // Build historical lookup map - get most recent record for each ONT
    const historicalMap = new Map();
    historicalRecords.forEach(record => {
      const existing = historicalMap.get(record.serial_number);
      if (!existing || new Date(record.report_date) > new Date(existing.report_date)) {
        historicalMap.set(record.serial_number, record);
      }
    });

    // Analyze each ONT with trend comparison
    const analyzedOnts = parsedOnts.map(ont => {
      const oltName = ont.OLTName || 'Unknown OLT';
      const portKey = ont['Shelf/Slot/Port'] || 'Unknown';
      const portStats = segmentStats[oltName]?.ports[portKey];
      const analysis = analyzeOnt(ont, portStats);

      // Calculate trends if historical data exists
      let trends = null;
      const historical = historicalMap.get(ont.SerialNumber);
      if (historical) {
        const currentOntRx = parseNumeric(ont.OntRxOptPwr);
        const previousOntRx = historical.ont_rx_power;
        const currentOltRx = parseNumeric(ont.OLTRXOptPwr);
        const previousOltRx = historical.olt_rx_power;
        const currentUsBip = parseNumeric(ont.UpstreamBipErrors) || 0;
        const previousUsBip = historical.us_bip_errors || 0;
        const currentDsBip = parseNumeric(ont.DownstreamBipErrors) || 0;
        const previousDsBip = historical.ds_bip_errors || 0;
        const currentUsFec = parseNumeric(ont.UpstreamFecUncorrectedCodeWords) || 0;
        const previousUsFec = historical.us_fec_uncorrected || 0;
        const currentDsFec = parseNumeric(ont.DownstreamFecUncorrectedCodeWords) || 0;
        const previousDsFec = historical.ds_fec_uncorrected || 0;

        trends = {
          ont_rx_change: currentOntRx !== null && previousOntRx !== null ? currentOntRx - previousOntRx : null,
          olt_rx_change: currentOltRx !== null && previousOltRx !== null ? currentOltRx - previousOltRx : null,
          us_bip_change: currentUsBip - previousUsBip,
          ds_bip_change: currentDsBip - previousDsBip,
          us_fec_change: currentUsFec - previousUsFec,
          ds_fec_change: currentDsFec - previousDsFec,
          previous_date: historical.report_date,
          days_since_last: historical.report_date ? 
            Math.floor((new Date() - new Date(historical.report_date)) / (1000 * 60 * 60 * 24)) : null
        };
      }

      return {
        ...ont,
        _analysis: analysis,
        _oltName: oltName,
        _port: portKey,
        _trends: trends,
      };
    });

    // Summary statistics
    const summary = {
      totalOnts: analyzedOnts.length,
      criticalCount: analyzedOnts.filter(o => o._analysis.status === 'critical').length,
      warningCount: analyzedOnts.filter(o => o._analysis.status === 'warning').length,
      okCount: analyzedOnts.filter(o => o._analysis.status === 'ok').length,
      offlineCount: analyzedOnts.filter(o => o._analysis.status === 'offline').length,
      oltCount: Object.keys(segmentStats).length,
      portCount: Object.values(segmentStats).reduce((sum, olt) => sum + Object.keys(olt.ports).length, 0),
    };

    return Response.json({
      success: true,
      summary,
      olts: segmentStats,
      onts: analyzedOnts,
    });

  } catch (error) {
    console.error('PON PM Parse Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});