import type { Job } from '../lib/types';
import { getRelativeTimeLabel } from '../lib/date';
import { trackClick } from '../lib/api';

interface JobCardProps {
  job: Job;
  onSelect: (job: Job) => void;
}

function CompanyLogo({ job }: { job: Job }) {
  if (job.company_logo_url) {
    return (
      <img
        src={job.company_logo_url}
        alt={`${job.company} logo`}
        className="h-10 w-10 rounded-lg object-contain bg-gray-100 dark:bg-gray-800 p-1"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }
  return null;
}

function FallbackIcon({ company }: { company: string }) {
  const letter = company.charAt(0).toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-sm font-bold text-indigo-600 dark:text-indigo-400">
      {letter}
    </div>
  );
}

export default function JobCard({ job, onSelect }: JobCardProps) {
  const isDirect = job.source_type === 'direct';

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.apply_url) {
      trackClick(job.id);
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      onClick={() => onSelect(job)}
      className="surface-elevated p-5 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200 group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(job);
        }
      }}
    >
      <div className="flex items-start gap-3.5">
        {/* Logo */}
        <div className="shrink-0">
          {job.company_logo_url ? (
            <CompanyLogo job={job} />
          ) : (
            <FallbackIcon company={job.company} />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                {job.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{job.company}</p>
            </div>
            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {getRelativeTimeLabel(job.posted_date)}
            </span>
          </div>

          {/* Location + Tags */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {job.location && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {job.location}
              </span>
            )}
            {job.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Summary */}
          {job.summary && (
            <p className="mt-2.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
              {job.summary}
            </p>
          )}

          {/* Trust cue + Apply */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDirect ? (
                <>
                  <span className="badge-community">Community reviewed</span>
                  <span className="badge-community">Warm intro possible</span>
                </>
              ) : (
                <span className="badge-webpulse">
                  Web Pulse {job.source_name ? `· ${job.source_name}` : ''}
                </span>
              )}
            </div>
            {job.apply_url && (
              <button
                onClick={handleApply}
                className="btn-primary py-1.5 px-3.5 text-xs"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
