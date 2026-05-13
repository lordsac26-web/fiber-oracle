import { useEffect, useRef, useCallback } from 'react';

/**
 * Bidirectional sync between filter state and URL query parameters.
 * - On mount: reads URL params and calls the corresponding setters.
 * - On change: writes filter values back to URL without triggering navigation.
 *
 * Supported params: olt, port, status, power, sort, search, splitters, oltPorts, models
 */

const PARAM_MAP = {
  olt: 'oltFilter',
  port: 'portFilter',
  status: 'statusFilter',
  power: 'powerRangeFilter',
  sort: 'sortBy',
  q: 'searchTerm',
};

// Params that are comma-separated arrays
const ARRAY_PARAMS = ['splitters', 'oltPorts', 'models'];

/**
 * Reads current URL search params and returns an object of filter values.
 */
export function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const filters = {};

  for (const [param, stateKey] of Object.entries(PARAM_MAP)) {
    const v = params.get(param);
    if (v) filters[stateKey] = v;
  }

  for (const key of ARRAY_PARAMS) {
    const v = params.get(key);
    if (v) filters[key] = v.split(',').filter(Boolean);
  }

  return filters;
}

/**
 * Hook: writes filter state into URL query params on every change.
 * Skips default/empty values to keep URLs clean.
 */
export function useFilterUrlSync({
  oltFilter, portFilter, statusFilter, powerRangeFilter,
  sortBy, searchTerm,
  globalSplitters, globalOltPorts, globalModels,
}) {
  // Debounce URL writes to avoid thrashing during rapid typing
  const timerRef = useRef(null);

  const writeToUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (oltFilter && oltFilter !== 'all') params.set('olt', oltFilter);
    if (portFilter && portFilter !== 'all') params.set('port', portFilter);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (powerRangeFilter && powerRangeFilter !== 'all') params.set('power', powerRangeFilter);
    if (sortBy && sortBy !== 'none') params.set('sort', sortBy);
    if (searchTerm) params.set('q', searchTerm);
    if (globalSplitters?.length) params.set('splitters', globalSplitters.join(','));
    if (globalOltPorts?.length) params.set('oltPorts', globalOltPorts.join(','));
    if (globalModels?.length) params.set('models', globalModels.join(','));

    const qs = params.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;

    // replaceState so it doesn't create a history entry per keystroke
    window.history.replaceState(null, '', newUrl);
  }, [oltFilter, portFilter, statusFilter, powerRangeFilter, sortBy, searchTerm,
      globalSplitters, globalOltPorts, globalModels]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(writeToUrl, 300);
    return () => clearTimeout(timerRef.current);
  }, [writeToUrl]);
}