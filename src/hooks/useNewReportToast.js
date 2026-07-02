import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { subscribePonPmReport } from '@/components/ponpm/ponPmReportBus';

/**
 * Real-time subscription on PONPMReport entity.
 * Shows a toast when a *new* report is created by another user (or the
 * current user in another tab), giving the team instant awareness.
 *
 * @param {Function} onReportAvailable - Called with the new report data
 *   so the caller can refresh the report list / auto-load.
 */
export function useNewReportToast(onReportAvailable) {
  // Track IDs of reports we know about to avoid toasting our own uploads
  const knownIdsRef = useRef(new Set());
  const initializedRef = useRef(false);

  // Hold the latest callback in a ref so the WebSocket subscription effect
  // doesn't tear down and re-establish whenever the parent's callback identity
  // changes (e.g. when it captures state like `result`).
  const callbackRef = useRef(onReportAvailable);
  callbackRef.current = onReportAvailable;

  useEffect(() => {
    // Seed known IDs from the first list load to avoid false positives on mount
    base44.entities.PONPMReport.list('-upload_date', 50)
      .then(reports => {
        reports.forEach(r => knownIdsRef.current.add(r.id));
        initializedRef.current = true;
      })
      .catch(() => { initializedRef.current = true; });

    const unsubscribe = subscribePonPmReport((event) => {
      if (!initializedRef.current) return;

      if (event.type === 'create' && event.data && !knownIdsRef.current.has(event.id)) {
        knownIdsRef.current.add(event.id);
        const name = event.data.report_name || 'New report';
        const ontCount = event.data.ont_count;
        toast.info(
          `📡 ${name}${ontCount ? ` (${ontCount.toLocaleString()} ONTs)` : ''} — click to load`,
          {
            duration: 15000,
            action: {
              label: 'Load',
              onClick: () => callbackRef.current?.(event.data),
            },
          }
        );
      }

      // Also notify when processing completes (another user's upload finished indexing)
      if (event.type === 'update' && event.data?.processing_status === 'completed') {
        if (!knownIdsRef.current.has(event.id)) {
          knownIdsRef.current.add(event.id);
        }
      }
    });

    return unsubscribe;
  }, []);
}