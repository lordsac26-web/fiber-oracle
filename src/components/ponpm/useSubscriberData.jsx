import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildSubscriberLookup, enrichOntsWithSubscriber } from './SubscriberUpload';

/**
 * Shared hook for subscriber data — loads from DB on mount, 
 * provides methods to upload new data and enrich ONTs.
 * 
 * Returns:
 *  - subscriberRecords: raw records array
 *  - subscriberLookup: lookup maps (byComposite, bySerial)
 *  - subscriberMeta: { upload_date, file_name, record_count } or null
 *  - isLoading: loading state
 *  - subscriberMatchCount: count of ONTs matched
 *  - handleSubscriberDataLoaded: callback when new data is uploaded
 *  - enrichOnts: function to enrich an ONT array in-place
 */
export function useSubscriberData() {
  const queryClient = useQueryClient();
  const [subscriberMatchCount, setSubscriberMatchCount] = useState(0);
  const subscriberLookupRef = useRef(null);

  // Load the single currently-active upload metadata.
  // Subscriber data is system-wide shared reference data — only one record
  // should ever have status='active'. We sort by -created_date as a safety
  // guard in case a transient overlap exists during an upload swap.
  const { data: metaList = [], isLoading: metaLoading } = useQuery({
    queryKey: ['subscriber-upload-meta'],
    queryFn: () => base44.entities.SubscriberUploadMeta.filter({ status: 'active' }, '-created_date', 1),
    // Short stale time so a fresh upload by ANOTHER admin/tab is picked up quickly.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const subscriberMeta = metaList.length > 0 ? metaList[0] : null;

  // Load subscriber records from DB — DISABLED by default. The fetch is
  // expensive (up to 50k records, sequentially paginated) and trips the
  // platform's read rate limit if it runs alongside other queries on page
  // load. The user must explicitly trigger it (via the "Reload subscriber
  // data" menu item or by uploading a new CSV), which calls loadNow().
  // This avoids partial silent loads after a fresh page reload.
  const [recordsEnabled, setRecordsEnabled] = useState(false);
  const { data: subscriberRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['subscriber-records'],
    queryFn: async () => {
      const all = [];
      const PAGE = 10000;
      const MAX_PAGES = 5; // 50k cap
      for (let i = 0; i < MAX_PAGES; i++) {
        const page = await base44.entities.SubscriberRecord.list('-created_date', PAGE, i * PAGE);
        all.push(...page);
        if (page.length < PAGE) break; // last page
        await new Promise(r => setTimeout(r, 150)); // breathe between pages
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!subscriberMeta && recordsEnabled,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  // Trigger a (re)load of subscriber records on demand.
  const loadNow = useCallback(async () => {
    setRecordsEnabled(true);
    await queryClient.invalidateQueries({ queryKey: ['subscriber-records'] });
  }, [queryClient]);

  const isLoading = metaLoading || recordsLoading;

  // Build lookup whenever records change
  useEffect(() => {
    if (subscriberRecords.length > 0) {
      subscriberLookupRef.current = buildSubscriberLookup(subscriberRecords);
    } else {
      subscriberLookupRef.current = null;
    }
  }, [subscriberRecords]);

  // Enrich an ONT array with subscriber data, returns match count
  const enrichOnts = useCallback((onts) => {
    if (!subscriberLookupRef.current || !onts) return 0;
    const matched = enrichOntsWithSubscriber(subscriberLookupRef.current, onts);
    setSubscriberMatchCount(matched);
    return matched;
  }, []);

  // Callback when new CSV data is uploaded — saves to DB and refreshes queries.
  //
  // Architecture: records are bulk-created DIRECTLY via the SDK (not sent through
  // the backend function) to avoid HTTP payload size limits that caused 500 errors
  // on large CSVs (30k+ records). The function only handles metadata + archiving.
  const handleSubscriberDataLoaded = useCallback(async (records, fileName) => {
    // Build lookup immediately for in-session use
    subscriberLookupRef.current = buildSubscriberLookup(records);
    setRecordsEnabled(true);

    const uploadDate = new Date().toISOString();

    // Optimistically update the meta cache so the UI reflects the new upload immediately
    const optimisticMeta = {
      id: '__optimistic__',
      file_name: fileName || 'subscriber_data.csv',
      record_count: records.length,
      upload_date: uploadDate,
      status: 'active',
      created_date: uploadDate,
    };
    queryClient.setQueryData(['subscriber-upload-meta'], [optimisticMeta]);

    try {
      // Step 1: Delete existing subscriber records in paginated batches
      let deleteOffset = 0;
      const DELETE_PAGE = 500;
      while (true) {
        const existing = await base44.entities.SubscriberRecord.list(null, DELETE_PAGE, deleteOffset);
        if (!existing.length) break;
        // Delete in parallel chunks of 50
        for (let i = 0; i < existing.length; i += 50) {
          const chunk = existing.slice(i, i + 50);
          await Promise.all(chunk.map(r => base44.entities.SubscriberRecord.delete(r.id)));
        }
        if (existing.length < DELETE_PAGE) break;
        // Don't advance offset — deleted records shift the page
      }

      // Step 2: Bulk-create new records in chunks of 500 via SDK directly
      const CHUNK = 500;
      for (let i = 0; i < records.length; i += CHUNK) {
        await base44.entities.SubscriberRecord.bulkCreate(records.slice(i, i + CHUNK));
      }

      // Step 3: Call lightweight meta function (archive old + create new meta)
      const res = await base44.functions.invoke('saveSubscriberData', {
        file_name:    fileName || 'subscriber_data.csv',
        record_count: records.length,
        upload_date:  uploadDate,
      });

      // Update cache with real server meta
      if (res.data?.success) {
        queryClient.setQueryData(['subscriber-upload-meta'], [{
          ...optimisticMeta,
          id:          res.data.meta_id,
          upload_date: res.data.upload_date || uploadDate,
        }]);
      }

      // Force a server round-trip (refetch, not just invalidate) so the UI
      // reflects the canonical 'active' record after the backend has archived
      // the old one. Using refetchQueries guarantees a network call rather
      // than relying on the next render to trigger a refetch.
      await queryClient.refetchQueries({ queryKey: ['subscriber-upload-meta'], exact: true });
      queryClient.invalidateQueries({ queryKey: ['subscriber-records'] });
    } catch (error) {
      console.error('Failed to persist subscriber data:', error);
      // Lookup still works in-session even if DB save fails
    }

    return records;
  }, [queryClient]);

  return {
    subscriberRecords,
    subscriberLookup: subscriberLookupRef.current,
    subscriberMeta,
    isLoading,
    recordsLoaded: recordsEnabled && (subscriberRecords.length > 0 || !!subscriberLookupRef.current),
    subscriberMatchCount,
    setSubscriberMatchCount,
    handleSubscriberDataLoaded,
    enrichOnts,
    loadNow,
  };
}