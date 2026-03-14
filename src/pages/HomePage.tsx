import { useState } from 'react';
import Header from '../components/Header';
import FounderSection from '../components/FounderSection';
import FilterRail from '../components/FilterRail';
import JobGrid from '../components/JobGrid';
import JobDetailModal from '../components/JobDetailModal';
import SortStrip from '../components/SortStrip';
import BottomNav from '../components/BottomNav';
import TermsModal from '../components/TermsModal';
import { useJobs } from '../hooks/useJobs';
import type { Job } from '../lib/types';

export default function HomePage() {
  const { jobs, meta, loading, error, sort, setSort, tags, setTags, refresh } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-8 space-y-5">
        <FounderSection />

        <SortStrip sort={sort} onSortChange={setSort} meta={meta} onRefresh={refresh} tags={tags} onTagsChange={setTags} />

        <div className="flex gap-8">
          <FilterRail sort={sort} onSortChange={setSort} meta={meta} tags={tags} onTagsChange={setTags} />

          <div className="flex-1 min-w-0">
            <JobGrid jobs={jobs} loading={loading} error={error} onSelectJob={setSelectedJob} />
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-100 dark:border-navy-800/40 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
          <p>Fintech Commons — a hobby project by Tarique Khan. Apache 2.0.</p>
          <button
            onClick={() => setShowTerms(true)}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline underline-offset-2"
          >
            Terms & Conditions
          </button>
        </footer>
      </main>

      <BottomNav />
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}
