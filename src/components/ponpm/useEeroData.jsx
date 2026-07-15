import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildEeroLookup, enrichOntsWithEero } from './EeroUpload';

/**
 * Shared hook for eero data — mirrors useSubscriberData architecture.
 * Reads the active dataset from the service-role backend function
 * `getEnrichmentDatasets` (shared query with useSubscriberData) so non-admin
 * viewers see enrichment data. Writes still go through saveEeroData (admin-gated).
 */
export function useEeroData() {
  const queryClient = useQueryClient();
  const [eeroMatchCount, setEeroMatchCount] = useState(0);
  const eeroLookupRef = useRef(null);

  // Shared query — React Query dedupes the identical key with useSubscriberData.
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

  const eeroMeta = enrichmentData?.eeroMeta || null;
  const eeroRecords = enrichmentData?.eeroRecords || [];

  const loadNow = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['enrichment-datasets'] });
  }, [queryClient]);

  // Build lookup whenever records change
  useEffect(() => {
    if (eeroRecords.length > 0) {
      eeroLookupRef.current = buildEeroLookup(eeroRecords);
    } else {
      eeroLookupRef.current = null;
    }
  }, [eeroRecords]);

  const enrichOnts = useCallback((onts) => {
    if (!eeroLookupRef.current || !onts) return 0;
    const matched = enrichOntsWithEero(eeroLookupRef.current, onts);
    setEeroMatchCount(matched);
    return matched;
  }, []);

  /**
   * Persist a freshly-uploaded CSV.
   *   1. reserve a pending meta
   *   2. bulk-create records stamped with upload_id
   *   3. activate the meta (atomic swap)
   * Throttling + retry for rate-limit safety.
   */
  const handleEeroDataLoaded = useCallback(async (records, fileName) => {
    eeroLookupRef.current = buildEeroLookup(records);

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
      // Step 1: reserve pending meta
      const reserveRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveEeroData', {
          mode:         'reserve',
          file_name:    fileName || 'eero_data.csv',
          record_count: records.length,
          upload_date:  uploadDate,
        }),
        'saveEeroData:reserve'
      );

      if (!reserveRes.data?.success || !reserveRes.data?.meta_id) {
        throw new Error(reserveRes.data?.error || 'Failed to reserve upload slot');
      }
      const newMetaId = reserveRes.data.meta_id;

      // Step 2: bulk create
      const CHUNK = 500;
      const CREATE_DELAY_MS = 400;
      let createdCount = 0;
      for (let i = 0; i < records.length; i += CHUNK) {
        const slice = records.slice(i, i + CHUNK).map((r) => ({ ...r, upload_id: newMetaId }));
        await withRateLimitRetry(
          () => base44.entities.EeroRecord.bulkCreate(slice),
          `bulkCreate chunk ${i / CHUNK + 1}`
        );
        createdCount += slice.length;
        if (i + CHUNK < records.length) await sleep(CREATE_DELAY_MS);
      }

      if (createdCount !== records.length) {
        throw new Error(`Bulk create incomplete: ${createdCount}/${records.length}`);
      }

      // Step 3: activate
      const activateRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveEeroData', {
          mode:    'activate',
          meta_id: newMetaId,
        }),
        'saveEeroData:activate'
      );

      if (!activateRes.data?.success) {
        throw new Error(activateRes.data?.error || 'Failed to activate new upload');
      }

      // Refresh the shared enrichment query so the new dataset is visible.
      await queryClient.invalidateQueries({ queryKey: ['enrichment-datasets'] });
    } catch (error) {
      console.error('Failed to persist eero data:', error);
      await queryClient.invalidateQueries({ queryKey: ['enrichment-datasets'] });
      throw error;
    }

    return records;
  }, [queryClient]);

  return {
    eeroRecords,
    eeroLookup: eeroLookupRef.current,
    eeroMeta,
    isLoading,
    recordsLoaded: eeroRecords.length > 0 || !!eeroLookupRef.current,
    eeroMatchCount,
    setEeroMatchCount,
    handleEeroDataLoaded,
    enrichOnts,
    loadNow,
  };
}