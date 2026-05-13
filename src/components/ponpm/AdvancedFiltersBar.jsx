import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from 'lucide-react';

/**
 * Advanced filters bar: free-text search, status, OLT, port, power range, sort.
 * Port filter is grouped by OLT when OLT="all" and port count exceeds 20.
 */
export default function AdvancedFiltersBar({
  searchTerm, setSearchTerm,
  statusFilter, setStatusFilter,
  oltFilter, setOltFilter,
  portFilter, setPortFilter,
  powerRangeFilter, setPowerRangeFilter,
  sortBy, setSortBy,
  olts,
  onts,
  onClearAll,
}) {
  // Group ports by OLT for the "all OLTs" case — avoids a flat list of hundreds
  const portsByOlt = useMemo(() => {
    if (oltFilter !== 'all') return null;
    const map = {};
    for (const o of onts) {
      if (!o._oltName || !o._port) continue;
      if (!map[o._oltName]) map[o._oltName] = new Set();
      map[o._oltName].add(o._port);
    }
    // Convert to sorted arrays
    const sorted = {};
    for (const olt of Object.keys(map).sort()) {
      sorted[olt] = [...map[olt]].sort();
    }
    return sorted;
  }, [onts, oltFilter]);

  const totalPortCount = useMemo(() => {
    if (!portsByOlt) return 0;
    return Object.values(portsByOlt).reduce((s, arr) => s + arr.length, 0);
  }, [portsByOlt]);

  return (
    <Card className="border-0 shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Serial, ONT ID, or Port..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
              </SelectContent>
            </Select>
            <Select value={oltFilter} onValueChange={(v) => { setOltFilter(v); setPortFilter('all'); }}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="OLT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OLTs</SelectItem>
                {Object.keys(olts).sort().map(olt => (
                  <SelectItem key={olt} value={olt}>{olt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={portFilter} onValueChange={setPortFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Port" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">All Ports</SelectItem>
                {/* Single OLT selected — flat list */}
                {oltFilter !== 'all' && olts[oltFilter] &&
                  Object.keys(olts[oltFilter].ports).sort().map(port => (
                    <SelectItem key={port} value={port}>{port}</SelectItem>
                  ))
                }
                {/* All OLTs — group by OLT when > 20 ports */}
                {oltFilter === 'all' && portsByOlt && totalPortCount > 20 &&
                  Object.entries(portsByOlt).map(([olt, ports]) => (
                    <SelectGroup key={olt}>
                      <SelectLabel className="text-xs font-semibold text-blue-600 px-2">{olt}</SelectLabel>
                      {ports.map(port => (
                        <SelectItem key={`${olt}|${port}`} value={port}>{port}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                }
                {/* All OLTs — flat list when <= 20 ports */}
                {oltFilter === 'all' && totalPortCount <= 20 &&
                  [...new Set(onts.map(o => o._port))].sort().map(port => (
                    <SelectItem key={port} value={port}>{port}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={powerRangeFilter} onValueChange={setPowerRangeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Power Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Power Levels</SelectItem>
                <SelectItem value="critical">Critical (&lt; -27 dBm)</SelectItem>
                <SelectItem value="warning">Warning (-27 to -25)</SelectItem>
                <SelectItem value="optimal">Optimal (-25 to -15)</SelectItem>
                <SelectItem value="high">High (&gt; -15 dBm)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Sorting</SelectItem>
                <SelectItem value="rx-asc">Rx Power (Low to High)</SelectItem>
                <SelectItem value="rx-desc">Rx Power (High to Low)</SelectItem>
                <SelectItem value="errors-desc">Errors (High to Low)</SelectItem>
                <SelectItem value="serial">Serial Number</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onClearAll}>
              Clear All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}