import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { cn } from "@/lib/utils";

const VIEW_OPTIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'issues', label: 'Impacted Only' },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'offline', label: 'Offline' },
  { value: 'ok', label: 'Healthy' },
];

export default function LCPMapFilters({
  searchTerm,
  onSearchChange,
  viewFilter,
  onViewFilterChange,
  severityFilter,
  onSeverityFilterChange,
  latestReport,
  issueTotals,
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
                  Latest PON PM: {latestReport.report_name}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                  No PON PM report loaded
                </Badge>
              )}
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {issueTotals.critical} critical
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {issueTotals.warning} warning
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                {issueTotals.offline} offline
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:w-28">
                Location View
              </span>
              <div className="flex flex-wrap gap-2">
                {VIEW_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={viewFilter === option.value ? 'default' : 'outline'}
                    className={cn(viewFilter === option.value && 'shadow-sm')}
                    onClick={() => onViewFilterChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:w-28">
                ONT Severity
              </span>
              <div className="flex flex-wrap gap-2">
                {SEVERITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={severityFilter === option.value ? 'default' : 'outline'}
                    className={cn(severityFilter === option.value && 'shadow-sm')}
                    onClick={() => onSeverityFilterChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}