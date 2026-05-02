import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Info, Loader2, CheckCircle2, AlertTriangle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { validateCsvFile, downloadCsvTemplate, OPTIC_INVENTORY_CSV_SPEC } from '@/lib/csvValidator';

const OPTIC_TYPE_MAP = {
  '100-05730': 'XGS-DD',
  '100-05674': 'XGS-COMBO',
  '100-05929': 'XGS-COMBO-EXT',
};

function getOpticType(model) {
  if (!model) return '';
  const trimmed = model.trim();
  return OPTIC_TYPE_MAP[trimmed] || '';
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizePort(port) {
  if (!port) return '';

  return port
    .toString()
    .trim()
    .toLowerCase()
    .split('/')
    .pop()
    .replace(/^xp/i, '')
    .replace(/^0+/, '') || '0';
}

function matchEntries(csvRows, lcpEntries) {
  const results = [];

  for (const row of csvRows) {
    const csvSystem = (row.systemName || '').trim().toLowerCase();
    const csvShelf = normalizePort(row.shelf);
    const csvSlot = normalizePort(row.slot);
    const csvPort = normalizePort(row.port);

    // Find all LCP entries whose OLT info matches this CSV row.
    // An LCP entry's olt_port can be "3", "xp3-4", "1-4", "1,2,3", etc.
    // COMBO optics use paired ports (e.g., "xp3-4" means ports 3 AND 4).
    const matches = lcpEntries.filter(entry => {
      const entrySystem = (entry.olt_name || '').trim().toLowerCase();
      const entryShelf = normalizePort(entry.olt_shelf);
      const entrySlot = normalizePort(entry.olt_slot);
      const entryPort = normalizePort(entry.olt_port);

      if (entrySystem !== csvSystem) return false;
      if (entryShelf !== csvShelf) return false;
      if (entrySlot !== csvSlot) return false;
      if (!entryPort) return false;

      if (entryPort === csvPort) return true;

      const rangeMatch = entryPort.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const lo = parseInt(rangeMatch[1], 10);
        const hi = parseInt(rangeMatch[2], 10);
        const p = parseInt(csvPort, 10);
        if (!Number.isNaN(p) && p >= lo && p <= hi) return true;
      }

      const parts = entryPort.split(',').map(part => normalizePort(part));
      if (parts.includes(csvPort)) return true;

      return false;
    });

    const opticType = getOpticType(row.opticModel);

    results.push({
      ...row,
      opticType,
      matchedEntries: matches,
      status: matches.length > 0 ? 'matched' : 'unmatched',
    });
  }

  return results;
}

