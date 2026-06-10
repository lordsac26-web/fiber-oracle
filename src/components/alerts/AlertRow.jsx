import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, MapPin, Trash2, CheckCircle2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { PRIORITY_STYLES, ONT_STATUS_STYLES } from './ontAlertUtils';

/**
 * AlertRow — a single flagged ONT in the Alerts list.
 * Pure presentation; all actions bubble up to the Alerts page.
 */
export default function AlertRow({ alert, selectable, isSelected, onToggleSelect, onDrillDown, onResolve, onDelete }) {
  const isResolved = alert.status === 'resolved';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      isSelected ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
    }`}>
      {selectable && !isResolved && (
        <input
          type="checkbox"
          checked={!!isSelected}
          onChange={() => onToggleSelect?.(alert)}
          className="rounded border-gray-300 cursor-pointer flex-shrink-0"
          aria-label={`Select alert ${alert.serial_number}`}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-sm truncate">{alert.serial_number}</span>
          {alert.ont_status && (
            <Badge variant="outline" className={`text-[10px] ${ONT_STATUS_STYLES[alert.ont_status] || ''}`}>
              {alert.ont_status}
            </Badge>
          )}
          <Badge variant="outline" className={`text-[10px] capitalize ${PRIORITY_STYLES[alert.priority] || ''}`}>
            {alert.priority}
          </Badge>
          {alert.job_report_id && (
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
              <ClipboardList className="h-2.5 w-2.5 mr-0.5" /> Work order
            </Badge>
          )}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">
          {alert.issue_summary || 'Flagged'}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
          {alert.subscriber_name && <span>{alert.subscriber_name}</span>}
          {(alert.olt_name || alert.port) && <span>• {[alert.olt_name, alert.port].filter(Boolean).join(' / ')}</span>}
          {alert.lcp_number && <span>• LCP {alert.lcp_number}{alert.splitter_number ? `/${alert.splitter_number}` : ''}</span>}
          {alert.subscriber_address && (
            <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{alert.subscriber_address}</span>
          )}
        </div>
        {alert.note && <div className="text-[11px] text-gray-500 italic mt-0.5">“{alert.note}”</div>}
        <div className="text-[10px] text-gray-400 mt-0.5">
          Flagged {alert.created_date ? format(new Date(alert.created_date), 'MMM d, yyyy h:mm a') : ''}
          {alert.flagged_by ? ` by ${alert.flagged_by}` : ''}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" title="View ONT details" onClick={() => onDrillDown?.(alert)}>
          <Activity className="h-4 w-4" />
        </Button>
        {!isResolved && (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700" title="Resolve" onClick={() => onResolve?.(alert)}>
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" title="Delete alert" onClick={() => onDelete?.(alert)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}