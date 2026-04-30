import React, { useMemo, useState } from 'react';
import { useCalixNavigation } from '@/pages/CalixSmxSupport';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight } from 'lucide-react';

/**
 * CalixShelfMap
 * 
 * Interactive image map for Calix E7 shelf showing:
 * - 2 slots with XGS-PON line cards
 * - 8 ports per slot (xp1-2 through xp15-16)
 * - Clickable regions mapped to LCP/splitter combos
 * - Drill-down to port detail view
 */

export default function CalixShelfMap({ reportData, lcpEntries, oltName }) {
  const { navigate } = useCalixNavigation();
  const [hoveredPort, setHoveredPort] = useState(null);

  // Port layout: Slot 1 (top) and Slot 2 (bottom)
  // Each slot has 8 ports: xp1-2, xp3-4, xp5-6, xp7-8, xp9-10, xp11-12, xp13-14, xp15-16
  const PORT_LAYOUT = [
    { slot: 1, portPair: 'xp1-2', portKey: '1/1' },
    { slot: 1, portPair: 'xp3-4', portKey: '1/2' },
    { slot: 1, portPair: 'xp5-6', portKey: '1/3' },
    { slot: 1, portPair: 'xp7-8', portKey: '1/4' },
    { slot: 1, portPair: 'xp9-10', portKey: '1/5' },
    { slot: 1, portPair: 'xp11-12', portKey: '1/6' },
    { slot: 1, portPair: 'xp13-14', portKey: '1/7' },
    { slot: 1, portPair: 'xp15-16', portKey: '1/8' },
    { slot: 2, portPair: 'xp1-2', portKey: '2/1' },
    { slot: 2, portPair: 'xp3-4', portKey: '2/2' },
    { slot: 2, portPair: 'xp5-6', portKey: '2/3' },
    { slot: 2, portPair: 'xp7-8', portKey: '2/4' },
    { slot: 2, portPair: 'xp9-10', portKey: '2/5' },
    { slot: 2, portPair: 'xp11-12', portKey: '2/6' },
    { slot: 2, portPair: 'xp13-14', portKey: '2/7' },
    { slot: 2, portPair: 'xp15-16', portKey: '2/8' },
  ];

  // Build LCP lookup map: key = slot/port
  const lcpMap = useMemo(() => {
    const map = new Map();
    lcpEntries.forEach(entry => {
      const key = `${entry.olt_shelf}/${entry.olt_slot}/${entry.olt_port}`;
      map.set(key, entry);
    });
    return map;
  }, [lcpEntries]);

  // Get port data and LCP info
  const portStats = useMemo(() => {
    const stats = {};
    PORT_LAYOUT.forEach(({ portKey, slot }) => {
      const shelfKey = `1/${slot}/${portKey.split('/')[1]}`;
      const lcpEntry = lcpMap.get(shelfKey);
      const onts = reportData.onts.filter(
        ont => ont['Shelf/Slot/Port']?.includes(`${slot}/`) && ont['Shelf/Slot/Port'].endsWith(`/${portKey.split('/')[1]}`)
      );
      const status = onts.length === 0 ? 'empty' : 
                     onts.some(o => o._analysis?.status === 'critical') ? 'critical' :
                     onts.some(o => o._analysis?.status === 'warning') ? 'warning' :
                     onts.some(o => o._analysis?.status === 'offline') ? 'offline' : 'ok';

      stats[portKey] = {
        onts: onts.length,
        status,
        lcp: lcpEntry ? `LCP ${lcpEntry.lcp_number}` : 'N/A',
        splitter: lcpEntry ? `Splitter ${lcpEntry.splitter_number}` : '-',
        ontList: onts.slice(0, 3).map(o => o.SerialNumber).join(', '),
      };
    });
    return stats;
  }, [reportData, lcpMap]);

  // SVG hotspot regions — calculated based on image dimensions
  // Image appears to be ~800px wide, each port gets equal horizontal space
  const getSvgRegions = () => {
    const slotHeight = 120;
    const portWidth = 100 / 8; // 8 ports per slot, 100% width
    const regions = [];

    PORT_LAYOUT.forEach(({ slot, portKey }, idx) => {
      const slotRow = slot === 1 ? 0 : 1;
      const portIdx = idx % 8;
      const x = (portIdx * portWidth);
      const y = (slotRow * slotHeight);

      regions.push({
        portKey,
        x,
        y,
        width: portWidth,
        height: slotHeight,
      });
    });

    return regions;
  };

  const handlePortClick = (portKey) => {
    navigate({ view: 'port', oltName, portKey });
  };

  const regions = getSvgRegions();
  const statusColors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    offline: '#a855f7',
    ok: '#22c55e',
    empty: '#d1d5db',
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
        {/* Background image */}
        <img
          src="https://media.base44.com/images/public/6927bc307b96037b8506c608/a2d0f90b6_e72-xg1601-front.jpg"
          alt="Calix E7 Shelf"
          className="w-full h-auto block"
        />

        {/* Interactive SVG overlay */}
        <svg
          className="absolute inset-0 w-full h-full cursor-pointer"
          viewBox="0 0 800 240"
          preserveAspectRatio="none"
        >
          {regions.map(({ portKey, x, y, width, height }) => {
            const stats = portStats[portKey];
            const isHovered = hoveredPort === portKey;

            return (
              <TooltipProvider key={portKey}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <g
                      onClick={() => handlePortClick(portKey)}
                      onMouseEnter={() => setHoveredPort(portKey)}
                      onMouseLeave={() => setHoveredPort(null)}
                      className="group"
                    >
                      {/* Background rect with status color */}
                      <rect
                        x={`${x}%`}
                        y={`${y}`}
                        width={`${width}%`}
                        height={`${height}`}
                        fill={statusColors[stats.status]}
                        opacity={isHovered ? 0.4 : 0.2}
                        className="transition-opacity"
                      />

                      {/* Border on hover */}
                      {isHovered && (
                        <rect
                          x={`${x}%`}
                          y={`${y}`}
                          width={`${width}%`}
                          height={`${height}`}
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        />
                      )}

                      {/* Port label text */}
                      <text
                        x={`${x + width / 2}%`}
                        y={`${y + 30}`}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="white"
                        className="pointer-events-none select-none"
                      >
                        {portKey}
                      </text>

                      {/* ONT count badge */}
                      {stats.onts > 0 && (
                        <text
                          x={`${x + width / 2}%`}
                          y={`${y + 55}`}
                          textAnchor="middle"
                          fontSize="10"
                          fill="white"
                          className="pointer-events-none select-none"
                        >
                          {stats.onts} ONTs
                        </text>
                      )}
                    </g>
                  </TooltipTrigger>

                  <TooltipContent className="bg-slate-900 border-slate-700 text-white text-xs p-2">
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-1">
                        Port {portKey}
                        {stats.onts > 0 && <ChevronRight className="h-3 w-3" />}
                      </div>
                      <div className="text-slate-300">{stats.lcp} / {stats.splitter}</div>
                      <div className="text-slate-400">{stats.onts} ONTs</div>
                      {stats.ontList && <div className="text-slate-500 text-[10px]">{stats.ontList}</div>}
                      <div className={`text-[10px] font-medium mt-1 capitalize px-1.5 py-0.5 rounded bg-white/10 inline-block`}>
                        {stats.status === 'empty' ? 'No Data' : stats.status}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { status: 'critical', label: 'Critical' },
          { status: 'warning', label: 'Warning' },
          { status: 'offline', label: 'Offline' },
          { status: 'ok', label: 'Healthy' },
          { status: 'empty', label: 'No Data' },
        ].map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: statusColors[status] }} />
            <span className="text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}