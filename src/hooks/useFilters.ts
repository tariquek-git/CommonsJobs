import { useState, useEffect } from 'react';
import { getFilters, type FiltersResponse } from '../lib/api';

interface UseFiltersReturn {
  categories: FiltersResponse['categories'];
  tags: FiltersResponse['tags'];
  loading: boolean;
}

export function useFilters(): UseFiltersReturn {
  const [categories, setCategories] = useState<FiltersResponse['categories']>([]);
  const [tags, setTags] = useState<FiltersResponse['tags']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getFilters()
      .then((res) => {
        if (!cancelled) {
          setCategories(res.categories);
          setTags(res.tags);
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
  }, []);

  return { categories, tags, loading };
}
