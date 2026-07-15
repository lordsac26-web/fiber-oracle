import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildSubscriberLookup, enrichOntsWithSubscriber } from './SubscriberUpload';

/**
 * Shared hook for subscriber data — loads the active dataset (metadata +
 * records) from the service-role backend function `getEnrichmentDatasets` so
 * any authenticated team member can view enrichment data. Writes (upload)
 * still go through saveSubscriberData, which remains admin-gated.
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

  // Single shared query (deduped with useEeroData) — service-role read
  // bypasses entity RLS so non-admin viewers see the admin-uploaded dataset.
  const { data: enrichmentData, isLoading: isLoading } = useQuery({
    queryKey: ['enrichment-datasets'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEnrichmentDatasets', {});
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity, // Keep cached data for the entire session — critical for 8-user concurrent access
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const subscriberMeta = enrichmentData?.subscriberMeta || null;
  const subscriberRecords = enrichmentData?.subscriberRecords || [];

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

  // Trigger a (re)load of enrichment datasets on demand.
  const loadNow = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['enrichment-datasets'] });
  }, [queryClient]);

  // Callback when new CSV data is uploaded — saves to DB and refreshes queries.
  //
  // Architecture: records are bulk-created DIRECTLY via the SDK (not sent through
  // the backend function) to avoid HTTP payload size limits that caused 500 errors
  // on large CSVs (30k+ records). The function only handles metadata + archiving.
  const handleSubscriberDataLoaded = useCallback(async (records, fileName) => {
    // Build lookup immediately for in-session use
    subscriberLookupRef.current = buildSubscriberLookup(records);

    const uploadDate = new Date().toISOString();

    // Throttling helper — keeps API requests under the platform rate limit.
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Retry helper — exponential backoff on 429 (rate limit) errors so
    // transient throttling doesn't kill a whole upload.
    const withRateLimitRetry = async (fn, label, maxAttempts = 5) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (err) {
          const isRateLimit = err?.status === 429
            || /rate limit/i.test(err?.message || '')
            || /rate limit/i.test(err?.data?.message || '');
          if (!isRateLimit || attempt === maxAttempts) throw err;
          const wait = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s
          console.warn(`[${label}] rate-limited, retry ${attempt}/${maxAttempts - 1} in ${wait}ms`);
          await sleep(wait);
        }
      }
    };

    try {
      // Step 1: RESERVE — create a NEW pending meta so we get an id to stamp
      //         records with. This avoids the up-front bulk-delete that was
      //         tripping the rate limit. Old records remain in place but are
      //         invisible (lookups filter by the active meta's id).
      const reserveRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveSubscriberData', {
          mode:         'reserve',
          file_name:    fileName || 'subscriber_data.csv',
          record_count: records.length,
          upload_date:  uploadDate,
        }),
        'saveSubscriberData:reserve'
      );

      if (!reserveRes.data?.success || !reserveRes.data?.meta_id) {
        throw new Error(reserveRes.data?.error || 'Failed to reserve upload slot');
      }
      const newMetaId = reserveRes.data.meta_id;

      // Step 2: BULK CREATE — stamp every record with the new upload_id so
      //         we can identify and (eventually) clean up the old generation.
      //         Sequential chunks with breathing room; retries on 429.
      const CHUNK = 500;
      const CREATE_DELAY_MS = 400;
      let createdCount = 0;
      for (let i = 0; i < records.length; i += CHUNK) {
        const slice = records.slice(i, i + CHUNK).map((r) => ({ ...r, upload_id: newMetaId }));
        await withRateLimitRetry(
          () => base44.entities.SubscriberRecord.bulkCreate(slice),
          `bulkCreate chunk ${i / CHUNK + 1}`
        );
        createdCount += slice.length;
        if (i + CHUNK < records.length) await sleep(CREATE_DELAY_MS);
      }

      if (createdCount !== records.length) {
        throw new Error(`Bulk create incomplete: ${createdCount}/${records.length}`);
      }

      // Step 3: ACTIVATE — atomically swap the new meta to 'active' and the
      //         previous one to 'replaced'. From here on the new generation
      //         is visible to all readers. Old records are orphaned and
      //         scheduled for async cleanup by purgeOrphanSubscriberRecords.
      const activateRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveSubscriberData', {
          mode:    'activate',
          meta_id: newMetaId,
        }),
        'saveSubscriberData:activate'
      );

      if (!activateRes.data?.success) {
        throw new Error(activateRes.data?.error || 'Failed to activate new upload');
      }

      // Refresh the shared enrichment query so the new dataset is visible.
      await queryClient.invalidateQueries({ queryKey: ['enrichment-datasets'] });
    } catch (error) {
      console.error('Failed to persist subscriber data:', error);
      await queryClient.invalidateQueries({ queryKey: ['enrichment-datasets'] });
      throw error;
    }

    return records;
  }, [queryClient]);

  return {
    subscriberRecords,
    subscriberLookup: subscriberLookupRef.current,
    subscriberMeta,
    isLoading,
    recordsLoaded: subscriberRecords.length > 0 || !!subscriberLookupRef.current,
    subscriberMatchCount,
    setSubscriberMatchCount,
    handleSubscriberDataLoaded,
    enrichOnts,
    loadNow,
  };
}