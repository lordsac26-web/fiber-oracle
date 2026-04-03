import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  ShieldAlert, Search, Download, ArrowUpDown, ChevronUp, ChevronDown,
  Activity, Info, Router, Layers, MapPin, List, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [viewMode, setViewMode] = useState('dashboard'); // dashboard | olt | port | lcp | onts
  const [drillFilter, setDrillFilter] = useState(null); // { type: 'olt'|'port'|'lcp', value: '...' }

  // Build the corrected FEC dataset
  const fecOnts = useMemo(() => {
    if (!onts?.length) return [];
    return onts
      .map(ont => {
        const usCor = parseInt(ont.UpstreamFecCorrectedCodeWords) || 0;
        const dsCor = parseInt(ont.DownstreamFecCorrectedCodeWords) || 0;
        const totalCorrected = usCor + dsCor;
        if (totalCorrected === 0) return null;
        return {
          ...ont,
          _usFecCor: usCor,
          _dsFecCor: dsCor,
          _totalCorrected: totalCorrected,
          _severity: getSeverity(totalCorrected),
          _hasUs: usCor > 0,
          _hasDs: dsCor > 0,
        };
      })
      .filter(Boolean);
  }, [onts]);

  // Summary stats
  const stats = useMemo(() => {
    const high = fecOnts.filter(o => o._severity === 'high').length;
    const moderate = fecOnts.filter(o => o._severity === 'moderate').length;
    const low = fecOnts.filter(o => o._severity === 'low').length;
    const usOnly = fecOnts.filter(o => o._hasUs && !o._hasDs).length;
    const dsOnly = fecOnts.filter(o => !o._hasUs && o._hasDs).length;
    const both = fecOnts.filter(o => o._hasUs && o._hasDs).length;
    const hiddenIssues = fecOnts.filter(o => o._analysis?.status === 'ok').length;
    return { total: fecOnts.length, high, moderate, low, usOnly, dsOnly, both, hiddenIssues };
  }, [fecOnts]);

  // Aggregations by OLT, Port, LCP
  const aggregations = useMemo(() => {
    const oltMap = new Map();
    const portMap = new Map();
    const lcpMap = new Map();

    fecOnts.forEach(ont => {
      const olt = ont._oltName || 'Unknown';
      const port = `${olt} / ${ont._port || 'Unknown'}`;
      const lcp = ont._lcpNumber ? `${ont._lcpNumber}/${ont._splitterNumber || ''}` : null;

      // OLT
      if (!oltMap.has(olt)) oltMap.set(olt, { name: olt, totalCor: 0, usCor: 0, dsCor: 0, count: 0, high: 0, moderate: 0, low: 0 });
      const o = oltMap.get(olt);
      o.totalCor += ont._totalCorrected; o.usCor += ont._usFecCor; o.dsCor += ont._dsFecCor; o.count++;
      if (ont._severity === 'high') o.high++; else if (ont._severity === 'moderate') o.moderate++; else o.low++;

      // Port
      if (!portMap.has(port)) portMap.set(port, { name: port, olt, portKey: ont._port || 'Unknown', totalCor: 0, usCor: 0, dsCor: 0, count: 0, totalOntsOnPort: 0, high: 0, moderate: 0, low: 0 });
      const p = portMap.get(port);
      p.totalCor += ont._totalCorrected; p.usCor += ont._usFecCor; p.dsCor += ont._dsFecCor; p.count++;
      if (ont._severity === 'high') p.high++; else if (ont._severity === 'moderate') p.moderate++; else p.low++;

      // LCP
      if (lcp) {
        if (!lcpMap.has(lcp)) lcpMap.set(lcp, { name: lcp, lcpNumber: ont._lcpNumber, splitter: ont._splitterNumber, location: ont._lcpLocation, address: ont._lcpAddress, totalCor: 0, usCor: 0, dsCor: 0, count: 0, high: 0, moderate: 0, low: 0 });
        const l = lcpMap.get(lcp);
        l.totalCor += ont._totalCorrected; l.usCor += ont._usFecCor; l.dsCor += ont._dsFecCor; l.count++;
        if (ont._severity === 'high') l.high++; else if (ont._severity === 'moderate') l.moderate++; else l.low++;
      }
    });

    // Enrich ports with total ONT count from the full dataset so we can compute % affected
    if (onts?.length) {
      const portTotalMap = new Map();
      onts.forEach(ont => {
        const key = `${ont._oltName || 'Unknown'} / ${ont._port || 'Unknown'}`;
        portTotalMap.set(key, (portTotalMap.get(key) || 0) + 1);
      });
      for (const p of portMap.values()) {
        p.totalOntsOnPort = portTotalMap.get(p.name) || p.count;
      }
    }

    const sortByTotal = (a, b) => b.totalCor - a.totalCor;
    return {
      olts: [...oltMap.values()].sort(sortByTotal),
      ports: [...portMap.values()].sort(sortByTotal),
      lcps: [...lcpMap.values()].sort(sortByTotal),
    };
  }, [fecOnts, onts]);

  // Filtered ONTs for the detail table
  const filtered = useMemo(() => {
    return fecOnts.filter(ont => {
      // Drill filter from aggregation click
      if (drillFilter) {
        if (drillFilter.type === 'olt' && ont._oltName !== drillFilter.value) return false;
        if (drillFilter.type === 'port' && `${ont._oltName} / ${ont._port}` !== drillFilter.value) return false;
        if (drillFilter.type === 'lcp') {
          const lcpKey = ont._lcpNumber ? `${ont._lcpNumber}/${ont._splitterNumber || ''}` : null;
          if (lcpKey !== drillFilter.value) return false;
        }
      }
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
  }, [fecOnts, searchTerm, severityFilter, directionFilter, drillFilter]);

  // Sort filtered ONTs
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

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleDrill = (type, value) => {
    setDrillFilter({ type, value });
    setViewMode('onts');
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

  const exportTopPorts = () => {
    const top10 = aggregations.ports.slice(0, 10);
    if (top10.length === 0) { toast.error('No port data to export'); return; }
    const headers = ['Rank', 'OLT', 'Port', 'Affected ONTs', 'Total ONTs on Port', '% Affected', 'US FEC Corrected', 'DS FEC Corrected', 'Total Corrected', 'High Severity', 'Moderate Severity', 'Low Severity'];
    const rows = top10.map((p, i) => {
      const pctAffected = p.totalOntsOnPort > 0 ? ((p.count / p.totalOntsOnPort) * 100).toFixed(1) : 'N/A';
      return [
        i + 1, p.olt, p.portKey, p.count, p.totalOntsOnPort, `${pctAffected}%`,
        p.usCor, p.dsCor, p.totalCor, p.high, p.moderate, p.low,
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-10-fec-ports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported top ${top10.length} ports with corrected FEC errors`);
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
            error-correcting, which causes micro-drops, buffering, and degraded subscriber experience. High counts
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
        <Card className={`border-0 shadow bg-red-50 cursor-pointer hover:ring-2 hover:ring-red-300 ${severityFilter === 'high' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <div className="text-xs text-gray-500">High (10k+)</div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow bg-orange-50 cursor-pointer hover:ring-2 hover:ring-orange-300 ${severityFilter === 'moderate' ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setSeverityFilter(severityFilter === 'moderate' ? 'all' : 'moderate')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.moderate}</div>
            <div className="text-xs text-gray-500">Moderate (1k+)</div>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow bg-amber-50 cursor-pointer hover:ring-2 hover:ring-amber-300 ${severityFilter === 'low' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.low}</div>
            <div className="text-xs text-gray-500">Low (1-999)</div>
          </CardContent>
        </Card>
      </div>

      {/* Direction + View Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
          <span>Direction:</span>
          <Badge variant={directionFilter === 'upstream' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDirectionFilter(directionFilter === 'upstream' ? 'all' : 'upstream')}>
            US only: {stats.usOnly}
          </Badge>
          <Badge variant={directionFilter === 'downstream' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDirectionFilter(directionFilter === 'downstream' ? 'all' : 'downstream')}>
            DS only: {stats.dsOnly}
          </Badge>
          <Badge variant={directionFilter === 'both' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDirectionFilter(directionFilter === 'both' ? 'all' : 'both')}>
            Both: {stats.both}
          </Badge>
        </div>

        <div className="flex border rounded-lg overflow-hidden">
          <Button variant={viewMode === 'dashboard' ? 'default' : 'ghost'} size="sm" className="rounded-none text-xs" onClick={() => { setViewMode('dashboard'); setDrillFilter(null); }}>
            <BarChart3 className="h-3.5 w-3.5 mr-1" />Dashboard
          </Button>
          <Button variant={viewMode === 'olt' ? 'default' : 'ghost'} size="sm" className="rounded-none text-xs" onClick={() => { setViewMode('olt'); setDrillFilter(null); }}>
            <Router className="h-3.5 w-3.5 mr-1" />By OLT
          </Button>
          <Button variant={viewMode === 'port' ? 'default' : 'ghost'} size="sm" className="rounded-none text-xs" onClick={() => { setViewMode('port'); setDrillFilter(null); }}>
            <Layers className="h-3.5 w-3.5 mr-1" />By Port
          </Button>
          <Button variant={viewMode === 'lcp' ? 'default' : 'ghost'} size="sm" className="rounded-none text-xs" onClick={() => { setViewMode('lcp'); setDrillFilter(null); }}>
            <MapPin className="h-3.5 w-3.5 mr-1" />By LCP
          </Button>
          <Button variant={viewMode === 'onts' ? 'default' : 'ghost'} size="sm" className="rounded-none text-xs" onClick={() => { setViewMode('onts'); setDrillFilter(null); }}>
            <List className="h-3.5 w-3.5 mr-1" />All ONTs
          </Button>
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <DashboardView aggregations={aggregations} onDrill={handleDrill} />
      )}

      {/* Aggregation Table Views */}
      {(viewMode === 'olt' || viewMode === 'port' || viewMode === 'lcp') && (
        <AggregationTable
          viewMode={viewMode}
          data={viewMode === 'olt' ? aggregations.olts : viewMode === 'port' ? aggregations.ports : aggregations.lcps}
          onDrill={handleDrill}
        />
      )}

      {/* ONT Detail Table */}
      {viewMode === 'onts' && (
        <OntTable
          drillFilter={drillFilter}
          setDrillFilter={setDrillFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          directionFilter={directionFilter}
          setDirectionFilter={setDirectionFilter}
          sorted={sorted}
          fecOnts={fecOnts}
          stats={stats}
          SortHeader={SortHeader}
          onSelectOnt={onSelectOnt}
          exportCSV={exportCSV}
          exportTopPorts={exportTopPorts}
          aggregations={aggregations}
          setViewMode={setViewMode}
        />
      )}
    </div>
  );
}

/* ── Dashboard View ──────────────────────────────────────────────────────── */
function DashboardView({ aggregations, onDrill }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <TopListCard
        title="Top OLTs by Corrected FEC"
        icon={<Router className="h-4 w-4" />}
        items={aggregations.olts.slice(0, 8)}
        onItemClick={(item) => onDrill('olt', item.name)}
        maxVal={aggregations.olts[0]?.totalCor || 1}
      />
      <TopListCard
        title="Top PON Ports by Corrected FEC"
        icon={<Layers className="h-4 w-4" />}
        items={aggregations.ports.slice(0, 8)}
        onItemClick={(item) => onDrill('port', item.name)}
        maxVal={aggregations.ports[0]?.totalCor || 1}
      />
      <TopListCard
        title="Top LCP/Splitters by Corrected FEC"
        icon={<MapPin className="h-4 w-4" />}
        items={aggregations.lcps.slice(0, 8)}
        onItemClick={(item) => onDrill('lcp', item.name)}
        maxVal={aggregations.lcps[0]?.totalCor || 1}
        renderSubtext={(item) => item.location || item.address || ''}
      />
    </div>
  );
}

function TopListCard({ title, icon, items, onItemClick, maxVal, renderSubtext }) {
  if (items.length === 0) {
    return (
      <Card className="border-0 shadow">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
        <CardContent className="text-xs text-gray-500">No data</CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-0 shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors -mx-2"
            onClick={() => onItemClick(item)}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[60%]" title={item.name}>
                {item.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-gray-900 dark:text-white">{item.totalCor.toLocaleString()}</span>
                <span className="text-gray-400">({item.count})</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(2, (item.totalCor / maxVal) * 100)}%`,
                    background: item.high > 0 ? '#dc2626' : item.moderate > 0 ? '#ea580c' : '#d97706',
                  }}
                />
              </div>
              <div className="flex gap-0.5 shrink-0">
                {item.high > 0 && <span className="text-[9px] px-1 py-0.5 bg-red-100 text-red-700 rounded">{item.high}H</span>}
                {item.moderate > 0 && <span className="text-[9px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded">{item.moderate}M</span>}
                {item.low > 0 && <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">{item.low}L</span>}
              </div>
            </div>
            {renderSubtext && renderSubtext(item) && (
              <div className="text-[10px] text-gray-400 mt-0.5 truncate">{renderSubtext(item)}</div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ── Aggregation Table ───────────────────────────────────────────────────── */
function AggregationTable({ viewMode, data, onDrill }) {
  const typeLabel = viewMode === 'olt' ? 'OLT' : viewMode === 'port' ? 'PON Port' : 'LCP / Splitter';
  const drillType = viewMode === 'olt' ? 'olt' : viewMode === 'port' ? 'port' : 'lcp';
  const maxVal = data[0]?.totalCor || 1;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Corrected FEC by {typeLabel} ({data.length})</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead>{typeLabel}</TableHead>
              <TableHead className="text-right">ONTs</TableHead>
              <TableHead className="text-right">US FEC Cor</TableHead>
              <TableHead className="text-right">DS FEC Cor</TableHead>
              <TableHead className="text-right">Total Corrected</TableHead>
              <TableHead>Severity Breakdown</TableHead>
              <TableHead className="w-[200px]">Distribution</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">No data for this grouping</TableCell>
              </TableRow>
            ) : data.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell>
                  <div className="font-medium text-sm">{row.name}</div>
                  {viewMode === 'lcp' && row.location && (
                    <div className="text-[10px] text-gray-400">{row.location}</div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{row.count}</TableCell>
                <TableCell className="text-right font-mono text-sm">{row.usCor.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-sm">{row.dsCor.toLocaleString()}</TableCell>
                <TableCell className={`text-right font-mono text-sm font-bold ${row.high > 0 ? 'text-red-600' : row.moderate > 0 ? 'text-orange-600' : 'text-amber-600'}`}>
                  {row.totalCor.toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {row.high > 0 && <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">{row.high} High</Badge>}
                    {row.moderate > 0 && <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px]">{row.moderate} Mod</Badge>}
                    {row.low > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">{row.low} Low</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (row.totalCor / maxVal) * 100)}%`,
                        background: row.high > 0 ? '#dc2626' : row.moderate > 0 ? '#ea580c' : '#d97706',
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onDrill(drillType, row.name)}>
                    View ONTs
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ── ONT Detail Table ────────────────────────────────────────────────────── */
function OntTable({
  drillFilter, setDrillFilter, searchTerm, setSearchTerm,
  severityFilter, setSeverityFilter, directionFilter, setDirectionFilter,
  sorted, fecOnts, stats, SortHeader, onSelectOnt, exportCSV, exportTopPorts, aggregations, setViewMode
}) {
  return (
    <>
      {/* Drill filter indicator */}
      {drillFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 rounded-lg">
          <span className="text-xs text-indigo-800 dark:text-indigo-200">
            Filtered to <strong>{drillFilter.type.toUpperCase()}: {drillFilter.value}</strong>
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setDrillFilter(null)}>Clear</Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" onClick={() => setViewMode('dashboard')}>Back to Dashboard</Button>
        </div>
      )}

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
            <SelectItem value="high">High (10k+)</SelectItem>
            <SelectItem value="moderate">Moderate (1k+)</SelectItem>
            <SelectItem value="low">Low (1-999)</SelectItem>
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
        <Button variant="outline" size="sm" onClick={exportTopPorts} disabled={aggregations.ports.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Top 10 Ports
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                    {fecOnts.length === 0 ? 'No ONTs with corrected FEC in this report' : 'No results match current filters'}
                  </TableCell>
                </TableRow>
              ) : sorted.map((ont, idx) => {
                const sev = FEC_SEVERITY[ont._severity];
                return (
                  <TableRow key={idx} className={sev?.rowBg || ''}>
                    <TableCell><Badge className={sev?.color}>{sev?.label}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${
                        ont._analysis?.status === 'ok' ? 'bg-green-50 text-green-700 border-green-300' :
                        ont._analysis?.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                        ont._analysis?.status === 'critical' ? 'bg-red-50 text-red-700 border-red-300' :
                        'bg-gray-50 text-gray-600 border-gray-300'
                      }`}>
                        {ont._analysis?.status?.toUpperCase() || '-'}
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
                    <TableCell className="text-right font-mono text-xs">{ont.OntRxOptPwr || '-'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{ont.OLTRXOptPwr || '-'}</TableCell>
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
            Showing {sorted.length} of {fecOnts.length} ONTs with corrected FEC
            {stats.hiddenIssues > 0 && ` • ${stats.hiddenIssues} currently marked "OK" status`}
          </div>
        )}
      </Card>
    </>
  );
}