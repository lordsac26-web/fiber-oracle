import React, { useState, useMemo } from 'react';
import { buildLcpLookupMap, resolveLcpForOnt } from './lcpLookup';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// Tooltip imports removed — no longer used at this level
import {
  Router,
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Search,
  ChevronRight,
  X,
  BarChart3,
  Users,
  Zap,
  HelpCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TopIssuePortsPanel from '@/components/ponpm/TopIssuePortsPanel';


// Compute aggregate error totals from a list of ONTs
function computeErrorTotals(onts) {
  let usBip = 0, dsBip = 0, usFecUn = 0, dsFecUn = 0, usFecCor = 0, dsFecCor = 0, usHec = 0, usMissed = 0;
  for (const o of onts) {
    usBip   += parseInt(o.UpstreamBipErrors) || 0;
    dsBip   += parseInt(o.DownstreamBipErrors) || 0;
    usFecUn += parseInt(o.UpstreamFecUncorrectedCodeWords) || 0;
    dsFecUn += parseInt(o.DownstreamFecUncorrectedCodeWords) || 0;
    usFecCor += parseInt(o.UpstreamFecCorrectedCodeWords) || 0;
    dsFecCor += parseInt(o.DownstreamFecCorrectedCodeWords) || 0;
    usHec   += parseInt(o.UpstreamGemHecErrors) || 0;
    usMissed += parseInt(o.UpstreamMissedBursts) || 0;
  }
  return { usBip, dsBip, usFecUn, dsFecUn, usFecCor, dsFecCor, usHec, usMissed, total: usBip + dsBip + usFecUn + dsFecUn + usFecCor + dsFecCor + usHec + usMissed };
}

function ErrorMetricsBadges({ errors, compact = false }) {
  if (errors.total === 0) return <span className="text-gray-400 text-xs">None</span>;
  const items = [
    { label: 'US BIP', value: errors.usBip },
    { label: 'DS BIP', value: errors.dsBip },
    { label: 'US FEC U', value: errors.usFecUn },
    { label: 'DS FEC U', value: errors.dsFecUn },
    { label: 'US FEC C', value: errors.usFecCor },
    { label: 'DS FEC C', value: errors.dsFecCor },
    { label: 'HEC', value: errors.usHec },
    { label: 'Missed', value: errors.usMissed },
  ].filter(i => i.value > 0);
  
  if (compact) {
    return (
      <span className="font-mono text-xs text-amber-700 dark:text-amber-400 font-semibold">
        {errors.total.toLocaleString()}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 dark:bg-amber-900/30 border-amber-300 text-amber-800 dark:text-amber-300 font-mono">
          {item.label}: {item.value.toLocaleString()}
        </Badge>
      ))}
    </div>
  );
}

function LcpHoverCell({ lcpNumber, lcpSplitter, lcpLocation, lcpAddress }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative inline-block">
      <span
        className="text-blue-600 font-medium underline decoration-dotted cursor-help"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {lcpNumber}{lcpSplitter ? `/${lcpSplitter}` : ''}
      </span>
      {hovered && (
        <div className="absolute bottom-full left-0 mb-2 z-[9999] w-60 rounded-md bg-gray-900 text-white text-xs shadow-xl p-2.5 space-y-1 pointer-events-none">
          {lcpLocation && <div><span className="text-gray-400">Location: </span>{lcpLocation}</div>}
          {lcpAddress && <div><span className="text-gray-400">Address: </span>{lcpAddress}</div>}
          {!lcpLocation && !lcpAddress && <div className="text-gray-400">No location data</div>}
        </div>
      )}
    </div>
  );
}

