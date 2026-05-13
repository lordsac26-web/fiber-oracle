import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Server } from 'lucide-react';

/**
 * Multi-OLT picker for the "OLT Data" CSV export.
 * Calls onExport(selectedOlts: string[]) when the user confirms.
 */
export default function MultiOltPickerDialog({ open, onOpenChange, oltNames = [], onExport }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');

  // Reset state whenever dialog reopens
  useEffect(() => {
    if (open) {
      setSelected([]);
      setSearch('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return oltNames;
    const term = search.toLowerCase();
    return oltNames.filter(o => o.toLowerCase().includes(term));
  }, [oltNames, search]);

  const toggle = (name) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const selectAllVisible = () => setSelected(filtered);
  const deselectAll = () => setSelected([]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-600" />
            Select OLTs to Export
          </DialogTitle>
          <DialogDescription>
            Choose one or more OLTs. ONTs are grouped per-OLT with section headers in the CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Filter OLTs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={selectAllVisible}>All</Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={deselectAll}>None</Button>
          </div>

          {selected.length > 0 && (
            <Badge variant="outline" className="text-xs">{selected.length} selected</Badge>
          )}

          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No OLTs match filter</div>
            ) : (
              filtered.map(olt => (
                <label
                  key={olt}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.includes(olt)}
                    onCheckedChange={() => toggle(olt)}
                  />
                  <span className="text-sm font-medium flex-1">{olt}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onExport(selected)} disabled={selected.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}