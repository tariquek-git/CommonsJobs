import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchJobs } from '../lib/api';
import type { Job, SortOption, SearchMeta } from '../lib/types';
import { PAGE_SIZE } from '../lib/constants';

interface UseJobsReturn {
  jobs: Job[];
  meta: SearchMeta | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  category: string | null;
  setCategory: (category: string | null) => void;
  refresh: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useJobs(): UseJobsReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const sortParam = searchParams.get('sort');
  const sort: SortOption = sortParam === 'oldest' ? 'oldest' : 'newest';
  const tags = searchParams.getAll('tag');
  const category = searchParams.get('category');

  const setSort = (s: SortOption) => {
    setSearchParams((prev) => {
      if (s === 'newest') prev.delete('sort');
      else prev.set('sort', s);
      return prev;
    });
  };

  const setTags = (t: string[]) => {
    setSearchParams((prev) => {
      prev.delete('tag');
      t.forEach((tag) => prev.append('tag', tag));
      return prev;
    });
  };

  const setCategory = (c: string | null) => {
    setSearchParams((prev) => {
      if (c) prev.set('category', c);
      else prev.delete('category');
      return prev;
    });
  };

  const abortRef = useRef<AbortController | null>(null);

  const fetchJobs = useCallback(
    async (pageNum: number, append: boolean) => {
      // Cancel any in-flight request before starting a new one
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await searchJobs({
          sort,
          limit: PAGE_SIZE,
          page: pageNum,
          tags: tags.length > 0 ? tags : undefined,
          category: category || undefined,
        });
        if (!controller.signal.aborted) {
          if (append) {
            setJobs((prev) => [...prev, ...result.jobs]);
          } else {
            setJobs(result.jobs);
          }
          setMeta(result.meta);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load jobs');
          if (!append) {
            setJobs([]);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sort, tags.join(','), category],
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    fetchJobs(1, false);
    return () => abortRef.current?.abort();
  }, [fetchJobs]);

  const hasMore = meta ? jobs.length < meta.total : false;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, true);
  }, [hasMore, loadingMore, page, fetchJobs]);

  return {
    jobs,
    meta,
    loading,
    loadingMore,
    error,
    sort,
    setSort,
    tags,
    setTags,
    category,
    setCategory,
    refresh: () => {
      setPage(1);
      fetchJobs(1, false);
    },
    loadMore,
    hasMore,
  };
}
