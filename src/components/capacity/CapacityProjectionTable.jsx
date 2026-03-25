import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

const SPLITTER_CAPACITY = 32;

const URGENCY_BADGE = {
  full: 'bg-red-600 text-white',
  critical: 'bg-orange-500 text-white',
  warning: 'bg-amber-400 text-amber-900',
  low: 'bg-green-100 text-green-800',
};

const URGENCY_LABEL = {
  full: 'At Capacity',
  critical: 'Critical',
  warning: 'Warning',
  low: 'OK',
};

export default function CapacityProjectionTable({ rows, hasMultipleReports }) {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortField) return rows;
    return [...rows].sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      // Handle nulls
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      if (av instanceof Date) { av = av.getTime(); bv = bv?.getTime?.() ?? 0; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, sortField, sortDir]);

  const SortHeader = ({ field, children, className = '' }) => (
    <TableHead
      className={`cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-gray-400" />
        )}
      </div>
    </TableHead>
  );

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <SortHeader field="urgency">Status</SortHeader>
              <SortHeader field="lcp">LCP/CLCP</SortHeader>
              <SortHeader field="splitter">Splitter</SortHeader>
              <SortHeader field="location">Location</SortHeader>
              <SortHeader field="oltName">OLT</SortHeader>
              <SortHeader field="latestCount" className="text-right">Current ONTs</SortHeader>
              <SortHeader field="remaining" className="text-right">Remaining</SortHeader>
              {hasMultipleReports && (
                <>
                  <SortHeader field="growthPerMonth" className="text-right">Growth/mo</SortHeader>
                  <SortHeader field="daysToFull" className="text-right">Days to Full</SortHeader>
                  <TableHead>Projected Full Date</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasMultipleReports ? 10 : 7} className="text-center py-8 text-gray-500">
                  No matching splitters found
                </TableCell>
              </TableRow>
            ) : sorted.map(row => {
              const pct = (row.latestCount / SPLITTER_CAPACITY) * 100;
              return (
                <TableRow key={row.key} className={
                  row.urgency === 'full' ? 'bg-red-50 dark:bg-red-900/10' :
                  row.urgency === 'critical' ? 'bg-orange-50 dark:bg-orange-900/10' :
                  row.urgency === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                }>
                  <TableCell>
                    <Badge className={URGENCY_BADGE[row.urgency]}>
                      {URGENCY_LABEL[row.urgency]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-indigo-600">{row.lcp}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.splitter || '-'}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm">{row.location || '-'}</TableCell>
                  <TableCell className="text-sm">{row.oltName || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-500' : pct >= 60 ? 'bg-amber-400' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm">{row.latestCount}/{SPLITTER_CAPACITY}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${
                    row.remaining === 0 ? 'text-red-600 font-bold' : row.remaining <= 5 ? 'text-amber-600' : ''
                  }`}>
                    {row.remaining}
                  </TableCell>
                  {hasMultipleReports && (
                    <>
                      <TableCell className={`text-right font-mono text-sm ${
                        row.growthPerMonth > 2 ? 'text-red-600' : row.growthPerMonth > 0.5 ? 'text-amber-600' : ''
                      }`}>
                        {row.growthPerMonth > 0 ? `+${row.growthPerMonth}` : row.growthPerMonth === 0 ? '0' : row.growthPerMonth}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${
                        row.daysToFull !== null && row.daysToFull <= 90 ? 'text-red-600 font-bold' :
                        row.daysToFull !== null && row.daysToFull <= 180 ? 'text-amber-600' : ''
                      }`}>
                        {row.daysToFull === 0 ? 'NOW' : row.daysToFull !== null ? row.daysToFull : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.projectedFullDate ? format(row.projectedFullDate, 'MMM d, yyyy') : '—'}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}