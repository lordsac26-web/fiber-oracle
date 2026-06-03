/**
 * Shared CSV export helpers for all PON PM / LCP / Eero exports.
 *
 * Consolidates the previously-duplicated escape/build/download logic that was
 * copy-pasted across ontCsvExports, exportAllIssuesCsv, exportCriticalCsv,
 * exportFullIssueReport, exportMultiOltCsv and exportComboGponReport.
 *
 * Keeping a single implementation guarantees consistent quoting/escaping
 * (RFC-4180 style double-quote doubling) across every export in the app.
 */

/** Escape a single cell value: wrap in quotes, double any embedded quotes. */
export function escapeCsv(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/**
 * Build a CSV string from an array of rows (each row is an array of cells).
 * Empty rows (`[]` or `''`) are emitted as blank lines so callers can use
 * them as section separators.
 */
export function buildCsv(rows) {
  return rows
    .map((row) =>
      Array.isArray(row) ? row.map(escapeCsv).join(',') : String(row ?? '')
    )
    .join('\n');
}

/**
 * Trigger a browser download of a CSV string.
 * Accepts either a pre-built CSV string or an array of rows.
 */
export function downloadCsv(csvOrRows, filename) {
  const csv = Array.isArray(csvOrRows) ? buildCsv(csvOrRows) : csvOrRows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}