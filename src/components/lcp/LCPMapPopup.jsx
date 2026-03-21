import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, RadioTower } from 'lucide-react';

function formatPower(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(1)} dBm` : '—';
}

export default function LCPMapPopup({ group, onOpenDetails }) {
  const previewRecords = (group.ontRecords || []).slice(0, 5);

  return (
    <div className="min-w-[280px] max-w-[320px]">
      <div className="font-bold text-lg text-indigo-600">{group.lcp_number}</div>
      {group.splitterLabel && (
        <div className="text-sm text-gray-600 mb-1">{group.splitterLabel}</div>
      )}
      {group.location && (
        <div className="flex items-start gap-1 text-sm mb-2">
          <MapPin className="h-3 w-3 mt-0.5 text-gray-400 shrink-0" />
          <span>{group.location}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-3">
        {group.oltNames?.slice(0, 2).map((olt) => (
          <Badge key={olt} variant="outline" className="text-[10px]">
            <RadioTower className="h-3 w-3 mr-1" />
            {olt}
          </Badge>
        ))}
        {group.oltNames?.length > 2 && (
          <Badge variant="outline" className="text-[10px]">+{group.oltNames.length - 2} OLTs</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-red-700">
          {group.issueSummary.critical} critical
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-700">
          {group.issueSummary.warning} warning
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-slate-700">
          {group.issueSummary.offline} offline
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-700">
          {group.issueSummary.ok} healthy
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-2 mb-3 text-xs text-blue-800">
        <div>Latest report: {group.latestReportName || 'Unavailable'}</div>
        <div>Avg ONT Rx: {formatPower(group.performanceSummary?.avgOntRx)}</div>
        <div>Low-power ONTs: {group.performanceSummary?.lowPowerCount || 0}</div>
      </div>

      {previewRecords.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500">Latest ONT Performance</div>
          <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
            {previewRecords.map((record) => (
              <div key={record.id} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-gray-700">{record.serial_number || 'Unknown ONT'}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{record.status}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-gray-500">
                  <span>Splitter {record.splitter_number || '—'}</span>
                  <span>ONT Rx {formatPower(record.ont_rx_power)}</span>
                </div>
              </div>
            ))}
          </div>
          {group.ontRecords.length > previewRecords.length && (
            <div className="text-[11px] text-gray-500">
              Showing {previewRecords.length} of {group.ontRecords.length} ONTs
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500 mb-3">No latest ONT performance data found for this LCP.</div>
      )}

      <Button size="sm" className="mt-3 w-full" onClick={onOpenDetails}>
        Open Full Details
      </Button>
    </div>
  );
}