import { useState, useEffect, useCallback } from 'react';
import { searchJobs } from '../lib/api';
import type { Job, SortOption, SearchMeta } from '../lib/types';

interface UseJobsReturn {
  jobs: Job[];
  meta: SearchMeta | null;
  loading: boolean;
  error: string | null;
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  refresh: () => void;
}

export function useJobs(): UseJobsReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchJobs({ sort, limit: 50 });
      setJobs(result.jobs);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, meta, loading, error, sort, setSort, refresh: fetchJobs };
}
