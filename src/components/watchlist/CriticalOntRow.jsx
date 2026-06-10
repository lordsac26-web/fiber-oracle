import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Activity, MapPin } from 'lucide-react';
import MetricDeltaCell from './MetricDeltaCell';

/**
 * CriticalOntRow — one ONT in the watchlist. Renders identity + current
 * metrics with their 5/10-report deltas. Pure presentation.
 */
export default function CriticalOntRow({ ont, rank, onDrillDown }) {
  const c = ont.current || {};
  const d = ont.deltas || {};

  return (
    <tr className="border-b hover:bg-red-50/40 dark:hover:bg-red-900/10 transition-colors">
      <td className="px-2 py-1 text-center text-xs text-gray-400 font-mono">{rank}</td>
      <td className="px-2 py-1">
        <button
          onClick={() => onDrillDown?.(ont)}
          className="text-left group"
          title="View ONT details"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold group-hover:text-blue-600">{ont.serial_number}</span>
            <Activity className="h-3 w-3 text-gray-300 group-hover:text-blue-500" />
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-1.5 flex-wrap mt-0.5">
            {ont.olt_name && <span>{ont.olt_name}</span>}
            {ont.port && <span>• {ont.port}</span>}
            {ont.lcp_number && <span>• LCP {ont.lcp_number}{ont.splitter_number ? `/${ont.splitter_number}` : ''}</span>}
          </div>
          {(ont.subscriber_name || ont.subscriber_address) && (
            <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 max-w-[220px] truncate">
              {ont.subscriber_name}
              {ont.subscriber_address && <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{ont.subscriber_address}</span>}
            </div>
          )}
        </button>
      </td>
      <td className="px-2 py-1 text-center">
        <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300">{ont.report_count}r</Badge>
      </td>

      {/* Power — higher (less negative) is better */}
      <MetricDeltaCell d={d.ont_rx_power} higherIsWorse={false} decimals={1} />
      <MetricDeltaCell d={d.olt_rx_power} higherIsWorse={false} decimals={1} />

      {/* Error counters — higher is worse */}
      <MetricDeltaCell d={d.us_bip_errors} higherIsWorse />
      <MetricDeltaCell d={d.ds_bip_errors} higherIsWorse />
      <MetricDeltaCell d={d.us_fec_uncorrected} higherIsWorse />
      <MetricDeltaCell d={d.ds_fec_uncorrected} higherIsWorse />
      <MetricDeltaCell d={d.us_gem_hec_errors} higherIsWorse />
      <MetricDeltaCell d={d.us_missed_bursts} higherIsWorse />
    </tr>
  );
}