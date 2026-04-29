import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, ChevronDown, Users, Cable, Server } from 'lucide-react';
import { toast } from 'sonner';

function buildCSVString(headers, rows) {
  return [
    headers.join(','),
    ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * LCP Export Menu — provides two export options:
 *  1) Single LCP/CLCP report (user picks which one) with subscriber list per splitter
 *  2) Comprehensive system report — all LCPs with subscriber counts & utilization
 */
export default function LCPExportMenu({ lcpEntries, latestOntCountsByKey, subscriberRecords }) {
  const [showSingleDialog, setShowSingleDialog] = useState(false);
  const [selectedLcp, setSelectedLcp] = useState('');

  // Build unique LCP numbers for the picker
  const uniqueLcps = useMemo(() => {
    const set = new Set();
    lcpEntries.forEach(e => { if (e.lcp_number) set.add(e.lcp_number); });
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [lcpEntries]);

  // Build subscriber lookup by DeviceName|LinkedPon|OntID and by serial
  const subscriberByKey = useMemo(() => {
    const byComposite = new Map();
    const bySerial = new Map();
    (subscriberRecords || []).forEach(rec => {
      if (rec.DeviceName && rec.LinkedPon && rec.OntID) {
        const key = `${rec.DeviceName.trim()}|${rec.LinkedPon.trim()}|${rec.OntID.trim()}`.toUpperCase();
        byComposite.set(key, rec);
      }
      if (rec.ONTSerialNo) {
        bySerial.set(rec.ONTSerialNo.trim().toUpperCase(), rec);
      }
    });
    return { byComposite, bySerial };
  }, [subscriberRecords]);

  // For a given LCP entry, find the matching subscriber records
  const getSubscribersForEntry = (entry) => {
    if (!subscriberRecords?.length) return [];
    // Match by OLT + port path (shelf/slot/port) — subscriber LinkedPon should match
    const port = `${entry.olt_shelf || ''}/${entry.olt_slot || ''}/${entry.olt_port || ''}`;
    const oltName = (entry.olt_name || '').trim().toUpperCase();

    return subscriberRecords.filter(rec => {
      const recOlt = (rec.DeviceName || '').trim().toUpperCase();
      const recPon = (rec.LinkedPon || '').trim();
      return recOlt === oltName && recPon === port;
    });
  };

  // --- Export: Single LCP/CLCP Report ---
  const exportSingleLcp = () => {
    if (!selectedLcp) { toast.error('Select an LCP/CLCP first'); return; }

    const entries = lcpEntries.filter(e => e.lcp_number === selectedLcp);
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
      const ontCount = latestOntCountsByKey[key] || 0;
      const subscribers = getSubscribersForEntry(entry);

      if (subscribers.length > 0) {
        subscribers.forEach(sub => {
          rows.push([
            entry.lcp_number, entry.splitter_number || '', entry.location || '',
            entry.olt_name || '', port,
            entry.optic_make || '', entry.optic_model || '', entry.optic_serial || '', entry.optic_type || '',
            ontCount,
            sub.SubscriberName || '', sub.AccountName || '', sub.Address || '',
            sub.City || '', sub.Zip || '',
            sub.OntID || '', sub.ONTSerialNo || '', sub.ONTModel || '',
            sub.CurrentONTSoftwareVersion || '',
          ]);
        });
      } else {
        // Still include the splitter row even without subscribers
        rows.push([
          entry.lcp_number, entry.splitter_number || '', entry.location || '',
          entry.olt_name || '', port,
          entry.optic_make || '', entry.optic_model || '', entry.optic_serial || '', entry.optic_type || '',
          ontCount,
          '', '', '', '', '', '', '', '', '',
        ]);
      }
    });

    const csv = buildCSVString(headers, rows);
    downloadCSV(csv, `${selectedLcp}-report-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${selectedLcp} report (${rows.length} rows)`);
    setShowSingleDialog(false);
  };

  // --- Export: Comprehensive System Report ---
  const exportSystemReport = () => {
    if (!lcpEntries.length) { toast.error('No LCP entries to export'); return; }

    const headers = [
      'LCP/CLCP', 'Splitter', 'Location', 'GPS Lat', 'GPS Long',
      'OLT', 'Shelf', 'Slot', 'Port',
      'Optic Make', 'Optic Model', 'Optic Serial', 'Optic Type',
      'Current ONT Count', 'Subscriber Count', 'Notes',
    ];

    const rows = lcpEntries
      .sort((a, b) => (a.lcp_number || '').localeCompare(b.lcp_number || '', undefined, { numeric: true }) ||
        (a.splitter_number || '').localeCompare(b.splitter_number || '', undefined, { numeric: true }))
      .map(entry => {
        const key = `${(entry.lcp_number || '').trim().toUpperCase()}|${(entry.splitter_number || '').trim().toUpperCase()}`;
        const ontCount = latestOntCountsByKey[key] || 0;
        const subCount = getSubscribersForEntry(entry).length;
        return [
          entry.lcp_number || '', entry.splitter_number || '', entry.location || '',
          entry.gps_lat || '', entry.gps_lng || '',
          entry.olt_name || '', entry.olt_shelf || '', entry.olt_slot || '', entry.olt_port || '',
          entry.optic_make || '', entry.optic_model || '', entry.optic_serial || '', entry.optic_type || '',
          ontCount, subCount, entry.notes || '',
        ];
      });

    const csv = buildCSVString(headers, rows);
    downloadCSV(csv, `lcp-system-report-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported system report (${rows.length} splitter entries)`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={!lcpEntries.length}>
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => setShowSingleDialog(true)}>
            <Cable className="h-4 w-4 mr-2 text-blue-500" />
            Single LCP/CLCP Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportSystemReport}>
            <Server className="h-4 w-4 mr-2 text-indigo-500" />
            Comprehensive System Report
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {
            // Plain database export (existing behavior, re-exported here)
            const h = ['Type','LCP','Splitter','Location','Lat','Long','OLT','Shelf','Slot','Port','Optic-Make','Optic-Model','Optic-Serial','Notes'];
            const rows = lcpEntries.map(e => [
              (e.lcp_number||'').toUpperCase().startsWith('CLCP')?'CLCP':'LCP',
              e.lcp_number||'',e.splitter_number||'',e.location||'',
              e.gps_lat||'',e.gps_lng||'',e.olt_name||'',e.olt_shelf||'',
              e.olt_slot||'',e.olt_port||'',e.optic_make||'',e.optic_model||'',
              e.optic_serial||'',e.notes||''
            ]);
            const csv = buildCSVString(h, rows);
            downloadCSV(csv, `lcp_entries_${new Date().toISOString().slice(0,10)}.csv`);
            toast.success(`Exported ${lcpEntries.length} entries`);
          }}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
            Raw Database Export (CSV)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Single LCP picker dialog */}
      <Dialog open={showSingleDialog} onOpenChange={setShowSingleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cable className="h-5 w-5 text-blue-500" />
              Export Single LCP/CLCP Report
            </DialogTitle>
            <DialogDescription>
              Select an LCP/CLCP to generate a detailed report with subscriber data for each splitter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={selectedLcp} onValueChange={setSelectedLcp}>
              <SelectTrigger>
                <SelectValue placeholder="Select LCP/CLCP..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {uniqueLcps.map(lcp => {
                  const count = lcpEntries.filter(e => e.lcp_number === lcp).length;
                  return (
                    <SelectItem key={lcp} value={lcp}>
                      {lcp} <span className="text-gray-400 ml-2">({count} splitter{count !== 1 ? 's' : ''})</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedLcp && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm space-y-1">
                <div className="font-medium text-blue-800">{selectedLcp}</div>
                <div className="text-blue-700 text-xs">
                  {lcpEntries.filter(e => e.lcp_number === selectedLcp).length} splitter(s) •{' '}
                  {subscriberRecords?.length > 0 ? (
                    <span className="text-green-700">Subscriber data available</span>
                  ) : (
                    <span className="text-amber-700">No subscriber data loaded</span>
                  )}
                </div>
              </div>
            )}

            {!subscriberRecords?.length && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0" />
                Upload subscriber data in PON PM Analysis to include customer info in reports.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSingleDialog(false)}>Cancel</Button>
            <Button onClick={exportSingleLcp} disabled={!selectedLcp}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}