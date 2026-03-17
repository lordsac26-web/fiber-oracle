import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from 'lucide-react';
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
  onStatusToggle,
}) {
  return (
    <div className="absolute top-4 left-4 right-4 z-[500] pointer-events-none">
      <Card className="pointer-events-auto border border-white/70 bg-white/95 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by LCP, splitter, location, or OLT..."
                className="h-10 pl-10"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {latestReport ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Latest completed PON PM: {latestReport.report_name}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                  No PON PM report loaded
                </Badge>
              )}
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {networkStatusTotals.critical} critical ONTs
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {networkStatusTotals.warning} warning ONTs
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                {networkStatusTotals.offline} offline ONTs
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {networkStatusTotals.ok} healthy ONTs
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Show LCP Pins By Status
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                    <span className="text-xs font-medium">{count} LCPs</span>
                  </label>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}