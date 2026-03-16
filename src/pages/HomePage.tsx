import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { usePostHog } from '@posthog/react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import FounderSection from '../components/FounderSection';
import FilterRail from '../components/FilterRail';
import JobGrid from '../components/JobGrid';
import JobDetailModal from '../components/JobDetailModal';
import SortStrip from '../components/SortStrip';
import BottomNav from '../components/BottomNav';
import CircuitLines from '../components/CircuitLines';
import { useJobs } from '../hooks/useJobs';
import type { Job } from '../lib/types';

const FintechGlobe = lazy(() => import('../components/FintechGlobe'));

export default function HomePage() {
  const posthog = usePostHog();
  const {
    jobs,
    meta,
    loading,
    error,
    sort,
    setSort,
    tags,
    setTags,
    category,
    setCategory,
    refresh,
  } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const setQuery = (q: string) => {
    setSearchParams((prev) => {
      if (q) prev.set('q', q);
      else prev.delete('q');
      return prev;
    });
  };

  const filteredJobs = useMemo(() => {
    if (!query.trim()) return jobs;
    const lower = query.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(lower) ||
        job.company.toLowerCase().includes(lower) ||
        (job.summary && job.summary.toLowerCase().includes(lower)) ||
        (job.location && job.location.toLowerCase().includes(lower)) ||
        (job.tags && job.tags.some((t) => t.toLowerCase().includes(lower))),
    );
  }, [jobs, query]);

  useEffect(() => {
    document.title = 'Fintech Commons — Fintech & Banking Jobs';
    return () => {
      document.title = 'Fintech Commons';
    };
  }, []);

  useEffect(() => {
    posthog?.capture('page_viewed', { page: 'home' });
  }, [posthog]);

  return (
    <div className="min-h-screen bg-white">
      <Header dark />

      {/* Dark hero zone */}
      <div className="relative overflow-hidden bg-navy-900">
        {/* Warm gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,91,255,0.3), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(255,59,139,0.2), transparent), radial-gradient(ellipse 50% 30% at 20% 80%, rgba(255,107,0,0.15), transparent)',
          }}
        />

        {/* Animated globe */}
        <div className="absolute right-[-10%] top-[-5%] w-[600px] h-[600px] opacity-30 lg:opacity-50 pointer-events-none">
          <Suspense fallback={null}>
            <FintechGlobe />
          </Suspense>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <h1 className="text-hero text-white mb-2">Fintech Commons Jobs</h1>
          <p className="text-lg text-white/75 max-w-xl mb-6">
            Fintech roles with a human behind them. Every listing is reviewed. Every intro is
            personal.
          </p>
          <FounderSection dark />
        </div>
      </div>

      {/* Light content zone */}
      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-8 space-y-5">
        <CircuitLines />
        <SortStrip
          sort={sort}
          onSortChange={setSort}
          meta={meta}
          onRefresh={refresh}
          tags={tags}
          onTagsChange={setTags}
          category={category}
          onCategoryChange={setCategory}
        />
        <p className="text-sm text-gray-500">
          Every role below has a real person behind it. Request a warm intro and skip the black
          hole.
        </p>

        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, company, location, or keyword…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 transition-shadow"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-8">
          <FilterRail
            sort={sort}
            onSortChange={setSort}
            meta={meta}
            tags={tags}
            onTagsChange={setTags}
            category={category}
            onCategoryChange={setCategory}
          />

          <div className="flex-1 min-w-0">
            <JobGrid
              jobs={filteredJobs}
              loading={loading}
              error={error}
              onSelectJob={setSelectedJob}
            />
          </div>
        </div>
      </main>

      <BottomNav />
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
