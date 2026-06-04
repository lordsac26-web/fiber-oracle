import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { downloadCsv } from './csvExportUtils';

/**
 * Extracted CSV export helpers from PONPMAnalysis to keep that page under
 * the platform's 2000-line edit limit. Pure functions — they take ONT
 * arrays in and trigger a browser download. No side effects beyond toast.
 */

/** Offline-only ONTs export — sorted by OLT then port (numeric), with historical offline checks */
export async function exportOfflineCSV(onts, savedReports = [], currentReportId = null) {
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

  toast.loading('Checking offline history...', { id: 'offline-export' });

  const currentReport = currentReportId
    ? savedReports.find(r => r.id === currentReportId)
    : savedReports[0];
  const currentTime = currentReport?.upload_date ? new Date(currentReport.upload_date).getTime() : Date.now();
  const previousReports = savedReports
    .filter(r => r.id !== currentReport?.id && r.upload_date)
    .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

  const closestReport = (targetTime, excludeIds = new Set()) => {
    let best = null;
    let bestDiff = Infinity;
    for (const report of previousReports) {
      if (excludeIds.has(report.id)) continue;
      const diff = Math.abs(new Date(report.upload_date).getTime() - targetTime);
      if (diff < bestDiff) {
        best = report;
        bestDiff = diff;
      }
    }
    return best;
  };

  const lastReport = previousReports[0] || null;
  const usedIds = new Set(lastReport ? [lastReport.id] : []);
  const weekReport = closestReport(currentTime - 7 * 24 * 60 * 60 * 1000, usedIds);
  if (weekReport) usedIds.add(weekReport.id);
  const monthReport = closestReport(currentTime - 30 * 24 * 60 * 60 * 1000, usedIds);

  const normalizeSerial = (value) => String(value || '').trim().toUpperCase();
  // Vendor prefix: serials beginning with 050/051/053 are ZTE (ZNTS),
  // everything else is Calix (CXNK). Prefix is prepended to the raw serial.
  const withVendorPrefix = (value) => {
    const serial = String(value || '').trim();
    if (!serial) return '';
    const prefix = /^05[013]/.test(serial) ? 'ZNTS' : 'CXNK';
    return `${prefix}${serial}`;
  };
  const offlineSerialsForReport = async (report) => {
    if (!report?.id) return new Set();
    const records = await base44.entities.ONTPerformanceRecord.filter({ report_id: report.id, status: 'offline' }, 'id', 5000);
    return new Set(records.map(r => normalizeSerial(r.serial_number)).filter(Boolean));
  };

  const [lastOffline, weekOffline, monthOffline] = await Promise.all([
    offlineSerialsForReport(lastReport),
    offlineSerialsForReport(weekReport),
    offlineSerialsForReport(monthReport),
  ]);

  const formatDate = (report) => report?.upload_date ? new Date(report.upload_date).toLocaleDateString() : 'No report';
  const headers = [
    'OLT', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model', 'LCP', 'Splitter', 'Location', 'Address',
    `Offline Last Report (${formatDate(lastReport)})`,
    `Offline ~7 Days (${formatDate(weekReport)})`,
    `Offline ~30 Days (${formatDate(monthReport)})`,
  ];
  const rows = offlineOnts.map(ont => {
    const serial = normalizeSerial(ont.SerialNumber);
    return [
      ont._oltName || '',
      ont['Shelf/Slot/Port'] || '',
      ont.OntID || '',
      withVendorPrefix(ont.SerialNumber),
      ont.model || '',
      ont._lcpNumber || '',
      ont._splitterNumber || '',
      ont._lcpLocation || '',
      ont._lcpAddress || '',
      lastReport ? (lastOffline.has(serial) ? 'Yes' : 'No') : 'No report',
      weekReport ? (weekOffline.has(serial) ? 'Yes' : 'No') : 'No report',
      monthReport ? (monthOffline.has(serial) ? 'Yes' : 'No') : 'No report',
    ];
  });

  downloadCsv([headers, ...rows], `offline-onts-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${offlineOnts.length} offline ONTs with history`, { id: 'offline-export' });
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