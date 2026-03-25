import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileText, MapPin, Info } from 'lucide-react';

export default function LCPImportDialog({
  open, onOpenChange, importPreview, importError, importWarnings,
  onFileUpload, onConfirmImport, onDownloadTemplate
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import LCP Entries</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Supported formats: CSV or TXT (comma, tab, or semicolon separated)</p>
                <p className="mt-2 font-medium">Column names:</p>
                <ul className="text-xs mt-1 space-y-0.5">
                  <li><strong>Type</strong> – LCP or CLCP (optional)</li>
                  <li><strong>LCP</strong> – LCP/CLCP number *</li>
                  <li><strong>Splitter</strong> – Splitter number *</li>
                  <li><strong>Location</strong> – Physical location</li>
                  <li><strong>Lat</strong> – GPS latitude (decimal or DMS)</li>
                  <li><strong>Long</strong> – GPS longitude (decimal or DMS)</li>
                  <li><strong>OLT</strong> – OLT name</li>
                  <li><strong>Shelf, Slot, Port</strong> – OLT location</li>
                  <li><strong>Optic-Make, Optic-Model, Optic-Serial, Notes</strong> – Optional</li>
                </ul>
                <p className="mt-1 text-xs text-blue-600">💡 Coordinates: decimal (40.7128) or DMS (42°28&apos;40.25&quot;N)</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <input type="file" accept=".csv,.txt" onChange={onFileUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload CSV or TXT file</p>
              <p className="text-xs text-gray-400 mt-1">For Excel files, save as CSV first</p>
            </label>
          </div>

          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
              {importError}
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Preview ({importPreview.length} entries)</span>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>LCP/CLCP</TableHead>
                      <TableHead>Splitter</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>OLT</TableHead>
                      <TableHead>Coordinates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.slice(0, 10).map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.entryType || (entry.lcpNumber?.toUpperCase().startsWith('CLCP') ? 'CLCP' : 'LCP')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.lcpNumber || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.splitterNumber || '-'}</TableCell>
                        <TableCell className="text-sm truncate max-w-[100px]">{entry.physicalLocation || '-'}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {entry.oltName ? (
                            <div>
                              <div>{entry.oltName}</div>
                              {(entry.oltShelf || entry.oltSlot || entry.oltPort) && (
                                <div className="text-gray-500">{entry.oltShelf || '-'}/{entry.oltSlot || '-'}/{entry.oltPort || '-'}</div>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.latitude && entry.longitude ? (
                            <div>
                              <div className="font-mono text-green-600">{entry.latitude}, {entry.longitude}</div>
                              {(entry._latOriginal || entry._lngOriginal) && 
                               (entry._latOriginal !== entry.latitude || entry._lngOriginal !== entry.longitude) && (
                                <div className="text-gray-400 text-[10px]">
                                  from: {entry._latOriginal}, {entry._lngOriginal}
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importPreview.length > 10 && (
                  <div className="text-center py-2 text-sm text-gray-500">
                    ... and {importPreview.length - 10} more
                  </div>
                )}
              </div>
              
              {importPreview.some(e => e._latOriginal || e._lngOriginal) && (
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  DMS coordinates (like 42°28&apos;40.25&quot;N) have been converted to decimal format
                </div>
              )}
              
              {importWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    <Info className="h-4 w-4" />
                    {importWarnings.length} row(s) had issues
                  </div>
                  <div className="max-h-24 overflow-y-auto text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    {importWarnings.slice(0, 5).map((w, i) => (
                      <div key={i}>Row {w.row}: {w.message}</div>
                    ))}
                    {importWarnings.length > 5 && (
                      <div className="text-amber-600">... and {importWarnings.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
                <Button onClick={onConfirmImport} className="flex-1">Import {importPreview.length} Entries</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}