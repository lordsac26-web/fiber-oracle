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

function analyzeOnt(ont, segmentStats) {
  const issues = [];
  const warnings = [];

  // Check ONT Rx Power
  const ontRx = parseNumeric(ont.OntRxOptPwr);
  if (ontRx !== null) {
    if (ontRx < THRESHOLDS.OntRxOptPwr.low) {
      issues.push({ field: 'OntRxOptPwr', severity: 'critical', message: `ONT Rx power critically low: ${ontRx} dBm` });
    } else if (ontRx < THRESHOLDS.OntRxOptPwr.marginal) {
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', message: `ONT Rx power marginal: ${ontRx} dBm` });
    } else if (ontRx > THRESHOLDS.OntRxOptPwr.high) {
      warnings.push({ field: 'OntRxOptPwr', severity: 'warning', message: `ONT Rx power too high: ${ontRx} dBm (may need attenuator)` });
    }
    
    // Compare to segment average
    if (segmentStats && segmentStats.avgOntRxOptPwr !== null) {
      const diff = ontRx - segmentStats.avgOntRxOptPwr;
      if (diff < -3) {
        warnings.push({ field: 'OntRxOptPwr', severity: 'info', message: `ONT Rx ${Math.abs(diff).toFixed(1)} dB below segment average` });
      }
    }
  }

  // Check OLT Rx Power
  const oltRx = parseNumeric(ont.OLTRXOptPwr);
  if (oltRx !== null) {
    if (oltRx < THRESHOLDS.OLTRXOptPwr.low) {
      issues.push({ field: 'OLTRXOptPwr', severity: 'critical', message: `OLT Rx power critically low: ${oltRx} dBm` });
    } else if (oltRx < THRESHOLDS.OLTRXOptPwr.marginal) {
      warnings.push({ field: 'OLTRXOptPwr', severity: 'warning', message: `OLT Rx power marginal: ${oltRx} dBm` });
    }
  }

  // Check error rates
  const checkErrorField = (fieldName, value) => {
    const num = parseNumeric(value);
    if (num !== null && THRESHOLDS[fieldName]) {
      if (num >= THRESHOLDS[fieldName].critical) {
        issues.push({ field: fieldName, severity: 'critical', message: `High ${fieldName}: ${num}` });
      } else if (num >= THRESHOLDS[fieldName].warning) {
        warnings.push({ field: fieldName, severity: 'warning', message: `Elevated ${fieldName}: ${num}` });
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
      issues.push({ field: 'UsSdberRate', severity: 'critical', message: `Critical upstream BER: ${usBer.toExponential(2)}` });
    } else if (usBer >= THRESHOLDS.UsSdberRate.warning) {
      warnings.push({ field: 'UsSdberRate', severity: 'warning', message: `Elevated upstream BER: ${usBer.toExponential(2)}` });
    }
  }

  const dsBer = parseNumeric(ont.DsSdberRate);
  if (dsBer !== null && dsBer > 0) {
    if (dsBer >= THRESHOLDS.DsSdberRate.critical) {
      issues.push({ field: 'DsSdberRate', severity: 'critical', message: `Critical downstream BER: ${dsBer.toExponential(2)}` });
    } else if (dsBer >= THRESHOLDS.DsSdberRate.warning) {
      warnings.push({ field: 'DsSdberRate', severity: 'warning', message: `Elevated downstream BER: ${dsBer.toExponential(2)}` });
    }
  }

  return {
    issues,
    warnings,
    status: issues.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'ok'
  };
}

function calculateSegmentStats(onts) {
  const segments = {};

  for (const ont of onts) {
    const segmentKey = ont['Shelf/Slot/Port'] || 'Unknown';
    if (!segments[segmentKey]) {
      segments[segmentKey] = {
        onts: [],
        ontRxValues: [],
        oltRxValues: [],
      };
    }
    segments[segmentKey].onts.push(ont);
    
    const ontRx = parseNumeric(ont.OntRxOptPwr);
    if (ontRx !== null) segments[segmentKey].ontRxValues.push(ontRx);
    
    const oltRx = parseNumeric(ont.OLTRXOptPwr);
    if (oltRx !== null) segments[segmentKey].oltRxValues.push(oltRx);
  }

  // Calculate stats for each segment
  for (const key of Object.keys(segments)) {
    const seg = segments[key];
    seg.count = seg.onts.length;
    
    if (seg.ontRxValues.length > 0) {
      seg.avgOntRxOptPwr = seg.ontRxValues.reduce((a, b) => a + b, 0) / seg.ontRxValues.length;
      seg.minOntRxOptPwr = Math.min(...seg.ontRxValues);
      seg.maxOntRxOptPwr = Math.max(...seg.ontRxValues);
    } else {
      seg.avgOntRxOptPwr = null;
      seg.minOntRxOptPwr = null;
      seg.maxOntRxOptPwr = null;
    }

    if (seg.oltRxValues.length > 0) {
      seg.avgOLTRXOptPwr = seg.oltRxValues.reduce((a, b) => a + b, 0) / seg.oltRxValues.length;
      seg.minOLTRXOptPwr = Math.min(...seg.oltRxValues);
      seg.maxOLTRXOptPwr = Math.max(...seg.oltRxValues);
    } else {
      seg.avgOLTRXOptPwr = null;
      seg.minOLTRXOptPwr = null;
      seg.maxOLTRXOptPwr = null;
    }

    // Clean up temporary arrays
    delete seg.ontRxValues;
    delete seg.oltRxValues;
  }

  return segments;
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
        ont[field] = value;
      }
      return ont;
    });

    // Calculate segment statistics
    const segmentStats = calculateSegmentStats(parsedOnts);

    // Analyze each ONT
    const analyzedOnts = parsedOnts.map(ont => {
      const segmentKey = ont['Shelf/Slot/Port'] || 'Unknown';
      const stats = segmentStats[segmentKey];
      const analysis = analyzeOnt(ont, stats);
      return {
        ...ont,
        _analysis: analysis,
        _segment: segmentKey,
      };
    });

    // Summary statistics
    const summary = {
      totalOnts: analyzedOnts.length,
      criticalCount: analyzedOnts.filter(o => o._analysis.status === 'critical').length,
      warningCount: analyzedOnts.filter(o => o._analysis.status === 'warning').length,
      okCount: analyzedOnts.filter(o => o._analysis.status === 'ok').length,
      segmentCount: Object.keys(segmentStats).length,
    };

    return Response.json({
      success: true,
      summary,
      segments: segmentStats,
      onts: analyzedOnts,
    });

  } catch (error) {
    console.error('PON PM Parse Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});