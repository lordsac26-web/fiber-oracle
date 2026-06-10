import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Flag, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ontToAlertPayload, PRIORITY_STYLES } from './ontAlertUtils';

const PRIORITIES = ['high', 'medium', 'low'];

/**
 * FlagOntDialog — flag one or more ONTs into the Alerts section.
 *
 * Props:
 *   onts      : array of in-memory ONT objects to flag (1+)
 *   reportId  : current PONPMReport id (for traceability)
 *   open / onOpenChange
 *   onFlagged : callback after successful create (e.g. to clear selection)
 */
export default function FlagOntDialog({ onts = [], reportId, open, onOpenChange, onFlagged }) {
  const [priority, setPriority] = useState('medium');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const count = onts.length;

  const handleFlag = async () => {
    if (count === 0) return;
    setSaving(true);
    try {
      let me = null;
      try { me = await base44.auth.me(); } catch { /* ignore */ }

      // Skip ONTs already flagged & still open (avoid duplicates).
      const serials = onts.map(o => o.SerialNumber).filter(Boolean);
      const existing = serials.length
        ? await base44.entities.ONTAlert.filter({ status: 'open', serial_number: { $in: serials } }, '-created_date', 1000)
        : [];
      const existingSerials = new Set(existing.map(a => a.serial_number));

      const payloads = onts
        .filter(o => o.SerialNumber && !existingSerials.has(o.SerialNumber))
        .map(o => ({ ...ontToAlertPayload(o, { reportId, priority, note }), flagged_by: me?.email }));

      if (payloads.length === 0) {
        toast.info('All selected ONTs are already flagged');
        onOpenChange(false);
        return;
      }

      await base44.entities.ONTAlert.bulkCreate(payloads);
      const skipped = count - payloads.length;
      toast.success(`Flagged ${payloads.length} ONT${payloads.length > 1 ? 's' : ''}${skipped ? ` (${skipped} already flagged)` : ''}`);
      setNote('');
      setPriority('medium');
      onOpenChange(false);
      onFlagged?.();
    } catch (err) {
      console.error('Flag ONT error:', err);
      toast.error('Failed to flag ONTs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Flag {count} ONT{count > 1 ? 's' : ''} to Alerts
          </DialogTitle>
          <DialogDescription>
            Flagged ONTs appear in the Alerts section where you can create work orders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview of what will be flagged */}
          <div className="max-h-32 overflow-y-auto rounded-md border bg-gray-50 dark:bg-gray-900 p-2 space-y-1">
            {onts.slice(0, 30).map((o, i) => (
              <div key={o.SerialNumber || i} className="flex items-center justify-between text-xs">
                <span className="font-mono truncate mr-2">{o.SerialNumber || o.OntID || 'Unknown'}</span>
                <span className="text-gray-500 truncate">{o._subscriber?.name || o._oltName || ''}</span>
              </div>
            ))}
            {count > 30 && <div className="text-xs text-gray-400 text-center pt-1">+{count - 30} more</div>}
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                    priority === p ? PRIORITY_STYLES[p] + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's wrong / what needs attention..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleFlag} disabled={saving || count === 0} className="bg-red-600 hover:bg-red-700">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
            Flag {count > 1 ? `${count} ONTs` : 'ONT'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}