import type { Job } from '../lib/types';
import JobCard from './JobCard';

interface JobGridProps {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onSelectJob: (job: Job) => void;
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface-elevated p-5 animate-pulse">
          <div className="flex gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800/60" />
              <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800/40" />
              <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-800/40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JobGrid({ jobs, loading, error, onSelectJob }: JobGridProps) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="surface-elevated p-8 text-center">
        <p className="text-red-600 dark:text-red-400 font-medium">Something went wrong</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="surface-elevated p-12 text-center">
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">No roles found</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Check back soon or try the other feed.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onSelect={onSelectJob} />
      ))}
    </div>
  );
}
