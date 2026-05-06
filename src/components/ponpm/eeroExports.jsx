import { toast } from 'sonner';

/**
 * Export a CSV of every ONT that has matched eero data, with all available
 * ONT + subscriber + eero fields. Use case: hand-off to ops for eero-aware
 * troubleshooting / device tracking.
 */
export function exportEeroOntsCSV(onts) {
  if (!onts || onts.length === 0) {
    toast.error('No ONT data loaded');
    return;
  }

  const eeroOnts = onts.filter(o => o._eero);
  if (eeroOnts.length === 0) {
    toast.error('No ONTs with matched eero data found');
    return;
  }

  const headers = [
    // ONT
    'OLT', 'Shelf/Slot/Port', 'OntID', 'SerialNumber', 'Model',
    'OntRxOptPwr', 'OLTRXOptPwr', 'OntTxPwr', 'Status',
    'LCP', 'Splitter', 'Location', 'Address',
    // Subscriber
    'Subscriber Name', 'Account', 'Subscriber Address', 'City', 'Zip',
    // Eero
    'Eero ID', 'Eero Network ID', 'Eero Serial', 'Home Identifier',
    'Eero Network Created', 'Eero Last Alive',
    'Eero Organization', 'Eero ISP', 'Eero Model', 'Eero Gateway',
  ];

  const rows = eeroOnts
    .sort((a, b) => {
      const oltCmp = (a._oltName || '').localeCompare(b._oltName || '', undefined, { numeric: true });
      if (oltCmp !== 0) return oltCmp;
      return (a['Shelf/Slot/Port'] || '').localeCompare(b['Shelf/Slot/Port'] || '', undefined, { numeric: true });
    })
    .map(ont => {
      const sub  = ont._subscriber || {};
      const eero = ont._eero || {};
      return [
        ont._oltName || '',
        ont['Shelf/Slot/Port'] || '',
        ont.OntID || '',
        ont.SerialNumber || '',
        ont.model || sub.model || '',
        ont.OntRxOptPwr ?? '',
        ont.OLTRXOptPwr ?? '',
        ont.OntTxPwr ?? '',
        ont._analysis?.status || '',
        ont._lcpNumber || '',
        ont._splitterNumber || '',
        ont._lcpLocation || '',
        ont._lcpAddress || '',
        sub.name || '',
        sub.account || '',
        sub.address || '',
        sub.city || '',
        sub.zip || '',
        eero.eero_id || '',
        eero.network_id || '',
        eero.serial || '',
        eero.home_identifier || '',
        eero.network_created || '',
        eero.last_alive || '',
        eero.organization || '',
        eero.isp || '',
        eero.model || '',
        eero.gateway || '',
      ];
    });

  // Quote every cell, escape internal double-quotes per RFC 4180
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eero-ont-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${eeroOnts.length} ONTs with eero data`);
}

/**
 * Compute eero saturation per chassis (OLT) and per port for the given ONTs.
 * Used by both the in-app preview (future) and the PDF generator backend.
 *
 * Saturation = (ONTs with eero) / (total ONTs)
 *
 * Returns:
 *   {
 *     chassis: [{ olt, total, withEero, saturation }],
 *     ports:   [{ olt, port, total, withEero, saturation }],
 *   }
 *
 * Sorted by saturation descending so high-density chassis/ports appear first.
 */
export function computeEeroSaturation(onts) {
  const chassisMap = new Map(); // olt → { total, withEero }
  const portMap    = new Map(); // "olt|port" → { olt, port, total, withEero }

  for (const ont of onts) {
    const olt  = ont._oltName || 'Unknown';
    const port = ont._port    || 'Unknown';
    const hasEero = !!ont._eero;

    if (!chassisMap.has(olt)) chassisMap.set(olt, { total: 0, withEero: 0 });
    const c = chassisMap.get(olt);
    c.total++;
    if (hasEero) c.withEero++;

    const portKey = `${olt}|${port}`;
    if (!portMap.has(portKey)) portMap.set(portKey, { olt, port, total: 0, withEero: 0 });
    const p = portMap.get(portKey);
    p.total++;
    if (hasEero) p.withEero++;
  }

  const chassis = [...chassisMap.entries()]
    .map(([olt, v]) => ({
      olt,
      total: v.total,
      withEero: v.withEero,
      saturation: v.total > 0 ? v.withEero / v.total : 0,
    }))
    .sort((a, b) => b.saturation - a.saturation || b.withEero - a.withEero);

  const ports = [...portMap.values()]
    .map(p => ({
      ...p,
      saturation: p.total > 0 ? p.withEero / p.total : 0,
    }))
    .sort((a, b) => b.saturation - a.saturation || b.withEero - a.withEero);

  return { chassis, ports };
}