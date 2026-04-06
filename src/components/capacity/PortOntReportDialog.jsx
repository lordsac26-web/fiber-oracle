import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PortOntReportDialog({ open, onOpenChange }) {
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('generatePortOntReport', {
        filterType,
      });
      
      if (!response.data.success) {
        setError('Failed to generate report');
        return;
      }
      
      setReportData(response.data);
      toast.success(`Generated report: ${response.data.portReports.length} ports`);
    } catch (err) {
      setError(err.message || 'Error generating report');
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData?.portReports) return;
    
    const headers = ['System Name (OLT)', 'Shelf', 'Slot', 'Port', 'ONT Count', 'LCP/CLCP', 'Splitter', 'Technology Type', 'Optic Make', 'Optic Model'];
    const rows = reportData.portReports.map(p => [
      p.oltName, p.shelf, p.slot, p.port, p.ontCount,
      p.lcpNumber, p.splitterNumber, p.opticType, p.opticMake, p.opticModel,
    ]);
    
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `port-ont-report-${filterType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${reportData.portReports.length} ports`);
  };

  const filterLabel = filterType === 'xgs-dd' ? 'XGS-DD' : filterType === 'combo' ? 'COMBO/EXT COMBO' : 'Full ONT Summary';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Port & ONT Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Report Type
              </label>
              <Select value={filterType} onValueChange={setFilterType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Full ONT Summary</SelectItem>
                  <SelectItem value="xgs-dd">XGS-DD Only</SelectItem>
                  <SelectItem value="combo">COMBO/EXT COMBO Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={!reportData?.portReports?.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          {reportData && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {reportData.summary.totalPorts}
                  </div>
                  <div className="text-xs text-gray-500">Total Ports</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {reportData.summary.totalOnts}
                  </div>
                  <div className="text-xs text-gray-500">Total ONTs</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {Object.entries(reportData.summary.byType).map(([type, count]) => (
                      <div key={type} className="text-xs">
                        <span className="font-medium">{type}:</span> {count}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Report Table */}
          {reportData && reportData.portReports.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead>System Name</TableHead>
                    <TableHead>Shelf</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead className="text-right">ONTs</TableHead>
                    <TableHead>LCP/CLCP</TableHead>
                    <TableHead>Splitter</TableHead>
                    <TableHead>Technology Type</TableHead>
                    <TableHead>Optic Make</TableHead>
                    <TableHead>Optic Model</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.portReports.map((port, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{port.oltName}</TableCell>
                      <TableCell>{port.shelf}</TableCell>
                      <TableCell>{port.slot}</TableCell>
                      <TableCell className="font-mono">{port.port}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{port.ontCount}</TableCell>
                      <TableCell className="text-xs">{port.lcpNumber || '-'}</TableCell>
                      <TableCell className="text-xs">{port.splitterNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {port.opticType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{port.opticMake || '-'}</TableCell>
                      <TableCell className="text-xs text-gray-600">{port.opticModel || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : reportData && reportData.portReports.length === 0 ? (
            <Card className="border-0 shadow">
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">No ports found for filter: <strong>{filterLabel}</strong></p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}