/**
 * OntBirthCertificatePicker
 *
 * Dialog that lets an admin search for ONTs by serial number or subscriber name,
 * select up to 32, then export a "birth certificate" PDF for each selected ONT.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Award, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { downloadPdfFromFunction } from '@/lib/pdfDownload';

const MAX_SELECTION = 32;

export default function OntBirthCertificatePicker({ open, onOpenChange, onts = [], subscriberRecords = [] }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);   // array of serial strings
  const [loading, setLoading] = useState(false);

  // ── Build a de-duplicated candidate list from current-report ONTs +
  //    subscriber records, keyed by serial number (uppercase).
  const candidates = useMemo(() => {
    const map = new Map();

    // Current report ONTs take precedence — they carry enriched subscriber info.
    (onts || []).forEach(ont => {
      const serial = String(ont.SerialNumber || ont.serial_number || '').trim();
      if (!serial) return;
      const key = serial.toUpperCase();
      if (map.has(key)) return;
      map.set(key, {
        serial,
        displayName: ont.subscriber_account_name || ont._subscriber?.name || ont._subscriber?.account || '',
        address: ont.subscriber_address || ont._subscriber?.address || '',
        source: 'report',
      });
    });

    // Supplement with subscriber records for ONTs not in the current report.
    (subscriberRecords || []).forEach(sub => {
      const serial = String(sub.ONTSerialNo || '').trim();
      if (!serial) return;
      const key = serial.toUpperCase();
      if (map.has(key)) return;
      map.set(key, {
        serial,
        displayName: sub.SubscriberName || sub.AccountName || '',
        address: [sub.Address, sub.City, sub.State].filter(Boolean).join(', '),
        source: 'subscriber',
      });
    });

    return [...map.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [onts, subscriberRecords]);

  // ── Filter candidates by search query ────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(c =>
      c.serial.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const toggle = (serial) => {
    setSelected(prev => {
      const key = serial.toUpperCase();
      const exists = prev.some(s => s.toUpperCase() === key);
      if (exists) return prev.filter(s => s.toUpperCase() !== key);
      if (prev.length >= MAX_SELECTION) {
        toast.error(`Maximum ${MAX_SELECTION} certificates per export`);
        return prev;
      }
      return [...prev, serial];
    });
  };

  const isSelected = (serial) => selected.some(s => s.toUpperCase() === serial.toUpperCase());

  const selectAllVisible = () => {
    setSelected(prev => {
      const current = new Set(prev.map(s => s.toUpperCase()));
      const toAdd = filtered
        .filter(c => !current.has(c.serial.toUpperCase()))
        .slice(0, MAX_SELECTION - prev.length)
        .map(c => c.serial);
      return [...prev, ...toAdd];
    });
  };

  const clearAll = () => setSelected([]);

  const handleClose = () => {
    setSearch('');
    setSelected([]);
    onOpenChange(false);
  };

  const handleExport = async () => {
    if (!selected.length) { toast.error('Select at least one ONT'); return; }
    setLoading(true);
    toast.loading('Generating birth certificates…', { id: 'cert-pdf' });
    try {
      await downloadPdfFromFunction(
        'generateOntBirthCertificate',
        { serialNumbers: selected },
        `FiberOracle-ONT-Certificates-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success(`${selected.length} certificate${selected.length > 1 ? 's' : ''} exported`, { id: 'cert-pdf' });
      handleClose();
    } catch (err) {
      toast.error('Export failed: ' + err.message, { id: 'cert-pdf' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            ONT Birth Certificate Export
          </DialogTitle>
          <DialogDescription>
            Search by subscriber name or serial number. Select up to {MAX_SELECTION} ONTs to generate a professional installation record PDF.
          </DialogDescription>
        </DialogHeader>

        {/* Search + controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search by name or serial…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAllVisible}
            disabled={filtered.length === 0 || selected.length >= MAX_SELECTION}>
            All Visible
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearAll}
            disabled={selected.length === 0}>
            Clear
          </Button>
        </div>

        {/* Selection count */}
        <div className="flex items-center gap-2 min-h-[22px]">
          {selected.length > 0 && (
            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
              {selected.length} / {MAX_SELECTION} selected
            </Badge>
          )}
          <span className="text-xs text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {candidates.length !== filtered.length ? ` of ${candidates.length}` : ''}
          </span>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {candidates.length === 0
                ? 'No subscriber or report data loaded'
                : 'No matches found'}
            </div>
          ) : (
            filtered.map(c => (
              <label
                key={c.serial}
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox
                  checked={isSelected(c.serial)}
                  onCheckedChange={() => toggle(c.serial)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate text-gray-900">
                      {c.displayName || <span className="text-gray-400 italic">No name</span>}
                    </span>
                    <span className="text-xs text-gray-400 font-mono shrink-0">{c.serial}</span>
                  </div>
                  {c.address && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{c.address}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleExport}
            disabled={selected.length === 0 || loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? 'Generating…' : `Export ${selected.length > 0 ? `(${selected.length})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}