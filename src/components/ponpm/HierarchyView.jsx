import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  Activity, Router, TrendingDown, TrendingUp,
} from 'lucide-react';
import PortHeaderLabel from './PortHeaderLabel';
import { formatUptime } from './formatUptime';

const STATUS_COLORS = {
  critical: 'bg-red-500',
  warning:  'bg-amber-500',
  ok:       'bg-green-500',
  offline:  'bg-purple-500',
};

// Compact error badge shown next to avg rx at port level
function ErrorChip({ label, value, critical, tooltip }) {
  if (!value || value === 0) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={`px-1 py-0.5 rounded text-[10px] font-mono ${critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
            {label}{value.toLocaleString()}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function HierarchyView({
  result,
  filteredOnts,
  expandedOlts,
  expandedPorts,
  toggleOlt,
  togglePort,
  hideOntStatus,
  setHideOntStatus,
  setIssueDetailView,
  setSelectedOntDetail,
  createJobReportForONT,
}) {
  return (
    <>
      {Object.entries(result.olts)
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([oltName, oltStats]) => {
          const oltOnts = filteredOnts.filter(o => o._oltName === oltName);
          if (oltOnts.length === 0) return null;

          const oltCritical = oltOnts.filter(o => o._analysis.status === 'critical').length;
          const oltWarning  = oltOnts.filter(o => o._analysis.status === 'warning').length;
          const isOltExpanded = expandedOlts.includes(oltName);

          // OLT-level error totals
          const oltUsBip   = oltOnts.reduce((s, o) => s + (parseInt(o.UpstreamBipErrors) || 0), 0);
          const oltDsBip   = oltOnts.reduce((s, o) => s + (parseInt(o.DownstreamBipErrors) || 0), 0);
          const oltUsFec   = oltOnts.reduce((s, o) => s + (parseInt(o.UpstreamFecUncorrectedCodeWords) || 0), 0);
          const oltDsFec   = oltOnts.reduce((s, o) => s + (parseInt(o.DownstreamFecUncorrectedCodeWords) || 0), 0);
          const oltMissed  = oltOnts.reduce((s, o) => s + (parseInt(o.UpstreamMissedBursts) || 0), 0);
          const oltGemHec  = oltOnts.reduce((s, o) => s + (parseInt(o.UpstreamGemHecErrors) || 0), 0);

          return (
            <Collapsible key={oltName} open={isOltExpanded} onOpenChange={() => toggleOlt(oltName)}>
              <Card className={`border-0 shadow-lg ${oltCritical > 0 ? 'ring-2 ring-red-300' : oltWarning > 0 ? 'ring-2 ring-amber-300' : ''}`}>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isOltExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <Router className="h-5 w-5 text-blue-600" />
                        <div className="text-left">
                          <div className="font-bold text-lg">{oltName}</div>
                          <div className="text-xs text-gray-500">{oltStats.portCount} ports • {oltStats.totalOnts} ONTs</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        {/* Avg Rx */}
                        <div className="hidden md:block text-center">
                          <div className="text-gray-500 text-xs">Avg ONT Rx</div>
                          <div className="font-mono font-medium">
                            {oltStats.avgOntRxOptPwr?.toFixed(1) || 'N/A'} dBm
                          </div>
                        </div>

                        {/* OLT error totals */}
                        <div className="hidden md:flex items-center gap-1 flex-wrap">
                          <ErrorChip label="BIP↑" value={oltUsBip}  critical={oltUsBip  >= 1000} tooltip="Total US BIP Errors" />
                          <ErrorChip label="BIP↓" value={oltDsBip}  critical={oltDsBip  >= 1000} tooltip="Total DS BIP Errors" />
                          <ErrorChip label="FEC↑" value={oltUsFec}  critical={oltUsFec  >= 10}   tooltip="Total US FEC Uncorrected" />
                          <ErrorChip label="FEC↓" value={oltDsFec}  critical={oltDsFec  >= 10}   tooltip="Total DS FEC Uncorrected" />
                          <ErrorChip label="MB"   value={oltMissed} critical={oltMissed >= 100}  tooltip="Total Missed Bursts" />
                          <ErrorChip label="HEC"  value={oltGemHec} critical={oltGemHec >= 100}  tooltip="Total GEM HEC Errors" />
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-2">
                          {oltCritical > 0 && (
                            <Badge
                              className="bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200"
                              onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'critical', oltName }); }}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />{oltCritical}
                            </Badge>
                          )}
                          {oltWarning > 0 && (
                            <Badge
                              className="bg-amber-100 text-amber-800 border-amber-300 cursor-pointer hover:bg-amber-200"
                              onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'warning', oltName }); }}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />{oltWarning}
                            </Badge>
                          )}
                          {oltCritical === 0 && oltWarning === 0 && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />OK
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                    {Object.entries(oltStats.ports)
                      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                      .map(([portKey, portStats]) => {
                        const portOnts = oltOnts.filter(o => o._port === portKey);
                        if (portOnts.length === 0) return null;

                        const portCritical = portOnts.filter(o => o._analysis.status === 'critical').length;
                        const portWarning  = portOnts.filter(o => o._analysis.status === 'warning').length;
                        const portId = `${oltName}|${portKey}`;
                        const isPortExpanded = expandedPorts.includes(portId);

                        // Port-level error totals
                        const portUsBip   = portOnts.reduce((s, o) => s + (parseInt(o.UpstreamBipErrors) || 0), 0);
                        const portDsBip   = portOnts.reduce((s, o) => s + (parseInt(o.DownstreamBipErrors) || 0), 0);
                        const portUsFec   = portOnts.reduce((s, o) => s + (parseInt(o.UpstreamFecUncorrectedCodeWords) || 0), 0);
                        const portDsFec   = portOnts.reduce((s, o) => s + (parseInt(o.DownstreamFecUncorrectedCodeWords) || 0), 0);
                        const portMissed  = portOnts.reduce((s, o) => s + (parseInt(o.UpstreamMissedBursts) || 0), 0);
                        const portGemHec  = portOnts.reduce((s, o) => s + (parseInt(o.UpstreamGemHecErrors) || 0), 0);

                        return (
                          <Collapsible key={portKey} open={isPortExpanded} onOpenChange={() => togglePort(portId)}>
                            <Card className={`border shadow-sm ${portCritical > 0 ? 'border-red-300' : portWarning > 0 ? 'border-amber-300' : 'border-gray-200'}`}>
                              <CollapsibleTrigger className="w-full">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {isPortExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <PortHeaderLabel portKey={portKey} portStats={portStats} portOnts={portOnts} />
                                    </div>

                                    <div className="flex items-center gap-3 flex-wrap justify-end">
                                      <div className="hidden md:flex items-center gap-3 text-sm">
                                        <div className="text-center">
                                          <div className="text-gray-500 text-[10px]">Avg ONT Rx</div>
                                          <div className="font-mono text-xs font-medium">
                                            {portStats.avgOntRxOptPwr?.toFixed(1) || 'N/A'} dBm
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-gray-500 text-[10px]">Range</div>
                                          <div className="font-mono text-[10px] font-medium">
                                            {portStats.minOntRxOptPwr?.toFixed(1) || 'N/A'} to {portStats.maxOntRxOptPwr?.toFixed(1) || 'N/A'}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Port error totals */}
                                      <div className="hidden md:flex items-center gap-1 flex-wrap">
                                        <ErrorChip label="BIP↑" value={portUsBip}  critical={portUsBip  >= 1000} tooltip="Total US BIP Errors on this port" />
                                        <ErrorChip label="BIP↓" value={portDsBip}  critical={portDsBip  >= 1000} tooltip="Total DS BIP Errors on this port" />
                                        <ErrorChip label="FEC↑" value={portUsFec}  critical={portUsFec  >= 10}   tooltip="Total US FEC Uncorrected on this port" />
                                        <ErrorChip label="FEC↓" value={portDsFec}  critical={portDsFec  >= 10}   tooltip="Total DS FEC Uncorrected on this port" />
                                        <ErrorChip label="MB"   value={portMissed} critical={portMissed >= 100}  tooltip="Total Missed Bursts on this port" />
                                        <ErrorChip label="HEC"  value={portGemHec} critical={portGemHec >= 100}  tooltip="Total GEM HEC Errors on this port" />
                                      </div>

                                      {/* Status badges */}
                                      <div className="flex items-center gap-1">
                                        {portCritical > 0 && (
                                          <Badge
                                            className="bg-red-100 text-red-800 border-red-300 text-xs px-1.5 cursor-pointer hover:bg-red-200"
                                            onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'critical', oltName, portKey }); }}
                                          >
                                            {portCritical}
                                          </Badge>
                                        )}
                                        {portWarning > 0 && (
                                          <Badge
                                            className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-1.5 cursor-pointer hover:bg-amber-200"
                                            onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'warning', oltName, portKey }); }}
                                          >
                                            {portWarning}
                                          </Badge>
                                        )}
                                        {portCritical === 0 && portWarning === 0 && (
                                          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs px-1.5">OK</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="border-t">
                                  {/* ONT visibility toggles */}
                                  <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b flex items-center gap-3 flex-wrap">
                                    <span className="text-xs text-gray-500 font-medium">Show:</span>
                                    {['critical', 'warning', 'offline', 'ok'].map(s => (
                                      <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={!hideOntStatus[s]}
                                          onChange={() => setHideOntStatus(prev => ({ ...prev, [s]: !prev[s] }))}
                                          className="rounded border-gray-300"
                                        />
                                        <Badge className={
                                          s === 'critical' ? 'bg-red-100 text-red-800 border-red-300 text-xs' :
                                          s === 'warning'  ? 'bg-amber-100 text-amber-800 border-amber-300 text-xs' :
                                          s === 'offline'  ? 'bg-purple-100 text-purple-800 border-purple-300 text-xs' :
                                          'bg-green-100 text-green-800 border-green-300 text-xs'
                                        }>
                                          {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </Badge>
                                      </label>
                                    ))}
                                  </div>

                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-12">Status</TableHead>
                                          <TableHead>ONT ID</TableHead>
                                          <TableHead>LCP/Splitter</TableHead>
                                          <TableHead>Serial</TableHead>
                                          <TableHead>Model</TableHead>
                                          <TableHead className="text-right">ONT Rx</TableHead>
                                          <TableHead className="text-right">OLT Rx</TableHead>
                                          <TableHead className="text-right">US BIP</TableHead>
                                          <TableHead className="text-right">DS BIP</TableHead>
                                          <TableHead className="text-right">US FEC Unc</TableHead>
                                          <TableHead className="text-right">DS FEC Unc</TableHead>
                                          <TableHead className="text-right">US FEC Cor</TableHead>
                                          <TableHead className="text-right">DS FEC Cor</TableHead>
                                          <TableHead className="text-right">Missed Burst</TableHead>
                                          <TableHead className="text-right">GEM HEC</TableHead>
                                          <TableHead>Uptime</TableHead>
                                          <TableHead>Issues</TableHead>
                                          <TableHead></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {portOnts.filter(ont => !hideOntStatus[ont._analysis.status]).map((ont, idx) => (
                                          <TableRow key={idx} className={
                                            ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
                                            ont._analysis.status === 'warning'  ? 'bg-amber-50 dark:bg-amber-900/10' :
                                            ont._analysis.status === 'offline'  ? 'bg-purple-50 dark:bg-purple-900/10' : ''
                                          }>
                                            <TableCell>
                                              <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[ont._analysis.status]}`} />
                                            </TableCell>
                                            <TableCell className="font-mono">{ont.OntID || '-'}</TableCell>
                                            <TableCell className="text-xs">
                                              {ont._lcpNumber ? (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger>
                                                      <span className="text-blue-600 font-medium">{ont._lcpNumber}/{ont._splitterNumber}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      {ont._lcpLocation && <div>{ont._lcpLocation}</div>}
                                                      {ont._lcpAddress && <div className="text-gray-400">{ont._lcpAddress}</div>}
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              ) : '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{ont.SerialNumber || '-'}</TableCell>
                                            <TableCell className="text-xs">{ont.model || '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                              <div className="flex flex-col items-end gap-0.5">
                                                <span className={
                                                  parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' :
                                                  parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' : ''
                                                }>{ont.OntRxOptPwr || '-'}</span>
                                                {ont._trends?.ont_rx_change != null && (
                                                  <span className={`text-[9px] flex items-center gap-0.5 ${ont._trends.ont_rx_change < -1 ? 'text-red-600' : ont._trends.ont_rx_change > 1 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {ont._trends.ont_rx_change < -0.1 ? '↓' : ont._trends.ont_rx_change > 0.1 ? '↑' : '→'}
                                                    {Math.abs(ont._trends.ont_rx_change).toFixed(1)}dB
                                                  </span>
                                                )}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                              <div className="flex flex-col items-end gap-0.5">
                                                <span className={
                                                  parseFloat(ont.OLTRXOptPwr) < -30 ? 'text-red-600 font-bold' :
                                                  parseFloat(ont.OLTRXOptPwr) < -28 ? 'text-amber-600' : ''
                                                }>{ont.OLTRXOptPwr || '-'}</span>
                                                {ont._trends?.olt_rx_change != null && (
                                                  <span className={`text-[9px] flex items-center gap-0.5 ${ont._trends.olt_rx_change < -1 ? 'text-red-600' : ont._trends.olt_rx_change > 1 ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {ont._trends.olt_rx_change < -0.1 ? '↓' : ont._trends.olt_rx_change > 0.1 ? '↑' : '→'}
                                                    {Math.abs(ont._trends.olt_rx_change).toFixed(1)}dB
                                                  </span>
                                                )}
                                              </div>
                                            </TableCell>
                                            {[
                                              [ont.UpstreamBipErrors,             100,  ont._trends?.us_bip_change],
                                              [ont.DownstreamBipErrors,            100,  ont._trends?.ds_bip_change],
                                              [ont.UpstreamFecUncorrectedCodeWords, 10,  ont._trends?.us_fec_change],
                                              [ont.DownstreamFecUncorrectedCodeWords,10, ont._trends?.ds_fec_change],
                                              [ont.UpstreamFecCorrectedCodeWords,   null, null],
                                              [ont.DownstreamFecCorrectedCodeWords, null, null],
                                              [ont.UpstreamMissedBursts,           10,   null],
                                              [ont.UpstreamGemHecErrors,           10,   null],
                                            ].map(([val, threshold, trend], ci) => (
                                              <TableCell key={ci} className="text-right font-mono text-xs">
                                                <div className="flex flex-col items-end gap-0.5">
                                                  <span className={threshold && parseInt(val) > threshold ? 'text-amber-600' : ''}>
                                                    {val || '0'}
                                                  </span>
                                                  {trend != null && trend !== 0 && (
                                                    <span className={`text-[9px] ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                      {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}
                                                    </span>
                                                  )}
                                                </div>
                                              </TableCell>
                                            ))}
                                            <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                              {formatUptime(ont.upTime)}
                                            </TableCell>
                                            <TableCell>
                                              <TooltipProvider>
                                                <div className="flex flex-wrap gap-1">
                                                  {ont._analysis.issues.slice(0, 2).map((issue, i) => (
                                                    <Tooltip key={i}>
                                                      <TooltipTrigger>
                                                        <Badge variant="outline" className="text-[10px] bg-red-50 border-red-300 text-red-700">
                                                          {issue.field}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent>{issue.message}</TooltipContent>
                                                    </Tooltip>
                                                  ))}
                                                  {ont._analysis.warnings.slice(0, 2).map((warn, i) => (
                                                    <Tooltip key={`w-${i}`}>
                                                      <TooltipTrigger>
                                                        <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-300 text-amber-700">
                                                          {warn.field}
                                                        </Badge>
                                                      </TooltipTrigger>
                                                      <TooltipContent>{warn.message}</TooltipContent>
                                                    </Tooltip>
                                                  ))}
                                                  {(ont._analysis.issues.length + ont._analysis.warnings.length) > 4 && (
                                                    <Badge variant="outline" className="text-[10px]">
                                                      +{ont._analysis.issues.length + ont._analysis.warnings.length - 4}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TooltipProvider>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex gap-1">
                                                <Button size="sm" variant="outline"
                                                  onClick={(e) => { e.stopPropagation(); setSelectedOntDetail(ont); }}
                                                  className="text-xs h-7 gap-1"
                                                >
                                                  <Activity className="h-3 w-3" />Details
                                                </Button>
                                                <Button size="sm" variant="outline"
                                                  onClick={(e) => { e.stopPropagation(); createJobReportForONT(ont); }}
                                                  className="text-xs h-7 gap-1"
                                                >
                                                  Job
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
    </>
  );
}