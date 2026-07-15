import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildSubscriberLookup, enrichOntsWithSubscriber } from './SubscriberUpload';

/**
 * Shared hook for subscriber data.
 *
 * Read path:
 *   - Metadata is fetched via the service-role backend function
 *     `getEnrichmentDatasets` (bypasses creator-gated RLS so non-admin
 *     viewers see the admin-uploaded dataset). Tiny payload, 2 Worker fetches.
 *   - Records are paginated client-side via user-scoped SDK reads —
 *     SubscriberRecord.read is open to all authenticated users, so this works
 *     for non-admins and runs in the browser (outside the Worker drain limit).
 *
 * Write path: admin-only, via saveSubscriberData (reserve → bulkCreate → activate).
 */
export function useSubscriberData() {
  const queryClient = useQueryClient();
  const [subscriberMatchCount, setSubscriberMatchCount] = useState(0);
  const subscriberLookupRef = useRef(null);

  // ── Metadata (service-role function) ───────────────────────────────────
  const { data: metaData, isLoading: metaLoading } = useQuery({
    queryKey: ['enrichment-meta'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEnrichmentDatasets', {});
      return res.data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const subscriberMeta = metaData?.subscriberMeta || null;

  // ── Records (user-scoped, paginated) ────────────────────────────────────
  // Stagger enable slightly so the meta fetch + report load don't all contend
  // for the SDK rate limit at once on initial page mount.
  const [recordsEnabled, setRecordsEnabled] = useState(false);
  useEffect(() => {
    if (subscriberMeta && !recordsEnabled) {
      const timer = setTimeout(() => setRecordsEnabled(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [subscriberMeta, recordsEnabled]);

  const { data: subscriberRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['subscriber-records', subscriberMeta?.id],
    queryFn: async () => {
      const PAGE = 5000; // platform list/filter cap
      const all = [];
      for (let i = 0; ; i++) {
        const page = await base44.entities.SubscriberRecord.filter(
          { upload_id: subscriberMeta.id }, 'id', PAGE, i * PAGE
        );
        if (!page || page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE) break;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
    enabled: !!subscriberMeta && recordsEnabled,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

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

  // Trigger a (re)load on demand.
  const loadNow = useCallback(async () => {
    setRecordsEnabled(true);
    await queryClient.invalidateQueries({ queryKey: ['enrichment-meta'] });
    await queryClient.invalidateQueries({ queryKey: ['subscriber-records'] });
  }, [queryClient]);

  // ── Upload / persist (admin only) ───────────────────────────────────────
  // Records are bulk-created DIRECTLY via the SDK (not sent through the
  // backend function) to avoid HTTP payload size limits on large CSVs.
  const handleSubscriberDataLoaded = useCallback(async (records, fileName) => {
    subscriberLookupRef.current = buildSubscriberLookup(records);

    const uploadDate = new Date().toISOString();
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const withRateLimitRetry = async (fn, label, maxAttempts = 5) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (err) {
          const isRateLimit = err?.status === 429
            || /rate limit/i.test(err?.message || '')
            || /rate limit/i.test(err?.data?.message || '');
          if (!isRateLimit || attempt === maxAttempts) throw err;
          const wait = 1000 * Math.pow(2, attempt - 1);
          console.warn(`[${label}] rate-limited, retry ${attempt}/${maxAttempts - 1} in ${wait}ms`);
          await sleep(wait);
        }
      }
    };

    try {
      // Step 1: RESERVE a pending meta
      const reserveRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveSubscriberData', {
          mode: 'reserve',
          file_name: fileName || 'subscriber_data.csv',
          record_count: records.length,
          upload_date: uploadDate,
        }),
        'saveSubscriberData:reserve'
      );
      if (!reserveRes.data?.success || !reserveRes.data?.meta_id) {
        throw new Error(reserveRes.data?.error || 'Failed to reserve upload slot');
      }
      const newMetaId = reserveRes.data.meta_id;

      // Step 2: BULK CREATE records stamped with the new upload_id
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

      // Step 3: ACTIVATE — atomic swap (new → active, old → replaced)
      const activateRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveSubscriberData', { mode: 'activate', meta_id: newMetaId }),
        'saveSubscriberData:activate'
      );
      if (!activateRes.data?.success) {
        throw new Error(activateRes.data?.error || 'Failed to activate new upload');
      }

      // Refresh meta + records so the new generation is visible.
      await queryClient.invalidateQueries({ queryKey: ['enrichment-meta'] });
      await queryClient.invalidateQueries({ queryKey: ['subscriber-records'] });
    } catch (error) {
      console.error('Failed to persist subscriber data:', error);
      await queryClient.invalidateQueries({ queryKey: ['enrichment-meta'] });
      await queryClient.invalidateQueries({ queryKey: ['subscriber-records'] });
      throw error;
    }

    return records;
  }, [queryClient]);

  return {
    subscriberRecords,
    subscriberLookup: subscriberLookupRef.current,
    subscriberMeta,
    isLoading: metaLoading || recordsLoading,
    recordsLoaded: recordsEnabled && (subscriberRecords.length > 0 || !!subscriberLookupRef.current),
    subscriberMatchCount,
    setSubscriberMatchCount,
    handleSubscriberDataLoaded,
    enrichOnts,
    loadNow,
  };
}