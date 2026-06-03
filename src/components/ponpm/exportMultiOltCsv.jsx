import { toast } from 'sonner';
import { escapeCsv as esc, downloadCsv } from './csvExportUtils';

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

  const lines = [];
  let totalRows = 0;

  const columns = [
    'STATUS', 'OLT/CHASSIS', 'SHELF/SLOT/PORT', 'ONTID', 'Serial Number', 'Model',
    'ONT Rx', 'OLT Rx', 'ONT Tx',
    'US BIP', 'DS BIP',
    'US UNC FEC', 'DS UNC FEC',
    'US COR FEC', 'DS COR FEC',
    'LCP', 'SPLITTER', 'Subscriber', 'Address',
  ];

  lines.push(columns.map(esc).join(','));

  selectedOlts.forEach((olt) => {
    const oltOnts = onts
      .filter(o => o._oltName === olt)
      .sort((a, b) => (a['Shelf/Slot/Port'] || '').localeCompare(b['Shelf/Slot/Port'] || '', undefined, { numeric: true }));

    oltOnts.forEach(o => {
      const sub = o._subscriber || {};
      lines.push([
        o._analysis?.status?.toUpperCase() || '',
        o._oltName || olt || '',
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

  downloadCsv(lines.join('\n'), `olt-data-${selectedOlts.length}-olts-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${totalRows} ONTs across ${selectedOlts.length} OLT(s)`);
}