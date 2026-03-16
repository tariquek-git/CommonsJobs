import { useState, useEffect, lazy, Suspense } from 'react';
import { usePostHog } from '@posthog/react';
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
  const { jobs, meta, loading, error, sort, setSort, tags, setTags, category, setCategory, refresh } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,91,255,0.3), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(255,59,139,0.2), transparent), radial-gradient(ellipse 50% 30% at 20% 80%, rgba(255,107,0,0.15), transparent)'
          }}
        />

        {/* Animated globe */}
        <div className="absolute right-[-10%] top-[-5%] w-[600px] h-[600px] opacity-30 lg:opacity-50 pointer-events-none">
          <Suspense fallback={null}>
            <FintechGlobe />
          </Suspense>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <h1 className="text-hero text-white mb-2">
            Fintech Commons Jobs
          </h1>
          <p className="text-lg text-white/75 max-w-xl mb-6">
            Fintech roles with a human behind them. Every listing is reviewed. Every intro is personal.
          </p>
          <FounderSection dark />
        </div>
      </div>

      {/* Light content zone */}
      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-8 space-y-5">
        <CircuitLines />
        <SortStrip sort={sort} onSortChange={setSort} meta={meta} onRefresh={refresh} tags={tags} onTagsChange={setTags} category={category} onCategoryChange={setCategory} />
        <p className="text-sm text-gray-500">Every role below has a real person behind it. Request a warm intro and skip the black hole.</p>

        <div className="flex gap-8">
          <FilterRail sort={sort} onSortChange={setSort} meta={meta} tags={tags} onTagsChange={setTags} category={category} onCategoryChange={setCategory} />

          <div className="flex-1 min-w-0">
            <JobGrid jobs={jobs} loading={loading} error={error} onSelectJob={setSelectedJob} />
          </div>
        </div>
      </main>

      <BottomNav />
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
