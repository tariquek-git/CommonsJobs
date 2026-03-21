import { useState, useEffect } from 'react';
import { getFilters, type FiltersResponse } from '../lib/api';
import { FILTER_CACHE_TTL_MS } from '../lib/constants';

const CACHE_KEY = 'fc_filters';

interface CachedFilters {
  categories: FiltersResponse['categories'];
  tags: FiltersResponse['tags'];
  cachedAt: number;
}

function getCached(): CachedFilters | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedFilters;
    if (Date.now() - data.cachedAt > FILTER_CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

interface UseFiltersReturn {
  categories: FiltersResponse['categories'];
  tags: FiltersResponse['tags'];
  loading: boolean;
}

export function useFilters(): UseFiltersReturn {
  const cached = getCached();
  const [categories, setCategories] = useState<FiltersResponse['categories']>(
    cached?.categories || [],
  );
  const [tags, setTags] = useState<FiltersResponse['tags']>(cached?.tags || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    // If we have a fresh cache, skip the fetch
    if (cached) return;

    let cancelled = false;
    getFilters()
      .then((res) => {
        if (!cancelled) {
          setCategories(res.categories);
          setTags(res.tags);
          // Cache in sessionStorage
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                categories: res.categories,
                tags: res.tags,
                cachedAt: Date.now(),
              }),
            );
          } catch {
            /* sessionStorage full or unavailable */
          }
        }
      })
      .catch(() => {
        // Fallback: empty filters, user can still search
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { categories, tags, loading };
}
