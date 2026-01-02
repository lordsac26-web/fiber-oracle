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
      techType: port1 % 2 === 1 ? 'XGS-PON (odd)' : 'GPON (even)',
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

  // Check ONT Rx Power
  const ontRx = parseNumeric(ont.OntRxOptPwr);
  if (ontRx !== null) {
    // Check if ONT is offline (0 power)
    if (ontRx === 0) {
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', value: `${ontRx} dBm`, threshold: `N/A`, message: `ONT OFFLINE - No signal detected` });
    } else if (ontRx < THRESHOLDS.OntRxOptPwr.low) {
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
  if (oltRx !== null) {
    // Check if OLT Rx is 0 (ONT offline)
    if (oltRx === 0) {
      // Don't flag as issue - already marked as offline above
    } else if (oltRx < THRESHOLDS.OLTRXOptPwr.low) {
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
    status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok'
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

    const { file_url } = await req.json();

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
    // Support multiple port formats: exact match and range matching
    const lcpLookup = {};
    for (const lcp of lcpEntries) {
      if (lcp.olt_name && lcp.olt_shelf && lcp.olt_slot && lcp.olt_port) {
        // Store with normalized key
        const baseKey = `${lcp.olt_name}|${lcp.olt_shelf}/${lcp.olt_slot}/${lcp.olt_port}`.toLowerCase();
        lcpLookup[baseKey] = {
          lcp_number: lcp.lcp_number,
          splitter_number: lcp.splitter_number,
          location: lcp.location,
          address: lcp.address,
        };
        
        // If port contains a range (e.g., "1-4"), also index individual ports
        const portRange = lcp.olt_port.match(/(\d+)-(\d+)/);
        if (portRange) {
          const start = parseInt(portRange[1]);
          const end = parseInt(portRange[2]);
          for (let p = start; p <= end; p++) {
            const rangeKey = `${lcp.olt_name}|${lcp.olt_shelf}/${lcp.olt_slot}/${p}`.toLowerCase();
            if (!lcpLookup[rangeKey]) {
              lcpLookup[rangeKey] = {
                lcp_number: lcp.lcp_number,
                splitter_number: lcp.splitter_number,
                location: lcp.location,
                address: lcp.address,
              };
            }
            // Also handle xp prefix format
            const xpKey = `${lcp.olt_name}|${lcp.olt_shelf}/${lcp.olt_slot}/xp${p}`.toLowerCase();
            if (!lcpLookup[xpKey]) {
              lcpLookup[xpKey] = {
                lcp_number: lcp.lcp_number,
                splitter_number: lcp.splitter_number,
                location: lcp.location,
                address: lcp.address,
              };
            }
          }
        }
      }
    }

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
      
      // Try to match LCP data
      const oltName = ont.OLTName || '';
      const port = ont['Shelf/Slot/Port'] || '';
      const lcpKey = `${oltName}|${port}`.toLowerCase();
      let lcpMatch = lcpLookup[lcpKey];
      
      // If no direct match, try extracting individual port number for combo ports
      if (!lcpMatch && port) {
        // Handle combo port format like "0/1/xp3-4" - extract first port number
        const comboMatch = port.match(/(\d+)\/(\d+)\/(?:xp)?(\d+)/i);
        if (comboMatch) {
          const altKey = `${oltName}|${comboMatch[1]}/${comboMatch[2]}/${comboMatch[3]}`.toLowerCase();
          lcpMatch = lcpLookup[altKey];
        }
      }
      
      if (lcpMatch) {
        ont._lcpNumber = lcpMatch.lcp_number;
        ont._splitterNumber = lcpMatch.splitter_number;
        ont._lcpLocation = lcpMatch.location;
        ont._lcpAddress = lcpMatch.address;
      }
      
      // Add combo port detection info
      const comboInfo = detectComboPort(port);
      ont._isCombo = comboInfo.isCombo;
      ont._techType = comboInfo.techType;
      ont._comboLabel = comboInfo.comboLabel;
      
      return ont;
    });

    // Calculate segment statistics
    const segmentStats = calculateSegmentStats(parsedOnts);

    // Fetch historical data for trend analysis
    const serialNumbers = parsedOnts
      .map(ont => ont.SerialNumber)
      .filter(s => s != null);

    let historicalRecords = [];
    if (serialNumbers.length > 0) {
      try {
        // Fetch all historical records for these ONTs
        historicalRecords = await base44.asServiceRole.entities.ONTPerformanceRecord.filter({
          serial_number: { $in: serialNumbers }
        });
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