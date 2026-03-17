import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Info, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

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
  return port.toString().trim().replace(/^0+/, '') || '0';
}

function matchEntries(csvRows, lcpEntries) {
  const results = [];

  for (const row of csvRows) {
    const csvSystem = (row.systemName || '').trim().toLowerCase();
    const csvShelf = normalizePort(row.shelf);
    const csvSlot = normalizePort(row.slot);
    const csvPort = normalizePort(row.port);

    // Find all LCP entries whose OLT info matches this CSV row.
    // An LCP entry's olt_port can be a range like "1-4", so we check if csvPort falls within it.
    const matches = lcpEntries.filter(entry => {
      const entrySystem = (entry.olt_name || '').trim().toLowerCase();
      const entryShelf = normalizePort(entry.olt_shelf);
      const entrySlot = normalizePort(entry.olt_slot);
      const entryPort = (entry.olt_port || '').trim();

      if (entrySystem !== csvSystem) return false;
      if (entryShelf !== csvShelf) return false;
      if (entrySlot !== csvSlot) return false;

      // Port matching: entry port could be "3", "1-4", "1,2,3", etc.
      if (!entryPort) return false;
      
      // Exact match
      if (normalizePort(entryPort) === csvPort) return true;
      
      // Range match: "1-4" means ports 1,2,3,4
      const rangeMatch = entryPort.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const lo = parseInt(rangeMatch[1], 10);
        const hi = parseInt(rangeMatch[2], 10);
        const p = parseInt(csvPort, 10);
        if (!isNaN(p) && p >= lo && p <= hi) return true;
      }

      // Comma-separated: "1,2,3"
      const parts = entryPort.split(',').map(s => normalizePort(s));
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      setParseError('Please upload a CSV file.');
      return;
    }

    setParseError('');
    setCsvRows([]);
    setMatchResults([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        setParseError('File must have a header row and at least one data row.');
        return;
      }

      const firstLine = lines[0];
      let delimiter = ',';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = ';';

      const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

      // Map expected headers
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

      const requiredFields = ['systemName', 'shelf', 'slot', 'port'];
      const missing = requiredFields.filter(f => !mappedHeaders.includes(f));
      if (missing.length > 0) {
        setParseError(`Missing required columns: ${missing.join(', ')}. Expected: SystemName, Shelf, Slot, Port, OPTIC-MAKE, OPTIC-MODEL, OPTIC-SERIAL`);
        return;
      }

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
        if (row.systemName && row.port) {
          rows.push(row);
        }
      }

      if (rows.length === 0) {
        setParseError('No valid data rows found.');
        return;
      }

      setCsvRows(rows);
      const results = matchEntries(rows, lcpEntries);
      setMatchResults(results);
    };
    reader.onerror = () => setParseError('Failed to read file.');
    reader.readAsText(file);

    // Reset file input so the same file can be re-uploaded
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

    // Deduplicate: group by entry ID, take last CSV row per entry (in case multiple CSV rows map to same LCP)
    const updateMap = new Map();
    for (const row of toUpdate) {
      for (const entry of row.matchedEntries) {
        updateMap.set(entry.id, {
          entryId: entry.id,
          optic_make: row.opticMake || '',
          optic_model: row.opticModel || '',
          optic_serial: row.opticSerial || '',
          optic_type: row.opticType || '',
        });
      }
    }

    const updates = Array.from(updateMap.values());
    let successCount = 0;
    let failCount = 0;

    // Update in batches of 5 to avoid rate limits
    for (let i = 0; i < updates.length; i += 5) {
      const batch = updates.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(u =>
          base44.entities.LCPEntry.update(u.entryId, {
            optic_make: u.optic_make,
            optic_model: u.optic_model,
            optic_serial: u.optic_serial,
            optic_type: u.optic_type,
          })
        )
      );
      for (const r of results) {
        if (r.status === 'fulfilled') successCount++;
        else failCount++;
      }
      // Small delay between batches
      if (i + 5 < updates.length) {
        await new Promise(r => setTimeout(r, 500));
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