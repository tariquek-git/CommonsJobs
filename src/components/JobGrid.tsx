import { Link } from 'react-router-dom';
import type { Job } from '../lib/types';
import JobCard from './JobCard';

interface JobGridProps {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onSelectJob: (job: Job) => void;
}

function SkeletonCard() {
  return (
    <div className="surface-elevated p-6 lg:p-7 overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-3/4 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          <div className="h-3 w-1/2 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          <div className="h-3 w-full rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
          <div className="h-3 w-2/3 rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

export default function JobGrid({ jobs, loading, error, onSelectJob }: JobGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-elevated p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 mb-3">
          <svg
            className="h-6 w-6 text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
        </div>
        <p className="text-gray-900 font-semibold">Hang tight — grabbing the latest roles...</p>
        <p className="text-gray-500 text-sm mt-1">
          This usually clears up in a moment. Give it another try.
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4 text-sm">
          <svg
            className="h-4 w-4 mr-1.5 -ml-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
          Try Again
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="surface-elevated p-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 mb-4">
          <svg
            className="h-7 w-7 text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </div>
        <p className="text-gray-600 text-lg font-semibold">No matches yet</p>
        <p className="text-gray-500 text-sm mt-1">
          Try broadening your filters, or subscribe below to get notified when new roles land.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Link to="/submit" className="btn-secondary text-sm">
            Submit a Role
          </Link>
          <button
            onClick={() =>
              document.getElementById('job-alert-section')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="btn-primary text-sm"
          >
            Subscribe to Alerts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
      {jobs.map((job, i) => (
        <div
          key={job.id}
          className="opacity-0 animate-stagger-fade-up"
          style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
        >
          <JobCard job={job} onSelect={onSelectJob} className="h-full" />
        </div>
      ))}
    </div>
  );
}
