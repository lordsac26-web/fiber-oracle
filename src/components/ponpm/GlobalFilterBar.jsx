import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, ChevronDown, X, Search, Cable, Router, Cpu } from 'lucide-react';

/**
 * GlobalFilterBar — page-level multi-select filters that flow into the main
 * filteredOnts memo on the PON PM Analysis page. Each filter is independent;
 * empty arrays mean "no restriction".
 *
 * Props:
 *   onts              — full ONT array from the loaded report
 *   selectedSplitters — string[] of selected "LCP/Splitter" composite keys
 *   selectedOltPorts  — string[] of selected "OLT|Port" composite keys
 *   selectedModels    — string[] of selected ONT model strings
 *   on*Change         — setters for each
 */
export default function GlobalFilterBar({
  onts = [],
  selectedSplitters = [],
  selectedOltPorts = [],
  selectedModels = [],
  onSplittersChange,
  onOltPortsChange,
  onModelsChange,
}) {
  // Derive option lists once per ONT array. Each option carries a count so
  // users can see how many ONTs match — useful when picking sparse splitters.
  const { splitterOptions, oltPortOptions, modelOptions } = useMemo(() => {
    const splitters = new Map();
    const oltPorts = new Map();
    const models = new Map();

    for (const ont of onts) {
      // Splitter key = "LCP/Splitter" — only include ONTs we actually resolved
      if (ont._lcpNumber) {
        const key = ont._splitterNumber
          ? `${ont._lcpNumber} / ${ont._splitterNumber}`
          : ont._lcpNumber;
        splitters.set(key, (splitters.get(key) || 0) + 1);
      }

      // OLT|Port composite — pipe separator avoids collisions with port slashes
      if (ont._oltName && ont._port) {
        const key = `${ont._oltName}|${ont._port}`;
        oltPorts.set(key, (oltPorts.get(key) || 0) + 1);
      }

      // Model — prefer subscriber ONTModel (ground-truth from subscriber CSV upload),
      // fall back to OLT-reported model so the filter is never empty.
      const model = ont._subscriber?.model || ont._subscriberModel || ont.subscriber_model || ont.model;
      if (model) {
        models.set(model, (models.get(model) || 0) + 1);
      }
    }

    const sortByLabel = (a, b) => a.value.localeCompare(b.value, undefined, { numeric: true });
    const toArr = (m) => [...m.entries()].map(([value, count]) => ({ value, count })).sort(sortByLabel);

    return {
      splitterOptions: toArr(splitters),
      oltPortOptions: toArr(oltPorts),
      modelOptions: toArr(models),
    };
  }, [onts]);

  const totalActive = selectedSplitters.length + selectedOltPorts.length + selectedModels.length;

  const clearAll = () => {
    onSplittersChange([]);
    onOltPortsChange([]);
    onModelsChange([]);
  };

  return (
    <Card className="border-0 shadow">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 mr-1">
            <Filter className="h-3.5 w-3.5 text-blue-500" />
            Global Filters
            {totalActive > 0 && (
              <Badge className="ml-1 bg-blue-100 text-blue-800 border-blue-300 text-[10px] px-1.5">
                {totalActive} active
              </Badge>
            )}
          </div>

          <FilterPopover
            label="Splitter"
            icon={<Cable className="h-3.5 w-3.5" />}
            options={splitterOptions}
            selected={selectedSplitters}
            onChange={onSplittersChange}
            emptyText="No splitters resolved. Run LCP enrichment."
            displayLabel={(v) => v}
          />

          <FilterPopover
            label="OLT Port"
            icon={<Router className="h-3.5 w-3.5" />}
            options={oltPortOptions}
            selected={selectedOltPorts}
            onChange={onOltPortsChange}
            emptyText="No OLT ports found."
            displayLabel={(v) => v.replace('|', ' / ')}
          />

          <FilterPopover
            label="ONT Model"
            icon={<Cpu className="h-3.5 w-3.5" />}
            options={modelOptions}
            selected={selectedModels}
            onChange={onModelsChange}
            emptyText="No ONT models reported."
            displayLabel={(v) => v}
          />

          {totalActive > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs ml-auto">
              <X className="h-3 w-3 mr-1" /> Clear all
            </Button>
          )}
        </div>

        {/* Active filter chips — tap to remove individually */}
        {totalActive > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {selectedSplitters.map((v) => (
              <Chip key={`s-${v}`} label={v} color="indigo" onRemove={() =>
                onSplittersChange(selectedSplitters.filter((x) => x !== v))} />
            ))}
            {selectedOltPorts.map((v) => (
              <Chip key={`p-${v}`} label={v.replace('|', ' / ')} color="blue" onRemove={() =>
                onOltPortsChange(selectedOltPorts.filter((x) => x !== v))} />
            ))}
            {selectedModels.map((v) => (
              <Chip key={`m-${v}`} label={v} color="purple" onRemove={() =>
                onModelsChange(selectedModels.filter((x) => x !== v))} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Internal pieces (kept in-file since they aren't reused elsewhere) ---

function FilterPopover({ label, icon, options, selected, onChange, emptyText, displayLabel }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [options, search]);

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 text-xs ${selected.length > 0 ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
          {icon}
          <span className="ml-1">{label}</span>
          {selected.length > 0 && (
            <Badge className="ml-1.5 bg-blue-600 text-white border-0 text-[10px] px-1.5 h-4">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
            <span>{filtered.length} of {options.length}</span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-blue-600 hover:underline"
              >
                Clear ({selected.length})
              </button>
            )}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              {options.length === 0 ? emptyText : 'No matches'}
            </div>
          ) : (
            filtered.map((opt) => {
              const isChecked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggle(opt.value)} />
                  <span className="flex-1 truncate font-mono">{displayLabel(opt.value)}</span>
                  <span className="text-[10px] text-gray-400 tabular-nums">{opt.count}</span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Chip({ label, color, onRemove }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${colors[color]}`}>
      {label}
      <button type="button" onClick={onRemove} className="hover:bg-black/10 rounded-full p-0.5" aria-label={`Remove ${label}`}>
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}