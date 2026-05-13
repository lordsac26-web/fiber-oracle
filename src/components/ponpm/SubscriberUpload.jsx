import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Users, Upload, CheckCircle2, AlertTriangle, Loader2, X, FileSpreadsheet, Download } from 'lucide-react';
import { toast } from 'sonner';
import { validateCsvFile, downloadCsvTemplate, SUBSCRIBER_CSV_SPEC } from '@/lib/csvValidator';

/**
 * Parses a subscriber/customer ONT CSV and returns a Map keyed by composite 
 * key "OLT|PORT|ONTID" → subscriber record object.
 *
 * Expected CSV columns (case-insensitive, flexible naming):
 * SubscriberName, AccountName, Address, City, Zip, OntID,
 * ONTRanged, ONTSerialNo, ONTModel, CurrentONTSoftwareVersion,
 * DeviceName (=OLT), LinkedPon (=port)
 */

function parseCSVLine(line, delim) {
  const result = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === delim && !inQ) {
      result.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  result.push(cur.trim());
  return result;
}

const HEADER_MAP = {
  subscribername: 'SubscriberName',
  subscriber_name: 'SubscriberName',
  subscriber: 'SubscriberName',
  accountname: 'AccountName',
  account_name: 'AccountName',
  account: 'AccountName',
  address: 'Address',
  city: 'City',
  state: 'State',
  st: 'State',
  province: 'State',
  region: 'State',
  zip: 'Zip',
  zipcode: 'Zip',
  zip_code: 'Zip',
  ontid: 'OntID',
  ont_id: 'OntID',
  ontranged: 'ONTRanged',
  ont_ranged: 'ONTRanged',
  ontserialno: 'ONTSerialNo',
  ont_serial_no: 'ONTSerialNo',
  ontserial: 'ONTSerialNo',
  serial: 'ONTSerialNo',
  serialnumber: 'ONTSerialNo',
  ontmodel: 'ONTModel',
  ont_model: 'ONTModel',
  model: 'ONTModel',
  currentontsoftwareversion: 'CurrentONTSoftwareVersion',
  current_ont_software_version: 'CurrentONTSoftwareVersion',
  softwareversion: 'CurrentONTSoftwareVersion',
  software_version: 'CurrentONTSoftwareVersion',
  sw_version: 'CurrentONTSoftwareVersion',
  devicename: 'DeviceName',
  device_name: 'DeviceName',
  device: 'DeviceName',
  linkedpon: 'LinkedPon',
  linked_pon: 'LinkedPon',
  pon: 'LinkedPon',
};

