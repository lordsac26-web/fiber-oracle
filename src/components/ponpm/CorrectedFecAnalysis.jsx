import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, Search, Download, ArrowUpDown, ChevronUp, ChevronDown, Activity, Info } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Severity tiers for corrected FEC.
 * These are non-zero corrected FEC ONTs that may appear "OK" status-wise
 * but signal degraded service (micro-drops, buffering, retransmits).
 */
const FEC_SEVERITY = {
  high:     { min: 10000, label: 'High',     color: 'bg-red-100 text-red-800 border-red-300',    rowBg: 'bg-red-50 dark:bg-red-900/10' },
  moderate: { min: 1000,  label: 'Moderate',  color: 'bg-orange-100 text-orange-800 border-orange-300', rowBg: 'bg-orange-50 dark:bg-orange-900/5' },
  low:      { min: 1,     label: 'Low',       color: 'bg-amber-100 text-amber-800 border-amber-300', rowBg: 'bg-amber-50/50 dark:bg-amber-900/5' },
};

function getSeverity(totalCorrected) {
  if (totalCorrected >= FEC_SEVERITY.high.min) return 'high';
  if (totalCorrected >= FEC_SEVERITY.moderate.min) return 'moderate';
  if (totalCorrected >= FEC_SEVERITY.low.min) return 'low';
  return null;
}

