import { toast } from 'sonner';

/**
 * Extracted CSV export helpers from PONPMAnalysis to keep that page under
 * the platform's 2000-line edit limit. Pure functions — they take ONT
 * arrays in and trigger a browser download. No side effects beyond toast.
 */

function downloadCsv(rows, filename) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Offline-only ONTs export — sorted by OLT then port (numeric) */
export function exportOfflineCSV(onts) {
  if (!onts) return;
  const offlineOnts = onts
    .filter(ont => ont._analysis?.status === 'offline')
    .sort((a, b) => {
      const oltCmp = (a._oltName || '').localeCompare(b._oltName || '', undefined, { numeric: true });
      if (oltCmp !== 0) return oltCmp;
      return (a['Shelf/Slot/Port'] || '').localeCompare(b['Shelf/Slot/Port'] || '', undefined, { numeric: true });
    });

  if (offlineOnts.length === 0) {
    toast.error('No offline ONTs found in this report');
    return;
  }

  const headers = ['OLT', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model', 'LCP', 'Splitter', 'Location', 'Address'];
  const rows = offlineOnts.map(ont => [
    ont._oltName || '',
    ont['Shelf/Slot/Port'] || '',
    ont.OntID || '',
    ont.SerialNumber || '',
    ont.model || '',
    ont._lcpNumber || '',
    ont._splitterNumber || '',
    ont._lcpLocation || '',
    ont._lcpAddress || '',
  ]);

  downloadCsv([headers, ...rows], `offline-onts-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${offlineOnts.length} offline ONTs`);
}

/** All / critical / warning / issues ONT export */
export function exportFilteredOntsCSV(onts, filterType = 'all') {
  if (!onts) return;
  let ontsToExport = onts;
  if (filterType === 'critical') ontsToExport = onts.filter(o => o._analysis?.status === 'critical');
  else if (filterType === 'warning') ontsToExport = onts.filter(o => o._analysis?.status === 'warning');
  else if (filterType === 'issues')  ontsToExport = onts.filter(o => o._analysis?.status !== 'ok');

  const headers = [
    'Status', 'OLT', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model',
    'OntRxOptPwr', 'OntTxPwr', 'OLTRXOptPwr',
    'UpstreamBipErrors', 'DownstreamBipErrors',
    'UpstreamFecUncorrected', 'DownstreamFecUncorrected',
    'Issues', 'Issue Details',
  ];

  const rows = ontsToExport.map(ont => {
    const allIssues = [...(ont._analysis?.issues || []), ...(ont._analysis?.warnings || [])];
    return [
      ont._analysis?.status?.toUpperCase() || '',
      ont._oltName,
      ont['Shelf/Slot/Port'],
      ont.OntID,
      ont.SerialNumber,
      ont.model,
      ont.OntRxOptPwr,
      ont.OntTxPwr,
      ont.OLTRXOptPwr,
      ont.UpstreamBipErrors,
      ont.DownstreamBipErrors,
      ont.UpstreamFecUncorrectedCodeWords,
      ont.DownstreamFecUncorrectedCodeWords,
      allIssues.map(i => i.field).join(', '),
      allIssues.map(i => `${i.field}: ${i.value} (${i.message})`).join('; '),
    ];
  });

  const suffix = filterType === 'all' ? '' : `-${filterType}`;
  downloadCsv([headers, ...rows], `pon-pm-analysis${suffix}-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${ontsToExport.length} ${filterType === 'all' ? '' : filterType + ' '}ONTs`);
}

/** Port inventory aggregate export */
export function exportPortInventoryCSV(onts) {
  if (!onts) return;

  const portMap = new Map();
  onts.forEach(ont => {
    const key = `${ont._oltName || 'Unknown'}|${ont._port || 'Unknown'}`;
    if (!portMap.has(key)) {
      portMap.set(key, {
        olt: ont._oltName || 'Unknown',
        port: ont._port || 'Unknown',
        onts: [],
        lcps: new Set(),
        models: new Set(),
        opticTypes: new Set(),
      });
    }
    const portData = portMap.get(key);
    portData.onts.push(ont);
    if (ont._lcpNumber) portData.lcps.add(`${ont._lcpNumber}${ont._splitterNumber ? '/' + ont._splitterNumber : ''}`);
    if (ont.model) portData.models.add(ont.model);
    if (ont._opticModel) portData.opticTypes.add(ont._opticModel);
  });

  const headers = ['OLT', 'Port', 'Total ONTs', 'LCP/Splitters', 'ONT Models', 'Optic Types', 'Status Breakdown'];
  const rows = [...portMap.values()]
    .sort((a, b) => {
      const oltCmp = a.olt.localeCompare(b.olt, undefined, { numeric: true });
      return oltCmp !== 0 ? oltCmp : a.port.localeCompare(b.port, undefined, { numeric: true });
    })
    .map(p => {
      const sb = {
        ok: p.onts.filter(o => o._analysis?.status === 'ok').length,
        warning: p.onts.filter(o => o._analysis?.status === 'warning').length,
        critical: p.onts.filter(o => o._analysis?.status === 'critical').length,
        offline: p.onts.filter(o => o._analysis?.status === 'offline').length,
      };
      return [
        p.olt,
        p.port,
        p.onts.length,
        [...p.lcps].join('; ') || 'N/A',
        [...p.models].join('; ') || 'N/A',
        [...p.opticTypes].join('; ') || 'N/A',
        `OK: ${sb.ok} | Warning: ${sb.warning} | Critical: ${sb.critical} | Offline: ${sb.offline}`,
      ];
    });

  downloadCsv([headers, ...rows], `port-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${portMap.size} ports with ONT inventory`);
}