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

  // Load active upload metadata
  const { data: metaList = [], isLoading: metaLoading } = useQuery({
    queryKey: ['subscriber-upload-meta'],
    queryFn: () => base44.entities.SubscriberUploadMeta.filter({ status: 'active' }, '-created_date', 1),
    staleTime: 2 * 60 * 1000,
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

  // Callback when new CSV data is uploaded — saves to DB and refreshes queries
  const handleSubscriberDataLoaded = useCallback(async (records, fileName) => {
    // Build lookup immediately for in-session use
    subscriberLookupRef.current = buildSubscriberLookup(records);

    // Save to DB in background
    try {
      await base44.functions.invoke('saveSubscriberData', {
        records,
        file_name: fileName || 'subscriber_data.csv',
      });
      // Refresh queries to pick up new data
      queryClient.invalidateQueries({ queryKey: ['subscriber-upload-meta'] });
      queryClient.invalidateQueries({ queryKey: ['subscriber-records'] });
    } catch (error) {
      console.error('Failed to persist subscriber data:', error);
      // Data still works in-session even if DB save fails
    }

    return records;
  }, [queryClient]);

  return {
    subscriberRecords,
    subscriberLookup: subscriberLookupRef.current,
    subscriberMeta,
    isLoading,
    recordsLoaded: recordsEnabled && subscriberRecords.length > 0,
    subscriberMatchCount,
    setSubscriberMatchCount,
    handleSubscriberDataLoaded,
    enrichOnts,
    loadNow,
  };
}