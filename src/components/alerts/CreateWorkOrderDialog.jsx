import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * CreateWorkOrderDialog — creates ONE grouped JobReport (work order) that lists
 * all selected alerts as line items, then links each alert to that JobReport
 * and marks them resolved-into-order.
 *
 * Props:
 *   alerts   : array of ONTAlert records to group into one work order
 *   open / onOpenChange
 *   onCreated: callback after success
 */
export default function CreateWorkOrderDialog({ alerts = [], open, onOpenChange, onCreated }) {
  const [jobNumber, setJobNumber] = useState('');
  const [technician, setTechnician] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const count = alerts.length;

  // Prefill sensible defaults whenever the dialog opens with a new selection.
  useEffect(() => {
    if (!open) return;
    setJobNumber(`WO-${format(new Date(), 'yyyyMMdd-HHmm')}`);
    // If every alert shares the same address, prefill it; otherwise leave blank.
    const addrs = [...new Set(alerts.map(a => a.subscriber_address).filter(Boolean))];
    setLocation(addrs.length === 1 ? addrs[0] : '');
    // Build a line-item list of the ONTs in this order.
    const lines = alerts.map((a) => {
      const who = a.subscriber_name || a.subscriber_account || '';
      const loc = [a.olt_name, a.port].filter(Boolean).join(' / ');
      const lcp = a.lcp_number ? `LCP ${a.lcp_number}${a.splitter_number ? '/' + a.splitter_number : ''}` : '';
      return `• ${a.serial_number}${who ? ` — ${who}` : ''}${loc ? ` [${loc}]` : ''}${lcp ? ` (${lcp})` : ''}${a.issue_summary ? ` — ${a.issue_summary}` : ''}`;
    });
    setNotes(`Grouped work order for ${count} flagged ONT${count > 1 ? 's' : ''}:\n${lines.join('\n')}`);
    setTechnician('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!jobNumber.trim()) {
      toast.error('Job number is required');
      return;
    }
    setSaving(true);
    try {
      let me = null;
      try { me = await base44.auth.me(); } catch { /* ignore */ }

      const job = await base44.entities.JobReport.create({
        job_number: jobNumber.trim(),
        technician_name: technician.trim() || undefined,
        location: location.trim() || undefined,
        status: 'in_progress',
        notes,
        diagnosis_used: false,
        fiber_info: {
          source: 'ont_alerts',
          ont_count: count,
          onts: alerts.map(a => ({
            serial_number: a.serial_number,
            olt_name: a.olt_name,
            port: a.port,
            lcp_number: a.lcp_number,
            splitter_number: a.splitter_number,
            subscriber_name: a.subscriber_name,
            subscriber_address: a.subscriber_address,
            ont_status: a.ont_status,
            issue_summary: a.issue_summary,
          })),
        },
      });

      // Link each alert to the new work order and mark resolved.
      await Promise.all(alerts.map(a =>
        base44.entities.ONTAlert.update(a.id, {
          job_report_id: job.id,
          status: 'resolved',
          resolved_by: me?.email,
          resolved_date: new Date().toISOString(),
        })
      ));

      toast.success(`Work order ${job.job_number} created for ${count} ONT${count > 1 ? 's' : ''}`);
      onOpenChange(false);
      onCreated?.(job);
    } catch (err) {
      console.error('Create work order error:', err);
      toast.error('Failed to create work order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-500" />
            Create Grouped Work Order
          </DialogTitle>
          <DialogDescription>
            One work order covering {count} flagged ONT{count > 1 ? 's' : ''}. Linked alerts are marked resolved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {alerts.map(a => (
              <Badge key={a.id} variant="outline" className="font-mono text-[10px]">{a.serial_number}</Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Job Number *</Label>
              <Input value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} placeholder="WO-..." />
            </div>
            <div className="space-y-1">
              <Label>Technician</Label>
              <Input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Name or tech #" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Location / Address</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Job site / area" />
          </div>

          <div className="space-y-1">
            <Label>Work Order Details</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="font-mono text-xs" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-2" />}
            Create Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}