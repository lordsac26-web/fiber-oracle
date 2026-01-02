import React, { useState, useMemo } from 'react';
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
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from 'lucide-react';

export default function OLTPortSummary({ result, onDrillDown }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPort, setSelectedPort] = useState(null);
  const [sortBy, setSortBy] = useState('issues'); // 'issues', 'onts', 'avgRx', 'name'
  const [sortOrder, setSortOrder] = useState('desc');

  // Build comprehensive OLT/Port summary data
  const summaryData = useMemo(() => {
    if (!result?.olts || !result?.onts) return { olts: [], ports: [] };

    const oltSummaries = [];
    const portSummaries = [];

    Object.entries(result.olts).forEach(([oltName, oltStats]) => {
      const oltOnts = result.onts.filter(o => o._oltName === oltName);
      const criticalCount = oltOnts.filter(o => o._analysis.status === 'critical').length;
      const warningCount = oltOnts.filter(o => o._analysis.status === 'warning').length;
      const okCount = oltOnts.filter(o => o._analysis.status === 'ok').length;
      const offlineCount = oltOnts.filter(o => o._analysis.status === 'offline').length;

      // Calculate averages
      const rxValues = oltOnts.map(o => parseFloat(o.OntRxOptPwr)).filter(v => !isNaN(v));
      const txValues = oltOnts.map(o => parseFloat(o.OntTxPwr)).filter(v => !isNaN(v));
      const oltRxValues = oltOnts.map(o => parseFloat(o.OLTRXOptPwr)).filter(v => !isNaN(v));

      // Detect degrading ONTs (those below -25 dBm)
      const degradingCount = rxValues.filter(v => v < -25).length;

      // Check for correlated issues (multiple ONTs with issues)
      const issueRate = (criticalCount + warningCount) / oltOnts.length;
      const hasCorrelatedIssue = issueRate > 0.3 && (criticalCount + warningCount) >= 3;

      oltSummaries.push({
        name: oltName,
        portCount: oltStats.portCount,
        ontCount: oltStats.totalOnts,
        criticalCount,
        warningCount,
        okCount,
        avgOntRx: rxValues.length > 0 ? rxValues.reduce((a, b) => a + b, 0) / rxValues.length : null,
        avgOntTx: txValues.length > 0 ? txValues.reduce((a, b) => a + b, 0) / txValues.length : null,
        avgOltRx: oltRxValues.length > 0 ? oltRxValues.reduce((a, b) => a + b, 0) / oltRxValues.length : null,
        minOntRx: rxValues.length > 0 ? Math.min(...rxValues) : null,
        maxOntRx: rxValues.length > 0 ? Math.max(...rxValues) : null,
        degradingCount,
        hasCorrelatedIssue,
        issueRate,
      });

      // Process each port
      Object.entries(oltStats.ports).forEach(([portKey, portStats]) => {
        const portOnts = oltOnts.filter(o => o._port === portKey);
        const portCritical = portOnts.filter(o => o._analysis.status === 'critical').length;
        const portWarning = portOnts.filter(o => o._analysis.status === 'warning').length;
        const portOk = portOnts.filter(o => o._analysis.status === 'ok').length;
        const portOffline = portOnts.filter(o => o._analysis.status === 'offline').length;

        const portRxValues = portOnts.map(o => parseFloat(o.OntRxOptPwr)).filter(v => !isNaN(v));
        const portTxValues = portOnts.map(o => parseFloat(o.OntTxPwr)).filter(v => !isNaN(v));
        const portOltRxValues = portOnts.map(o => parseFloat(o.OLTRXOptPwr)).filter(v => !isNaN(v));

        const portDegradingCount = portRxValues.filter(v => v < -25).length;
        const portIssueRate = (portCritical + portWarning) / portOnts.length;
        const portHasCorrelatedIssue = portIssueRate > 0.4 && (portCritical + portWarning) >= 2;

        // Get LCP info if available
        const lcpInfo = portOnts.find(o => o._lcpNumber);

        portSummaries.push({
          oltName,
          portKey,
          fullPath: `${oltName} / ${portKey}`,
          ontCount: portStats.count,
          criticalCount: portCritical,
          warningCount: portWarning,
          okCount: portOk,
          offlineCount: portOffline,
          avgOntRx: portRxValues.length > 0 ? portRxValues.reduce((a, b) => a + b, 0) / portRxValues.length : null,
          avgOntTx: portTxValues.length > 0 ? portTxValues.reduce((a, b) => a + b, 0) / portTxValues.length : null,
          avgOltRx: portOltRxValues.length > 0 ? portOltRxValues.reduce((a, b) => a + b, 0) / portOltRxValues.length : null,
          minOntRx: portRxValues.length > 0 ? Math.min(...portRxValues) : null,
          maxOntRx: portRxValues.length > 0 ? Math.max(...portRxValues) : null,
          degradingCount: portDegradingCount,
          hasCorrelatedIssue: portHasCorrelatedIssue,
          issueRate: portIssueRate,
          isCombo: portStats.isCombo,
          techType: portStats.techType,
          lcpNumber: lcpInfo?._lcpNumber,
          lcpLocation: lcpInfo?._lcpLocation,
          onts: portOnts,
        });
      });
    });

    return { olts: oltSummaries, ports: portSummaries };
  }, [result]);

  // Filter and sort ports
  const filteredPorts = useMemo(() => {
    let ports = summaryData.ports.filter(p => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return p.oltName.toLowerCase().includes(term) ||
             p.portKey.toLowerCase().includes(term) ||
             p.lcpNumber?.toLowerCase().includes(term);
    });

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
  }, [summaryData.ports, searchTerm, sortBy, sortOrder]);

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

  return (
    <div className="space-y-4">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <Router className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <div className="text-xl font-bold">{summaryData.olts.length}</div>
            <div className="text-xs text-gray-500">OLTs</div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <Activity className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <div className="text-xl font-bold">{summaryData.ports.length}</div>
            <div className="text-xs text-gray-500">PON Ports</div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <div className="text-xl font-bold">
              {summaryData.ports.reduce((sum, p) => sum + p.degradingCount, 0)}
            </div>
            <div className="text-xs text-gray-500">Degrading ONTs</div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <div className="text-xl font-bold">{correlatedIssuePorts.length}</div>
            <div className="text-xs text-gray-500">Correlated Issues</div>
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

      {/* Search and Sort */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search OLT, Port, or LCP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          <Button 
            variant={sortBy === 'issues' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => handleSort('issues')}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Issues
          </Button>
          <Button 
            variant={sortBy === 'degrading' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => handleSort('degrading')}
          >
            <TrendingDown className="h-3 w-3 mr-1" />
            Degrading
          </Button>
          <Button 
            variant={sortBy === 'avgRx' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => handleSort('avgRx')}
          >
            <Zap className="h-3 w-3 mr-1" />
            Avg Rx
          </Button>
          <Button 
            variant={sortBy === 'onts' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => handleSort('onts')}
          >
            <Users className="h-3 w-3 mr-1" />
            ONTs
          </Button>
        </div>
      </div>

      {/* Port Summary Table */}
      <Card className="border shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>OLT / Port</TableHead>
                <TableHead className="text-center">ONTs</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Avg ONT Rx</TableHead>
                <TableHead className="text-right">Rx Range</TableHead>
                <TableHead className="text-right">Avg OLT Rx</TableHead>
                <TableHead className="text-center">Degrading</TableHead>
                <TableHead>LCP</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPorts.map((port, idx) => (
                <TableRow 
                  key={idx} 
                  className={`cursor-pointer hover:bg-gray-50 ${port.hasCorrelatedIssue ? 'bg-orange-50/50' : ''}`}
                  onClick={() => setSelectedPort(port)}
                >
                  <TableCell>
                    <div className="font-medium text-sm">{port.oltName}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      {port.portKey}
                      {port.isCombo && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-purple-50 border-purple-300 text-purple-700">
                          {port.techType}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">{port.ontCount}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {port.criticalCount > 0 && (
                        <Badge className="bg-red-100 text-red-800 border-red-300 text-xs px-1.5">
                          {port.criticalCount}
                        </Badge>
                      )}
                      {port.warningCount > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-1.5">
                          {port.warningCount}
                        </Badge>
                      )}
                      {port.offlineCount > 0 && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs px-1.5">
                          {port.offlineCount}
                        </Badge>
                      )}
                      {port.criticalCount === 0 && port.warningCount === 0 && port.offlineCount === 0 && (
                        <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                        </Badge>
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
                  <TableCell className="text-right font-mono text-xs text-gray-500">
                    {port.minOntRx?.toFixed(1)} ~ {port.maxOntRx?.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {port.avgOltRx?.toFixed(1) || '-'} dBm
                  </TableCell>
                  <TableCell className="text-center">
                    {port.degradingCount > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                        {port.degradingCount}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {port.lcpNumber ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-blue-600 font-medium">{port.lcpNumber}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {port.lcpLocation || 'No location info'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
      </Card>

      {/* Port Detail Dialog */}
      <Dialog open={!!selectedPort} onOpenChange={() => setSelectedPort(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              {selectedPort?.oltName} / {selectedPort?.portKey}
              {selectedPort?.isCombo && (
                <Badge variant="outline" className="text-xs bg-purple-50 border-purple-300 text-purple-700">
                  {selectedPort.techType}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedPort && (
            <div className="space-y-4">
              {/* Port Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className={`border ${getHealthBg(selectedPort)}`}>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold">{selectedPort.ontCount}</div>
                    <div className="text-xs text-gray-500">Total ONTs</div>
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
                    <div className="text-xs text-gray-500">Avg ONT Rx (dBm)</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold">{selectedPort.avgOltRx?.toFixed(1) || 'N/A'}</div>
                    <div className="text-xs text-gray-500">Avg OLT Rx (dBm)</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{selectedPort.degradingCount}</div>
                    <div className="text-xs text-gray-500">Degrading</div>
                  </CardContent>
                </Card>
              </div>

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
                          of ONTs on this port have issues. This may indicate an upstream problem such as:
                        </p>
                        <ul className="text-xs text-orange-600 mt-1 list-disc list-inside">
                          <li>Dirty or damaged splitter input connector</li>
                          <li>Feeder fiber degradation or macrobend</li>
                          <li>OLT optic degradation</li>
                          <li>Environmental issue at LCP/cabinet</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* LCP Info */}
              {selectedPort.lcpNumber && (
                <Card className="border bg-blue-50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">LCP: {selectedPort.lcpNumber}</span>
                      {selectedPort.lcpLocation && (
                        <span className="text-sm text-blue-600">• {selectedPort.lcpLocation}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ONT List */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>ONT ID</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">ONT Rx</TableHead>
                      <TableHead className="text-right">OLT Rx</TableHead>
                      <TableHead className="text-right">US BIP</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPort.onts.map((ont, idx) => (
                      <TableRow key={idx} className={
                        ont._analysis.status === 'critical' ? 'bg-red-50' :
                        ont._analysis.status === 'warning' ? 'bg-amber-50' :
                        ont._analysis.status === 'offline' ? 'bg-purple-50' : ''
                      }>
                        <TableCell>
                          <div className={`w-3 h-3 rounded-full ${
                            ont._analysis.status === 'critical' ? 'bg-red-500' :
                            ont._analysis.status === 'warning' ? 'bg-amber-500' :
                            ont._analysis.status === 'offline' ? 'bg-purple-500' : 'bg-green-500'
                          }`} />
                        </TableCell>
                        <TableCell className="font-mono">{ont.OntID || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{ont.SerialNumber || '-'}</TableCell>
                        <TableCell className="text-xs">{ont.model || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={
                            parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' :
                            parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' : ''
                          }>
                            {ont.OntRxOptPwr || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {ont.OLTRXOptPwr || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {ont.UpstreamBipErrors || '0'}
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