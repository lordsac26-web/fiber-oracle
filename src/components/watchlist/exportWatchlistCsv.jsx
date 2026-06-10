// Dumps the critical ONT watchlist (current values + 5r/10r deltas) to a CSV file.
// Kept dependency-free so it stays trivially testable and portable.

const METRICS = [
  ['ont_rx_power', 'ONT Rx (dBm)'],
  ['olt_rx_power', 'OLT Rx (dBm)'],
  ['us_bip_errors', 'US BIP'],
  ['ds_bip_errors', 'DS BIP'],
  ['us_fec_uncorrected', 'US FEC Uncorrected'],
  ['ds_fec_uncorrected', 'DS FEC Uncorrected'],
  ['us_gem_hec_errors', 'US GEM HEC'],
  ['us_missed_bursts', 'US Missed Bursts'],
];

function esc(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Quote fields containing comma, quote, or newline; double embedded quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildWatchlistCsv(onts) {
  const header = [
    'Rank', 'Serial Number', 'ONT ID', 'OLT', 'Port', 'Model',
    'LCP', 'Splitter', 'Subscriber', 'Address', 'Status',
    'Severity Score', 'Report Count',
  ];
  for (const [, label] of METRICS) {
    header.push(label, `${label} Δ5r`, `${label} Δ10r`);
  }

  const rows = onts.map((o, i) => {
    const c = o.current || {};
    const d = o.deltas || {};
    const row = [
      i + 1, o.serial_number, o.ont_id, o.olt_name, o.port, o.model,
      o.lcp_number, o.splitter_number, o.subscriber_name, o.subscriber_address,
      o.status, o.severity_score, o.report_count,
    ];
    for (const [key] of METRICS) {
      const md = d[key] || {};
      row.push(c[key], md.delta5, md.delta10);
    }
    return row;
  });

  return [header, ...rows].map(r => r.map(esc).join(',')).join('\n');
}

export function downloadWatchlistCsv(onts, fileName = 'critical-ont-watchlist.csv') {
  const csv = buildWatchlistCsv(onts);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}