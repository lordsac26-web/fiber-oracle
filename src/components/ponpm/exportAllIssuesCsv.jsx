import { toast } from 'sonner';
import { downloadCsv } from './csvExportUtils';

/**
 * All Issues (CSV) — every ONT classified as critical OR warning, one row each.
 *
 * Unlike Full Issue Report this is a flat single-section CSV — easier to
 * pivot/filter in spreadsheets but contains no FEC port aggregate.
 */
export function exportAllIssuesCSV(onts) {
  if (!onts || onts.length === 0) {
    toast.error('No ONT data loaded');
    return;
  }
  const issueOnts = onts
    .filter(o => o._analysis?.status === 'critical' || o._analysis?.status === 'warning')
    .sort((a, b) => {
      // Critical first, then by OLT/port
      const sa = a._analysis.status === 'critical' ? 0 : 1;
      const sb = b._analysis.status === 'critical' ? 0 : 1;
      if (sa !== sb) return sa - sb;
      const oltCmp = (a._oltName || '').localeCompare(b._oltName || '', undefined, { numeric: true });
      if (oltCmp !== 0) return oltCmp;
      return (a['Shelf/Slot/Port'] || '').localeCompare(b['Shelf/Slot/Port'] || '', undefined, { numeric: true });
    });

  if (issueOnts.length === 0) {
    toast.error('No critical or warning ONTs found');
    return;
  }

  const headers = [
    'Status', 'OLT', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model',
    'ONT Rx', 'OLT Rx', 'ONT Tx',
    'US BIP', 'DS BIP', 'US FEC Unc', 'DS FEC Unc',
    'LCP', 'Splitter', 'Location',
    'Subscriber', 'Account', 'Address',
    'Issue Count', 'Issue Summary',
  ];

  const rows = issueOnts.map(o => {
    const sub = o._subscriber || {};
    const all = [...(o._analysis?.issues || []), ...(o._analysis?.warnings || [])];
    return [
      o._analysis.status.toUpperCase(),
      o._oltName || '',
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
      o._lcpNumber || '',
      o._splitterNumber || '',
      o._lcpLocation || '',
      sub.name || '',
      sub.account || '',
      sub.address || sub.streetAddress || '',
      all.length,
      all.map(i => `${i.field}: ${i.value} (${i.message})`).join('; '),
    ];
  });

  downloadCsv([headers, ...rows], `all-issues-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${issueOnts.length} ONTs with issues`);
}