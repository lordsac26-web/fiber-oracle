import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react';
import { cn } from "@/lib/utils";

const STATUS_META = {
  critical: {
    label: 'Critical',
    icon: AlertTriangle,
    badgeClassName: 'border-red-200 bg-red-50 text-red-700',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    badgeClassName: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  offline: {
    label: 'Offline',
    icon: WifiOff,
    badgeClassName: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  ok: {
    label: 'Healthy',
    icon: CheckCircle2,
    badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

function formatPower(value) {
  return typeof value === 'number' && !Number.isNaN(value) ? `${value.toFixed(2)} dBm` : '—';
}

export default function LCPIssueList({ issueRecords = [] }) {
  if (!issueRecords.length) {
    return (
      <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
        No active ONT issues are linked to this LCP in the latest PON PM report.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issueRecords.map((record) => {
        const normalizedStatus = (record.status || 'ok').toLowerCase();
        const meta = STATUS_META[normalizedStatus] || STATUS_META.ok;
        const Icon = meta.icon;

        return (
          <div
            key={record.id || `${record.serial_number}-${record.ont_id}`}
            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {record.serial_number || 'Unknown ONT'}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ONT {record.ont_id || '—'} • Splitter {record.splitter_number || '—'}
                </div>
              </div>
              <Badge variant="outline" className={cn('gap-1', meta.badgeClassName)}>
                <Icon className="h-3 w-3" />
                {meta.label}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="rounded-md bg-gray-50 px-2 py-1.5 dark:bg-gray-900">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">ONT Rx</div>
                <div className="font-medium">{formatPower(record.ont_rx_power)}</div>
              </div>
              <div className="rounded-md bg-gray-50 px-2 py-1.5 dark:bg-gray-900">
                <div className="text-[11px] uppercase tracking-wide text-gray-400">OLT Rx</div>
                <div className="font-medium">{formatPower(record.olt_rx_power)}</div>
              </div>
            </div>

            {record.olt_name && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {record.olt_name} • {record.shelf_slot_port || 'No port path'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}