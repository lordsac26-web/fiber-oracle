/**
 * VirtualizedONTTable — lightweight windowed rendering for ONT table rows.
 *
 * Instead of rendering all ONT rows at once (which can be 64+ per port and
 * 5000+ when all ports are expanded), this component only renders rows that
 * are within or near the visible viewport. Uses a simple scroll-position
 * approach with no external dependencies (react-window is not installed).
 *
 * Approach: We render the full <table> skeleton but only materialize actual
 * <ONTTableRow> components for rows inside a ±overscan window. Offscreen
 * rows are replaced with a spacer <tr> of the correct height to maintain
 * scroll position and table geometry.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ONTTableRow from './ONTTableRow';

const ROW_HEIGHT = 32; // approximate px height of a compact ONT row
const OVERSCAN = 10;   // extra rows to render above/below viewport

export default function VirtualizedONTTable({
  portOnts,
  hideOntStatus,
  subscriberMatchCount,
  eeroRecordsLoaded,
  onSelectDetail,
  selectable = false,
  selectedSerials,
  onToggleSelect,
  onToggleSelectMany,
  onFlag,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Filter ONTs by hidden status checkboxes
  const visibleOnts = React.useMemo(
    () => portOnts.filter(ont => !hideOntStatus[ont._analysis.status]),
    [portOnts, hideOntStatus]
  );

  const totalRows = visibleOnts.length;
  const totalHeight = totalRows * ROW_HEIGHT;

  // For small datasets (≤60), skip virtualization overhead entirely
  const skipVirtualization = totalRows <= 60;

  const handleScroll = useCallback((e) => {
    if (!skipVirtualization) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [skipVirtualization]);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || 400);
    }
  }, []);

  // Compute visible window
  const startIdx = skipVirtualization ? 0 : Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = skipVirtualization ? totalRows : Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);

  const topPad = startIdx * ROW_HEIGHT;
  const bottomPad = (totalRows - endIdx) * ROW_HEIGHT;

  // Header checkbox reflects whether all currently-visible rows are selected.
  const allVisibleSelected = selectable && visibleOnts.length > 0 &&
    visibleOnts.every(o => selectedSerials?.has(o.SerialNumber));

  const tableHeaders = (
    <TableHeader>
      <TableRow>
        {selectable && (
          <TableHead className="px-1 py-1 w-8">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => onToggleSelectMany?.(visibleOnts)}
              className="rounded border-gray-300 cursor-pointer"
              aria-label="Select all visible ONTs"
            />
          </TableHead>
        )}
        <TableHead className="px-1.5 py-1 text-[10px] w-8">St</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px]">ID</TableHead>
        {subscriberMatchCount > 0 && <TableHead className="px-1.5 py-1 text-[10px]">Subscriber</TableHead>}
        <TableHead className="px-1.5 py-1 text-[10px]">LCP/Spl</TableHead>
        {eeroRecordsLoaded && <TableHead className="px-1.5 py-1 text-[10px] text-center">eero</TableHead>}
        <TableHead className="px-1.5 py-1 text-[10px]">Serial</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px]">Model</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">ONT Rx</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">OLT Rx</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">US BIP</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">DS BIP</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">US FEC U</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">DS FEC U</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">US FEC C</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">DS FEC C</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">HEC</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px] text-right">MBurst</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px]">Up</TableHead>
        <TableHead className="px-1.5 py-1 text-[10px]">Issues</TableHead>
        <TableHead className="px-1 py-1 w-16"></TableHead>
      </TableRow>
    </TableHeader>
  );

  // Determine the column count for spacer rows
  let colCount = 18; // base columns
  if (subscriberMatchCount > 0) colCount++;
  if (eeroRecordsLoaded) colCount++;
  if (selectable) colCount++;

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto max-h-[600px] overflow-y-auto"
      onScroll={handleScroll}
    >
      <Table>
        {tableHeaders}
        <TableBody>
          {/* Top spacer */}
          {topPad > 0 && (
            <tr style={{ height: topPad }}>
              <td colSpan={colCount} />
            </tr>
          )}
          {/* Visible rows */}
          {visibleOnts.slice(startIdx, endIdx).map((ont, idx) => (
            <ONTTableRow
              key={ont.SerialNumber || `${ont._oltName}-${ont._port}-${ont.OntID}-${startIdx + idx}`}
              ont={ont}
              hasSubscriberData={subscriberMatchCount > 0}
              hasEeroData={eeroRecordsLoaded}
              onSelectDetail={onSelectDetail}
              selectable={selectable}
              isSelected={selectedSerials?.has(ont.SerialNumber)}
              onToggleSelect={onToggleSelect}
              onFlag={onFlag}
            />
          ))}
          {/* Bottom spacer */}
          {bottomPad > 0 && (
            <tr style={{ height: bottomPad }}>
              <td colSpan={colCount} />
            </tr>
          )}
        </TableBody>
      </Table>
    </div>
  );
}