import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Navigation, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Dialog that lets the user pick which ONTs (within a single LCP) should be
 * displayed and geocoded on the drilldown map. ONTs are grouped by splitter
 * so the operator can quickly toggle whole splitters at once.
 *
 * Props:
 *   open: boolean
 *   onOpenChange: (open: boolean) => void
 *   lcpNumber: string
 *   records: Array<{ id, serial_number, splitter_number, subscriber_account_name,
 *                    subscriber_address, _subscriber?, gps_lat, gps_lng, status }>
 *   selectedIds: Set<string> | string[]
 *   onApply: (nextSelectedIds: Set<string>) => void
 */
export default function ONTSelectionDialog({
  open,
  onOpenChange,
  lcpNumber,
  records = [],
  selectedIds,
  onApply,
}) {
  // Local draft selection — only committed when the user clicks Apply.
  // We accept either a Set or an array on the way in to keep the parent flexible.
  const initialSet = useMemo(
    () => (selectedIds instanceof Set ? new Set(selectedIds) : new Set(selectedIds || [])),
    [selectedIds]
  );
  const [draft, setDraft] = useState(initialSet);
  const [search, setSearch] = useState('');

  // Re-sync the draft whenever the dialog opens or the parent selection changes.
  // This prevents stale local state if the user reopens the dialog after geocoding.
  useEffect(() => {
    if (open) setDraft(new Set(initialSet));
  }, [open, initialSet]);

  // Group ONTs by splitter for a more useful UI than a flat list.
  const grouped = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySplitter = new Map();
    for (const r of records) {
      const name = (r.subscriber_account_name || r._subscriber?.name || '').toLowerCase();
      const acct = (r._subscriber?.account || '').toLowerCase();
      const addr = (r.subscriber_address || r._subscriber?.address || '').toLowerCase();
      const serial = (r.serial_number || r.SerialNumber || '').toLowerCase();
      if (term && !name.includes(term) && !acct.includes(term) && !addr.includes(term) && !serial.includes(term)) {
        continue;
      }
      const spl = r.splitter_number || r._splitterNumber || 'Unknown';
      if (!bySplitter.has(spl)) bySplitter.set(spl, []);
      bySplitter.get(spl).push(r);
    }
    // Sort splitters numerically/lexically; sort ONTs within each splitter by ONT ID.
    return [...bySplitter.entries()]
      .sort(([a], [b]) => String(a).localeCompare(String(b), undefined, { numeric: true }))
      .map(([splitter, items]) => ({
        splitter,
        items: items.sort((a, b) =>
          String(a.ont_id || a.OntID || '').localeCompare(String(b.ont_id || b.OntID || ''), undefined, { numeric: true })
        ),
      }));
  }, [records, search]);

  const visibleIds = useMemo(() => {
    const ids = [];
    for (const g of grouped) for (const r of g.items) if (r.id) ids.push(r.id);
    return ids;
  }, [grouped]);

  const toggleOne = useCallback((id) => {
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSplitter = useCallback((splitterItems) => {
    const ids = splitterItems.map(r => r.id).filter(Boolean);
    setDraft(prev => {
      const next = new Set(prev);
      const allOn = ids.every(id => next.has(id));
      if (allOn) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setDraft(prev => {
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  }, [visibleIds]);

  const clearAllVisible = useCallback(() => {
    setDraft(prev => {
      const next = new Set(prev);
      visibleIds.forEach(id => next.delete(id));
      return next;
    });
  }, [visibleIds]);

  const selectOnlyUngeocoded = useCallback(() => {
    setDraft(() => {
      const next = new Set();
      for (const r of records) {
        if (!r.id) continue;
        const hasCoords = r.gps_lat && r.gps_lng;
        const hasAddress = (r.subscriber_address || r._subscriber?.address || '').trim().length >= 5;
        if (!hasCoords && hasAddress) next.add(r.id);
      }
      return next;
    });
  }, [records]);

  const totalSelected = draft.size;
  const totalRecords = records.filter(r => r.id).length;

  const statusColor = (s) => ({
    ok: 'bg-green-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    offline: 'bg-gray-500',
  }[s] || 'bg-gray-400');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Select ONTs to plot — {lcpNumber}
          </DialogTitle>
          <DialogDescription>
            Pick which ONTs to display on the map. Selected ONTs without coordinates
            will be geocoded from their subscriber address (street, city, zip).
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subscriber, address, serial…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={selectAllVisible}>Select all</Button>
          <Button size="sm" variant="outline" onClick={clearAllVisible}>Clear</Button>
          <Button size="sm" variant="outline" onClick={selectOnlyUngeocoded} title="Pick only ONTs that have an address but no coordinates yet">
            <Navigation className="h-3.5 w-3.5 mr-1" />
            Needs geocoding
          </Button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {grouped.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">
              No ONTs match the search.
            </div>
          )}

          {grouped.map(({ splitter, items }) => {
            const ids = items.map(r => r.id).filter(Boolean);
            const checkedCount = ids.filter(id => draft.has(id)).length;
            const allOn = ids.length > 0 && checkedCount === ids.length;
            const someOn = checkedCount > 0 && !allOn;
            return (
              <div key={splitter} className="border rounded-lg">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b rounded-t-lg">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                    <Checkbox
                      checked={allOn ? true : someOn ? 'indeterminate' : false}
                      onCheckedChange={() => toggleSplitter(items)}
                    />
                    Splitter {splitter}
                    <Badge variant="outline" className="text-[10px]">{checkedCount}/{ids.length}</Badge>
                  </label>
                </div>

                <div className="divide-y">
                  {items.map((r) => {
                    const id = r.id;
                    if (!id) return null; // Defensive — shouldn't happen for DB records
                    const checked = draft.has(id);
                    const name = r.subscriber_account_name || r._subscriber?.name || r._subscriber?.account;
                    const address = r.subscriber_address || r._subscriber?.address || '';
                    const city = r._subscriber?.city || '';
                    const zip = r._subscriber?.zip || '';
                    const fullAddress = [address, city, zip].filter(Boolean).join(', ');
                    const hasCoords = !!(r.gps_lat && r.gps_lng);
                    const status = r.status || r._analysis?.status || 'ok';
                    return (
                      <label key={id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleOne(id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`inline-block w-2 h-2 rounded-full ${statusColor(status)}`} />
                            <span className="font-medium truncate">
                              {name || r.serial_number || 'Unknown'}
                            </span>
                            <span className="font-mono text-gray-400">
                              ONT {r.ont_id || r.OntID || '—'}
                            </span>
                          </div>
                          {fullAddress && (
                            <div className="text-[11px] text-gray-500 truncate mt-0.5">
                              {fullAddress}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasCoords ? (
                            <Badge variant="outline" className="text-[10px] text-green-700 border-green-300 bg-green-50">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />
                              GPS
                            </Badge>
                          ) : fullAddress ? (
                            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                              <Navigation className="h-3 w-3 mr-0.5" />
                              Geocodable
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-gray-500">
                              <AlertTriangle className="h-3 w-3 mr-0.5" />
                              No address
                            </Badge>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex-1 text-xs text-gray-500">
            {totalSelected} of {totalRecords} ONTs selected
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onApply(new Set(draft));
              onOpenChange(false);
            }}
          >
            Apply selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}