import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Parses the Shelf/Slot/Port string (e.g. "1/2/3", "0/1/xp4") and returns the shelf number.
 */
function extractShelf(shelfSlotPort) {
  if (!shelfSlotPort) return null;
  const parts = shelfSlotPort.split('/');
  return parts.length >= 1 ? parts[0] : null;
}

function matchesTech(ont, tech) {
  if (tech === 'All') return true;
  if (tech === 'GPON') return ont._techType?.includes('GPON') ?? false;
  if (tech === 'XGS-PON') return ont._techType?.includes('XGS') ?? false;
  return true;
}

/**
 * Groups ONTs by "OLT | Shelf" key and computes health counts per group.
 * Returns sorted array of { key, oltName, shelf, crit, warn, healthy, offline, total }
 */
function buildShelfGroups(onts, techFilter) {
  const map = new Map();

  for (const ont of onts) {
    if (!matchesTech(ont, techFilter)) continue;

    const oltName = ont._oltName || ont.OLTName || 'Unknown';
    const shelf = extractShelf(ont['Shelf/Slot/Port'] || ont._port || '');
    const key = `${oltName}|${shelf ?? '?'}`;

    if (!map.has(key)) {
      map.set(key, { key, oltName, shelf: shelf ?? '?', crit: 0, warn: 0, healthy: 0, offline: 0, total: 0 });
    }

    const g = map.get(key);
    const status = ont._analysis?.status;
    g.total++;
    if (status === 'critical') g.crit++;
    else if (status === 'warning') g.warn++;
    else if (status === 'offline') g.offline++;
    else g.healthy++;
  }

  // Sort: OLT name then shelf numerically
  return [...map.values()].sort((a, b) => {
    const oltCmp = a.oltName.localeCompare(b.oltName, undefined, { numeric: true });
    if (oltCmp !== 0) return oltCmp;
    return String(a.shelf).localeCompare(String(b.shelf), undefined, { numeric: true });
  });
}

function HealthBar({ crit, warn, healthy, offline, total }) {
  if (total === 0) return null;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden w-full bg-gray-200 dark:bg-gray-700 mt-1">
      {healthy > 0 && <div className="bg-green-500" style={{ width: `${(healthy / total) * 100}%` }} />}
      {warn    > 0 && <div className="bg-amber-400" style={{ width: `${(warn    / total) * 100}%` }} />}
      {crit    > 0 && <div className="bg-red-500"   style={{ width: `${(crit    / total) * 100}%` }} />}
      {offline > 0 && <div className="bg-purple-400" style={{ width: `${(offline / total) * 100}%` }} />}
    </div>
  );
}

export default function ShelfHealthPanel({ filteredOnts, techFilter }) {
  const groups = useMemo(
    () => buildShelfGroups(filteredOnts || [], techFilter),
    [filteredOnts, techFilter]
  );

  const label = techFilter !== 'All' ? ` — ${techFilter}` : '';

  return (
    <Card className="border-0 shadow">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-sm">
          Network Health Profile{label}
        </CardTitle>
        <p className="text-[10px] text-gray-400">Per OLT shelf — Crit · Warn · Healthy · Offline</p>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Fixed-height scrollable frame */}
        <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
          {groups.length === 0 && (
            <p className="text-[11px] text-gray-400 text-center py-4">No ONT data available</p>
          )}
          <div className="space-y-1">
            {groups.map(g => {
              const hasCrit = g.crit > 0;
              const hasWarn = g.warn > 0 && !hasCrit;
              const allGood = g.crit === 0 && g.warn === 0;
              return (
                <div
                  key={g.key}
                  className={`rounded px-2 py-1.5 border text-[11px] ${
                    hasCrit
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : hasWarn
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Header row: label + total */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[60%]">
                      {g.oltName} · Shelf {g.shelf}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{g.total} ONTs</span>
                  </div>

                  {/* Counts row */}
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${g.crit > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                      {g.crit} crit
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className={`font-mono font-bold ${g.warn > 0 ? 'text-amber-500' : 'text-gray-300'}`}>
                      {g.warn} warn
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className={`font-mono font-bold ${g.healthy > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                      {g.healthy} ok
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className={`font-mono font-bold ${g.offline > 0 ? 'text-purple-500' : 'text-gray-300'}`}>
                      {g.offline} off
                    </span>
                  </div>

                  {/* Mini stacked health bar */}
                  <HealthBar {...g} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t text-[9px] text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Critical</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Warning</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Healthy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Offline</span>
        </div>
      </CardContent>
    </Card>
  );
}