import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronRight, Router, AlertCircle, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import PortHeaderLabel from './PortHeaderLabel';
import VirtualizedONTTable from './VirtualizedONTTable';

/**
 * Renders the OLT -> Port -> ONT collapsible hierarchy for the PON PM analysis page.
 *
 * Extracted out of pages/PONPMAnalysis to keep that page under the editable line
 * limit and to isolate the heaviest render path. Wrapped in React.memo so it only
 * re-renders when its inputs actually change (e.g. when filteredOnts or expansion
 * state updates) rather than on every parent state tick.
 *
 * This is a pure presentational component — all business logic (filtering, status
 * computation upstream, selection state) is owned by the parent and passed in.
 *
 * Performance: receives `groupedByOltPort` (a pre-computed Map of OLT → { onts,
 * ports: Map }) instead of filtering `filteredOnts` on every render. This
 * eliminates O(N × OLTs × Ports) repeated filtering (~800k iterations → ~7k
 * on a typical 7k-ONT report).
 */
function OltHierarchyView({
  result,
  filteredOnts,
  groupedByOltPort,
  expandedOlts,
  expandedPorts,
  toggleOlt,
  togglePort,
  hideOntStatus,
  setHideOntStatus,
  setIssueDetailView,
  subscriberMatchCount,
  eeroRecordsLoaded,
  setSelectedOntDetail,
  isAdmin,
  selectMode,
  selectedSerials,
  toggleSelectOnt,
  toggleSelectMany,
  setFlagDialogOnts,
}) {
  if (!result?.olts || !groupedByOltPort || groupedByOltPort.size === 0) return null;

  return (
    <>
      {[...groupedByOltPort.entries()]
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([oltName, oltGroup]) => {
          const oltStats = result.olts[oltName];
          if (!oltStats) return null;
          const oltOnts = oltGroup.onts;
          // Single-pass status count (replaces 2 separate filter calls)
          let oltCritical = 0, oltWarning = 0;
          for (const o of oltOnts) {
            if (o._analysis.status === 'critical') oltCritical++;
            else if (o._analysis.status === 'warning') oltWarning++;
          }
          const isOltExpanded = expandedOlts.includes(oltName);

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

                      <div className="flex items-center gap-4">
                        <div className="hidden md:block text-center">
                          <div className="text-gray-500 text-xs">Avg ONT Rx</div>
                          <div className="font-mono font-medium">
                            {oltStats.avgOntRxOptPwr?.toFixed(1) || 'N/A'} dBm
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {oltCritical > 0 && (
                            <Badge
                              className="bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200"
                              onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'critical', oltName }); }}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {oltCritical}
                            </Badge>
                          )}
                          {oltWarning > 0 && (
                            <Badge
                              className="bg-amber-100 text-amber-800 border-amber-300 cursor-pointer hover:bg-amber-200"
                              onClick={(e) => { e.stopPropagation(); setIssueDetailView({ type: 'warning', oltName }); }}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {oltWarning}
                            </Badge>
                          )}
                          {oltCritical === 0 && oltWarning === 0 && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              OK
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                    {[...oltGroup.ports.entries()]
                      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                      .map(([portKey, portOnts]) => {
                        const portStats = oltStats.ports?.[portKey];
                        if (!portStats) return null;
                        // Single-pass status count (replaces 2 separate filter calls)
                        let portCritical = 0, portWarning = 0;
                        for (const o of portOnts) {
                          if (o._analysis.status === 'critical') portCritical++;
                          else if (o._analysis.status === 'warning') portWarning++;
                        }
                        const portId = `${oltName}|${portKey}`;
                        const isPortExpanded = expandedPorts.includes(portId);

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

                                    <div className="flex items-center gap-4">
                                      <div className="hidden md:flex items-center gap-4 text-sm">
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
                                          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs px-1.5">
                                            OK
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="border-t">
                                  {/* ONT Status Filter */}
                                  <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b flex items-center gap-3 flex-wrap">
                                    <span className="text-xs text-gray-500 font-medium">Show:</span>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!hideOntStatus.critical}
                                        onChange={() => setHideOntStatus((prev) => ({ ...prev, critical: !prev.critical }))}
                                        className="rounded border-gray-300"
                                      />
                                      <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Critical</Badge>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!hideOntStatus.warning}
                                        onChange={() => setHideOntStatus((prev) => ({ ...prev, warning: !prev.warning }))}
                                        className="rounded border-gray-300"
                                      />
                                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">Warning</Badge>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!hideOntStatus.offline}
                                        onChange={() => setHideOntStatus((prev) => ({ ...prev, offline: !prev.offline }))}
                                        className="rounded border-gray-300"
                                      />
                                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">Offline</Badge>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!hideOntStatus.ok}
                                        onChange={() => setHideOntStatus((prev) => ({ ...prev, ok: !prev.ok }))}
                                        className="rounded border-gray-300"
                                      />
                                      <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">OK</Badge>
                                    </label>
                                  </div>
                                  <VirtualizedONTTable
                                    portOnts={portOnts}
                                    hideOntStatus={hideOntStatus}
                                    subscriberMatchCount={subscriberMatchCount}
                                    eeroRecordsLoaded={eeroRecordsLoaded}
                                    onSelectDetail={setSelectedOntDetail}
                                    selectable={isAdmin && selectMode}
                                    selectedSerials={selectedSerials}
                                    onToggleSelect={toggleSelectOnt}
                                    onToggleSelectMany={toggleSelectMany}
                                    onFlag={isAdmin ? (ont) => setFlagDialogOnts([ont]) : undefined}
                                  />
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

export default React.memo(OltHierarchyView);