export function parseSubscriberCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { records: [], error: 'File needs header + at least one data row' };

  let delim = ',';
  if (lines[0].includes('\t')) delim = '\t';
  else if ((lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length) delim = ';';

  const rawHeaders = parseCSVLine(lines[0], delim);
  const headers = rawHeaders.map(h => {
    const clean = h.replace(/['"]/g, '').trim().toLowerCase().replace(/[\s\-]+/g, '');
    return HEADER_MAP[clean] || null;
  });

  // Validate minimum required columns
  const hasOntId = headers.includes('OntID');
  const hasDevice = headers.includes('DeviceName');
  const hasLinkedPon = headers.includes('LinkedPon');
  if (!hasOntId) return { records: [], error: `Missing OntID column. Found: ${rawHeaders.join(', ')}` };

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i], delim);
    if (vals.length < 2) continue;
    const rec = {};
    headers.forEach((h, idx) => {
      if (h && vals[idx]) rec[h] = vals[idx].replace(/^["']|["']$/g, '').trim();
    });
    if (!rec.OntID) continue;
    records.push(rec);
  }

  return { records, error: null, hasDevice, hasLinkedPon };
}

/**
 * Builds a lookup map from parsed subscriber records.
 * Primary key: "OLT|PORT|ONTID" (from DeviceName + LinkedPon + OntID)
 * Fallback key: serial number (ONTSerialNo)
 */
/**
 * Normalizes a port path string for consistent matching.
 * Subscriber CSV may use "1/1/1" or "0/1/1" (with/without shelf prefix).
 * PM data uses "Shelf/Slot/Port" from the OLT.
 * We normalize to trimmed uppercase, removing any leading "0/" shelf prefix
 * ambiguity by storing BOTH the full path AND a slot/port-only fallback.
 */
function normalizePort(port) {
  // Strip whitespace AND the "xp" port-segment prefix so subscriber CSV ports
  // (e.g. "1/1/xp13") match PM data ports (e.g. "1/1/13"). Mirrors backend
  // syncSubscriberToOntRecords.js normalization.
  return (port || '').trim().replace(/\s+/g, '').replace(/\/xp(\d)/gi, '/$1');
}

// Vendor prefixes that appear in subscriber-export serial numbers but NOT in
// PM-report serial numbers. Must mirror functions/syncSubscriberToOntRecords.js
// so frontend live-enrichment matches what the backend sync would set.
const VENDOR_PREFIXES = ['CXNK', 'ZNTS'];

function normalizeSerial(serial) {
  if (!serial || typeof serial !== 'string') return null;
  let n = serial.trim().toUpperCase();
  for (const prefix of VENDOR_PREFIXES) {
    if (n.startsWith(prefix)) { n = n.substring(prefix.length); break; }
  }
  n = n.replace(/[^A-Z0-9]/g, '');
  return n.length > 0 ? n : null;
}

// Normalize ONT ID for matching. The OLT may emit "1" while the subscriber CSV
// has "01" (or vice versa). We canonicalize to: trim, uppercase, and strip
// leading zeros from purely-numeric IDs. Letters are preserved so non-numeric
// IDs (rare) still match exactly.
function normalizeOntId(id) {
  if (id === null || id === undefined) return null;
  const s = String(id).trim().toUpperCase();
  if (!s) return null;
  // If purely numeric, strip leading zeros (but keep "0" itself as "0")
  if (/^\d+$/.test(s)) {
    return s.replace(/^0+/, '') || '0';
  }
  return s;
}

// Detect technology type from ONT model. Must stay in sync with the lists in
// functions/parsePonPm.js (detectTechTypeFromModel) and functions/loadSavedReport.js
// (detectTechType). When subscriber enrichment overwrites ont.model with the
// authoritative model (e.g. "5222XG"), we recompute _techType so the technology
// counters (GPON / XGS-PON KPI chips) reflect the corrected model.
const XGS_MODELS  = ['GP1101X', 'GP4201X', 'GP4201XH', '5222XG', '5228XG'];
const GPON_MODELS = ['711GE', '717GE', '725G', '725GE', '725', '812G-1', '844G-1', '844GE-1', '803G'];
function detectTechTypeFromModel(model) {
  if (!model) return null;
  const m = String(model).toUpperCase().trim();
  if (!m) return null;
  // Any model containing "DZS" is XGS-PON
  if (m.replace(/\s/g, '').includes('DZS')) return 'XGS-PON';
  for (const x of XGS_MODELS)  if (m.includes(x)) return 'XGS-PON';
  for (const g of GPON_MODELS) if (m.includes(g)) return 'GPON';
  return null;
}

export function buildSubscriberLookup(records) {
  const byComposite = new Map(); // "OLT|PORT|ONTID" → record
  const bySerial = new Map();    // "SERIAL" → record
  // OntID-only → MODEL lookup. OntID is NOT globally unique (ONT 1 exists
  // under every PON port), so we cannot use it to attribute full subscriber
  // identity. BUT operationally, ONTs with the same OntID across the network
  // usually run the same hardware family, so we can safely use it as a
  // model-only fallback. To be extra safe we ONLY record the model when ALL
  // subscriber rows sharing that OntID agree on it — if they disagree we
  // mark the OntID ambiguous and skip the fallback for that ID entirely.
  // Per ops feedback the OntID column is identical between the PON PM report
  // and the subscriber CSV, which makes this a reliable bridge for the ~1000
  // ONTs that don't resolve via composite or serial matching.
  const ontIdToModel = new Map();      // "ONTID" → "MODEL"
  const ontIdAmbiguous = new Set();    // OntIDs with conflicting models

  for (const rec of records) {
    // Build composite key from DeviceName (OLT) + LinkedPon (port) + OntID.
    // Note: OntID may be a number in some CSV exports — accept both string and
    // number values rather than calling .trim() directly (which would crash on
    // numerics) and use normalizeOntId() so "01" and "1" collide on the same key.
    if (rec.DeviceName && rec.LinkedPon && (rec.OntID !== null && rec.OntID !== undefined && rec.OntID !== '')) {
      const oltName = rec.DeviceName.trim().toUpperCase();
      const linkedPon = normalizePort(rec.LinkedPon).toUpperCase();
      const ontId = normalizeOntId(rec.OntID);
      if (ontId !== null) {
        // Primary key: exact match
        byComposite.set(`${oltName}|${linkedPon}|${ontId}`, rec);
        // Fallback key without OLT name (in case OLT names differ between systems)
        byComposite.set(`|${linkedPon}|${ontId}`, rec);
      }
    }

    // Track OntID → model with conflict detection (see note above the maps).
    // We only commit a model when ALL subscriber rows sharing an OntID agree;
    // any conflict marks the OntID ambiguous and drops it from the fallback.
    const ontIdOnly = normalizeOntId(rec.OntID);
    const subModel = (rec.ONTModel || '').trim();
    if (ontIdOnly !== null && subModel && !ontIdAmbiguous.has(ontIdOnly)) {
      const existing = ontIdToModel.get(ontIdOnly);
      if (existing === undefined) {
        ontIdToModel.set(ontIdOnly, subModel);
      } else if (existing !== subModel) {
        ontIdToModel.delete(ontIdOnly);
        ontIdAmbiguous.add(ontIdOnly);
      }
    }

    // Strip vendor prefix when storing so subscriber serials align with PM-report
    // serials (which never carry a CXNK/ZNTS prefix).
    const normSerial = normalizeSerial(rec.ONTSerialNo);
    if (normSerial && !bySerial.has(normSerial)) {
      bySerial.set(normSerial, rec);
    }
  }

  return { byComposite, bySerial, ontIdToModel };
}

/**
 * Enriches ONT array in-place with subscriber data.
 * Match strategy:
 *   1) OLT name + port path + ONT ID (primary — most reliable, full subscriber)
 *   2) Serial number fallback (full subscriber)
 *   3) OntID-only MODEL fallback — does NOT attach subscriber identity, only
 *      overwrites ont.model + _techType so the GPON / XGS-PON chip counts and
 *      the ONT Model filter reflect the authoritative subscriber-CSV model.
 *      This catches ONTs the OLT reports without a vendor prefix (e.g. plain
 *      "1101X" instead of "GP1101X") so they classify correctly.
 * Returns count of ONTs that received full subscriber attribution (strategies
 * 1 + 2 only — strategy 3 is model-only and not counted here).
 */
export function enrichOntsWithSubscriber(lookup, onts) {
  if (!lookup || !onts) return 0;
  const { byComposite, bySerial, ontIdToModel } = lookup;
  let matched = 0;

  for (const ont of onts) {
    // Strategy 1: composite key (OLT + port + ONT ID) — IDs normalized so "01"
    // matches "1" (leading-zero variants are the most common silent mismatch).
    const oltName = (ont._oltName || ont.OLTName || '').trim().toUpperCase();
    const port = normalizePort(ont['Shelf/Slot/Port'] || ont._port || '').toUpperCase();
    const ontId = normalizeOntId(ont.OntID);

    let sub = null;
    if (oltName && port && ontId) {
      sub = byComposite.get(`${oltName}|${port}|${ontId}`);
    }

    // Strategy 1b: port + ONT ID without OLT name (cross-system name mismatch)
    if (!sub && port && ontId) {
      sub = byComposite.get(`|${port}|${ontId}`);
    }

    // Strategy 2: serial fallback — normalize both sides identically.
    // Run this BEFORE giving up so vendor-prefix and formatting differences
    // (CXNK/ZNTS, dashes, spaces) don't block a legitimate match.
    if (!sub && ont.SerialNumber) {
      const normSn = normalizeSerial(ont.SerialNumber);
      if (normSn) sub = bySerial.get(normSn);
    }

    if (sub) {
      // Build full address: "123 Main St, Springfield, MA, 01103"
      // State is included between city and zip so the geocoder can
      // disambiguate ambiguous town names (e.g. multiple "Hudson"s).
      const addrParts = [sub.Address, sub.City, sub.State, sub.Zip].filter(p => p && p.trim());
      const fullAddress = addrParts.join(', ');

      ont._subscriber = {
        name: sub.SubscriberName || '',
        account: sub.AccountName || '',
        address: fullAddress || sub.Address || '',
        streetAddress: (sub.Address || '').trim(),
        city: sub.City || '',
        state: sub.State || '',
        zip: sub.Zip || '',
        ontRanged: sub.ONTRanged || '',
        softwareVersion: sub.CurrentONTSoftwareVersion || '',
        // ONT device fields from subscriber data — used in ONTDetailView, job reports, exports
        model: sub.ONTModel || '',
        serialNo: sub.ONTSerialNo || '',
      };
      // Always prefer the specific subscriber model over the OLT-reported model
      // (e.g. subscriber CSV has "5222XG" while OLT reports generic "DZS 522x XG").
      // Also recompute _techType from the corrected model — otherwise the GPON/
      // XGS-PON KPI chips undercount, since _techType was originally derived
      // from a missing/generic model at ingest time and never refreshed.
      if (sub.ONTModel) {
        ont.model = sub.ONTModel;
        const newTech = detectTechTypeFromModel(sub.ONTModel);
        // Only overwrite when we resolved a known tech — preserve the
        // existing combo-port fallback (e.g. "XGS-PON (combo odd)") otherwise.
        if (newTech) ont._techType = newTech;
      }
      matched++;
    } else if (ontIdToModel && ontId) {
      // Strategy 3: OntID-only model fallback. The ONT didn't match a single
      // subscriber row (composite + serial both failed), but the OntID maps
      // unambiguously to a model in the subscriber CSV. Set ont.model and
      // _techType only — no identity, no address — so the model filter and
      // GPON / XGS-PON chips classify this ONT correctly.
      const fallbackModel = ontIdToModel.get(ontId);
      if (fallbackModel) {
        ont.model = fallbackModel;
        const newTech = detectTechTypeFromModel(fallbackModel);
        if (newTech) ont._techType = newTech;
      }
    }
  }

  return matched;
}

export default function SubscriberUpload({ onDataLoaded, subscriberCount, subscriberMeta, open: controlledOpen, onOpenChange, hideTrigger = false }) {
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

    // Shared validator — checks extension, size, header, required columns.
    // On failure shows a clear error pointing to the listed format / template.
    const validation = await validateCsvFile(file, SUBSCRIBER_CSV_SPEC);
    if (!validation.ok) {
      setParsing(false);
      toast.error(validation.message, { duration: 7000 });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const { records, error, hasDevice, hasLinkedPon } = parseSubscriberCSV(validation.text);
    setParsing(false);

    if (error) {
      toast.error(error);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setPreview({ records, hasDevice, hasLinkedPon, fileName: file.name });
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmLoad = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await onDataLoaded(preview.records, preview.fileName);
      toast.success(`Loaded & saved ${preview.records.length.toLocaleString()} records from ${preview.fileName}`);
      setPreview(null);
      setOpen(false);
    } catch (error) {
      // Surface the actual error (rate limit, network, etc.) so the user knows
      // why the save failed instead of seeing a generic message.
      const msg = error?.message || 'Unknown error';
      toast.error(`Failed to save subscriber data: ${msg}`, { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {!hideTrigger && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Users className="h-4 w-4" />
          Subscriber Data
          {subscriberCount > 0 && (
            <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300 ml-1">
              {subscriberCount}
            </Badge>
          )}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Upload Subscriber / Customer ONT Report
            </DialogTitle>
            <DialogDescription>
              Upload a CSV with customer ONT data to enrich the analysis with subscriber names, addresses, and account info.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Expected columns info */}
            <Card className="border bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1.5">Expected CSV Columns:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-blue-700 dark:text-blue-300">
                  <span>• SubscriberName</span>
                  <span>• AccountName</span>
                  <span>• Address</span>
                  <span>• City</span>
                  <span>• State</span>
                  <span>• Zip</span>
                  <span>• OntID</span>
                  <span>• ONTRanged</span>
                  <span>• ONTSerialNo</span>
                  <span>• ONTModel</span>
                  <span>• SoftwareVersion</span>
                  <span>• DeviceName (OLT)</span>
                  <span>• LinkedPon (Port)</span>
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                  <strong>State</strong> (2-letter, e.g. "NY") is recommended — it lets the geocoder disambiguate towns with shared names.
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2">
                  Matching uses DeviceName + LinkedPon + OntID as the primary key, with serial number as fallback.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => downloadCsvTemplate(SUBSCRIBER_CSV_SPEC)}
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  Download template
                </Button>
              </CardContent>
            </Card>

            {/* Upload zone */}
            <div className="relative">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFile}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                {parsing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                ) : (
                  <>
                    <FileSpreadsheet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">Click or drag to upload CSV</p>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <Card className="border bg-green-50 dark:bg-green-900/20 border-green-200">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-800 dark:text-green-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {preview.records.length} records parsed
                    </span>
                    <span className="text-xs text-gray-500">{preview.fileName}</span>
                  </div>

                  {(!preview.hasDevice || !preview.hasLinkedPon) && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded p-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        {!preview.hasDevice && 'DeviceName (OLT) column not found. '}
                        {!preview.hasLinkedPon && 'LinkedPon (Port) column not found. '}
                        Matching will use serial number only.
                      </span>
                    </div>
                  )}

                  {/* Sample row */}
                  {preview.records.length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Sample: </span>
                      {preview.records[0].SubscriberName && <span>"{preview.records[0].SubscriberName}" </span>}
                      {preview.records[0].Address && <span>@ {preview.records[0].Address} </span>}
                      {preview.records[0].DeviceName && <span>OLT: {preview.records[0].DeviceName} </span>}
                      {preview.records[0].OntID && <span>ONT: {preview.records[0].OntID}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Current data status */}
          {subscriberMeta && !preview && (
            <Card className="border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Current data loaded from database</span>
                  </div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-300">
                    {subscriberMeta.record_count?.toLocaleString()} records • {subscriberMeta.file_name}
                  </div>
                </div>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
                  Upload a new CSV to replace the existing data.
                </p>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setPreview(null); }}>Cancel</Button>
            <Button onClick={confirmLoad} disabled={!preview?.records?.length || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Users className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : `Load & Save ${preview?.records?.length || 0} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}