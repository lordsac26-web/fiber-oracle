import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Clipboard } from 'lucide-react';
import { formatUptime } from '@/components/ponpm/formatUptime';
import ONTSparkline from '@/components/ponpm/ONTSparkline';

const STATUS_COLORS = { critical: 'bg-red-500', warning: 'bg-amber-500', ok: 'bg-green-500', offline: 'bg-purple-500' };

export default function ONTTableRow({ ont, hasSubscriberData, hasSparklines, onSelectDetail, onCreateJobReport }) {
  const cellCls = "px-1.5 py-1 text-[10px]";
  const monoCls = `${cellCls} font-mono`;
  const rightMono = `${monoCls} text-right`;

  return (
    <TableRow className={`${
      ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
      ont._analysis.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' :
      ont._analysis.status === 'offline' ? 'bg-purple-50 dark:bg-purple-900/10' : ''
    }`}>
      <TableCell className="px-1 py-1"><div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[ont._analysis.status]}`} /></TableCell>
      <TableCell className={monoCls}>{ont.OntID || '-'}</TableCell>
      {hasSubscriberData && (
        <TableCell className={`${cellCls} max-w-[120px]`}>
          {ont._subscriber ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="truncate text-left">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{ont._subscriber.name || ont._subscriber.account || '-'}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-left text-xs">
                  {ont._subscriber.name && <div><strong>Name:</strong> {ont._subscriber.name}</div>}
                  {ont._subscriber.account && <div><strong>Acct:</strong> {ont._subscriber.account}</div>}
                  {ont._subscriber.address && <div><strong>Addr:</strong> {ont._subscriber.address}</div>}
                  {ont._subscriber.city && <div><strong>City:</strong> {ont._subscriber.city} {ont._subscriber.zip}</div>}
                  {ont._subscriber.softwareVersion && <div><strong>SW:</strong> {ont._subscriber.softwareVersion}</div>}
                  {ont._subscriber.ontRanged && <div><strong>Ranged:</strong> {ont._subscriber.ontRanged}</div>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : <span className="text-gray-400">-</span>}
        </TableCell>
      )}
      <TableCell className={cellCls}>
        {ont._lcpNumber ? (
          <span className="text-blue-600 font-medium">{ont._lcpNumber}/{ont._splitterNumber}</span>
        ) : '-'}
      </TableCell>
      <TableCell className={`${monoCls} max-w-[80px] truncate`}>{ont.SerialNumber || '-'}</TableCell>
      <TableCell className={`${cellCls} max-w-[60px] truncate`}>{ont._subscriber?.model || ont.model || '-'}</TableCell>
      {/* ONT Rx */}
      <TableCell className={rightMono}>
        <span className={parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' : parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' : ''}>{ont.OntRxOptPwr || '-'}</span>
        {ont._trends?.ont_rx_change != null && <div className={`text-[8px] leading-tight ${ont._trends.ont_rx_change < -1 ? 'text-red-600' : ont._trends.ont_rx_change > 1 ? 'text-green-600' : 'text-gray-400'}`}>{ont._trends.ont_rx_change < -0.1 ? '↓' : ont._trends.ont_rx_change > 0.1 ? '↑' : '→'}{Math.abs(ont._trends.ont_rx_change).toFixed(1)}</div>}
      </TableCell>
      {/* Rx Sparkline */}
      {hasSparklines && (
        <TableCell className="px-0.5 py-1">
          <ONTSparkline data={ont._sparklines?.rx} type="rx" width={68} height={26} />
        </TableCell>
      )}
      {/* OLT Rx */}
      <TableCell className={rightMono}>
        <span className={parseFloat(ont.OLTRXOptPwr) < -30 ? 'text-red-600 font-bold' : parseFloat(ont.OLTRXOptPwr) < -28 ? 'text-amber-600' : ''}>{ont.OLTRXOptPwr || '-'}</span>
        {ont._trends?.olt_rx_change != null && <div className={`text-[8px] leading-tight ${ont._trends.olt_rx_change < -1 ? 'text-red-600' : ont._trends.olt_rx_change > 1 ? 'text-green-600' : 'text-gray-400'}`}>{ont._trends.olt_rx_change < -0.1 ? '↓' : ont._trends.olt_rx_change > 0.1 ? '↑' : '→'}{Math.abs(ont._trends.olt_rx_change).toFixed(1)}</div>}
      </TableCell>
      {/* US BIP */}
      <TableCell className={rightMono}>
        <span className={parseInt(ont.UpstreamBipErrors) > 100 ? 'text-amber-600' : ''}>{ont.UpstreamBipErrors || '0'}</span>
        {ont._trends?.us_bip_change != null && ont._trends.us_bip_change !== 0 && <div className={`text-[8px] leading-tight ${ont._trends.us_bip_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.us_bip_change > 0 ? '+' : ''}{ont._trends.us_bip_change}</div>}
      </TableCell>
      {/* DS BIP */}
      <TableCell className={rightMono}>
        <span className={parseInt(ont.DownstreamBipErrors) > 100 ? 'text-amber-600' : ''}>{ont.DownstreamBipErrors || '0'}</span>
        {ont._trends?.ds_bip_change != null && ont._trends.ds_bip_change !== 0 && <div className={`text-[8px] leading-tight ${ont._trends.ds_bip_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.ds_bip_change > 0 ? '+' : ''}{ont._trends.ds_bip_change}</div>}
      </TableCell>
      {/* US FEC Unc */}
      <TableCell className={rightMono}>
        <span className={parseInt(ont.UpstreamFecUncorrectedCodeWords) > 10 ? 'text-amber-600' : ''}>{ont.UpstreamFecUncorrectedCodeWords || '0'}</span>
        {ont._trends?.us_fec_change != null && ont._trends.us_fec_change !== 0 && <div className={`text-[8px] leading-tight ${ont._trends.us_fec_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.us_fec_change > 0 ? '+' : ''}{ont._trends.us_fec_change}</div>}
      </TableCell>
      {/* FEC Sparkline */}
      {hasSparklines && (
        <TableCell className="px-0.5 py-1">
          <ONTSparkline data={ont._sparklines?.fec} type="fec" width={68} height={26} />
        </TableCell>
      )}
      {/* DS FEC Unc */}
      <TableCell className={rightMono}>
        <span className={parseInt(ont.DownstreamFecUncorrectedCodeWords) > 10 ? 'text-amber-600' : ''}>{ont.DownstreamFecUncorrectedCodeWords || '0'}</span>
        {ont._trends?.ds_fec_change != null && ont._trends.ds_fec_change !== 0 && <div className={`text-[8px] leading-tight ${ont._trends.ds_fec_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.ds_fec_change > 0 ? '+' : ''}{ont._trends.ds_fec_change}</div>}
      </TableCell>
      <TableCell className={rightMono}>{ont.UpstreamFecCorrectedCodeWords || '0'}</TableCell>
      <TableCell className={rightMono}>{ont.DownstreamFecCorrectedCodeWords || '0'}</TableCell>
      <TableCell className={rightMono}>
        <span className={parseInt(ont.UpstreamMissedBursts) >= 10 ? 'text-amber-600' : ''}>{ont.UpstreamMissedBursts || '0'}</span>
      </TableCell>
      <TableCell className={rightMono}>
        <span className={parseInt(ont.UpstreamGemHecErrors) >= 10 ? 'text-amber-600' : ''}>{ont.UpstreamGemHecErrors || '0'}</span>
      </TableCell>
      <TableCell className={`${cellCls} text-gray-500 whitespace-nowrap`}>{formatUptime(ont.upTime)}</TableCell>
      {/* Issues — compact badges */}
      <TableCell className={cellCls}>
        <TooltipProvider>
          <div className="flex flex-wrap gap-0.5">
            {ont._analysis.issues.slice(0, 2).map((issue, i) => (
              <Tooltip key={i}><TooltipTrigger><Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight bg-red-50 border-red-300 text-red-700">{issue.field}</Badge></TooltipTrigger><TooltipContent className="text-xs">{issue.message}</TooltipContent></Tooltip>
            ))}
            {ont._analysis.warnings.slice(0, 2).map((warn, i) => (
              <Tooltip key={`w-${i}`}><TooltipTrigger><Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight bg-amber-50 border-amber-300 text-amber-700">{warn.field}</Badge></TooltipTrigger><TooltipContent className="text-xs">{warn.message}</TooltipContent></Tooltip>
            ))}
            {(ont._analysis.issues.length + ont._analysis.warnings.length) > 4 && (
              <Badge variant="outline" className="text-[8px] px-1 py-0">+{ont._analysis.issues.length + ont._analysis.warnings.length - 4}</Badge>
            )}
          </div>
        </TooltipProvider>
      </TableCell>
      {/* Actions — icon-only buttons with tooltips */}
      <TableCell className="px-1 py-1">
        <TooltipProvider>
          <div className="flex gap-0.5">
            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelectDetail(ont); }} className="h-6 w-6">
                <Activity className="h-3 w-3" />
              </Button>
            </TooltipTrigger><TooltipContent className="text-xs">Details</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onCreateJobReport(ont); }} className="h-6 w-6">
                <Clipboard className="h-3 w-3" />
              </Button>
            </TooltipTrigger><TooltipContent className="text-xs">Create Job Report</TooltipContent></Tooltip>
          </div>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}