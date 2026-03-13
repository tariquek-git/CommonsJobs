import { useState, useEffect, useCallback } from 'react';
import { searchJobs } from '../lib/api';
import type { Job, FeedType, SortOption, SearchMeta } from '../lib/types';

interface UseJobsReturn {
  jobs: Job[];
  meta: SearchMeta | null;
  loading: boolean;
  error: string | null;
  feed: FeedType;
  sort: SortOption;
  setFeed: (feed: FeedType) => void;
  setSort: (sort: SortOption) => void;
  refresh: () => void;
}

export function useJobs(): UseJobsReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedType>('community');
  const [sort, setSort] = useState<SortOption>('newest');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchJobs({ feed, sort, limit: 50 });
      setJobs(result.jobs);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [feed, sort]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, meta, loading, error, feed, sort, setFeed, setSort, refresh: fetchJobs };
}
