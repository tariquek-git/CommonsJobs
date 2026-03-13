import type { Job } from '../lib/types';
import JobCard from './JobCard';

interface JobGridProps {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onSelectJob: (job: Job) => void;
}

export default function JobGrid({ jobs, loading, error, onSelectJob }: JobGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-accent-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-elevated p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/20 mb-3">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 font-medium">Something went wrong</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="surface-elevated p-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-navy-800 mb-4">
          <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">No roles found</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Check back soon or submit a role to get started.
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
