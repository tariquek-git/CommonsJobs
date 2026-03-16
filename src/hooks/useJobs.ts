import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchJobs } from '../lib/api';
import type { Job, SortOption, SearchMeta } from '../lib/types';

interface UseJobsReturn {
  jobs: Job[];
  meta: SearchMeta | null;
  loading: boolean;
  error: string | null;
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  category: string | null;
  setCategory: (category: string | null) => void;
  refresh: () => void;
}

export function useJobs(): UseJobsReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchJobs({ sort, limit: 50, tags: tags.length > 0 ? tags : undefined, category: category || undefined });
      setJobs(result.jobs);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [sort, tags.join(','), category]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, meta, loading, error, sort, setSort, tags, setTags, category, setCategory, refresh: fetchJobs };
}
