import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Zap,
  Settings,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Router,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * CalixUnifiedExport — Consolidated export menu for all data formats
 * Provides options for PDF, CSV, and specialized reports
 */

const EXPORT_OPTIONS = {
  pdf: [
    { id: 'full-report', label: 'Full Network Report', icon: FileText },
    { id: 'critical-only', label: 'Critical Issues Only', icon: AlertCircle },
    { id: 'executive-summary', label: 'Executive Summary', icon: Zap },
  ],
  csv: [
    { id: 'all-onts', label: 'All ONT Records', icon: FileSpreadsheet },
    { id: 'critical-onts', label: 'Critical ONTs', icon: AlertCircle },
    { id: 'warning-onts', label: 'Warning ONTs', icon: AlertTriangle },
    { id: 'offline-onts', label: 'Offline ONTs', icon: Router },
    { id: 'port-inventory', label: 'Port Inventory Report', icon: FileSpreadsheet },
    { id: 'lcp-utilization', label: 'LCP/Splitter Utilization', icon: Router },
    { id: 'issue-summary', label: 'Issue Summary', icon: AlertCircle },
  ],
  advanced: [
    { id: 'trend-analysis', label: 'Historical Trends', icon: Zap },
    { id: 'peer-comparison', label: 'Peer Comparison Report', icon: FileSpreadsheet },
    { id: 'subscriber-map', label: 'Subscriber Mapping', icon: FileText },
  ],
};

export default function CalixUnifiedExport({ reportData, filteredOnts }) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState(new Set(['all-onts']));
  const [isExporting, setIsExporting] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Export Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const exportAsCSV = (filteredOnts, columns, filename) => {
    const headers = columns.map(c => `"${c}"`).join(',');
    const rows = filteredOnts.map(ont =>
      columns.map(col => {
        const val = getColumnValue(ont, col);
        return `"${val || ''}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getColumnValue = (ont, col) => {
    const map = {
      'Status': ont._analysis?.status || 'unknown',
      'OLT': ont.OLTName,
      'Port': ont['Shelf/Slot/Port'],
      'ONT ID': ont.OntID,
      'Serial': ont.SerialNumber,
      'Model': ont.model,
      'ONT Rx': ont.OntRxOptPwr,
      'OLT Rx': ont.OLTRXOptPwr,
      'US BIP': ont.UpstreamBipErrors,
      'DS BIP': ont.DownstreamBipErrors,
      'US FEC U': ont.UpstreamFecUncorrectedCodeWords,
      'DS FEC U': ont.DownstreamFecUncorrectedCodeWords,
      'Subscriber': ont.subscriber_account_name || 'N/A',
      'Address': ont.subscriber_address || 'N/A',
    };
    return map[col] || '';
  };

  const handleExport = async (formatId) => {
    if (formatId === 'all-onts') {
      exportAsCSV(filteredOnts, ['Status', 'OLT', 'Port', 'ONT ID', 'Serial', 'Model', 'ONT Rx', 'OLT Rx', 'US BIP', 'DS BIP'], 'all-onts');
      toast.success(`Exported ${filteredOnts.length} ONT records`);
    } else if (formatId === 'critical-onts') {
      const critical = filteredOnts.filter(o => o._analysis?.status === 'critical');
      if (critical.length === 0) {
        toast.error('No critical ONTs to export');
        return;
      }
      exportAsCSV(critical, ['OLT', 'Port', 'ONT ID', 'Serial', 'ONT Rx', 'OLT Rx', 'US BIP', 'DS BIP'], 'critical-onts');
      toast.success(`Exported ${critical.length} critical ONTs`);
    } else if (formatId === 'warning-onts') {
      const warnings = filteredOnts.filter(o => o._analysis?.status === 'warning');
      if (warnings.length === 0) {
        toast.error('No warning ONTs to export');
        return;
      }
      exportAsCSV(warnings, ['OLT', 'Port', 'ONT ID', 'Serial', 'ONT Rx', 'OLT Rx'], 'warning-onts');
      toast.success(`Exported ${warnings.length} warning ONTs`);
    } else if (formatId === 'offline-onts') {
      const offline = filteredOnts.filter(o => o._analysis?.status === 'offline');
      if (offline.length === 0) {
        toast.error('No offline ONTs to export');
        return;
      }
      exportAsCSV(offline, ['OLT', 'Port', 'ONT ID', 'Serial', 'Subscriber', 'Address'], 'offline-onts');
      toast.success(`Exported ${offline.length} offline ONTs`);
    } else {
      toast.info(`${formatId} export coming soon`);
    }
  };

  const handleBatchExport = async () => {
    setIsExporting(true);
    try {
      for (const format of selectedFormats) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Slight delay between exports
        await handleExport(format);
      }
      setShowExportDialog(false);
      setSelectedFormats(new Set(['all-onts']));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card className="border-0 shadow bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-500" />
                Export Data
              </h3>
              <p className="text-xs text-gray-500 mt-1">Download reports and data in multiple formats</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Export Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-xs text-gray-500">PDF Reports</DropdownMenuLabel>
                  {EXPORT_OPTIONS.pdf.map(opt => (
                    <DropdownMenuItem key={opt.id} onClick={() => handleExport(opt.id)}>
                      <opt.icon className="h-4 w-4 mr-2" />
                      {opt.label}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs text-gray-500">CSV Data</DropdownMenuLabel>
                  {EXPORT_OPTIONS.csv.map(opt => (
                    <DropdownMenuItem key={opt.id} onClick={() => handleExport(opt.id)}>
                      <opt.icon className="h-4 w-4 mr-2" />
                      {opt.label}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs text-gray-500">Advanced</DropdownMenuLabel>
                  {EXPORT_OPTIONS.advanced.map(opt => (
                    <DropdownMenuItem key={opt.id} onClick={() => handleExport(opt.id)}>
                      <opt.icon className="h-4 w-4 mr-2" />
                      {opt.label}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Batch Export...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch Export</DialogTitle>
            <DialogDescription>Select multiple export formats to download at once</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* PDF Section */}
            <div>
              <h4 className="font-medium mb-3 text-sm">PDF Reports</h4>
              <div className="space-y-2">
                {EXPORT_OPTIONS.pdf.map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                    <Checkbox
                      checked={selectedFormats.has(opt.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedFormats);
                        if (checked) newSet.add(opt.id);
                        else newSet.delete(opt.id);
                        setSelectedFormats(newSet);
                      }}
                    />
                    <opt.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CSV Section */}
            <div>
              <h4 className="font-medium mb-3 text-sm">CSV Data Exports</h4>
              <div className="space-y-2">
                {EXPORT_OPTIONS.csv.map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                    <Checkbox
                      checked={selectedFormats.has(opt.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedFormats);
                        if (checked) newSet.add(opt.id);
                        else newSet.delete(opt.id);
                        setSelectedFormats(newSet);
                      }}
                    />
                    <opt.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchExport}
              disabled={selectedFormats.size === 0 || isExporting}
            >
              {isExporting ? 'Exporting...' : `Export (${selectedFormats.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}