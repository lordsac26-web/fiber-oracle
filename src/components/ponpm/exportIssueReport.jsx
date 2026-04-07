import { toast } from 'sonner';

export const exportIssueReport = (onts) => {
  if (!onts) return;
  const criticalOnts = onts.filter(o => o._analysis.status === 'critical');
  if (criticalOnts.length === 0) {
    toast.error('No critical ONTs found to export');
    return;
  }
  const headers = ['OLT', 'Port', 'ONT ID', 'Serial', 'Model', 'Issues'];
  const rows = criticalOnts.map(ont => [
    ont._oltName || '',
    ont._port || '',
    ont.OntID || '',
    ont.SerialNumber || '',
    ont.model || '',
    [...ont._analysis.issues, ...ont._analysis.warnings].map(i => `${i.field}: ${i.message}`).join(' | ') || 'N/A',
  ]);
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `critical-issues-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${criticalOnts.length} critical ONTs`);
};