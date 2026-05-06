import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Wifi, CheckCircle2, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { toast } from 'sonner';
import { validateCsvFile, downloadCsvTemplate, parseCsvLine, detectDelimiter, EERO_CSV_SPEC } from '@/lib/csvValidator';

/**
 * Eero data upload component — mirrors SubscriberUpload.
 *
 * Eero CSV is matched against ONTs through the subscriber data:
 *   eero.home_identifier  ↔  subscriber.AccountName
 * Therefore enrichment requires subscriber data to already be loaded.
 *
 * Lookup is keyed by a normalized home_identifier (uppercase, trimmed,
 * stripped of whitespace) so minor formatting differences don't break matches.
 */

// ─── Header normalization map ─────────────────────────────────────────────
// Maps every accepted alias for a column to the canonical record key.
const HEADER_MAP = {
  eero_id: 'eero_id',
  eeroid: 'eero_id',
  network_id: 'network_id',
  networkid: 'network_id',
  serial: 'serial',
  serialnumber: 'serial',
  home_identifier: 'home_identifier',
  homeidentifier: 'home_identifier',
  home_id: 'home_identifier',
  homeid: 'home_identifier',
  account: 'home_identifier',
  accountname: 'home_identifier',
  network_created: 'network_created',
  networkcreated: 'network_created',
  created: 'network_created',
  last_alive: 'last_alive',
  lastalive: 'last_alive',
  lastseen: 'last_alive',
  organization: 'organization',
  org: 'organization',
  isp: 'isp',
  model: 'model',
  gateway: 'gateway',
};

function normalizeHeaderName(h) {
  return String(h || '')
    .replace(/['"]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '');
}

export function parseEeroCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { records: [], error: 'File needs header + at least one data row' };

  const delim = detectDelimiter(lines[0]);
  const rawHeaders = parseCsvLine(lines[0], delim);
  const headers = rawHeaders.map(h => HEADER_MAP[normalizeHeaderName(h)] || null);

  if (!headers.includes('home_identifier')) {
    return { records: [], error: `Missing home_identifier column. Found: ${rawHeaders.join(', ')}` };
  }

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i], delim);
    if (vals.length < 2) continue;
    const rec = {};
    headers.forEach((h, idx) => {
      if (h && vals[idx]) rec[h] = vals[idx].replace(/^["']|["']$/g, '').trim();
    });
    if (!rec.home_identifier) continue;
    records.push(rec);
  }

  return { records, error: null };
}

/**
 * Normalize a home_identifier / account name for lookup.
 *
 * Accounts follow a 16-digit canonical format: "8275" + 12 more digits
 * (e.g. 8275100090049486). Some records carry a textual prefix/suffix to
 * flag special status — e.g. "FD-8275100090049486" or "8275100090049486-X".
 * For matching we want to ignore ALL non-numeric characters and lock onto
 * the 16-digit account number itself, so an eero row keyed by the bare
 * number still matches an ONT subscriber tagged with "FD-…" (and vice versa).
 *
 * Strategy:
 *   1. Strip every non-digit character.
 *   2. Search for the canonical pattern (8275 + 12 digits) and prefer it
 *      when present — this is robust against extra digits accidentally
 *      glued onto either side of the account number.
 *   3. Fallback: return the full digit string so legacy / non-conforming
 *      identifiers still produce a stable, comparable key.
 */
export function normalizeHomeId(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, '');
  if (!digits) return null;
  const canonical = digits.match(/8275\d{12}/);
  return canonical ? canonical[0] : digits;
}

/**
 * Build a lookup map keyed by normalized home_identifier → eero record.
 * If multiple eero rows share the same home_identifier (multiple eeros per
 * home), we store the FIRST one — typical multi-AP scenario where any one
 * is sufficient as a "has eero" indicator.
 */
export function buildEeroLookup(records) {
  const byHomeId = new Map();
  for (const rec of records) {
    const key = normalizeHomeId(rec.home_identifier);
    if (key && !byHomeId.has(key)) byHomeId.set(key, rec);
  }
  return { byHomeId };
}

/**
 * Enrich ONT array in-place with eero data. Match is via the ONT's
 * subscriber AccountName (already populated by subscriber enrichment).
 * Returns count of matched ONTs.
 */
