import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search, ChevronDown, ChevronRight, MapPin, ArrowUpDown,
  ChevronUp, AlertCircle, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';

const SPLITTER_CAP = 32;

function getStatus(remaining) {
  if (remaining <= 0) return 'full';
  if (remaining <= 4) return 'critical';
  if (remaining <= 10) return 'warning';
  return 'available';
}

const STATUS_CONFIG = {
  full:      { label: 'Full (0)',        color: 'bg-red-600 text-white',           icon: XCircle,       rowBg: 'bg-red-50 dark:bg-red-900/10' },
  critical:  { label: '1-4 Remaining',   color: 'bg-orange-500 text-white',        icon: AlertCircle,   rowBg: 'bg-orange-50 dark:bg-orange-900/10' },
  warning:   { label: '5-10 Remaining',  color: 'bg-amber-400 text-amber-900',     icon: AlertTriangle, rowBg: 'bg-amber-50 dark:bg-amber-900/10' },
  available: { label: '11-32 Remaining', color: 'bg-green-100 text-green-800',     icon: CheckCircle2,  rowBg: '' },
};

export default function UtilizationDashboard({ lcpEntries, ontCountsByKey }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedLcps, setExpandedLcps] = useState([]);
  const [sortField, setSortField] = useState('status');
  const [sortDir, setSortDir] = useState('asc');

  // Build per-splitter rows, then group by LCP
  const { lcpGroups, splitterRows, stats } = useMemo(() => {
    const rows = [];
    const seen = new Set();

    // From LCP entries
    for (const entry of lcpEntries) {
      const lcp = (entry.lcp_number || '').trim().toUpperCase();
      const spl = (entry.splitter_number || '').trim().toUpperCase();
      if (!lcp) continue;
      const key = `${lcp}|${spl}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const count = ontCountsByKey[key] || 0;
      const remaining = Math.max(0, SPLITTER_CAP - count);
      rows.push({
        key, lcp, splitter: spl, count, remaining,
        status: getStatus(remaining),
        location: entry.location || '',
        address: entry.address || '',
        oltName: entry.olt_name || '',
        oltPort: `${entry.olt_shelf || '-'}/${entry.olt_slot || '-'}/${entry.olt_port || '-'}`,
        hasGps: !!(entry.gps_lat && entry.gps_lng),
      });
    }

    // Also include keys from ONT counts that have no LCP entry
    for (const [key, count] of Object.entries(ontCountsByKey)) {
      if (seen.has(key)) continue;
      const [lcp, spl] = key.split('|');
      if (!lcp) continue;
      seen.add(key);
      const remaining = Math.max(0, SPLITTER_CAP - count);
      rows.push({
        key, lcp, splitter: spl || '', count, remaining,
        status: getStatus(remaining),
        location: '', address: '', oltName: '', oltPort: '-/-/-', hasGps: false,
      });
    }

    // Group by LCP
    const groups = {};
    for (const row of rows) {
      if (!groups[row.lcp]) {
        groups[row.lcp] = { lcp: row.lcp, splitters: [], location: row.location, oltName: row.oltName };
      }
      groups[row.lcp].splitters.push(row);
      // Use first non-empty location
      if (!groups[row.lcp].location && row.location) groups[row.lcp].location = row.location;
    }

    // Compute per-LCP aggregate stats
    for (const g of Object.values(groups)) {
      g.totalSplitters = g.splitters.length;
      g.totalOnts = g.splitters.reduce((s, r) => s + r.count, 0);
      g.totalCapacity = g.totalSplitters * SPLITTER_CAP;
      g.totalRemaining = g.totalCapacity - g.totalOnts;
      g.fullCount = g.splitters.filter(r => r.status === 'full').length;
      g.criticalCount = g.splitters.filter(r => r.status === 'critical').length;
      g.warningCount = g.splitters.filter(r => r.status === 'warning').length;
      g.availableCount = g.splitters.filter(r => r.status === 'available').length;
      // Worst status for sorting
      g.worstStatus = g.fullCount > 0 ? 'full' : g.criticalCount > 0 ? 'critical' : g.warningCount > 0 ? 'warning' : 'available';
    }

    // Global stats
    const stats = {
      totalSplitters: rows.length,
      full: rows.filter(r => r.status === 'full').length,
      critical: rows.filter(r => r.status === 'critical').length,
      warning: rows.filter(r => r.status === 'warning').length,
      available: rows.filter(r => r.status === 'available').length,
      totalOnts: rows.reduce((s, r) => s + r.count, 0),
      totalLcps: Object.keys(groups).length,
    };

    return { lcpGroups: groups, splitterRows: rows, stats };
  }, [lcpEntries, ontCountsByKey]);

  // Filter
  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return Object.values(lcpGroups)
      .filter(g => {
        const matchesSearch = !term ||
          g.lcp.toLowerCase().includes(term) ||
          g.location.toLowerCase().includes(term) ||
          g.oltName.toLowerCase().includes(term) ||
          g.splitters.some(s => s.splitter.toLowerCase().includes(term));
        const matchesStatus = statusFilter === 'all' ||
          g.splitters.some(s => s.status === statusFilter);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const statusOrder = { full: 0, critical: 1, warning: 2, available: 3 };
        if (sortField === 'status') {
          const diff = statusOrder[a.worstStatus] - statusOrder[b.worstStatus];
          return sortDir === 'asc' ? diff : -diff;
        }
        if (sortField === 'lcp') {
          const cmp = a.lcp.localeCompare(b.lcp, undefined, { numeric: true });
          return sortDir === 'asc' ? cmp : -cmp;
        }
        if (sortField === 'onts') {
          return sortDir === 'asc' ? a.totalOnts - b.totalOnts : b.totalOnts - a.totalOnts;
        }
        if (sortField === 'remaining') {
          return sortDir === 'asc' ? a.totalRemaining - b.totalRemaining : b.totalRemaining - a.totalRemaining;
        }
        return 0;
      });
  }, [lcpGroups, searchTerm, statusFilter, sortField, sortDir]);

  const toggleLcp = (lcp) => {
    setExpandedLcps(prev => prev.includes(lcp) ? prev.filter(l => l !== lcp) : [...prev, lcp]);
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Filtered splitter count for the status filter
  const filteredSplitterCount = useMemo(() => {
    return filteredGroups.reduce((s, g) => {
      if (statusFilter === 'all') return s + g.totalSplitters;
      return s + g.splitters.filter(sp => sp.status === statusFilter).length;
    }, 0);
  }, [filteredGroups, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard
          label="Total Splitters" value={stats.totalSplitters}
          sub={`${stats.totalLcps} LCP/CLCPs`}
          className="border-0 shadow"
        />
        <SummaryCard
          label="Full (0 left)" value={stats.full}
          className="border-0 shadow bg-red-50 dark:bg-red-900/20"
          valueColor="text-red-600"
          onClick={() => setStatusFilter(statusFilter === 'full' ? 'all' : 'full')}
          active={statusFilter === 'full'}
        />
        <SummaryCard
          label="Critical (1-4)" value={stats.critical}
          className="border-0 shadow bg-orange-50 dark:bg-orange-900/20"
          valueColor="text-orange-600"
          onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
          active={statusFilter === 'critical'}
        />
        <SummaryCard
          label="Warning (5-10)" value={stats.warning}
          className="border-0 shadow bg-amber-50 dark:bg-amber-900/20"
          valueColor="text-amber-600"
          onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
          active={statusFilter === 'warning'}
        />
        <SummaryCard
          label="Available (11-32)" value={stats.available}
          className="border-0 shadow bg-green-50 dark:bg-green-900/20"
          valueColor="text-green-600"
          onClick={() => setStatusFilter(statusFilter === 'available' ? 'all' : 'available')}
          active={statusFilter === 'available'}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by LCP, splitter, location, OLT..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="full">Full (0 left)</SelectItem>
            <SelectItem value="critical">Critical (1-4)</SelectItem>
            <SelectItem value="warning">Warning (5-10)</SelectItem>
            <SelectItem value="available">Available (11+)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setExpandedLcps(filteredGroups.map(g => g.lcp))}>
            <ChevronDown className="h-4 w-4 mr-1" /> Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpandedLcps([])}>
            <ChevronRight className="h-4 w-4 mr-1" /> Collapse
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Showing {filteredGroups.length} LCP/CLCPs · {filteredSplitterCount} splitters
      </p>

      {/* LCP Groups */}
      <div className="space-y-2">
        {filteredGroups.map(group => {
          const isExpanded = expandedLcps.includes(group.lcp);
          const pct = group.totalCapacity > 0 ? Math.round((group.totalOnts / group.totalCapacity) * 100) : 0;
          const filteredSplitters = statusFilter === 'all'
            ? group.splitters
            : group.splitters.filter(s => s.status === statusFilter);

          // Sort splitters by remaining ascending (fullest first)
          const sortedSplitters = [...filteredSplitters].sort((a, b) => a.remaining - b.remaining);

          return (
            <Collapsible key={group.lcp} open={isExpanded} onOpenChange={() => toggleLcp(group.lcp)}>
              <Card className={`border-0 shadow ${
                group.fullCount > 0 ? 'ring-1 ring-red-300' :
                group.criticalCount > 0 ? 'ring-1 ring-orange-300' :
                group.warningCount > 0 ? 'ring-1 ring-amber-300' : ''
              }`}>
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-indigo-600 shrink-0">{group.lcp}</Badge>
                            {group.location && (
                              <span className="text-xs text-gray-500 truncate max-w-[200px]">{group.location}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {group.totalSplitters} splitter{group.totalSplitters !== 1 ? 's' : ''} · {group.totalOnts} ONTs · {pct}% utilized
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {group.fullCount > 0 && (
                          <Badge className="bg-red-600 text-white text-xs">{group.fullCount} full</Badge>
                        )}
                        {group.criticalCount > 0 && (
                          <Badge className="bg-orange-500 text-white text-xs">{group.criticalCount} critical</Badge>
                        )}
                        {group.warningCount > 0 && (
                          <Badge className="bg-amber-400 text-amber-900 text-xs">{group.warningCount} warn</Badge>
                        )}
                        {group.fullCount === 0 && group.criticalCount === 0 && group.warningCount === 0 && (
                          <Badge className="bg-green-100 text-green-800 text-xs">All OK</Badge>
                        )}
                        <div className="w-20">
                          <Progress value={pct} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                          <TableHead className="w-16">Status</TableHead>
                          <TableHead>Splitter</TableHead>
                          <TableHead>OLT</TableHead>
                          <TableHead className="text-right">ONTs</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead>Utilization</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedSplitters.map(row => {
                          const cfg = STATUS_CONFIG[row.status];
                          const splPct = Math.round((row.count / SPLITTER_CAP) * 100);
                          return (
                            <TableRow key={row.key} className={cfg.rowBg}>
                              <TableCell>
                                <Badge className={`${cfg.color} text-[10px]`}>{cfg.label.split(' ')[0]}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {row.splitter || '-'}
                                {row.hasGps && <MapPin className="h-3 w-3 inline ml-1 text-gray-400" />}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.oltName ? (
                                  <div>
                                    <div className="font-medium truncate max-w-[140px]">{row.oltName}</div>
                                    <div className="font-mono text-xs text-gray-500">{row.oltPort}</div>
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">{row.count}</TableCell>
                              <TableCell className={`text-right font-mono text-sm font-semibold ${
                                row.remaining === 0 ? 'text-red-600' :
                                row.remaining <= 4 ? 'text-orange-600' :
                                row.remaining <= 10 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {row.remaining}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        splPct >= 100 ? 'bg-red-500' : splPct >= 88 ? 'bg-orange-500' : splPct >= 69 ? 'bg-amber-400' : 'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.min(100, splPct)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500 w-8">{splPct}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        {filteredGroups.length === 0 && (
          <Card className="border-0 shadow">
            <CardContent className="py-12 text-center">
              <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No matching LCP/CLCPs found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, className = '', valueColor = 'text-gray-900', onClick, active }) {
  return (
    <Card
      className={`${className} ${onClick ? 'cursor-pointer transition-all hover:shadow-md' : ''} ${active ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 text-center">
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}