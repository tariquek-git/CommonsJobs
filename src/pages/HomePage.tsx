import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { usePostHog } from '@posthog/react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import FilterRail from '../components/FilterRail';
import JobGrid from '../components/JobGrid';
import JobDetailModal from '../components/JobDetailModal';
import SortStrip from '../components/SortStrip';
import BottomNav from '../components/BottomNav';
import CircuitLines from '../components/CircuitLines';
import { useJobs } from '../hooks/useJobs';
import type { Job } from '../lib/types';

const TransactionFlowGlobe = lazy(() => import('../components/TransactionFlowGlobe'));
const FounderSection = lazy(() => import('../components/FounderSection'));

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
    document.title = 'Fintech Commons | Vetted Fintech Jobs & Warm Intros';
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

      {/* Dark hero zone — compact */}
      <div className="relative bg-navy-900">
        {/* Warm gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,91,255,0.3), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(255,59,139,0.2), transparent), radial-gradient(ellipse 50% 30% at 20% 80%, rgba(255,107,0,0.15), transparent)',
          }}
        />

        {/* Animated globe */}
        <div className="absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[380px] lg:h-[380px] opacity-30 lg:opacity-60 pointer-events-none">
          <Suspense fallback={null}>
            <TransactionFlowGlobe />
          </Suspense>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-6">
          <h1 className="text-hero text-white mb-1">
            Fintech Commons <span className="text-white/40">/</span>{' '}
            <span className="text-accent-pink">Jobs</span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-xl mb-4">
            Community-reviewed fintech &amp; banking roles. Real talk, not corporate jargon.
          </p>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Human-reviewed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Warm intros
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              No ghost jobs
            </span>
            {meta && (
              <span className="text-white/30">
                {meta.total} reviewed role{meta.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Founder section — in hero */}
          <div className="mt-6 pb-2">
            <Suspense fallback={null}>
              <FounderSection dark />
            </Suspense>
          </div>
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

        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
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
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/30 transition-all shadow-sm"
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