export function enrichOntsWithEero(lookup, onts) {
  if (!lookup || !onts) return 0;
  const { byHomeId } = lookup;
  let matched = 0;

  for (const ont of onts) {
    const account = ont._subscriber?.account || ont.subscriber_account_name;
    const key = normalizeHomeId(account);
    if (!key) {
      // Clear any stale eero data if subscriber link was lost
      if (ont._eero) delete ont._eero;
      continue;
    }
    const eero = byHomeId.get(key);
    if (eero) {
      ont._eero = {
        eero_id:         eero.eero_id || '',
        network_id:      eero.network_id || '',
        serial:          eero.serial || '',
        home_identifier: eero.home_identifier || '',
        network_created: eero.network_created || '',
        last_alive:      eero.last_alive || '',
        organization:    eero.organization || '',
        isp:             eero.isp || '',
        model:           eero.model || '',
        gateway:         eero.gateway || '',
      };
      matched++;
    } else if (ont._eero) {
      delete ont._eero;
    }
  }

  return matched;
}

export default function EeroUpload({ onDataLoaded, eeroMatchCount, eeroMeta, open: controlledOpen, onOpenChange, hideTrigger = false }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    const validation = await validateCsvFile(file, EERO_CSV_SPEC);
    if (!validation.ok) {
      setParsing(false);
      toast.error(validation.message, { duration: 7000 });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const { records, error } = parseEeroCSV(validation.text);
    setParsing(false);

    if (error) {
      toast.error(error);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setPreview({ records, fileName: file.name });
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmLoad = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await onDataLoaded(preview.records, preview.fileName);
      toast.success(`Loaded & saved ${preview.records.length.toLocaleString()} eero records from ${preview.fileName}`);
      setPreview(null);
      setOpen(false);
    } catch (error) {
      const msg = error?.message || 'Unknown error';
      toast.error(`Failed to save eero data: ${msg}`, { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {!hideTrigger && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Wifi className="h-4 w-4" />
          eero Data
          {eeroMatchCount > 0 && (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 ml-1">
              {eeroMatchCount}
            </Badge>
          )}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-emerald-500" />
              Upload eero Report
            </DialogTitle>
            <DialogDescription>
              Upload a CSV with eero device data to flag ONTs that have an eero deployed.
              Matching uses <code className="text-xs">home_identifier</code> against the subscriber <code className="text-xs">AccountName</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200">
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mb-1.5">Expected CSV Columns:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <span>• eero_id</span>
                  <span>• network_id</span>
                  <span>• serial</span>
                  <span>• <strong>home_identifier</strong> (required)</span>
                  <span>• network_created</span>
                  <span>• last_alive</span>
                  <span>• organization</span>
                  <span>• isp</span>
                  <span>• model</span>
                  <span>• gateway</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => downloadCsvTemplate(EERO_CSV_SPEC)}
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  Download template
                </Button>
              </CardContent>
            </Card>

            <div className="relative">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
                {parsing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
                ) : (
                  <>
                    <FileSpreadsheet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">Click or drag to upload CSV</p>
                  </>
                )}
              </div>
            </div>

            {preview && (
              <Card className="border bg-green-50 dark:bg-green-900/20 border-green-200">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {preview.records.length} eero records parsed
                    </span>
                    <span className="text-xs text-gray-500">{preview.fileName}</span>
                  </div>

                  {preview.records.length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Sample: </span>
                      home: {preview.records[0].home_identifier || 'N/A'}
                      {preview.records[0].model && <span> • model: {preview.records[0].model}</span>}
                      {preview.records[0].serial && <span> • SN: {preview.records[0].serial}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {eeroMeta && !preview && (
            <Card className="border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Current eero data loaded from database</span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-300">
                    {eeroMeta.record_count?.toLocaleString()} records • {eeroMeta.file_name}
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                  Upload a new CSV to replace the existing data.
                </p>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setPreview(null); }}>Cancel</Button>
            <Button onClick={confirmLoad} disabled={!preview?.records?.length || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Wifi className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : `Load & Save ${preview?.records?.length || 0} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}