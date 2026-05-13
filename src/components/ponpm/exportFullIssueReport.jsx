import { toast } from 'sonner';

/**
 * Full Issue Report (CSV)
 *
 * Combines, in a single CSV:
 *   1. All critical ONTs (one row each)
 *   2. Top 20 warning ONTs (most-severe first — i.e. highest issue count)
 *   3. Top 20 ports with the worst FEC error totals (US+DS uncorrected)
 *
 * Sections are separated by header rows for human readability while keeping
 * the file a valid CSV that Excel/Sheets opens cleanly.
 */
export function exportFullIssueReportCSV(onts) {
  if (!onts || onts.length === 0) {
    toast.error('No ONT data loaded');
    return;
  }

  const lines = [];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const row = (arr) => lines.push(arr.map(esc).join(','));
  const blank = () => lines.push('');
  const section = (title) => {
    blank();
    row([`=== ${title} ===`]);
  };

  // ─── 1. Critical ONTs ────────────────────────────────────────────────
  const critical = onts
    .filter(o => o._analysis?.status === 'critical')
    .sort((a, b) => (a._oltName || '').localeCompare(b._oltName || '', undefined, { numeric: true }));

  section(`CRITICAL ONTs (${critical.length})`);
  row(['OLT', 'Shelf/Slot/Port', 'OntID', 'Serial', 'Model',
       'ONT Rx', 'OLT Rx', 'US BIP', 'DS BIP', 'US FEC Unc', 'DS FEC Unc',
       'LCP', 'Splitter', 'Subscriber', 'Address', 'Issues']);
  critical.forEach(o => {
    const sub = o._subscriber || {};
    const issues = [...(o._analysis?.issues || []), ...(o._analysis?.warnings || [])]
      .map(i => `${i.field}: ${i.value}`)
      .join('; ');
    row([
      o._oltName, o['Shelf/Slot/Port'], o.OntID, o.SerialNumber, o.model,
      o.OntRxOptPwr, o.OLTRXOptPwr,
      o.UpstreamBipErrors ?? 0, o.DownstreamBipErrors ?? 0,
      o.UpstreamFecUncorrectedCodeWords ?? 0, o.DownstreamFecUncorrectedCodeWords ?? 0,
      o._lcpNumber, o._splitterNumber,
      sub.name, sub.address || sub.streetAddress, issues,
    ]);
  });

  // ─── 2. Top 20 Warning ONTs ──────────────────────────────────────────
  const warnings = onts
    .filter(o => o._analysis?.status === 'warning')
    .map(o => ({
      ont: o,
      score: (o._analysis?.issues?.length || 0) + (o._analysis?.warnings?.length || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  section(`TOP 20 WARNING ONTs (of ${onts.filter(o => o._analysis?.status === 'warning').length} total)`);
  row(['OLT', 'Shelf/Slot/Port', 'OntID', 'Serial', 'Model',
       'ONT Rx', 'OLT Rx', 'US BIP', 'DS BIP', 'US FEC Unc', 'DS FEC Unc',
       'LCP', 'Splitter', 'Subscriber', 'Warnings']);
  warnings.forEach(({ ont: o }) => {
    const sub = o._subscriber || {};
    const w = (o._analysis?.warnings || []).map(i => `${i.field}: ${i.value}`).join('; ');
    row([
      o._oltName, o['Shelf/Slot/Port'], o.OntID, o.SerialNumber, o.model,
      o.OntRxOptPwr, o.OLTRXOptPwr,
      o.UpstreamBipErrors ?? 0, o.DownstreamBipErrors ?? 0,
      o.UpstreamFecUncorrectedCodeWords ?? 0, o.DownstreamFecUncorrectedCodeWords ?? 0,
      o._lcpNumber, o._splitterNumber, sub.name, w,
    ]);
  });

  // ─── 3. Top 20 FEC-error ports ───────────────────────────────────────
  const portMap = new Map();
  onts.forEach(o => {
    const key = `${o._oltName || 'Unknown'}|${o['Shelf/Slot/Port'] || 'Unknown'}`;
    if (!portMap.has(key)) {
      portMap.set(key, {
        olt: o._oltName || 'Unknown',
        port: o['Shelf/Slot/Port'] || 'Unknown',
        usFec: 0, dsFec: 0, ontCount: 0,
      });
    }
    const p = portMap.get(key);
    p.usFec += Number(o.UpstreamFecUncorrectedCodeWords || 0);
    p.dsFec += Number(o.DownstreamFecUncorrectedCodeWords || 0);
    p.ontCount += 1;
  });
  const topFecPorts = [...portMap.values()]
    .map(p => ({ ...p, totalFec: p.usFec + p.dsFec }))
    .filter(p => p.totalFec > 0)
    .sort((a, b) => b.totalFec - a.totalFec)
    .slice(0, 20);

  section(`TOP 20 PORTS BY FEC ERRORS (uncorrected, US+DS)`);
  row(['OLT', 'Port', 'ONT Count', 'US FEC Unc', 'DS FEC Unc', 'Total FEC Unc']);
  topFecPorts.forEach(p => {
    row([p.olt, p.port, p.ontCount, p.usFec, p.dsFec, p.totalFec]);
  });

  // ─── Download ────────────────────────────────────────────────────────
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `full-issue-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported full issue report (${critical.length} critical, ${warnings.length} top warnings, ${topFecPorts.length} FEC ports)`);
}