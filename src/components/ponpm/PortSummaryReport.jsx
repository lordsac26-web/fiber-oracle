import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PortSummaryReport({ isOpen, onClose, onts }) {
  const [filterType, setFilterType] = useState('all'); // all | xgs-dd | combo

  const portData = useMemo(() => {
    if (!onts?.length) return [];

    const portMap = new Map();

    onts.forEach(ont => {
      const shelfSlotPort = ont['Shelf/Slot/Port'] || 'Unknown';
      const [shelf, slot, port] = shelfSlotPort.split('/').map(s => s.trim());

      const techType = ont._techType || 'Unknown';
      const oltName = ont._oltName || 'Unknown';
      const lcpKey = ont._lcpNumber ? `${ont._lcpNumber}${ont._splitterNumber ? `/${ont._splitterNumber}` : ''}` : 'N/A';

      const key = `${oltName}|${shelf}|${slot}|${port}|${lcpKey}|${techType}`;

      if (!portMap.has(key)) {
        portMap.set(key, {
          systemName: oltName,
          shelf: shelf || 'N/A',
          slot: slot || 'N/A',
          port: port || 'N/A',
          lcpClcp: lcpKey,
          splitter: ont._splitterNumber || 'N/A',
          techType: techType,
          ontCount: 0,
          model: ont.model || 'N/A',
        });
      }

      const entry = portMap.get(key);
      entry.ontCount++;
    });

    return [...portMap.values()].sort((a, b) => {
      const aName = `${a.systemName}/${a.shelf}/${a.slot}/${a.port}`;
      const bName = `${b.systemName}/${b.shelf}/${b.slot}/${b.port}`;
      return aName.localeCompare(bName, undefined, { numeric: true });
    });
  }, [onts]);

  const filteredData = useMemo(() => {
    if (filterType === 'all') return portData;
    if (filterType === 'xgs-dd') return portData.filter(p => p.techType?.includes('XGS-PON'));
    if (filterType === 'combo') return portData.filter(p => p.techType?.includes('COMBO') || p.techType?.includes('combo'));
    return portData;
  }, [portData, filterType]);

  const exportReport = (format) => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    if (format === 'csv') {
      const headers = ['System Name', 'Shelf', 'Slot', 'Port', 'LCP/CLCP', 'Splitter', 'Technology Type', 'ONT Count'];
      const rows = filteredData.map(p => [
        p.systemName,
        p.shelf,
        p.slot,
        p.port,
        p.lcpClcp,
        p.splitter,
        p.techType,
        p.ontCount,
      ]);

      const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      let filename = 'port-summary-report';
      if (filterType === 'xgs-dd') filename += '-xgs-dd';
      else if (filterType === 'combo') filename += '-combo';
      filename += `-${new Date().toISOString().slice(0, 10)}.csv`;

      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredData.length} ports to CSV`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <CardHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 flex items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Port ONT Summary Report
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">Filter by Technology:</span>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All ONTs ({portData.length})
              </Button>
              <Button
                variant={filterType === 'xgs-dd' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('xgs-dd')}
              >
                XGS-DD ({portData.filter(p => p.techType?.includes('XGS-PON')).length})
              </Button>
              <Button
                variant={filterType === 'combo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('combo')}
              >
                COMBO ({portData.filter(p => p.techType?.includes('COMBO') || p.techType?.includes('combo')).length})
              </Button>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport('csv')}
              disabled={filteredData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <span className="text-xs text-gray-500 flex items-center">
              {filteredData.length} port(s) • {filteredData.reduce((sum, p) => sum + p.ontCount, 0)} total ONTs
            </span>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead>System Name</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>LCP/CLCP</TableHead>
                  <TableHead>Splitter</TableHead>
                  <TableHead>Technology Type</TableHead>
                  <TableHead className="text-right">ONT Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No data matching this filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((port, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{port.systemName}</TableCell>
                      <TableCell className="font-mono text-sm">{port.shelf}</TableCell>
                      <TableCell className="font-mono text-sm">{port.slot}</TableCell>
                      <TableCell className="font-mono text-sm">{port.port}</TableCell>
                      <TableCell className="text-sm">{port.lcpClcp}</TableCell>
                      <TableCell className="text-sm">{port.splitter}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            port.techType?.includes('XGS-PON')
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : port.techType?.includes('COMBO')
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-cyan-100 text-cyan-800 border-cyan-300'
                          }
                        >
                          {port.techType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">{port.ontCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}