import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildEeroLookup, enrichOntsWithEero } from './EeroUpload';

/**
 * Shared hook for eero data — mirrors useSubscriberData architecture.
 * Reads metadata from EeroUploadMeta (status='active') on mount; records
 * are loaded on-demand (loadNow) to avoid concurrent rate-limited fetches.
 */
export function useEeroData() {
  const queryClient = useQueryClient();
  const [eeroMatchCount, setEeroMatchCount] = useState(0);
  const eeroLookupRef = useRef(null);

  const { data: metaList = [], isLoading: metaLoading } = useQuery({
    queryKey: ['eero-upload-meta'],
    queryFn: () => base44.entities.EeroUploadMeta.filter({ status: 'active' }, '-created_date', 1),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const eeroMeta = metaList.length > 0 ? metaList[0] : null;

  // Records are NOT auto-loaded — explicit trigger via loadNow().
  const [recordsEnabled, setRecordsEnabled] = useState(false);
  const { data: eeroRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['eero-records', eeroMeta?.id],
    queryFn: async () => {
      const all = [];
      const PAGE = 5000; // platform list/filter cap
      const MAX_PAGES = 20;
      const filter = eeroMeta?.id ? { upload_id: eeroMeta.id } : {};
      for (let i = 0; i < MAX_PAGES; i++) {
        const page = await base44.entities.EeroRecord.filter(
          filter, '-created_date', PAGE, i * PAGE
        );
        all.push(...page);
        if (page.length < PAGE) break;
        await new Promise(r => setTimeout(r, 200));
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!eeroMeta && recordsEnabled,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const loadNow = useCallback(async () => {
    setRecordsEnabled(true);
    await queryClient.invalidateQueries({ queryKey: ['eero-records'] });
  }, [queryClient]);

  const isLoading = metaLoading || recordsLoading;

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
   * Mirrors useSubscriberData.handleSubscriberDataLoaded:
   *   1. reserve a pending meta
   *   2. bulk-create records stamped with upload_id
   *   3. activate the meta (atomic swap)
   * Throttling + retry for rate-limit safety.
   */
  const handleEeroDataLoaded = useCallback(async (records, fileName) => {
    eeroLookupRef.current = buildEeroLookup(records);
    setRecordsEnabled(true);

    const uploadDate = new Date().toISOString();

    // Optimistic meta update so the UI reflects the upload immediately
    const optimisticMeta = {
      id: '__optimistic__',
      file_name: fileName || 'eero_data.csv',
      record_count: records.length,
      upload_date: uploadDate,
      status: 'active',
      created_date: uploadDate,
    };
    queryClient.setQueryData(['eero-upload-meta'], [optimisticMeta]);

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

      queryClient.setQueryData(['eero-upload-meta'], [{
        ...optimisticMeta,
        id:           newMetaId,
        upload_date:  activateRes.data.upload_date || uploadDate,
        record_count: createdCount,
      }]);

      await queryClient.refetchQueries({ queryKey: ['eero-upload-meta'], exact: true });
      queryClient.invalidateQueries({ queryKey: ['eero-records'] });
    } catch (error) {
      console.error('Failed to persist eero data:', error);
      await queryClient.refetchQueries({ queryKey: ['eero-upload-meta'], exact: true });
      throw error;
    }

    return records;
  }, [queryClient]);

  return {
    eeroRecords,
    eeroLookup: eeroLookupRef.current,
    eeroMeta,
    isLoading,
    recordsLoaded: recordsEnabled && (eeroRecords.length > 0 || !!eeroLookupRef.current),
    eeroMatchCount,
    setEeroMatchCount,
    handleEeroDataLoaded,
    enrichOnts,
    loadNow,
  };
}