export default function CorrectedFecAnalysis({ onts, onSelectOnt }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [sortField, setSortField] = useState('totalCorrected');
  const [sortDir, setSortDir] = useState('desc');

  // Build the corrected FEC dataset from the full ONT array
  const fecOnts = useMemo(() => {
    if (!onts?.length) return [];
    return onts
      .map(ont => {
        const usCor = parseInt(ont.UpstreamFecCorrectedCodeWords) || 0;
        const dsCor = parseInt(ont.DownstreamFecCorrectedCodeWords) || 0;
        const totalCorrected = usCor + dsCor;
        if (totalCorrected === 0) return null;
        const severity = getSeverity(totalCorrected);
        return {
          ...ont,
          _usFecCor: usCor,
          _dsFecCor: dsCor,
          _totalCorrected: totalCorrected,
          _severity: severity,
          _hasUs: usCor > 0,
          _hasDs: dsCor > 0,
        };
      })
      .filter(Boolean);
  }, [onts]);

  // Apply filters
  const filtered = useMemo(() => {
    return fecOnts.filter(ont => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        ont.SerialNumber?.toLowerCase().includes(term) ||
        ont.OntID?.toString().includes(term) ||
        ont._oltName?.toLowerCase().includes(term) ||
        ont._port?.toLowerCase().includes(term) ||
        ont._lcpNumber?.toLowerCase().includes(term);
      const matchesSeverity = severityFilter === 'all' || ont._severity === severityFilter;
      const matchesDirection = directionFilter === 'all' ||
        (directionFilter === 'upstream' && ont._hasUs) ||
        (directionFilter === 'downstream' && ont._hasDs) ||
        (directionFilter === 'both' && ont._hasUs && ont._hasDs);
      return matchesSearch && matchesSeverity && matchesDirection;
    });
  }, [fecOnts, searchTerm, severityFilter, directionFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'totalCorrected': av = a._totalCorrected; bv = b._totalCorrected; break;
        case 'usFecCor': av = a._usFecCor; bv = b._usFecCor; break;
        case 'dsFecCor': av = a._dsFecCor; bv = b._dsFecCor; break;
        case 'serial': return sortDir === 'asc' ? (a.SerialNumber || '').localeCompare(b.SerialNumber || '') : (b.SerialNumber || '').localeCompare(a.SerialNumber || '');
        case 'oltName': return sortDir === 'asc' ? (a._oltName || '').localeCompare(b._oltName || '') : (b._oltName || '').localeCompare(a._oltName || '');
        default: av = a._totalCorrected; bv = b._totalCorrected;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sortField, sortDir]);

  // Summary stats
  const stats = useMemo(() => {
    const high = fecOnts.filter(o => o._severity === 'high').length;
    const moderate = fecOnts.filter(o => o._severity === 'moderate').length;
    const low = fecOnts.filter(o => o._severity === 'low').length;
    const usOnly = fecOnts.filter(o => o._hasUs && !o._hasDs).length;
    const dsOnly = fecOnts.filter(o => !o._hasUs && o._hasDs).length;
    const both = fecOnts.filter(o => o._hasUs && o._hasDs).length;
    // How many are "OK" status but have corrected FEC
    const hiddenIssues = fecOnts.filter(o => o._analysis?.status === 'ok').length;
    return { total: fecOnts.length, high, moderate, low, usOnly, dsOnly, both, hiddenIssues };
  }, [fecOnts]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const exportCSV = () => {
    const headers = ['Severity', 'Status', 'OLT', 'Shelf/Slot/Port', 'ONT ID', 'Serial', 'Model', 'LCP', 'Splitter',
      'US FEC Corrected', 'DS FEC Corrected', 'Total Corrected', 'ONT Rx (dBm)', 'OLT Rx (dBm)', 'US BIP', 'DS BIP', 'US FEC Unc', 'DS FEC Unc'];
    const rows = sorted.map(o => [
      o._severity?.toUpperCase(), o._analysis?.status?.toUpperCase(), o._oltName, o['Shelf/Slot/Port'], o.OntID, o.SerialNumber, o.model,
      o._lcpNumber || '', o._splitterNumber || '',
      o._usFecCor, o._dsFecCor, o._totalCorrected,
      o.OntRxOptPwr, o.OLTRXOptPwr, o.UpstreamBipErrors || 0, o.DownstreamBipErrors || 0,
      o.UpstreamFecUncorrectedCodeWords || 0, o.DownstreamFecUncorrectedCodeWords || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corrected-fec-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sorted.length} ONTs with corrected FEC`);
  };

  const SortHeader = ({ field, children, className = '' }) => (
    <TableHead className={`cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`} onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
      </div>
    </TableHead>
  );

  if (!onts?.length) return null;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <Card className="border border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Corrected FEC Analysis</strong> — ONTs with non-zero corrected FEC codewords may appear "OK" but are actively 
            error-correcting, which causes micro-drops, buffering, and degraded subscriber experience. High corrected FEC counts 
            indicate the link is operating near its correction threshold and may soon become uncorrectable.
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">ONTs w/ Corrected FEC</div>
            {stats.hiddenIssues > 0 && (
              <Badge variant="outline" className="text-[10px] mt-1 bg-blue-50 text-blue-700 border-blue-300">
                {stats.hiddenIssues} marked "OK"
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow bg-red-50 cursor-pointer hover:ring-2 hover:ring-red-300" onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <div className="text-xs text-gray-500">High (≥10k)</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow bg-orange-50 cursor-pointer hover:ring-2 hover:ring-orange-300" onClick={() => setSeverityFilter(severityFilter === 'moderate' ? 'all' : 'moderate')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.moderate}</div>
            <div className="text-xs text-gray-500">Moderate (≥1k)</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow bg-amber-50 cursor-pointer hover:ring-2 hover:ring-amber-300" onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.low}</div>
            <div className="text-xs text-gray-500">Low (1–999)</div>
          </CardContent>
        </Card>
      </div>

      {/* Direction breakdown */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
        <span>Direction:</span>
        <Badge variant="outline" className="cursor-pointer" onClick={() => setDirectionFilter(directionFilter === 'upstream' ? 'all' : 'upstream')}>
          US only: {stats.usOnly}
        </Badge>
        <Badge variant="outline" className="cursor-pointer" onClick={() => setDirectionFilter(directionFilter === 'downstream' ? 'all' : 'downstream')}>
          DS only: {stats.dsOnly}
        </Badge>
        <Badge variant="outline" className="cursor-pointer" onClick={() => setDirectionFilter(directionFilter === 'both' ? 'all' : 'both')}>
          Both: {stats.both}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search serial, ONT ID, OLT, port, LCP..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="high">High (≥10k)</SelectItem>
            <SelectItem value="moderate">Moderate (≥1k)</SelectItem>
            <SelectItem value="low">Low (1–999)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Direction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="upstream">Upstream</SelectItem>
            <SelectItem value="downstream">Downstream</SelectItem>
            <SelectItem value="both">Both US + DS</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={sorted.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <SortHeader field="oltName">OLT</SortHeader>
                <TableHead>Port</TableHead>
                <TableHead>ONT ID</TableHead>
                <SortHeader field="serial">Serial</SortHeader>
                <TableHead>LCP</TableHead>
                <SortHeader field="usFecCor" className="text-right">US FEC Cor</SortHeader>
                <SortHeader field="dsFecCor" className="text-right">DS FEC Cor</SortHeader>
                <SortHeader field="totalCorrected" className="text-right">Total Cor</SortHeader>
                <TableHead className="text-right">ONT Rx</TableHead>
                <TableHead className="text-right">OLT Rx</TableHead>
                <TableHead className="text-right">US FEC Unc</TableHead>
                <TableHead className="text-right">DS FEC Unc</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-gray-500">
                    {fecOnts.length === 0 ? 'No ONTs with corrected FEC in this report' : 'No results match current filters'}
                  </TableCell>
                </TableRow>
              ) : sorted.map((ont, idx) => {
                const sev = FEC_SEVERITY[ont._severity];
                return (
                  <TableRow key={idx} className={sev?.rowBg || ''}>
                    <TableCell>
                      <Badge className={sev?.color}>{sev?.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${
                        ont._analysis?.status === 'ok' ? 'bg-green-50 text-green-700 border-green-300' :
                        ont._analysis?.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                        ont._analysis?.status === 'critical' ? 'bg-red-50 text-red-700 border-red-300' :
                        'bg-gray-50 text-gray-600 border-gray-300'
                      }`}>
                        {ont._analysis?.status?.toUpperCase() || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ont._oltName || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{ont._port || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{ont.OntID || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{ont.SerialNumber || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {ont._lcpNumber ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><span className="text-blue-600 font-medium">{ont._lcpNumber}/{ont._splitterNumber}</span></TooltipTrigger>
                            <TooltipContent>
                              {ont._lcpLocation && <div>{ont._lcpLocation}</div>}
                              {ont._lcpAddress && <div className="text-gray-400">{ont._lcpAddress}</div>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${ont._usFecCor >= 10000 ? 'text-red-600 font-bold' : ont._usFecCor >= 1000 ? 'text-orange-600 font-semibold' : ont._usFecCor > 0 ? 'text-amber-600' : ''}`}>
                      {ont._usFecCor.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${ont._dsFecCor >= 10000 ? 'text-red-600 font-bold' : ont._dsFecCor >= 1000 ? 'text-orange-600 font-semibold' : ont._dsFecCor > 0 ? 'text-amber-600' : ''}`}>
                      {ont._dsFecCor.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${ont._totalCorrected >= 10000 ? 'text-red-600' : ont._totalCorrected >= 1000 ? 'text-orange-600' : 'text-amber-600'}`}>
                      {ont._totalCorrected.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {ont.OntRxOptPwr || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {ont.OLTRXOptPwr || '-'}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${parseInt(ont.UpstreamFecUncorrectedCodeWords) > 0 ? 'text-red-600 font-bold' : ''}`}>
                      {ont.UpstreamFecUncorrectedCodeWords || '0'}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${parseInt(ont.DownstreamFecUncorrectedCodeWords) > 0 ? 'text-red-600 font-bold' : ''}`}>
                      {ont.DownstreamFecUncorrectedCodeWords || '0'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => onSelectOnt?.(ont)}>
                        <Activity className="h-3 w-3" /> Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t text-xs text-gray-500">
            Showing {sorted.length} of {fecOnts.length} ONTs with corrected FEC • {stats.hiddenIssues} currently marked "OK" status
          </div>
        )}
      </Card>
    </div>
  );
}