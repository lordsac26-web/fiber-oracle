import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildEeroLookup, enrichOntsWithEero } from './EeroUpload';

/**
 * Shared hook for eero data — mirrors useSubscriberData architecture.
 *
 * Read path:
 *   - Metadata via service-role function `getEnrichmentDatasets` (shared query
 *     with useSubscriberData — React Query dedupes the identical key).
 *   - Records paginated client-side via user-scoped SDK reads. EeroRecord.read
 *     is open to all authenticated users so non-admin viewers can read it.
 */
export function useEeroData() {
  const queryClient = useQueryClient();
  const [eeroMatchCount, setEeroMatchCount] = useState(0);
  const eeroLookupRef = useRef(null);

  // ── Metadata (shared with useSubscriberData) ───────────────────────────
  const { data: metaData, isLoading: metaLoading } = useQuery({
    queryKey: ['enrichment-meta'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEnrichmentDatasets', {});
      return res.data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const eeroMeta = metaData?.eeroMeta || null;

  // ── Records (user-scoped, paginated) ────────────────────────────────────
  const [recordsEnabled, setRecordsEnabled] = useState(false);
  useEffect(() => {
    if (eeroMeta && !recordsEnabled) {
      const timer = setTimeout(() => setRecordsEnabled(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [eeroMeta, recordsEnabled]);

  const { data: eeroRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['eero-records', eeroMeta?.id],
    queryFn: async () => {
      const PAGE = 5000;
      const all = [];
      for (let i = 0; ; i++) {
        const page = await base44.entities.EeroRecord.filter(
          { upload_id: eeroMeta.id }, 'id', PAGE, i * PAGE
        );
        if (!page || page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE) break;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: Infinity,
    enabled: !!eeroMeta && recordsEnabled,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

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

  const loadNow = useCallback(async () => {
    setRecordsEnabled(true);
    await queryClient.invalidateQueries({ queryKey: ['enrichment-meta'] });
    await queryClient.invalidateQueries({ queryKey: ['eero-records'] });
  }, [queryClient]);

  // ── Upload / persist (admin only) ───────────────────────────────────────
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
      const reserveRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveEeroData', {
          mode: 'reserve',
          file_name: fileName || 'eero_data.csv',
          record_count: records.length,
          upload_date: uploadDate,
        }),
        'saveEeroData:reserve'
      );
      if (!reserveRes.data?.success || !reserveRes.data?.meta_id) {
        throw new Error(reserveRes.data?.error || 'Failed to reserve upload slot');
      }
      const newMetaId = reserveRes.data.meta_id;

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

      const activateRes = await withRateLimitRetry(
        () => base44.functions.invoke('saveEeroData', { mode: 'activate', meta_id: newMetaId }),
        'saveEeroData:activate'
      );
      if (!activateRes.data?.success) {
        throw new Error(activateRes.data?.error || 'Failed to activate new upload');
      }

      await queryClient.invalidateQueries({ queryKey: ['enrichment-meta'] });
      await queryClient.invalidateQueries({ queryKey: ['eero-records'] });
    } catch (error) {
      console.error('Failed to persist eero data:', error);
      await queryClient.invalidateQueries({ queryKey: ['enrichment-meta'] });
      await queryClient.invalidateQueries({ queryKey: ['eero-records'] });
      throw error;
    }

    return records;
  }, [queryClient]);

  return {
    eeroRecords,
    eeroLookup: eeroLookupRef.current,
    eeroMeta,
    isLoading: metaLoading || recordsLoading,
    recordsLoaded: recordsEnabled && (eeroRecords.length > 0 || !!eeroLookupRef.current),
    eeroMatchCount,
    setEeroMatchCount,
    handleEeroDataLoaded,
    enrichOnts,
    loadNow,
  };
}