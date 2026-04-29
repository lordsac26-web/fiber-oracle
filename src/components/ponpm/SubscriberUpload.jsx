import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Users, Upload, CheckCircle2, AlertTriangle, Loader2, X, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

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
export function buildSubscriberLookup(records) {
  const byComposite = new Map(); // "OLT|PORT|ONTID" → record
  const bySerial = new Map();    // "SERIAL" → record

  for (const rec of records) {
    // Build composite key from DeviceName (OLT) + LinkedPon (port) + OntID
    if (rec.DeviceName && rec.LinkedPon && rec.OntID) {
      const oltName = rec.DeviceName.trim();
      const linkedPon = rec.LinkedPon.trim();
      const ontId = rec.OntID.trim();
      const key = `${oltName}|${linkedPon}|${ontId}`.toUpperCase();
      byComposite.set(key, rec);
    }

    if (rec.ONTSerialNo) {
      bySerial.set(rec.ONTSerialNo.trim().toUpperCase(), rec);
    }
  }

  return { byComposite, bySerial };
}

/**
 * Enriches ONT array in-place with subscriber data.
 * Match strategy:
 *   1) OLT name + port path + ONT ID (primary — most reliable)
 *   2) Serial number fallback
 * Returns count of matched ONTs.
 */
export function enrichOntsWithSubscriber(lookup, onts) {
  if (!lookup || !onts) return 0;
  const { byComposite, bySerial } = lookup;
  let matched = 0;

  for (const ont of onts) {
    // Strategy 1: composite key
    const oltName = (ont._oltName || ont.OLTName || '').trim();
    const port = (ont['Shelf/Slot/Port'] || ont._port || '').trim();
    const ontId = (ont.OntID || '').toString().trim();

    let sub = null;
    if (oltName && port && ontId) {
      const key = `${oltName}|${port}|${ontId}`.toUpperCase();
      sub = byComposite.get(key);
    }

    // Strategy 2: serial fallback
    if (!sub && ont.SerialNumber) {
      sub = bySerial.get(ont.SerialNumber.trim().toUpperCase());
    }

    if (sub) {
      ont._subscriber = {
        name: sub.SubscriberName || '',
        account: sub.AccountName || '',
        address: sub.Address || '',
        city: sub.City || '',
        zip: sub.Zip || '',
        ontRanged: sub.ONTRanged || '',
        softwareVersion: sub.CurrentONTSoftwareVersion || '',
      };
      matched++;
    }
  }

  return matched;
}

export default function SubscriberUpload({ onDataLoaded, subscriberCount, subscriberMeta }) {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fn = file.name.toLowerCase();
    if (!fn.endsWith('.csv') && !fn.endsWith('.txt')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setParsing(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { records, error, hasDevice, hasLinkedPon } = parseSubscriberCSV(ev.target.result);
      setParsing(false);

      if (error) {
        toast.error(error);
        return;
      }

      setPreview({ records, hasDevice, hasLinkedPon, fileName: file.name });
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmLoad = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await onDataLoaded(preview.records, preview.fileName);
      toast.success(`Loaded & saved ${preview.records.length} subscriber records`);
      setPreview(null);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to save subscriber data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Users className="h-4 w-4" />
        Subscriber Data
        {subscriberCount > 0 && (
          <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300 ml-1">
            {subscriberCount}
          </Badge>
        )}
      </Button>

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
                  <span>• Zip</span>
                  <span>• OntID</span>
                  <span>• ONTRanged</span>
                  <span>• ONTSerialNo</span>
                  <span>• ONTModel</span>
                  <span>• SoftwareVersion</span>
                  <span>• DeviceName (OLT)</span>
                  <span>• LinkedPon (Port)</span>
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2">
                  Matching uses DeviceName + LinkedPon + OntID as the primary key, with serial number as fallback.
                </p>
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