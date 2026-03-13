import { useState, useMemo } from 'react';
import Header from '../components/Header';
import FounderSection from '../components/FounderSection';
import FilterRail from '../components/FilterRail';
import JobGrid from '../components/JobGrid';
import JobDetailModal from '../components/JobDetailModal';
import SortStrip from '../components/SortStrip';
import SearchBar from '../components/SearchBar';
import FilterChips from '../components/FilterChips';
import { useJobs } from '../hooks/useJobs';
import type { Job } from '../lib/types';

export default function HomePage() {
  const { jobs, meta, loading, error, sort, setSort, refresh } = useJobs();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const clearFilters = () => setActiveFilters([]);

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location?.toLowerCase().includes(q) ||
          j.tags?.some((t) => t.toLowerCase().includes(q)) ||
          j.summary?.toLowerCase().includes(q)
      );
    }
    if (activeFilters.length > 0) {
      result = result.filter((j) => {
        const text = [j.title, j.location, ...(j.tags || []), j.summary || '']
          .join(' ')
          .toLowerCase();
        return activeFilters.some((f) => text.includes(f));
      });
    }
    return result;
  }, [jobs, search, activeFilters]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-navy-950">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
        <FounderSection />

        <SearchBar value={search} onChange={setSearch} />

        <FilterChips activeFilters={activeFilters} onToggle={toggleFilter} onClear={clearFilters} />

        <SortStrip sort={sort} onSortChange={setSort} meta={meta} onRefresh={refresh} />

        <div className="flex gap-8">
          <FilterRail sort={sort} onSortChange={setSort} meta={meta} />

          <div className="flex-1 min-w-0">
            <JobGrid jobs={filteredJobs} loading={loading} error={error} onSelectJob={setSelectedJob} />
          </div>
        </div>
      </main>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
