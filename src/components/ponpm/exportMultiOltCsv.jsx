import { toast } from 'sonner';

/**
 * Multi-OLT CSV export — one combined CSV with all ONTs from the selected
 * OLTs, grouped by OLT with section header rows for readability.
 */
export function exportMultiOltCSV(onts, selectedOlts) {
  if (!onts || onts.length === 0) {
    toast.error('No ONT data loaded');
    return;
  }
  if (!selectedOlts || selectedOlts.length === 0) {
    toast.error('Select at least one OLT');
    return;
  }

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [];
  let totalRows = 0;

  const columns = [
    'Status', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model',
    'ONT Rx', 'OLT Rx', 'ONT Tx',
    'US BIP', 'DS BIP',
    'US FEC Unc', 'DS FEC Unc',
    'US FEC Corr', 'DS FEC Corr',
    'LCP', 'Splitter', 'Subscriber', 'Address',
  ];

  selectedOlts.forEach((olt, idx) => {
    const oltOnts = onts
      .filter(o => o._oltName === olt)
      .sort((a, b) => (a['Shelf/Slot/Port'] || '').localeCompare(b['Shelf/Slot/Port'] || '', undefined, { numeric: true }));

    if (idx > 0) lines.push('');
    lines.push([`=== OLT: ${olt} (${oltOnts.length} ONTs) ===`].map(esc).join(','));
    lines.push(columns.map(esc).join(','));

    oltOnts.forEach(o => {
      const sub = o._subscriber || {};
      lines.push([
        o._analysis?.status?.toUpperCase() || '',
        o['Shelf/Slot/Port'] || '',
        o.OntID || '',
        o.SerialNumber || '',
        o.model || '',
        o.OntRxOptPwr ?? '',
        o.OLTRXOptPwr ?? '',
        o.OntTxPwr ?? '',
        o.UpstreamBipErrors ?? 0,
        o.DownstreamBipErrors ?? 0,
        o.UpstreamFecUncorrectedCodeWords ?? 0,
        o.DownstreamFecUncorrectedCodeWords ?? 0,
        o.UpstreamFecCorrectedCodeWords ?? 0,
        o.DownstreamFecCorrectedCodeWords ?? 0,
        o._lcpNumber || '',
        o._splitterNumber || '',
        sub.name || '',
        sub.address || sub.streetAddress || '',
      ].map(esc).join(','));
      totalRows += 1;
    });
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `olt-data-${selectedOlts.length}-olts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${totalRows} ONTs across ${selectedOlts.length} OLT(s)`);
}