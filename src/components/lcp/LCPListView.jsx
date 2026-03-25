import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Server, Edit2, Trash2 } from 'lucide-react';

export default function LCPListView({ 
  entries, selectedIds, selectionMode, latestOntCountsByKey,
  onToggleSelect, onEdit, onDelete, updatePending, deletePending 
}) {
  const getOntKey = (entry) => 
    `${(entry.lcp_number || '').trim().toUpperCase()}|${(entry.splitter_number || '').trim().toUpperCase()}`;

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const count = latestOntCountsByKey[getOntKey(entry)] || 0;
        const remaining = Math.max(0, 32 - count);
        return (
          <Card key={entry.id} className={`border-0 shadow-lg ${selectedIds.includes(entry.id) ? 'ring-2 ring-blue-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                {selectionMode && (
                  <input type="checkbox" checked={selectedIds.includes(entry.id)} onChange={() => onToggleSelect(entry.id)} className="h-5 w-5 rounded border-gray-300 mr-3 mt-1" />
                )}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="bg-indigo-600 text-lg px-3 py-1">{entry.lcp_number}</Badge>
                    <Badge variant="outline" className="font-mono">{entry.splitter_number}</Badge>
                    <Badge variant="outline" className="text-xs font-mono">{count} current ONTs</Badge>
                    <Badge variant="outline" className={`text-xs font-mono ${
                      remaining === 0 ? 'bg-red-50 text-red-700 border-red-300' :
                      remaining <= 5 ? 'bg-amber-50 text-amber-700 border-amber-300' : ''
                    }`}>
                      ~{remaining} remaining
                    </Badge>
                    {entry.gps_lat && entry.gps_lng && (
                      <Badge variant="outline" className="text-xs text-blue-600">📍 Has GPS</Badge>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {entry.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs text-gray-500">Physical Location</div>
                          <div className="text-sm">{entry.location}</div>
                          {entry.gps_lat && entry.gps_lng && (
                            <div className="text-xs text-blue-600 font-mono mt-0.5">{entry.gps_lat}, {entry.gps_lng}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {(entry.olt_name || entry.olt_shelf || entry.olt_slot || entry.olt_port) && (
                      <div className="flex items-start gap-2">
                        <Server className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">OLT Location</div>
                          {entry.olt_name && <div className="text-sm font-semibold truncate">{entry.olt_name}</div>}
                          <div className="text-sm font-mono text-gray-600">
                            Shelf {entry.olt_shelf || '-'} / Slot {entry.olt_slot || '-'} / Port {entry.olt_port || '-'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {(entry.optic_make || entry.optic_model || entry.optic_serial || entry.optic_type) && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Optic Info</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">
                          {[entry.optic_make, entry.optic_model].filter(Boolean).join(' ')}
                          {entry.optic_serial && <span className="text-gray-500 ml-2">S/N: {entry.optic_serial}</span>}
                        </span>
                        {entry.optic_type && (
                          <Badge className={
                            entry.optic_type === 'XGS-DD' ? 'bg-purple-600' :
                            entry.optic_type === 'XGS-COMBO' ? 'bg-emerald-600' :
                            entry.optic_type === 'XGS-COMBO-EXT' ? 'bg-amber-600' : 'bg-gray-500'
                          }>{entry.optic_type}</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {entry.notes && <div className="text-sm text-gray-500 italic">{entry.notes}</div>}
                </div>

                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(entry)} disabled={updatePending}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => onDelete(entry.id)} disabled={deletePending}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}