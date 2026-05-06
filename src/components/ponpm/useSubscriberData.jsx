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
    // Key includes the active meta id so a fresh upload (new id) refetches
    // automatically and we never serve stale records from a previous upload.
    queryKey: ['subscriber-records', subscriberMeta?.id],
    queryFn: async () => {
      const all = [];
      const PAGE = 10000;
      const MAX_PAGES = 5; // 50k cap
      // Scope the read to the currently active upload generation. Filtering
      // server-side avoids pulling orphaned legacy rows that the background
      // purge hasn't deleted yet.
      const filter = subscriberMeta?.id ? { upload_id: subscriberMeta.id } : {};
      for (let i = 0; i < MAX_PAGES; i++) {
        const page = await base44.entities.SubscriberRecord.filter(
          filter, '-created_date', PAGE, i * PAGE
        );
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

    // Throttling helper — keeps API requests under the platform rate limit.
    // The SDK's per-request limit was being tripped by 50-wide Promise.all bursts
    // on large datasets (7k+ records) which left the DB in a half-broken state
    // (records partially deleted, meta updated to a stale state).
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

      queryClient.setQueryData(['subscriber-upload-meta'], [{
        ...optimisticMeta,
        id:           newMetaId,
        upload_date:  activateRes.data.upload_date || uploadDate,
        record_count: createdCount,
      }]);

      // Force a server round-trip so the UI reflects the canonical 'active'
      // record after the backend swap.
      await queryClient.refetchQueries({ queryKey: ['subscriber-upload-meta'], exact: true });
      queryClient.invalidateQueries({ queryKey: ['subscriber-records'] });
    } catch (error) {
      console.error('Failed to persist subscriber data:', error);
      // Roll back optimistic cache so the UI doesn't lie about a save that failed.
      await queryClient.refetchQueries({ queryKey: ['subscriber-upload-meta'], exact: true });
      throw error;
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