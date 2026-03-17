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

const TransactionFlowGlobe = lazy(() => import('../components/TransactionFlowGlobe'));

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
        <div className="absolute right-8 lg:right-16 top-1/2 -translate-y-1/2 w-[350px] h-[350px] lg:w-[440px] lg:h-[440px] opacity-40 lg:opacity-70 pointer-events-none">
          <Suspense fallback={null}>
            <TransactionFlowGlobe />
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

      {/* Built by Tarique card */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-28 lg:pb-8">
        <button
          onClick={() => window.dispatchEvent(new Event('open-about'))}
          className="w-full max-w-md mx-auto flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-600 shrink-0 group-hover:bg-brand-200 transition-colors">
            TK
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">
              Built by Tarique Khan
            </p>
            <p className="text-xs text-gray-500">Business Development at Brim Financial</p>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-2">
            <a
              href="https://www.linkedin.com/in/tariquekhan1/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded-full p-1.5 text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-colors"
              aria-label="Tarique's LinkedIn"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <svg
              className="h-4 w-4 text-gray-400 group-hover:text-brand-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </button>
      </div>

      <BottomNav />
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
