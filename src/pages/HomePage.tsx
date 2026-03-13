import { useState } from 'react';
import Header from '../components/Header';
import FounderSection from '../components/FounderSection';
import FeedToggle from '../components/FeedToggle';
import FilterRail from '../components/FilterRail';
import JobGrid from '../components/JobGrid';
import JobDetailModal from '../components/JobDetailModal';
import SortStrip from '../components/SortStrip';
import { useJobs } from '../hooks/useJobs';
import type { Job } from '../lib/types';

export default function HomePage() {
  const { jobs, meta, loading, error, feed, sort, setFeed, setSort, refresh } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Founder section */}
        <FounderSection />

        {/* Feed toggle */}
        <FeedToggle feed={feed} onChange={setFeed} />

        {/* Sort strip (mobile only) */}
        <SortStrip sort={sort} onSortChange={setSort} meta={meta} onRefresh={refresh} />

        {/* Main layout: filter rail + grid */}
        <div className="flex gap-8">
          <FilterRail feed={feed} sort={sort} onSortChange={setSort} meta={meta} />

          <div className="flex-1 min-w-0">
            <JobGrid jobs={jobs} loading={loading} error={error} onSelectJob={setSelectedJob} />
          </div>
        </div>
      </main>

      {/* Job detail modal */}
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