export default function OpticInventoryUpload({ open, onOpenChange, lcpEntries, onComplete }) {
  const [csvRows, setCsvRows] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [parseError, setParseError] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const reset = () => {
    setCsvRows([]);
    setMatchResults([]);
    setParseError('');
    setIsApplying(false);
  };

  const handleClose = (open) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParseError('');
    setCsvRows([]);
    setMatchResults([]);

    // Shared validator — extension, size, headers, required columns.
    const validation = await validateCsvFile(file, OPTIC_INVENTORY_CSV_SPEC);
    if (!validation.ok) {
      setParseError(validation.message);
      e.target.value = '';
      return;
    }

    // validateCsvFile already read the file and gave us text + delimiter.
    const text = validation.text;
    const delimiter = validation.delimiter;
    const lines = text.split(/\r?\n/).filter(l => l.trim());

    const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Map expected headers to internal field names
    const headerMap = {
      'systemname': 'systemName', 'system_name': 'systemName', 'system name': 'systemName',
      'shelf': 'shelf',
      'slot': 'slot',
      'port': 'port',
      'optic-make': 'opticMake', 'optic_make': 'opticMake', 'opticmake': 'opticMake',
      'optic-model': 'opticModel', 'optic_model': 'opticModel', 'opticmodel': 'opticModel',
      'optic-serial': 'opticSerial', 'optic_serial': 'opticSerial', 'opticserial': 'opticSerial',
    };
    const mappedHeaders = headers.map(h => headerMap[h] || h);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseCSVLine(line, delimiter);
      const row = {};
      mappedHeaders.forEach((header, idx) => {
        if (values[idx] !== undefined) {
          row[header] = values[idx].replace(/^["']|["']$/g, '');
        }
      });
      if (row.systemName) rows.push(row);
    }

    if (rows.length === 0) {
      setParseError('No valid data rows found in the file.');
      e.target.value = '';
      return;
    }

    setCsvRows(rows);
    setMatchResults(matchEntries(rows, lcpEntries));
    e.target.value = '';
  };

  const matchedCount = matchResults.filter(r => r.status === 'matched').length;
  const unmatchedCount = matchResults.filter(r => r.status === 'unmatched').length;

  const handleApply = async () => {
    const toUpdate = matchResults.filter(r => r.status === 'matched');
    if (toUpdate.length === 0) {
      toast.error('No matched entries to update.');
      return;
    }

    setIsApplying(true);

    // Deduplicate by entry ID and only queue actual changes so we avoid unnecessary writes.
    const updateMap = new Map();
    for (const row of toUpdate) {
      for (const entry of row.matchedEntries) {
        const payload = {};

        const nextMake = row.opticMake?.trim();
        const nextModel = row.opticModel?.trim();
        const nextSerial = row.opticSerial?.trim();
        const nextType = row.opticType?.trim();

        if (nextMake && nextMake !== (entry.optic_make || '').trim()) payload.optic_make = nextMake;
        if (nextModel && nextModel !== (entry.optic_model || '').trim()) payload.optic_model = nextModel;
        if (nextSerial && nextSerial !== (entry.optic_serial || '').trim()) payload.optic_serial = nextSerial;
        if (nextType && nextType !== (entry.optic_type || '').trim()) payload.optic_type = nextType;

        if (Object.keys(payload).length > 0) {
          updateMap.set(entry.id, { entryId: entry.id, payload });
        }
      }
    }

    const updates = Array.from(updateMap.values());
    let successCount = 0;
    let failCount = 0;
    const MAX_RETRIES = 6;
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    if (updates.length === 0) {
      setIsApplying(false);
      toast.success('All matched entries already have this optic data.');
      handleClose(false);
      return;
    }

    for (const update of updates) {
      let completed = false;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await base44.entities.LCPEntry.update(update.entryId, update.payload);
          successCount++;
          completed = true;
          break;
        } catch (err) {
          const msg = String(err?.message || '').toLowerCase();
          const isRetryable = msg.includes('rate limit') || msg.includes('429') || msg.includes('timeout');

          if (!isRetryable || attempt === MAX_RETRIES - 1) {
            failCount++;
            console.warn('[OpticImport] Update failed:', err?.message || err);
            break;
          }

          const backoffMs = Math.min(12000, 1500 * (attempt + 1));
          await wait(backoffMs);
        }
      }

      if (completed) {
        await wait(350);
      }
    }

    setIsApplying(false);

    if (failCount > 0) {
      toast.warning(`Updated ${successCount} entries, ${failCount} failed.`);
    } else {
      toast.success(`Updated optic info for ${successCount} LCP entries.`);
    }

    onComplete();
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Optic Inventory</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Upload an optic inventory CSV to populate optic fields on matching LCP entries.</p>
                <p className="mt-2 text-xs"><strong>Required columns:</strong> SystemName, Shelf, Slot, Port, OPTIC-MAKE, OPTIC-MODEL, OPTIC-SERIAL</p>
                <p className="mt-1 text-xs">Matching uses OLT name + shelf + slot + port. Optic type is auto-classified from model number.</p>
                <div className="mt-2 text-xs space-y-0.5">
                  <p className="font-medium">Optic Type Classification:</p>
                  <p>• <Badge variant="outline" className="text-xs py-0 px-1">100-05730</Badge> → <Badge className="bg-purple-600 text-xs py-0 px-1">XGS-DD</Badge></p>
                  <p>• <Badge variant="outline" className="text-xs py-0 px-1">100-05674</Badge> → <Badge className="bg-emerald-600 text-xs py-0 px-1">XGS-COMBO</Badge></p>
                  <p>• <Badge variant="outline" className="text-xs py-0 px-1">100-05929</Badge> → <Badge className="bg-amber-600 text-xs py-0 px-1">XGS-COMBO-EXT</Badge></p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => downloadCsvTemplate(OPTIC_INVENTORY_CSV_SPEC)}
            >
              <Download className="h-3 w-3 mr-1.5" />
              Download template
            </Button>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="optic-inventory-upload"
            />
            <label htmlFor="optic-inventory-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload optic inventory CSV</p>
            </label>
          </div>

          {parseError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {matchResults.length > 0 && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  {matchResults.length} rows in file
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {matchedCount} matched
                </div>
                {unmatchedCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    {unmatchedCount} unmatched
                  </div>
                )}
              </div>

              {/* Results table */}
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      <TableHead>Status</TableHead>
                      <TableHead>SystemName</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Optic</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Matched LCP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.map((row, i) => (
                      <TableRow key={i} className={row.status === 'unmatched' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                        <TableCell>
                          {row.status === 'matched' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.systemName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.shelf}/{row.slot}/{row.port}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{row.opticMake}</div>
                          <div className="text-gray-500">{row.opticModel}</div>
                        </TableCell>
                        <TableCell>
                          {row.opticType ? (
                            <Badge className={
                              row.opticType === 'XGS-DD' ? 'bg-purple-600' :
                              row.opticType === 'XGS-COMBO' ? 'bg-emerald-600' :
                              row.opticType === 'XGS-COMBO-EXT' ? 'bg-amber-600' : ''
                            }>
                              {row.opticType}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.matchedEntries.length > 0
                            ? row.matchedEntries.map(e => e.lcp_number).join(', ')
                            : <span className="text-gray-400">No match</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {unmatchedCount > 0 && (
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>Unmatched rows have no LCP entry with a matching OLT name + shelf/slot/port. These will be skipped.</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  className="flex-1"
                  disabled={matchedCount === 0 || isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>Apply to {matchedCount} Entries</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}