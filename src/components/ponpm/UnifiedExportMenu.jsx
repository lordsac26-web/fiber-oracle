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
  Wifi, Cable, Database, Search, Server, BarChart3, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportOfflineCSV } from './ontCsvExports';
import { exportEeroOntsCSV } from './eeroExports';
import { exportCriticalIssuesCSV } from './exportCriticalCsv.js';
import { exportFullIssueReportCSV } from './exportFullIssueReport.js';
import { exportAllIssuesCSV } from './exportAllIssuesCsv.js';
import { exportMultiOltCSV } from './exportMultiOltCsv.js';
import MultiOltPickerDialog from './MultiOltPickerDialog.jsx';
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

// ─── LCP Export Functions (unchanged structure, kept inline) ────────────────

/** Full LCP Utilization Report (CSV) */
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

/** Raw LCP Database Export (CSV) — re-importable */
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
  const [showOltPicker, setShowOltPicker] = useState(false);

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

  // Subscriber lookup for single/multi LCP export — kept for the existing
  // implementation since LCP exports rely on the subscriber join.
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

  // OLT list pulled from the result object
  const oltNames = useMemo(() => result?.olts ? Object.keys(result.olts).sort() : [], [result?.olts]);

  /** Single/Multi LCP Report CSV with subscriber data */
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

  /** Comprehensive System Report PDF — server-rendered branded executive PDF */
  const exportSystemReport = async () => {
    toast.loading('Generating Comprehensive System Report...', { id: 'system-report' });
    try {
      await downloadPdfFromFunction(
        'generateExecutiveReport',
        {},
        `FiberOracle-System-Report-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success('System Report generated', { id: 'system-report' });
    } catch (error) {
      toast.error('Failed to generate system report: ' + error.message, { id: 'system-report' });
    }
  };

  /** eero Saturation PDF */
  const exportEeroSatPDF = async () => {
    if (!onts || !eeroRecordsLoaded) { toast.error('Load eero data first'); return; }
    toast.loading('Generating eero saturation PDF...', { id: 'eero-pdf' });
    try {
      await downloadPdfFromFunction(
        'generateEeroSaturationPDF',
        { reportData: { onts }, reportName: result?.summary?.reportName },
        `FiberOracle-Eero-Saturation-${new Date().toISOString().slice(0, 10)}.pdf`
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
        <DropdownMenuContent align="end" className="w-72">
          {/* ─── LCP / Splitter Reports ─── */}
          <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">LCP / Splitter Reports</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => exportFullLcpUtilization(lcpEntries, lcpOntCounts)} disabled={!lcpEntries.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-indigo-500" />
            Full LCP w/ Utilization (CSV)
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

          {/* ─── PON PM Reports ─── */}
          <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">PON PM Reports</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => exportCriticalIssuesCSV(onts)} disabled={!onts}>
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            Critical Issue Report (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportFullIssueReportCSV(onts)} disabled={!onts}>
            <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
            Full Issue Report (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportAllIssuesCSV(onts)} disabled={!onts}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-500" />
            All Results (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowOltPicker(true)} disabled={!onts || oltNames.length === 0}>
            <Server className="h-4 w-4 mr-2 text-cyan-600" />
            OLT Data — Select OLT(s) (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportOfflineCSV(onts)} disabled={!onts}>
            <Router className="h-4 w-4 mr-2 text-purple-500" />
            Offline ONTs (CSV)
          </DropdownMenuItem>

          {/* ─── Eero Reports ─── */}
          {eeroRecordsLoaded && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">Eero Reports</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => exportEeroOntsCSV(onts)} disabled={!onts}>
                <Wifi className="h-4 w-4 mr-2 text-emerald-500" />
                ONTs with Eero (CSV)
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          {/* ─── System Status / Overview ─── */}
          <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">System Status / Overview</DropdownMenuLabel>
          <DropdownMenuItem onClick={exportSystemReport} disabled={!onts}>
            <BarChart3 className="h-4 w-4 mr-2 text-indigo-600" />
            Comprehensive System Report (PDF)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportEeroSatPDF} disabled={!onts || !eeroRecordsLoaded}>
            <FileText className="h-4 w-4 mr-2 text-emerald-600" />
            Eero Saturation Report (PDF)
          </DropdownMenuItem>
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
              <Badge variant="outline" className="text-xs">{selectedLcps.length} selected</Badge>
            )}

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

      {/* Multi-OLT picker for OLT Data export */}
      <MultiOltPickerDialog
        open={showOltPicker}
        onOpenChange={setShowOltPicker}
        oltNames={oltNames}
        onExport={(selectedOlts) => {
          exportMultiOltCSV(onts, selectedOlts);
          setShowOltPicker(false);
        }}
      />
    </>
  );
}