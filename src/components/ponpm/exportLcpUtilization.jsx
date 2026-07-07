import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const DEFAULT_SPLITTER_CAP = 32; // fallback when no splitter_ratio is on file

/** Parse a splitter_ratio string like "1:32" or "1:64" → 32 or 64. */
function parseSplitterCapacity(ratioStr) {
  const m = String(ratioStr || '').match(/1\s*[:x/]\s*(\d+)/i);
  const cap = m ? parseInt(m[1], 10) : NaN;
  return Number.isFinite(cap) && cap > 0 ? cap : null;
}

export async function exportLcpPortUtilization(onts) {
  if (!onts || onts.length === 0) {
    toast.error('No ONT data available');
    return;
  }

  // Capacity per LCP|Splitter from the LCP database's splitter_ratio —
  // a 1:64 conversion doubles the capacity vs the 1:32 default.
  const capByKey = new Map();
  try {
    const lcpEntries = await base44.entities.LCPEntry.list('-created_date', 5000);
    for (const e of lcpEntries) {
      const key = `${(e.lcp_number || '').trim().toUpperCase()}|${(e.splitter_number || '').trim().toUpperCase()}`;
      const cap = parseSplitterCapacity(e.splitter_ratio);
      if (cap) capByKey.set(key, cap);
    }
  } catch {
    // Non-fatal — export proceeds with the default capacity.
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

  const headers = ['LCP/CLCP', 'Splitter #', 'Splitter Ratio', 'Total ONTs', 'OK', 'Warning', 'Critical', 'Offline', 'Capacity', 'Remaining Ports'];
  const csvRows = rows.map(r => {
    const cap = capByKey.get(`${r.lcp.trim().toUpperCase()}|${r.splitter.trim().toUpperCase()}`) || DEFAULT_SPLITTER_CAP;
    return [
      r.lcp, r.splitter, `1:${cap}`, r.total, r.ok, r.warning, r.critical, r.offline, cap, Math.max(0, cap - r.total)
    ];
  });

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