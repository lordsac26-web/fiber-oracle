import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Detects PONPMReport records that are still being indexed in the background
 * (processing_status === 'pending' or 'saving').
 *
 * Returns a single source of truth used by:
 *  - the global progress banner (so it survives page navigation / refresh)
 *  - the upload UI (to block new uploads while one is in flight)
 *
 * Strategy:
 *  - Initial fetch via list, filtered client-side (entity .filter with $in
 *    isn't reliable across all envs, and the dataset of pending reports is
 *    always tiny — at most a handful).
 *  - Real-time updates via base44.entities.PONPMReport.subscribe so we don't
 *    poll. Any status change invalidates the query.
 */
export function useProcessingReports() {
  const queryClient = useQueryClient();

  const { data: processingReports = [] } = useQuery({
    queryKey: ['processingPonPmReports'],
    queryFn: async () => {
      // Pull the most recent ~25 reports — processing ones are always at the top
      // because they were just created. Filter client-side for in-flight states.
      const recent = await base44.entities.PONPMReport.list('-created_date', 25);
      return recent.filter(
        (r) => r.processing_status === 'pending' || r.processing_status === 'saving'
      );
    },
    // Light background refresh as a safety net in case a subscription event is missed.
    refetchInterval: 15000,
    staleTime: 5000,
  });

  // Subscribe to entity updates so the banner reacts in real time without polling.
  useEffect(() => {
    const unsubscribe = base44.entities.PONPMReport.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['processingPonPmReports'] });
    });
    return () => unsubscribe();
  }, [queryClient]);

  const activeReport = useMemo(() => {
    if (!processingReports.length) return null;
    // Most-recent first
    return processingReports[0];
  }, [processingReports]);

  return {
    isProcessing: !!activeReport,
    activeReport,
    processingReports,
  };
}