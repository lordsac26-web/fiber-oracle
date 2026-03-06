import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Info, RotateCcw } from 'lucide-react';

export default function ThresholdSettingsDialog({
  open,
  onOpenChange,
  thresholds,
  onUpdate,
  onSave,
  onReset,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Analysis Thresholds
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Optical Power Thresholds */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">Optical Power (dBm)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">ONT Rx Critical (&lt;)</Label>
                <Input type="number" step="0.1" value={thresholds.OntRxOptPwr.low}
                  onChange={(e) => onUpdate('OntRxOptPwr', 'low', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ONT Rx Warning (&lt;)</Label>
                <Input type="number" step="0.1" value={thresholds.OntRxOptPwr.marginal}
                  onChange={(e) => onUpdate('OntRxOptPwr', 'marginal', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">ONT Rx High (&gt;)</Label>
                <Input type="number" step="0.1" value={thresholds.OntRxOptPwr.high}
                  onChange={(e) => onUpdate('OntRxOptPwr', 'high', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">OLT Rx Critical (&lt;)</Label>
                <Input type="number" step="0.1" value={thresholds.OLTRXOptPwr.low}
                  onChange={(e) => onUpdate('OLTRXOptPwr', 'low', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">OLT Rx Warning (&lt;)</Label>
                <Input type="number" step="0.1" value={thresholds.OLTRXOptPwr.marginal}
                  onChange={(e) => onUpdate('OLTRXOptPwr', 'marginal', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">OLT Rx High (&gt;)</Label>
                <Input type="number" step="0.1" value={thresholds.OLTRXOptPwr.high}
                  onChange={(e) => onUpdate('OLTRXOptPwr', 'high', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Error Thresholds */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">Error Counts</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">BIP Errors Warning (≥)</Label>
                <Input type="number" value={thresholds.UpstreamBipErrors.warning}
                  onChange={(e) => { onUpdate('UpstreamBipErrors', 'warning', e.target.value); onUpdate('DownstreamBipErrors', 'warning', e.target.value); }} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">BIP Errors Critical (≥)</Label>
                <Input type="number" value={thresholds.UpstreamBipErrors.critical}
                  onChange={(e) => { onUpdate('UpstreamBipErrors', 'critical', e.target.value); onUpdate('DownstreamBipErrors', 'critical', e.target.value); }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">FEC Uncorrected Warning (≥)</Label>
                <Input type="number" value={thresholds.UpstreamFecUncorrectedCodeWords.warning}
                  onChange={(e) => { onUpdate('UpstreamFecUncorrectedCodeWords', 'warning', e.target.value); onUpdate('DownstreamFecUncorrectedCodeWords', 'warning', e.target.value); }} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">FEC Uncorrected Critical (≥)</Label>
                <Input type="number" value={thresholds.UpstreamFecUncorrectedCodeWords.critical}
                  onChange={(e) => { onUpdate('UpstreamFecUncorrectedCodeWords', 'critical', e.target.value); onUpdate('DownstreamFecUncorrectedCodeWords', 'critical', e.target.value); }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Missed Bursts Warning (≥)</Label>
                <Input type="number" value={thresholds.UpstreamMissedBursts.warning}
                  onChange={(e) => onUpdate('UpstreamMissedBursts', 'warning', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Missed Bursts Critical (≥)</Label>
                <Input type="number" value={thresholds.UpstreamMissedBursts.critical}
                  onChange={(e) => onUpdate('UpstreamMissedBursts', 'critical', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 inline mr-2" />
            Note: Changes apply to exports and reports. Re-upload the file to re-analyze with new thresholds.
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Defaults
          </Button>
          <Button onClick={onSave}>Save Thresholds</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}