import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Download, FileSpreadsheet, FileText, ChevronDown, AlertCircle, Router,
  Wifi, Cable, Database, Search, Server, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportOfflineCSV } from './ontCsvExports';
import { exportEeroOntsCSV } from './eeroExports';
import { downloadPdfFromFunction } from '@/lib/pdfDownload';
import { buildSubscriberLookup } from './SubscriberUpload';

// ─── CSV Helpers ────────────────────────────────────────────────────────────
function buildCSV(headers, rows) {
  return [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Export Functions ────────────────────────────────────────────────────────

/** 1. Full LCP Utilization Report CSV */
function exportFullLcpUtilization(lcpEntries, latestOntCountsByKey) {
  if (!lcpEntries?.length) { toast.error('No LCP data available'); return; }
  const headers = [
    'Type', 'LCP Name', 'Splitter #', 'Location', 'Optic Type',
    'OLT', 'Shelf', 'Slot', 'Port', 'ONT Count',
  ];
  const rows = lcpEntries
    .sort((a, b) => (a.lcp_number || '').localeCompare(b.lcp_number || '', undefined, { numeric: true }))
    .map(e => {
      const key = `${(e.lcp_number || '').trim().toUpperCase()}|${(e.splitter_number || '').trim().toUpperCase()}`;
      const type = (e.lcp_number || '').toUpperCase().startsWith('CLCP') ? 'CLCP' : 'LCP';
      return [
        type, e.lcp_number || '', e.splitter_number || '', e.location || '',
        e.optic_type || e.optic_model || '',
        e.olt_name || '', e.olt_shelf || '', e.olt_slot || '', e.olt_port || '',
        latestOntCountsByKey[key] || 0,
      ];
    });
  downloadCSV(buildCSV(headers, rows), `full-lcp-utilization-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${rows.length} LCP/splitter entries`);
}

/** 3. Raw LCP Database Export CSV */
function exportRawLcpDatabase(lcpEntries) {
  if (!lcpEntries?.length) { toast.error('No LCP data available'); return; }
  const headers = [
    'Type', 'LCP', 'Splitter', 'Location', 'Address', 'Lat', 'Long',
    'OLT', 'Shelf', 'Slot', 'Port',
    'Optic Make', 'Optic Model', 'Optic Serial', 'Optic Type',
    'Splitter Ratio', 'Fiber Count', 'Notes',
  ];
  const rows = lcpEntries.map(e => [
    (e.lcp_number || '').toUpperCase().startsWith('CLCP') ? 'CLCP' : 'LCP',
    e.lcp_number || '', e.splitter_number || '', e.location || '', e.address || '',
    e.gps_lat || '', e.gps_lng || '',
    e.olt_name || '', e.olt_shelf || '', e.olt_slot || '', e.olt_port || '',
    e.optic_make || '', e.optic_model || '', e.optic_serial || '', e.optic_type || '',
    e.splitter_ratio || '', e.fiber_count || '', e.notes || '',
  ]);
  downloadCSV(buildCSV(headers, rows), `lcp-database-export-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${rows.length} raw LCP entries`);
}

/** 5. Full Issue Report CSV (critical + warning + top 20 corrected FEC ports) */
function exportFullIssueCSV(onts) {
  if (!onts?.length) return;
  // Critical + warning ONTs
  const issueOnts = onts.filter(o => o._analysis?.status === 'critical' || o._analysis?.status === 'warning');

  // Top 20 corrected FEC ports
  const portFec = {};
  onts.forEach(o => {
    const key = `${o._oltName || ''}|${o._port || ''}`;
    const ds = parseInt(o.DownstreamFecCorrectedCodeWords) || 0;
    const us = parseInt(o.UpstreamFecCorrectedCodeWords) || 0;
    if (!portFec[key]) portFec[key] = { olt: o._oltName, port: o._port, total: 0, ontCount: 0 };
    portFec[key].total += ds + us;
    portFec[key].ontCount++;
  });
  const topFecPorts = Object.values(portFec).filter(p => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 20);

  // Build CSV with two sections
  const rows = [];
  // Section 1: Issue ONTs
  rows.push(['--- CRITICAL & WARNING ONTs ---', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  const h1 = ['Status', 'OLT', 'Port', 'ONT ID', 'Serial', 'Model', 'ONT Rx', 'OLT Rx', 'US BIP', 'DS BIP', 'US FEC U', 'DS FEC U', 'Issues', 'Details'];
  rows.push(h1);
  issueOnts.forEach(o => {
    const allIssues = [...(o._analysis?.issues || []), ...(o._analysis?.warnings || [])];
    rows.push([
      o._analysis?.status?.toUpperCase(), o._oltName, o._port, o.OntID, o.SerialNumber, o.model,
      o.OntRxOptPwr, o.OLTRXOptPwr, o.UpstreamBipErrors || 0, o.DownstreamBipErrors || 0,
      o.UpstreamFecUncorrectedCodeWords || 0, o.DownstreamFecUncorrectedCodeWords || 0,
      allIssues.map(i => i.field).join(', '),
      allIssues.map(i => `${i.field}: ${i.value} (${i.message})`).join('; '),
    ]);
  });

  // Section 2: Top FEC Ports
  rows.push(['']);
  rows.push(['--- TOP 20 CORRECTED FEC PORTS ---', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  rows.push(['OLT', 'Port', 'Total FEC Corrected', 'ONTs on Port', '', '', '', '', '', '', '', '', '', '']);
  topFecPorts.forEach(p => {
    rows.push([p.olt, p.port, p.total, p.ontCount, '', '', '', '', '', '', '', '', '', '']);
  });

  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadCSV(csv, `full-issue-report-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${issueOnts.length} issue ONTs + top ${topFecPorts.length} FEC ports`);
}

/** 6. All Results CSV (full PON PM with eero + subscriber) */
function exportAllResultsCSV(onts) {
  if (!onts?.length) return;
  const headers = [
    'Status', 'OLT', 'Shelf/Slot/Port', 'ONT ID', 'Serial', 'Model', 'Technology',
    'ONT Rx (dBm)', 'OLT Rx (dBm)', 'ONT Tx (dBm)',
    'US BIP', 'DS BIP', 'US FEC Unc', 'DS FEC Unc', 'US FEC Cor', 'DS FEC Cor',
    'US GEM HEC', 'US Missed Bursts', 'Uptime',
    'LCP', 'Splitter', 'LCP Location',
    'Subscriber Name', 'Account', 'Address', 'City', 'Zip',
    'Has eero', 'eero Serial', 'eero Model',
    'Issues',
  ];
  const rows = onts.map(o => {
    const sub = o._subscriber || {};
    const eero = o._eero || {};
    const allIssues = [...(o._analysis?.issues || []), ...(o._analysis?.warnings || [])];
    return [
      o._analysis?.status?.toUpperCase() || '', o._oltName || '', o['Shelf/Slot/Port'] || '',
      o.OntID || '', o.SerialNumber || '', o.model || '', o._techType || '',
      o.OntRxOptPwr ?? '', o.OLTRXOptPwr ?? '', o.OntTxPwr ?? '',
      o.UpstreamBipErrors || 0, o.DownstreamBipErrors || 0,
      o.UpstreamFecUncorrectedCodeWords || 0, o.DownstreamFecUncorrectedCodeWords || 0,
      o.UpstreamFecCorrectedCodeWords || 0, o.DownstreamFecCorrectedCodeWords || 0,
      o.UpstreamGemHecErrors || 0, o.UpstreamMissedBursts || 0, o.OntUptime || '',
      o._lcpNumber || '', o._splitterNumber || '', o._lcpLocation || '',
      sub.name || '', sub.account || '', sub.address || '', sub.city || '', sub.zip || '',
      o._eero ? 'Yes' : 'No', eero.serial || '', eero.model || '',
      allIssues.map(i => `${i.field}: ${i.value}`).join('; '),
    ];
  });
  downloadCSV(buildCSV(headers, rows), `all-results-${new Date().toISOString().slice(0, 10)}.csv`);
  toast.success(`Exported ${rows.length} ONT records`);
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function UnifiedExportMenu({
  result,               // full PON PM result object
  lcpEntries = [],
  lcpOntCounts = {},
  subscriberRecords,
  eeroRecordsLoaded,
}) {
  const [showLcpPicker, setShowLcpPicker] = useState(false);
  const [selectedLcps, setSelectedLcps] = useState([]);
  const [lcpSearch, setLcpSearch] = useState('');

  const onts = result?.onts;

  // Unique LCP names for multi-select dialog
  const uniqueLcps = useMemo(() => {
    const map = new Map();
    lcpEntries.forEach(e => {
      if (!e.lcp_number) return;
      if (!map.has(e.lcp_number)) map.set(e.lcp_number, 0);
      map.set(e.lcp_number, map.get(e.lcp_number) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [lcpEntries]);

  const filteredLcps = useMemo(() => {
    if (!lcpSearch) return uniqueLcps;
    const term = lcpSearch.toLowerCase();
    return uniqueLcps.filter(l => l.name.toLowerCase().includes(term));
  }, [uniqueLcps, lcpSearch]);

  // Subscriber lookup for single LCP export
  const subscriberLookup = useMemo(
    () => buildSubscriberLookup(subscriberRecords || []),
    [subscriberRecords]
  );

  const getSubscribersForEntry = (entry) => {
    if (!subscriberRecords?.length) return [];
    const port = `${entry.olt_shelf || ''}/${entry.olt_slot || ''}/${entry.olt_port || ''}`.replace(/\s+/g, '');
    const oltName = (entry.olt_name || '').trim().toUpperCase();
    return (subscriberRecords || []).filter(rec => {
      const recOlt = (rec.DeviceName || '').trim().toUpperCase();
      const recPon = (rec.LinkedPon || '').trim().replace(/\s+/g, '');
      if (oltName && recOlt === oltName && recPon === port) return true;
      if (port && recPon === port && !recOlt) return true;
      return false;
    });
  };

  const toggleLcp = (name) => {
    setSelectedLcps(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const selectAllVisible = () => setSelectedLcps(filteredLcps.map(l => l.name));
  const deselectAll = () => setSelectedLcps([]);

  /** 2. Single/Multi LCP Report CSV with subscriber data */
  const exportSelectedLcps = () => {
    if (selectedLcps.length === 0) { toast.error('Select at least one LCP'); return; }
    const entries = lcpEntries.filter(e => selectedLcps.includes(e.lcp_number));
    if (!entries.length) { toast.error('No entries found'); return; }

    const headers = [
      'LCP/CLCP', 'Splitter', 'Location', 'OLT', 'Shelf/Slot/Port',
      'Optic Make', 'Optic Model', 'Optic Serial', 'Optic Type',
      'Current ONT Count', 'Subscriber Name', 'Account', 'Address', 'City', 'Zip',
      'ONT ID', 'ONT Serial', 'ONT Model', 'Software Version'
    ];
    const rows = [];
    entries.forEach(entry => {
      const port = `${entry.olt_shelf || ''}/${entry.olt_slot || ''}/${entry.olt_port || ''}`;
      const key = `${entry.lcp_number.trim().toUpperCase()}|${(entry.splitter_number || '').trim().toUpperCase()}`;
      const ontCount = lcpOntCounts[key] || 0;
      const subs = getSubscribersForEntry(entry);
      if (subs.length > 0) {
        subs.forEach(sub => {
          rows.push([
            entry.lcp_number, entry.splitter_number || '', entry.location || '',
            entry.olt_name || '', port,
            entry.optic_make || '', entry.optic_model || '', entry.optic_serial || '', entry.optic_type || '',
            ontCount, sub.SubscriberName || '', sub.AccountName || '', sub.Address || '',
            sub.City || '', sub.Zip || '', sub.OntID || '', sub.ONTSerialNo || '', sub.ONTModel || '',
            sub.CurrentONTSoftwareVersion || '',
          ]);
        });
      } else {
        rows.push([
          entry.lcp_number, entry.splitter_number || '', entry.location || '',
          entry.olt_name || '', port,
          entry.optic_make || '', entry.optic_model || '', entry.optic_serial || '', entry.optic_type || '',
          ontCount, '', '', '', '', '', '', '', '', '',
        ]);
      }
    });

    const label = selectedLcps.length === 1 ? selectedLcps[0] : `${selectedLcps.length}-lcps`;
    downloadCSV(buildCSV(headers, rows), `${label}-report-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${selectedLcps.length} LCP(s) (${rows.length} rows)`);
    setShowLcpPicker(false);
  };

  /** 4. Critical Issue Report PDF */
  const exportCriticalPDF = async () => {
    if (!onts) return;
    const criticalOnts = onts.filter(o => o._analysis?.status === 'critical');
    if (criticalOnts.length === 0) { toast.error('No critical issues to export'); return; }
    toast.loading('Generating critical issues PDF...', { id: 'critical-pdf' });
    try {
      await downloadPdfFromFunction(
        'generatePonPmPDF',
        { reportData: { ...result, onts: criticalOnts }, criticalOnly: true },
        `critical-issue-report-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success(`Exported ${criticalOnts.length} critical issues`, { id: 'critical-pdf' });
    } catch (error) {
      toast.error('Failed to generate PDF: ' + error.message, { id: 'critical-pdf' });
    }
  };

  /** Comprehensive System Report PDF (Executive Report from DB data) */
  const exportSystemReport = async () => {
    if (!onts) return;
    toast.loading('Generating Comprehensive System Report...', { id: 'system-report' });
    try {
      await downloadPdfFromFunction(
        'generateExecutiveReport',
        {},
        `system-report-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success('System Report generated', { id: 'system-report' });
    } catch (error) {
      toast.error('Failed to generate system report: ' + error.message, { id: 'system-report' });
    }
  };

  /** 9. eero Saturation PDF */
  const exportEeroSatPDF = async () => {
    if (!onts || !eeroRecordsLoaded) { toast.error('Load eero data first'); return; }
    toast.loading('Generating eero saturation PDF...', { id: 'eero-pdf' });
    try {
      await downloadPdfFromFunction(
        'generateEeroSaturationPDF',
        { reportData: { onts }, reportName: result?.summary?.reportName },
        `eero-saturation-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success('eero saturation PDF generated', { id: 'eero-pdf' });
    } catch (error) {
      toast.error('Failed to generate eero PDF: ' + error.message, { id: 'eero-pdf' });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* LCP Reports */}
          <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">LCP Reports</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => exportFullLcpUtilization(lcpEntries, lcpOntCounts)} disabled={!lcpEntries.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-indigo-500" />
            Full LCP Utilization (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setSelectedLcps([]); setLcpSearch(''); setShowLcpPicker(true); }} disabled={!lcpEntries.length}>
            <Cable className="h-4 w-4 mr-2 text-blue-500" />
            Single/Multi LCP Report (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportRawLcpDatabase(lcpEntries)} disabled={!lcpEntries.length}>
            <Database className="h-4 w-4 mr-2 text-green-500" />
            Raw LCP Database (CSV)
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* PON PM Reports */}
          <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">PON PM Reports</DropdownMenuLabel>
          <DropdownMenuItem onClick={exportCriticalPDF} disabled={!onts}>
            <FileText className="h-4 w-4 mr-2 text-red-600" />
            Critical Issue Report (PDF)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportFullIssueCSV(onts)} disabled={!onts}>
            <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
            Full Issue Report (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportAllResultsCSV(onts)} disabled={!onts}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-500" />
            All Results (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportOfflineCSV(onts)} disabled={!onts}>
            <Router className="h-4 w-4 mr-2 text-purple-500" />
            Offline ONTs (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportSystemReport} disabled={!onts}>
            <BarChart3 className="h-4 w-4 mr-2 text-indigo-600" />
            Comprehensive System Report (PDF)
          </DropdownMenuItem>

          {/* eero section — always visible when data is loaded */}
          {eeroRecordsLoaded && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">eero Reports</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => exportEeroOntsCSV(onts)} disabled={!onts}>
                <Wifi className="h-4 w-4 mr-2 text-emerald-500" />
                ONTs with eero (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportEeroSatPDF} disabled={!onts}>
                <FileText className="h-4 w-4 mr-2 text-emerald-600" />
                eero Saturation Report (PDF)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Multi-select LCP Picker Dialog */}
      <Dialog open={showLcpPicker} onOpenChange={setShowLcpPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cable className="h-5 w-5 text-blue-500" />
              Select LCP/CLCPs to Export
            </DialogTitle>
            <DialogDescription>
              Select one or more LCPs. A detailed report with subscriber data will be generated for each.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Search + select all/none */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Filter LCPs..."
                  value={lcpSearch}
                  onChange={(e) => setLcpSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={selectAllVisible}>All</Button>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={deselectAll}>None</Button>
            </div>

            {selectedLcps.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {selectedLcps.length} selected
              </Badge>
            )}

            {/* Scrollable checklist */}
            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {filteredLcps.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No LCPs match filter</div>
              ) : (
                filteredLcps.map(lcp => (
                  <label
                    key={lcp.name}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedLcps.includes(lcp.name)}
                      onCheckedChange={() => toggleLcp(lcp.name)}
                    />
                    <span className="text-sm font-medium flex-1">{lcp.name}</span>
                    <span className="text-xs text-gray-400">{lcp.count} spl</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLcpPicker(false)}>Cancel</Button>
            <Button onClick={exportSelectedLcps} disabled={selectedLcps.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export {selectedLcps.length > 0 ? `(${selectedLcps.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}