export default function OLTPortSummary({ result, onDrillDown }) {
  // Fetch LCP entries for real-time lookup
  const { data: lcpEntries = [] } = useQuery({
    queryKey: ['lcp-entries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date', 5000),
    staleTime: 5 * 60 * 1000,
  });
  const lcpMap = useMemo(() => buildLcpLookupMap(lcpEntries), [lcpEntries]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOlt, setSelectedOlt] = useState(null);   // OLT-level drill
  const [selectedPort, setSelectedPort] = useState(null);  // Port-level drill
  const [sortBy, setSortBy] = useState('issues'); // 'issues', 'onts', 'avgRx', 'name'
  const [sortOrder, setSortOrder] = useState('desc');

  // Build comprehensive OLT/Port summary data
  const summaryData = useMemo(() => {
    if (!result?.olts || !result?.onts) return { olts: [], ports: [] };

    // Single-pass groupBy: OLT → ONTs (avoids N×OLT repeated filtering)
    const oltOntMap = new Map();
    for (const ont of result.onts) {
      const oltName = ont._oltName || 'Unknown';
      if (!oltOntMap.has(oltName)) oltOntMap.set(oltName, []);
      oltOntMap.get(oltName).push(ont);
    }

    const oltSummaries = [];
    const portSummaries = [];

    Object.entries(result.olts).forEach(([oltName, oltStats]) => {
      const oltOnts = oltOntMap.get(oltName) || [];
      if (oltOnts.length === 0) return;

      // Single-pass OLT stats (replaces 14+ separate filter/map/reduce calls)
      let criticalCount = 0, warningCount = 0, okCount = 0, offlineCount = 0;
      let rxSum = 0, rxCount = 0, rxMin = Infinity, rxMax = -Infinity;
      let txSum = 0, txCount = 0;
      let oltRxSum = 0, oltRxCount = 0;
      let degradingCount = 0;
      let usBip = 0, dsBip = 0, usFecUn = 0, dsFecUn = 0, usFecCor = 0, dsFecCor = 0, usHec = 0, usMissed = 0;

      // Port sub-grouping within this OLT (single pass)
      const portMap = new Map();
      for (const o of oltOnts) {
        const status = o._analysis.status;
        if (status === 'critical') criticalCount++;
        else if (status === 'warning') warningCount++;
        else if (status === 'ok') okCount++;
        else if (status === 'offline') offlineCount++;

        const rx = parseFloat(o.OntRxOptPwr);
        if (!isNaN(rx)) { rxSum += rx; rxCount++; if (rx < rxMin) rxMin = rx; if (rx > rxMax) rxMax = rx; if (rx < -25) degradingCount++; }
        const tx = parseFloat(o.OntTxPwr);
        if (!isNaN(tx)) { txSum += tx; txCount++; }
        const oltRx = parseFloat(o.OLTRXOptPwr);
        if (!isNaN(oltRx)) { oltRxSum += oltRx; oltRxCount++; }

        usBip += parseInt(o.UpstreamBipErrors) || 0;
        dsBip += parseInt(o.DownstreamBipErrors) || 0;
        usFecUn += parseInt(o.UpstreamFecUncorrectedCodeWords) || 0;
        dsFecUn += parseInt(o.DownstreamFecUncorrectedCodeWords) || 0;
        usFecCor += parseInt(o.UpstreamFecCorrectedCodeWords) || 0;
        dsFecCor += parseInt(o.DownstreamFecCorrectedCodeWords) || 0;
        usHec += parseInt(o.UpstreamGemHecErrors) || 0;
        usMissed += parseInt(o.UpstreamMissedBursts) || 0;

        const portKey = o._port || 'Unknown';
        if (!portMap.has(portKey)) portMap.set(portKey, []);
        portMap.get(portKey).push(o);
      }

      const issueRate = (criticalCount + warningCount) / oltOnts.length;
      const hasCorrelatedIssue = issueRate > 0.3 && (criticalCount + warningCount) >= 3;

      oltSummaries.push({
        name: oltName,
        portCount: oltStats.portCount,
        ontCount: oltStats.totalOnts,
        criticalCount, warningCount, okCount, offlineCount,
        avgOntRx: rxCount > 0 ? rxSum / rxCount : null,
        avgOntTx: txCount > 0 ? txSum / txCount : null,
        avgOltRx: oltRxCount > 0 ? oltRxSum / oltRxCount : null,
        minOntRx: rxCount > 0 ? rxMin : null,
        maxOntRx: rxCount > 0 ? rxMax : null,
        degradingCount, hasCorrelatedIssue, issueRate,
        errors: { usBip, dsBip, usFecUn, dsFecUn, usFecCor, dsFecCor, usHec, usMissed, total: usBip + dsBip + usFecUn + dsFecUn + usFecCor + dsFecCor + usHec + usMissed },
      });

      // Process ports using pre-grouped portMap (no repeated filtering)
      Object.entries(oltStats.ports).forEach(([portKey, portStats]) => {
        const portOnts = portMap.get(portKey) || [];
        if (portOnts.length === 0) return;

        let portCritical = 0, portWarning = 0, portOk = 0, portOffline = 0;
        let pRxSum = 0, pRxCount = 0, pRxMin = Infinity, pRxMax = -Infinity;
        let pTxSum = 0, pTxCount = 0;
        let pOltRxSum = 0, pOltRxCount = 0;
        let pDegradingCount = 0;
        let pUsBip = 0, pDsBip = 0, pUsFecUn = 0, pDsFecUn = 0, pUsFecCor = 0, pDsFecCor = 0, pUsHec = 0, pUsMissed = 0;

        for (const o of portOnts) {
          const status = o._analysis.status;
          if (status === 'critical') portCritical++;
          else if (status === 'warning') portWarning++;
          else if (status === 'ok') portOk++;
          else if (status === 'offline') portOffline++;

          const rx = parseFloat(o.OntRxOptPwr);
          if (!isNaN(rx)) { pRxSum += rx; pRxCount++; if (rx < pRxMin) pRxMin = rx; if (rx > pRxMax) pRxMax = rx; if (rx < -25) pDegradingCount++; }
          const tx = parseFloat(o.OntTxPwr);
          if (!isNaN(tx)) { pTxSum += tx; pTxCount++; }
          const oltRx = parseFloat(o.OLTRXOptPwr);
          if (!isNaN(oltRx)) { pOltRxSum += oltRx; pOltRxCount++; }

          pUsBip += parseInt(o.UpstreamBipErrors) || 0;
          pDsBip += parseInt(o.DownstreamBipErrors) || 0;
          pUsFecUn += parseInt(o.UpstreamFecUncorrectedCodeWords) || 0;
          pDsFecUn += parseInt(o.DownstreamFecUncorrectedCodeWords) || 0;
          pUsFecCor += parseInt(o.UpstreamFecCorrectedCodeWords) || 0;
          pDsFecCor += parseInt(o.DownstreamFecCorrectedCodeWords) || 0;
          pUsHec += parseInt(o.UpstreamGemHecErrors) || 0;
          pUsMissed += parseInt(o.UpstreamMissedBursts) || 0;
        }

        const portIssueRate = (portCritical + portWarning) / portOnts.length;
        const portHasCorrelatedIssue = portIssueRate > 0.4 && (portCritical + portWarning) >= 2;

        let lcpInfo = portOnts.find(o => o._lcpNumber);
        let resolvedLcp = null;
        if (!lcpInfo && lcpMap.size > 0 && portOnts.length > 0) {
          resolvedLcp = resolveLcpForOnt(lcpMap, portOnts[0]);
        }

        portSummaries.push({
          oltName, portKey,
          fullPath: `${oltName} / ${portKey}`,
          ontCount: portStats.count,
          criticalCount: portCritical, warningCount: portWarning, okCount: portOk, offlineCount: portOffline,
          avgOntRx: pRxCount > 0 ? pRxSum / pRxCount : null,
          avgOntTx: pTxCount > 0 ? pTxSum / pTxCount : null,
          avgOltRx: pOltRxCount > 0 ? pOltRxSum / pOltRxCount : null,
          minOntRx: pRxCount > 0 ? pRxMin : null,
          maxOntRx: pRxCount > 0 ? pRxMax : null,
          degradingCount: pDegradingCount,
          hasCorrelatedIssue: portHasCorrelatedIssue,
          issueRate: portIssueRate,
          lcpNumber: lcpInfo?._lcpNumber || resolvedLcp?.lcp_number || '',
          lcpSplitter: lcpInfo?._splitterNumber || resolvedLcp?.splitter_number || '',
          lcpLocation: lcpInfo?._lcpLocation || resolvedLcp?.location || '',
          lcpAddress: lcpInfo?._lcpAddress || resolvedLcp?.address || '',
          onts: portOnts,
          errors: { usBip: pUsBip, dsBip: pDsBip, usFecUn: pUsFecUn, dsFecUn: pDsFecUn, usFecCor: pUsFecCor, dsFecCor: pDsFecCor, usHec: pUsHec, usMissed: pUsMissed, total: pUsBip + pDsBip + pUsFecUn + pDsFecUn + pUsFecCor + pDsFecCor + pUsHec + pUsMissed },
        });
      });
    });

    return { olts: oltSummaries, ports: portSummaries };
  }, [result, lcpMap]);

  // Filter OLTs by search
  const filteredOlts = useMemo(() => {
    if (!searchTerm) return summaryData.olts;
    const term = searchTerm.toLowerCase();
    return summaryData.olts.filter(o => o.name.toLowerCase().includes(term));
  }, [summaryData.olts, searchTerm]);

  // Get ports for the selected OLT
  const selectedOltPorts = useMemo(() => {
    if (!selectedOlt) return [];
    let ports = summaryData.ports.filter(p => p.oltName === selectedOlt.name);

    ports.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'issues':
          aVal = a.criticalCount * 10 + a.warningCount;
          bVal = b.criticalCount * 10 + b.warningCount;
          break;
        case 'onts':
          aVal = a.ontCount;
          bVal = b.ontCount;
          break;
        case 'avgRx':
          aVal = a.avgOntRx || -999;
          bVal = b.avgOntRx || -999;
          break;
        case 'degrading':
          aVal = a.degradingCount;
          bVal = b.degradingCount;
          break;
        default:
          aVal = a.fullPath;
          bVal = b.fullPath;
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return ports;
  }, [summaryData.ports, selectedOlt, sortBy, sortOrder]);

  // Ports with correlated issues
  const correlatedIssuePorts = useMemo(() => {
    return summaryData.ports.filter(p => p.hasCorrelatedIssue);
  }, [summaryData.ports]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getHealthColor = (port) => {
    if (port.criticalCount > 0) return 'text-red-600';
    if (port.warningCount > 0) return 'text-amber-600';
    return 'text-green-600';
  };

  const getHealthBg = (port) => {
    if (port.criticalCount > 0) return 'bg-red-50 border-red-200';
    if (port.warningCount > 0) return 'bg-amber-50 border-amber-200';
    return 'bg-green-50 border-green-200';
  };

  const handlePortClick = (oltName, portKey) => {
    const port = summaryData.ports.find(p => p.oltName === oltName && p.portKey === portKey);
    if (port) {
      // Also set the parent OLT so back-navigation works
      const olt = summaryData.olts.find(o => o.name === oltName);
      setSelectedOlt(olt || null);
      setSelectedPort(port);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <Router className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <div className="text-xl font-bold">{summaryData.olts.length}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">OLTs</div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <Activity className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <div className="text-xl font-bold text-gray-900 dark:text-white">{summaryData.ports.length}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">PON Ports</div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {summaryData.ports.reduce((sum, p) => sum + p.degradingCount, 0)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Degrading ONTs</div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <div className="text-xl font-bold text-gray-900 dark:text-white">{correlatedIssuePorts.length}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Correlated Issues</div>
          </CardContent>
        </Card>
      </div>

      {/* Correlated Issues Alert */}
      {correlatedIssuePorts.length > 0 && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Ports with Correlated Issues ({correlatedIssuePorts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-orange-700 mb-2">
              These ports have multiple ONTs with issues (&gt;40% affected), suggesting a possible upstream problem.
            </p>
            <div className="flex flex-wrap gap-2">
              {correlatedIssuePorts.slice(0, 8).map((port, idx) => (
                <Badge 
                  key={idx}
                  className="bg-orange-100 text-orange-800 border-orange-300 cursor-pointer hover:bg-orange-200"
                  onClick={() => setSelectedPort(port)}
                >
                  {port.oltName}/{port.portKey}
                  <span className="ml-1 opacity-70">
                    ({port.criticalCount + port.warningCount}/{port.ontCount})
                  </span>
                </Badge>
              ))}
              {correlatedIssuePorts.length > 8 && (
                <Badge variant="outline">+{correlatedIssuePorts.length - 8} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search OLT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* ═══ TIER 1: OLT-level profile + top issue ports ═══ */}
      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <Card className="border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 dark:bg-gray-800">
                  <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">OLT Name</TableHead>
                  <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">Ports</TableHead>
                  <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">ONTs</TableHead>
                  <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">Status</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">Avg ONT Rx</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">Rx Range</TableHead>
                  <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">Errors</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOlts.map((olt, idx) => (
                  <TableRow 
                    key={idx} 
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${olt.hasCorrelatedIssue ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                    onClick={() => { setSelectedOlt(olt); setSelectedPort(null); }}
                  >
                    <TableCell>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{olt.name}</div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-gray-900 dark:text-white">{olt.portCount}</TableCell>
                    <TableCell className="text-center font-mono text-gray-900 dark:text-white">{olt.ontCount}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {olt.criticalCount > 0 && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 text-xs px-1.5">
                            {olt.criticalCount}
                          </Badge>
                        )}
                        {olt.warningCount > 0 && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-1.5">
                            {olt.warningCount}
                          </Badge>
                        )}
                        {olt.offlineCount > 0 && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs px-1.5">
                            {olt.offlineCount}
                          </Badge>
                        )}
                        {olt.criticalCount === 0 && olt.warningCount === 0 && (olt.offlineCount || 0) === 0 && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={
                        olt.avgOntRx < -27 ? 'text-red-600 font-bold' :
                        olt.avgOntRx < -25 ? 'text-amber-600' : 'text-green-600'
                      }>
                        {olt.avgOntRx?.toFixed(1) || '-'} dBm
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                      {olt.minOntRx?.toFixed(1)} ~ {olt.maxOntRx?.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center">
                      <ErrorMetricsBadges errors={olt.errors} compact />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        <TopIssuePortsPanel onts={result?.onts || []} onPortClick={handlePortClick} />
      </div>

      {/* ═══ TIER 2: OLT → Ports Dialog ═══ */}
      <Dialog open={!!selectedOlt && !selectedPort} onOpenChange={() => setSelectedOlt(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Router className="h-5 w-5 text-blue-500" />
              {selectedOlt?.name}
              <Badge variant="outline" className="text-xs">{selectedOlt?.ontCount} ONTs</Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">PON port details for {selectedOlt?.name}</DialogDescription>
          </DialogHeader>

          {selectedOlt && (
            <div className="space-y-4">
              {/* OLT-level stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedOlt.portCount}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">PON Ports</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className={`text-xl font-bold ${
                      selectedOlt.avgOntRx < -27 ? 'text-red-600' :
                      selectedOlt.avgOntRx < -25 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {selectedOlt.avgOntRx?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Avg ONT Rx (dBm)</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{selectedOlt.degradingCount}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Degrading ONTs</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{selectedOlt.errors.total.toLocaleString()}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Errors</div>
                  </CardContent>
                </Card>
              </div>

              {/* OLT-level error breakdown */}
              {selectedOlt.errors.total > 0 && (
                <Card className="border">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">OLT Error Breakdown</div>
                    <ErrorMetricsBadges errors={selectedOlt.errors} />
                  </CardContent>
                </Card>
              )}

              {/* Sort bar for ports */}
              <div className="flex gap-1 flex-wrap">
                <Button variant={sortBy === 'issues' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('issues')}>
                  <AlertCircle className="h-3 w-3 mr-1" /> Issues
                </Button>
                <Button variant={sortBy === 'degrading' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('degrading')}>
                  <TrendingDown className="h-3 w-3 mr-1" /> Degrading
                </Button>
                <Button variant={sortBy === 'avgRx' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('avgRx')}>
                  <Zap className="h-3 w-3 mr-1" /> Avg Rx
                </Button>
                <Button variant={sortBy === 'onts' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('onts')}>
                  <Users className="h-3 w-3 mr-1" /> ONTs
                </Button>
              </div>

              {/* Port table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-800">
                      <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Port</TableHead>
                      <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">ONTs</TableHead>
                      <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">Status</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">Avg ONT Rx</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">Rx Range</TableHead>
                      <TableHead className="text-center text-gray-700 dark:text-gray-200 font-semibold">Errors</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">LCP</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOltPorts.map((port, idx) => (
                      <TableRow
                        key={idx}
                        className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${port.hasCorrelatedIssue ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                        onClick={() => setSelectedPort(port)}
                      >
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {port.portKey}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-gray-900 dark:text-white">{port.ontCount}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {port.criticalCount > 0 && (
                              <Badge className="bg-red-100 text-red-800 border-red-300 text-xs px-1.5">{port.criticalCount}</Badge>
                            )}
                            {port.warningCount > 0 && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-1.5">{port.warningCount}</Badge>
                            )}
                            {port.offlineCount > 0 && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs px-1.5">{port.offlineCount}</Badge>
                            )}
                            {port.criticalCount === 0 && port.warningCount === 0 && port.offlineCount === 0 && (
                              <Badge className="bg-green-100 text-green-800 border-green-300 text-xs"><CheckCircle2 className="h-3 w-3" /></Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={
                            port.avgOntRx < -27 ? 'text-red-600 font-bold' :
                            port.avgOntRx < -25 ? 'text-amber-600' : 'text-green-600'
                          }>
                            {port.avgOntRx?.toFixed(1) || '-'} dBm
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                          {port.minOntRx?.toFixed(1)} ~ {port.maxOntRx?.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center">
                          <ErrorMetricsBadges errors={port.errors} compact />
                        </TableCell>
                        <TableCell className="text-xs">
                          {port.lcpNumber ? (
                            <LcpHoverCell lcpNumber={port.lcpNumber} lcpSplitter={port.lcpSplitter} lcpLocation={port.lcpLocation} lcpAddress={port.lcpAddress} />
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ TIER 3: Port → ONTs Dialog ═══ */}
      <Dialog open={!!selectedPort} onOpenChange={() => setSelectedPort(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              {selectedPort?.oltName} / {selectedPort?.portKey}
            </DialogTitle>
            <DialogDescription className="sr-only">ONT details for port {selectedPort?.portKey}</DialogDescription>
          </DialogHeader>

          {selectedPort && (
            <div className="space-y-4">
              {/* Port Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className={`border ${getHealthBg(selectedPort)}`}>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedPort.ontCount}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total ONTs</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className={`text-xl font-bold ${
                      selectedPort.avgOntRx < -27 ? 'text-red-600' :
                      selectedPort.avgOntRx < -25 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {selectedPort.avgOntRx?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Avg ONT Rx (dBm)</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedPort.avgOltRx?.toFixed(1) || 'N/A'}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Avg OLT Rx (dBm)</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{selectedPort.degradingCount}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Degrading</div>
                  </CardContent>
                </Card>
              </div>

              {/* Port error breakdown */}
              {selectedPort.errors.total > 0 && (
                <Card className="border">
                  <CardContent className="p-3">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Port Error Breakdown</div>
                    <ErrorMetricsBadges errors={selectedPort.errors} />
                  </CardContent>
                </Card>
              )}

              {/* Correlated Issue Warning */}
              {selectedPort.hasCorrelatedIssue && (
                <Card className="border-2 border-orange-300 bg-orange-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-orange-800">Correlated Issue Detected</div>
                        <p className="text-sm text-orange-700">
                          {((selectedPort.criticalCount + selectedPort.warningCount) / selectedPort.ontCount * 100).toFixed(0)}% 
                          of ONTs on this port have issues. This may indicate an upstream problem.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* LCP Info */}
              {selectedPort.lcpNumber && (
                <Card className="border bg-blue-50">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-blue-800">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">LCP: {selectedPort.lcpNumber}</span>
                      {selectedPort.lcpSplitter && (
                        <span className="text-sm text-blue-600">/ Splitter: {selectedPort.lcpSplitter}</span>
                      )}
                    </div>
                    {selectedPort.lcpLocation && (
                      <div className="text-sm text-blue-700 pl-6">{selectedPort.lcpLocation}</div>
                    )}
                    {selectedPort.lcpAddress && (
                      <div className="text-xs text-blue-600 pl-6">{selectedPort.lcpAddress}</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ONT List */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 dark:bg-gray-800">
                      <TableHead className="w-10 text-gray-700 dark:text-gray-200 font-semibold">Status</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">ONT ID</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Subscriber</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Serial</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Model</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">ONT Rx</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">OLT Rx</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">US BIP</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">DS BIP</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-200 font-semibold">US FEC</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-200 font-semibold">Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPort.onts.map((ont, idx) => (
                      <TableRow key={idx} className={
                        ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
                        ont._analysis.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' :
                        ont._analysis.status === 'offline' ? 'bg-purple-50 dark:bg-purple-900/10' : ''
                      }>
                        <TableCell>
                          <div className={`w-3 h-3 rounded-full ${
                            ont._analysis.status === 'critical' ? 'bg-red-500' :
                            ont._analysis.status === 'warning' ? 'bg-amber-500' :
                            ont._analysis.status === 'offline' ? 'bg-purple-500' : 'bg-green-500'
                          }`} />
                        </TableCell>
                        <TableCell className="font-mono text-gray-900 dark:text-white">{ont.OntID || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-900 dark:text-white max-w-[120px] truncate">
                          {ont._subscriber ? (ont._subscriber.name || ont._subscriber.account || '-') : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-900 dark:text-white">{ont.SerialNumber || '-'}</TableCell>
                        <TableCell className="text-xs text-gray-900 dark:text-white">
                          {ont._subscriber?.model || ont.model || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={
                            parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' :
                            parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' : 'text-gray-900 dark:text-white'
                          }>
                            {ont.OntRxOptPwr || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-900 dark:text-white">
                          {ont.OLTRXOptPwr || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-gray-900 dark:text-white">
                          {(parseInt(ont.UpstreamBipErrors) || 0) > 0 ? <span className="text-amber-700 dark:text-amber-400">{ont.UpstreamBipErrors}</span> : '0'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-gray-900 dark:text-white">
                          {(parseInt(ont.DownstreamBipErrors) || 0) > 0 ? <span className="text-amber-700 dark:text-amber-400">{ont.DownstreamBipErrors}</span> : '0'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-gray-900 dark:text-white">
                          {(parseInt(ont.UpstreamFecUncorrectedCodeWords) || 0) > 0 ? <span className="text-red-600">{ont.UpstreamFecUncorrectedCodeWords}</span> : '0'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ont._analysis.issues.slice(0, 2).map((issue, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] bg-red-50 border-red-300 text-red-700">
                                {issue.field}
                              </Badge>
                            ))}
                            {ont._analysis.warnings.slice(0, 2).map((warn, i) => (
                              <Badge key={`w-${i}`} variant="outline" className="text-[9px] bg-amber-50 border-amber-300 text-amber-700">
                                {warn.field}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Drill Down Button */}
              {onDrillDown && (
                <div className="flex justify-end">
                  <Button onClick={() => {
                    onDrillDown(selectedPort.oltName, selectedPort.portKey);
                    setSelectedPort(null);
                    setSelectedOlt(null);
                  }}>
                    View in Full Analysis
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}