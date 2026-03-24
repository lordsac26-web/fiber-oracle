import { toast } from 'sonner';

const SPLITTER_CAP = 32;

export function exportLcpPortUtilization(onts) {
  if (!onts || onts.length === 0) {
    toast.error('No ONT data available');
    return;
  }

  // Group ONTs by LCP + Splitter
  const lcpSplitterMap = {};
  onts.forEach(ont => {
    const lcpNum = ont._lcpNumber || ont.lcp_number || '';
    const spNum = ont._splitterNumber || ont.splitter_number || '';
    if (!lcpNum) return;
    const key = `${lcpNum}|${spNum}`;
    if (!lcpSplitterMap[key]) {
      lcpSplitterMap[key] = { lcp: lcpNum, splitter: spNum, total: 0, ok: 0, warning: 0, critical: 0, offline: 0 };
    }
    lcpSplitterMap[key].total++;
    const status = ont._analysis?.status || 'ok';
    if (status === 'critical') lcpSplitterMap[key].critical++;
    else if (status === 'warning') lcpSplitterMap[key].warning++;
    else if (status === 'offline') lcpSplitterMap[key].offline++;
    else lcpSplitterMap[key].ok++;
  });

  const rows = Object.values(lcpSplitterMap)
    .sort((a, b) => a.lcp.localeCompare(b.lcp, undefined, { numeric: true }) || a.splitter.localeCompare(b.splitter, undefined, { numeric: true }));

  if (rows.length === 0) {
    toast.error('No LCP/splitter data found in this report');
    return;
  }

  const headers = ['LCP/CLCP', 'Splitter #', 'Total ONTs', 'OK', 'Warning', 'Critical', 'Offline', 'Remaining Ports (of 32)'];
  const csvRows = rows.map(r => [
    r.lcp, r.splitter, r.total, r.ok, r.warning, r.critical, r.offline, Math.max(0, SPLITTER_CAP - r.total)
  ]);

  const csv = [headers, ...csvRows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lcp-splitter-port-utilization-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} LCP/splitter entries`);
}