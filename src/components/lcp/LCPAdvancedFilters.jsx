import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function LCPAdvancedFilters({ 
  lcpEntries, filters, onFiltersChange, showAdvanced, onToggleAdvanced 
}) {
  // Derive unique values for dropdowns
  const filterOptions = useMemo(() => {
    const olts = new Set();
    const opticTypes = new Set();
    const opticModels = new Set();
    const opticMakes = new Set();

    lcpEntries.forEach(e => {
      if (e.olt_name) olts.add(e.olt_name);
      if (e.optic_type) opticTypes.add(e.optic_type);
      if (e.optic_model) opticModels.add(e.optic_model);
      if (e.optic_make) opticMakes.add(e.optic_make);
    });

    return {
      olts: [...olts].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      opticTypes: [...opticTypes].sort(),
      opticModels: [...opticModels].sort(),
      opticMakes: [...opticMakes].sort(),
    };
  }, [lcpEntries]);

  const activeFilterCount = [
    filters.oltName, filters.opticMake, filters.opticModel, filters.opticType, filters.hasGps
  ].filter(v => v && v !== 'all').length;

  const clearAll = () => {
    onFiltersChange({
      searchTerm: '', oltName: 'all', opticMake: 'all', opticModel: 'all',
      opticType: 'all', hasGps: 'all',
    });
  };

  return (
    <div className="space-y-3">
      {/* Primary search + toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search LCP, splitter, location, port..."
            className="pl-10 h-10"
            value={filters.searchTerm}
            onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          />
          {filters.searchTerm && (
            <button
              onClick={() => onFiltersChange({ ...filters, searchTerm: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant={showAdvanced ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleAdvanced}
          className="h-10 gap-1.5"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-white text-blue-700">
              {activeFilterCount}
            </Badge>
          )}
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Advanced filter row */}
      {showAdvanced && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500" onClick={clearAll}>
                <X className="h-3 w-3 mr-1" /> Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* OLT Name */}
            <Select value={filters.oltName} onValueChange={(v) => onFiltersChange({ ...filters, oltName: v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="OLT Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OLTs</SelectItem>
                {filterOptions.olts.map(olt => (
                  <SelectItem key={olt} value={olt}>{olt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Optic Make */}
            <Select value={filters.opticMake} onValueChange={(v) => onFiltersChange({ ...filters, opticMake: v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Optic Make" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Makes</SelectItem>
                {filterOptions.opticMakes.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Optic Model */}
            <Select value={filters.opticModel} onValueChange={(v) => onFiltersChange({ ...filters, opticModel: v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Optic Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {filterOptions.opticModels.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Optic Type */}
            <Select value={filters.opticType} onValueChange={(v) => onFiltersChange({ ...filters, opticType: v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Optic Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {filterOptions.opticTypes.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Has GPS */}
            <Select value={filters.hasGps} onValueChange={(v) => onFiltersChange({ ...filters, hasGps: v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="GPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any GPS</SelectItem>
                <SelectItem value="yes">Has GPS</SelectItem>
                <SelectItem value="no">No GPS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {filters.oltName !== 'all' && (
                <FilterPill label={`OLT: ${filters.oltName}`} onRemove={() => onFiltersChange({ ...filters, oltName: 'all' })} />
              )}
              {filters.opticMake !== 'all' && (
                <FilterPill label={`Make: ${filters.opticMake}`} onRemove={() => onFiltersChange({ ...filters, opticMake: 'all' })} />
              )}
              {filters.opticModel !== 'all' && (
                <FilterPill label={`Model: ${filters.opticModel}`} onRemove={() => onFiltersChange({ ...filters, opticModel: 'all' })} />
              )}
              {filters.opticType !== 'all' && (
                <FilterPill label={`Type: ${filters.opticType}`} onRemove={() => onFiltersChange({ ...filters, opticType: 'all' })} />
              )}
              {filters.hasGps !== 'all' && (
                <FilterPill label={`GPS: ${filters.hasGps === 'yes' ? 'Yes' : 'No'}`} onRemove={() => onFiltersChange({ ...filters, hasGps: 'all' })} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, onRemove }) {
  return (
    <Badge variant="outline" className="text-xs gap-1 pl-2 pr-1 py-0.5 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300">
      {label}
      <button onClick={onRemove} className="ml-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}