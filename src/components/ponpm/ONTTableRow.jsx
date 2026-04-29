import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Clipboard } from 'lucide-react';
import { formatUptime } from '@/components/ponpm/formatUptime';

const STATUS_COLORS = { critical: 'bg-red-500', warning: 'bg-amber-500', ok: 'bg-green-500', offline: 'bg-purple-500' };

export default function ONTTableRow({ ont, hasSubscriberData, onSelectDetail, onCreateJobReport }) {
  return (
    <TableRow className={
      ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
      ont._analysis.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' :
      ont._analysis.status === 'offline' ? 'bg-purple-50 dark:bg-purple-900/10' : ''
    }>
      <TableCell><div className={`w-3 h-3 rounded-full ${STATUS_COLORS[ont._analysis.status]}`} /></TableCell>
      <TableCell className="font-mono">{ont.OntID || '-'}</TableCell>
      {hasSubscriberData && (
        <TableCell className="text-xs max-w-[180px]">
          {ont._subscriber ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="truncate text-left">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{ont._subscriber.name || ont._subscriber.account || '-'}</div>
                    {ont._subscriber.address && <div className="text-gray-500 truncate">{ont._subscriber.address}</div>}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-left">
                  {ont._subscriber.name && <div><strong>Subscriber:</strong> {ont._subscriber.name}</div>}
                  {ont._subscriber.account && <div><strong>Account:</strong> {ont._subscriber.account}</div>}
                  {ont._subscriber.address && <div><strong>Address:</strong> {ont._subscriber.address}</div>}
                  {ont._subscriber.city && <div><strong>City:</strong> {ont._subscriber.city} {ont._subscriber.zip}</div>}
                  {ont._subscriber.softwareVersion && <div><strong>SW:</strong> {ont._subscriber.softwareVersion}</div>}
                  {ont._subscriber.ontRanged && <div><strong>Ranged:</strong> {ont._subscriber.ontRanged}</div>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : <span className="text-gray-400">-</span>}
        </TableCell>
      )}
      <TableCell className="text-xs">
        {ont._lcpNumber ? (
          <TooltipProvider><Tooltip><TooltipTrigger>
            <span className="text-blue-600 font-medium">{ont._lcpNumber}/{ont._splitterNumber}</span>
          </TooltipTrigger><TooltipContent>
            {ont._lcpLocation && <div>{ont._lcpLocation}</div>}
            {ont._lcpAddress && <div className="text-gray-400">{ont._lcpAddress}</div>}
          </TooltipContent></Tooltip></TooltipProvider>
        ) : '-'}
      </TableCell>
      <TableCell className="font-mono text-xs">{ont.SerialNumber || '-'}</TableCell>
      <TableCell className="text-xs">{ont.model || '-'}</TableCell>
      <TableCell className="text-right font-mono text-xs">
        <div className="flex flex-col items-end gap-0.5">
          <span className={parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' : parseFloat(ont.OntRxOptPwr) < -25 ? 'text-amber-600' : ''}>{ont.OntRxOptPwr || '-'}</span>
          {ont._trends?.ont_rx_change != null && <span className={`text-[9px] flex items-center gap-0.5 ${ont._trends.ont_rx_change < -1 ? 'text-red-600' : ont._trends.ont_rx_change > 1 ? 'text-green-600' : 'text-gray-500'}`}>{ont._trends.ont_rx_change < -0.1 ? '↓' : ont._trends.ont_rx_change > 0.1 ? '↑' : '→'}{Math.abs(ont._trends.ont_rx_change).toFixed(1)}dB</span>}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        <div className="flex flex-col items-end gap-0.5">
          <span className={parseFloat(ont.OLTRXOptPwr) < -30 ? 'text-red-600 font-bold' : parseFloat(ont.OLTRXOptPwr) < -28 ? 'text-amber-600' : ''}>{ont.OLTRXOptPwr || '-'}</span>
          {ont._trends?.olt_rx_change != null && <span className={`text-[9px] flex items-center gap-0.5 ${ont._trends.olt_rx_change < -1 ? 'text-red-600' : ont._trends.olt_rx_change > 1 ? 'text-green-600' : 'text-gray-500'}`}>{ont._trends.olt_rx_change < -0.1 ? '↓' : ont._trends.olt_rx_change > 0.1 ? '↑' : '→'}{Math.abs(ont._trends.olt_rx_change).toFixed(1)}dB</span>}
        </div>
      </TableCell>
      {/* US BIP */}
      <TableCell className="text-right font-mono text-xs">
        <div className="flex flex-col items-end gap-0.5">
          <span className={parseInt(ont.UpstreamBipErrors) > 100 ? 'text-amber-600' : ''}>{ont.UpstreamBipErrors || '0'}</span>
          {ont._trends?.us_bip_change != null && ont._trends.us_bip_change !== 0 && <span className={`text-[9px] ${ont._trends.us_bip_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.us_bip_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.us_bip_change)}</span>}
        </div>
      </TableCell>
      {/* DS BIP */}
      <TableCell className="text-right font-mono text-xs">
        <div className="flex flex-col items-end gap-0.5">
          <span className={parseInt(ont.DownstreamBipErrors) > 100 ? 'text-amber-600' : ''}>{ont.DownstreamBipErrors || '0'}</span>
          {ont._trends?.ds_bip_change != null && ont._trends.ds_bip_change !== 0 && <span className={`text-[9px] ${ont._trends.ds_bip_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.ds_bip_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.ds_bip_change)}</span>}
        </div>
      </TableCell>
      {/* US FEC Unc */}
      <TableCell className="text-right font-mono text-xs">
        <div className="flex flex-col items-end gap-0.5">
          <span className={parseInt(ont.UpstreamFecUncorrectedCodeWords) > 10 ? 'text-amber-600' : ''}>{ont.UpstreamFecUncorrectedCodeWords || '0'}</span>
          {ont._trends?.us_fec_change != null && ont._trends.us_fec_change !== 0 && <span className={`text-[9px] ${ont._trends.us_fec_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.us_fec_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.us_fec_change)}</span>}
        </div>
      </TableCell>
      {/* DS FEC Unc */}
      <TableCell className="text-right font-mono text-xs">
        <div className="flex flex-col items-end gap-0.5">
          <span className={parseInt(ont.DownstreamFecUncorrectedCodeWords) > 10 ? 'text-amber-600' : ''}>{ont.DownstreamFecUncorrectedCodeWords || '0'}</span>
          {ont._trends?.ds_fec_change != null && ont._trends.ds_fec_change !== 0 && <span className={`text-[9px] ${ont._trends.ds_fec_change > 0 ? 'text-red-600' : 'text-green-600'}`}>{ont._trends.ds_fec_change > 0 ? '↑' : '↓'}{Math.abs(ont._trends.ds_fec_change)}</span>}
        </div>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">{ont.UpstreamFecCorrectedCodeWords || '0'}</TableCell>
      <TableCell className="text-right font-mono text-xs">{ont.DownstreamFecCorrectedCodeWords || '0'}</TableCell>
      <TableCell className="text-right font-mono text-xs">
        <span className={parseInt(ont.UpstreamMissedBursts) >= 10 ? 'text-amber-600' : ''}>{ont.UpstreamMissedBursts || '0'}</span>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        <span className={parseInt(ont.UpstreamGemHecErrors) >= 10 ? 'text-amber-600' : ''}>{ont.UpstreamGemHecErrors || '0'}</span>
      </TableCell>
      <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatUptime(ont.upTime)}</TableCell>
      <TableCell>
        <TooltipProvider>
          <div className="flex flex-wrap gap-1">
            {ont._analysis.issues.slice(0, 2).map((issue, i) => (
              <Tooltip key={i}><TooltipTrigger><Badge variant="outline" className="text-[10px] bg-red-50 border-red-300 text-red-700">{issue.field}</Badge></TooltipTrigger><TooltipContent>{issue.message}</TooltipContent></Tooltip>
            ))}
            {ont._analysis.warnings.slice(0, 2).map((warn, i) => (
              <Tooltip key={`w-${i}`}><TooltipTrigger><Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-300 text-amber-700">{warn.field}</Badge></TooltipTrigger><TooltipContent>{warn.message}</TooltipContent></Tooltip>
            ))}
            {(ont._analysis.issues.length + ont._analysis.warnings.length) > 4 && (
              <Badge variant="outline" className="text-[10px]">+{ont._analysis.issues.length + ont._analysis.warnings.length - 4}</Badge>
            )}
          </div>
        </TooltipProvider>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSelectDetail(ont); }} className="text-xs h-7 gap-1"><Activity className="h-3 w-3" />Details</Button>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onCreateJobReport(ont); }} className="text-xs h-7 gap-1"><Clipboard className="h-3 w-3" />Job</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}