import { toast } from 'sonner';
import { downloadCsv } from './csvExportUtils';

/**
 * Critical Issues (CSV) — every ONT classified as critical, one row each.
 * Focused on actionable triage: includes signal levels, error counters,
 * LCP/splitter, subscriber info, and a summary of every issue/warning fired.
 */
export function exportCriticalIssuesCSV(onts) {
  if (!onts || onts.length === 0) {
    toast.error('No ONT data loaded');
    return;
  }
  const critical = onts
    .filter(o => o._analysis?.status === 'critical')
    .sort((a, b) => {
      const oltCmp = (a._oltName || '').localeCompare(b._oltName || '', undefined, { numeric: true });
      if (oltCmp !== 0) return oltCmp;
      return (a['Shelf/Slot/Port'] || '').localeCompare(b['Shelf/Slot/Port'] || '', undefined, { numeric: true });
    });

  if (critical.length === 0) {
    toast.error('No critical ONTs found');
    return;
  }

  const headers = [
    'OLT', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model',
    'ONT Rx', 'OLT Rx', 'ONT Tx',
    'US BIP', 'DS BIP', 'US FEC Unc', 'DS FEC Unc',
    'LCP', 'Splitter', 'Location',
    'Subscriber', 'Account', 'Address',
    'Issue Count', 'Issue Summary',
  ];

  const rows = critical.map(o => {
    const sub = o._subscriber || {};
    const all = [...(o._analysis?.issues || []), ...(o._analysis?.warnings || [])];
    return [
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

  downloadCsv([headers, ...rows], `critical-issues-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${critical.length} critical ONTs`);
}