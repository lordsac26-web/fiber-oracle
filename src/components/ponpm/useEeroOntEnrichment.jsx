import { useCallback } from 'react';
import { buildEeroLookup, enrichOntsWithEero } from './EeroUpload';

/**
 * Wraps the upload-flow callback for eero CSV uploads.
 *
 * Persists the new dataset (via the eero data hook), then re-enriches the
 * currently-loaded ONT result in-memory so the user sees match counts and
 * "has eero" badges immediately without waiting for a refetch.
 *
 * Kept in its own file to avoid bloating PONPMAnalysis past the 2000-line
 * platform editing limit.
 */
export function useEeroOntEnrichmentHandler({
  result,
  setResult,
  persistEeroData,
  setEeroMatchCount,
}) {
  return useCallback(async (records, fileName) => {
    await persistEeroData(records, fileName);
    if (result?.onts) {
      const lookup = buildEeroLookup(records);
      const matched = enrichOntsWithEero(lookup, result.onts);
      setEeroMatchCount(matched);
      setResult(prev => ({ ...prev })); // trigger re-render
    }
  }, [result, persistEeroData, setResult, setEeroMatchCount]);
}