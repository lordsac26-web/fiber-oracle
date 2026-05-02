/**
 * Shared CSV validation + template download utilities.
 *
 * Goal: every CSV upload point in the app validates the file against a known
 * column spec BEFORE attempting to parse it as data. If validation fails,
 * the user is shown a clear error pointing at the expected format and
 * offered a downloadable template.
 *
 * Usage:
 *   const result = validateCsvFile(file, SUBSCRIBER_CSV_SPEC);
 *   if (!result.ok) { toast.error(result.message); return; }
 *   // ...proceed with parsing using result.text + result.delimiter
 */

/**
 * @typedef {Object} CsvSpec
 * @property {string} label              Human-readable name (e.g. "Subscriber Data")
 * @property {string[]} requiredColumns  Column names (case-insensitive, ignoring _-/ space) that must be present
 * @property {string[]} [optionalColumns] Documented optional columns — included in template
 * @property {string[]} [aliases]        Map of "alias→canonical" for required columns (lower-case alias)
 * @property {string[][]} [sampleRows]   Sample rows for the downloadable template
 */

const DEFAULT_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Normalize a header cell for comparison: lowercase, strip quotes/whitespace/separators.
 */
function normalizeHeader(h) {
  return String(h || '')
    .replace(/['"]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/]+/g, '');
}

/**
 * Detect the most likely CSV delimiter from a header line.
 */
export function detectDelimiter(headerLine) {
  if (!headerLine) return ',';
  if (headerLine.includes('\t')) return '\t';
  const semis = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semis > commas ? ';' : ',';
}

/**
 * Parse one CSV line respecting quoted fields.
 */
export function parseCsvLine(line, delimiter) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === delimiter && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Validate a File against a CsvSpec. Reads the file fully, checks size and
 * required columns, and returns either the raw text + delimiter (on success)
 * or a user-facing error message (on failure).
 *
 * @param {File} file
 * @param {CsvSpec} spec
 * @param {{ maxBytes?: number }} [opts]
 * @returns {Promise<{ ok: true, text: string, delimiter: string, headers: string[] } | { ok: false, message: string }>}
 */
export async function validateCsvFile(file, spec, opts = {}) {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  if (!file) return { ok: false, message: 'No file selected.' };

  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.csv') && !name.endsWith('.txt')) {
    return {
      ok: false,
      message: `Invalid file: "${file.name}". ${spec.label} requires a .csv file. Please check your file format against the listed columns or download the template.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, message: 'The selected file is empty.' };
  }
  if (file.size > maxBytes) {
    return { ok: false, message: `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).` };
  }

  // Read the file
  let text;
  try {
    text = await file.text();
  } catch {
    return { ok: false, message: 'Could not read the file. It may be corrupted or not a text file.' };
  }

  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false,
      message: `${spec.label} CSV must have a header row and at least one data row. Please check your file format or download the template.`,
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const normalized = rawHeaders.map(normalizeHeader);

  // Build a set of acceptable normalized names per required column
  const required = (spec.requiredColumns || []).map(c => ({
    canonical: c,
    accepted: new Set([normalizeHeader(c), ...(spec.aliases?.[c] || []).map(normalizeHeader)]),
  }));

  const missing = required.filter(r => !normalized.some(h => r.accepted.has(h))).map(r => r.canonical);

  if (missing.length > 0) {
    return {
      ok: false,
      message:
        `${spec.label} CSV is missing required column(s): ${missing.join(', ')}. ` +
        `Please check your file format against the listed columns, or download the template and re-export.`,
    };
  }

  return { ok: true, text, delimiter, headers: rawHeaders };
}

/**
 * Trigger a browser download of a CSV template built from a CsvSpec.
 */
export function downloadCsvTemplate(spec) {
  const headers = [
    ...(spec.requiredColumns || []),
    ...(spec.optionalColumns || []),
  ];
  const rows = spec.sampleRows && spec.sampleRows.length > 0 ? spec.sampleRows : [];
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spec.label.toLowerCase().replace(/\s+/g, '-')}-template.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Specs for each upload point ───────────────────────────────────────────

export const SUBSCRIBER_CSV_SPEC = {
  label: 'Subscriber Data',
  requiredColumns: ['OntID'],
  optionalColumns: [
    'SubscriberName', 'AccountName', 'Address', 'City', 'Zip',
    'ONTRanged', 'ONTSerialNo', 'ONTModel', 'CurrentONTSoftwareVersion',
    'DeviceName', 'LinkedPon',
  ],
  aliases: {
    OntID: ['ont_id', 'ontid'],
    SubscriberName: ['subscriber_name', 'subscriber'],
    AccountName: ['account_name', 'account'],
    ONTSerialNo: ['ont_serial_no', 'ontserial', 'serial', 'serialnumber'],
    ONTModel: ['ont_model', 'model'],
    CurrentONTSoftwareVersion: ['current_ont_software_version', 'softwareversion', 'sw_version'],
    DeviceName: ['device_name', 'device'],
    LinkedPon: ['linked_pon', 'pon'],
  },
  sampleRows: [
    [
      '1', 'Jane Doe', 'ACCT-1001', '123 Main St', 'Anytown', '12345',
      'Yes', 'CXNK01234567', '844G', '3.6.0',
      'OLT-CENTRAL-01', '1/1/1',
    ],
  ],
};

export const PONPM_CSV_SPEC = {
  label: 'PON PM Report',
  requiredColumns: ['SerialNumber'],
  optionalColumns: [
    'OntID', 'Shelf/Slot/Port', 'OLTName', 'Model',
    'OntRxOptPwr', 'OLTRXOptPwr', 'OntTxPwr',
    'UpstreamBipErrors', 'DownstreamBipErrors',
    'UpstreamFecUncorrectedCodeWords', 'DownstreamFecUncorrectedCodeWords',
    'UpstreamFecCorrectedCodeWords', 'DownstreamFecCorrectedCodeWords',
  ],
  aliases: {
    SerialNumber: ['serial_number', 'serial', 'fsan'],
  },
  // PON PM CSVs are vendor-exported; template is informational only
  sampleRows: [],
};

export const OPTIC_INVENTORY_CSV_SPEC = {
  label: 'Optic Inventory',
  requiredColumns: ['SystemName', 'Shelf', 'Slot', 'Port'],
  optionalColumns: ['OPTIC-MAKE', 'OPTIC-MODEL', 'OPTIC-SERIAL'],
  aliases: {
    SystemName: ['system_name', 'system name'],
    'OPTIC-MAKE': ['optic_make', 'opticmake'],
    'OPTIC-MODEL': ['optic_model', 'opticmodel'],
    'OPTIC-SERIAL': ['optic_serial', 'opticserial'],
  },
  sampleRows: [
    ['OLT-CENTRAL-01', '1', '1', '1', 'Calix', '100-05730', 'SN12345'],
  ],
};

export const LCP_CSV_SPEC = {
  label: 'LCP Entries',
  requiredColumns: ['LCP', 'Splitter'],
  optionalColumns: [
    'Type', 'Location', 'Lat', 'Long',
    'OLT', 'Shelf', 'Slot', 'Port',
    'Optic-Make', 'Optic-Model', 'Optic-Serial', 'Notes',
  ],
  aliases: {
    LCP: ['lcp_number', 'lcpnumber', 'clcp'],
    Splitter: ['splitter_number', 'splitternumber'],
  },
  sampleRows: [
    ['LCP-001', '1', 'LCP', '123 Main St', '40.7128', '-74.0060', 'OLT-CENTRAL-01', '1', '1', '1', 'Calix', '100-05730', 'SN12345', ''],
  ],
};