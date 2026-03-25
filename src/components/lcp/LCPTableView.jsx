import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit2, Trash2 } from 'lucide-react';

export default function LCPTableView({ 
  entries, selectedIds, selectionMode, latestOntCountsByKey,
  onToggleSelect, onEdit, onDelete, sortBy, sortOrder, onColumnSort 
}) {
  const getOntKey = (entry) => 
    `${(entry.lcp_number || '').trim().toUpperCase()}|${(entry.splitter_number || '').trim().toUpperCase()}`;

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              {selectionMode && <TableHead className="w-10"></TableHead>}
              <TableHead className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => onColumnSort('lcp_number')}>
                <span className="inline-flex items-center gap-1">LCP/CLCP {sortBy === 'lcp_number' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => onColumnSort('splitter_number')}>
                <span className="inline-flex items-center gap-1">Splitter {sortBy === 'splitter_number' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => onColumnSort('location')}>
                <span className="inline-flex items-center gap-1">Location {sortBy === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => onColumnSort('olt')}>
                <span className="inline-flex items-center gap-1">OLT (Shelf/Slot/Port) {sortBy === 'olt' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => onColumnSort('ont_count')}>
                <span className="inline-flex items-center gap-1">Current ONTs {sortBy === 'ont_count' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
              </TableHead>
              <TableHead>Remaining Ports</TableHead>
              <TableHead>GPS</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const count = latestOntCountsByKey[getOntKey(entry)] || 0;
              const remaining = Math.max(0, 32 - count);
              return (
                <TableRow key={entry.id} className={selectedIds.includes(entry.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                  {selectionMode && (
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => onToggleSelect(entry.id)} className="h-4 w-4 rounded border-gray-300" />
                    </TableCell>
                  )}
                  <TableCell><Badge className="bg-indigo-600">{entry.lcp_number}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{entry.splitter_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{entry.location || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[200px]">
                    {entry.olt_name || entry.olt_shelf || entry.olt_slot || entry.olt_port ? (
                      <div>
                        {entry.olt_name && <div className="font-semibold truncate">{entry.olt_name}</div>}
                        <div className="font-mono text-xs text-gray-500">{entry.olt_shelf || '-'}/{entry.olt_slot || '-'}/{entry.olt_port || '-'}</div>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">{count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs font-mono ${
                      remaining === 0 ? 'bg-red-50 text-red-700 border-red-300' :
                      remaining <= 5 ? 'bg-amber-50 text-amber-700 border-amber-300' :
                      'text-gray-600'
                    }`}>
                      ~{remaining} / 32
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.gps_lat && entry.gps_lng ? (
                      <Badge variant="outline" className="text-xs">📍</Badge>
                    ) : <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(entry)}><Edit2 className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete(entry.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}