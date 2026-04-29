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

  // Load subscriber records from DB
  const { data: subscriberRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['subscriber-records'],
    queryFn: () => base44.entities.SubscriberRecord.list('-created_date', 10000),
    staleTime: 2 * 60 * 1000,
    enabled: !!subscriberMeta,
  });

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
    subscriberMatchCount,
    setSubscriberMatchCount,
    handleSubscriberDataLoaded,
    enrichOnts,
  };
}