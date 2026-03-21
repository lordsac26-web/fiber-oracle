import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: 'critical', label: 'Critical', tone: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'warning', label: 'Warning', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'offline', label: 'Offline', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'ok', label: 'Healthy', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export default function LCPMapFilters({
  searchTerm,
  onSearchChange,
  latestReport,
  networkStatusTotals,
  groupStatusCounts,
  selectedStatuses,
  selectedOlt,
  onOltChange,
  availableOlts,
  performanceFilter,
  onPerformanceFilterChange,
  onStatusToggle,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-[500] pointer-events-none w-[min(420px,calc(100vw-2rem))]">
      <Card className="pointer-events-auto border border-white/70 bg-white/95 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              {latestReport ? (
                <Badge variant="outline" className="max-w-full bg-blue-50 text-blue-700 border-blue-200 truncate">
                  Latest completed PON PM: {latestReport.report_name}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                  No PON PM report loaded
                </Badge>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Badge variant="outline" className="justify-center bg-red-50 text-red-700 border-red-200">
                  {networkStatusTotals.critical} critical
                </Badge>
                <Badge variant="outline" className="justify-center bg-amber-50 text-amber-700 border-amber-200">
                  {networkStatusTotals.warning} warning
                </Badge>
                <Badge variant="outline" className="justify-center bg-slate-100 text-slate-700 border-slate-200">
                  {networkStatusTotals.offline} offline
                </Badge>
                <Badge variant="outline" className="justify-center bg-emerald-50 text-emerald-700 border-emerald-200">
                  {networkStatusTotals.ok} healthy
                </Badge>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setIsCollapsed((value) => !value)}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
              {isCollapsed ? 'Show' : 'Hide'}
            </Button>
          </div>

          {!isCollapsed && (
            <>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by LCP, splitter, location, or OLT..."
                    className="h-9 pl-10"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={selectedOlt} onValueChange={onOltChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Filter by OLT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All OLTs</SelectItem>
                      {availableOlts.map((olt) => (
                        <SelectItem key={olt} value={olt}>{olt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={performanceFilter} onValueChange={onPerformanceFilterChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Recent performance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Performance</SelectItem>
                      <SelectItem value="impacted">Any Issues</SelectItem>
                      <SelectItem value="low_power">Low Power</SelectItem>
                      <SelectItem value="healthy">Healthy Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Show LCP Pins By Status
                </div>
                <div className="grid gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const checked = selectedStatuses.includes(option.value);
                    const count = groupStatusCounts[option.value] || 0;

                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors cursor-pointer",
                          checked ? option.tone : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={checked} onCheckedChange={() => onStatusToggle(option.value)} />
                          <span>{option.label}</span>
                        </div>
                        <span className="text-xs font-medium">{count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}