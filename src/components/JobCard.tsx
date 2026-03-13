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
        className="h-11 w-11 rounded-xl object-contain bg-gray-100 dark:bg-navy-800 p-1.5"
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
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 dark:bg-accent-900/20 text-sm font-bold text-accent-600 dark:text-accent-400">
      {letter}
    </div>
  );
}

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function JobCard({ job, onSelect }: JobCardProps) {
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
      className="surface-elevated card-accent-community p-5 cursor-pointer
        hover:border-accent-300 dark:hover:border-accent-700/60 hover:shadow-md
        hover:-translate-y-0.5
        transition-all duration-200 group"
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
        <div className="shrink-0">
          {job.company_logo_url ? (
            <CompanyLogo job={job} />
          ) : (
            <FallbackIcon company={job.company} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors leading-snug">
                {job.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{job.company}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                {getRelativeTimeLabel(job.posted_date)}
              </span>
              {(() => {
                const days = getDaysUntilExpiry(job.expires_at);
                if (days !== null && days <= 7 && days > 0) {
                  return (
                    <span className="block text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Expires in {days}d
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {job.location && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                </svg>
                {job.location}
              </span>
            )}
            {job.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-gray-100 dark:bg-navy-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>

          {job.standout_perks && job.standout_perks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {job.standout_perks.slice(0, 3).map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-900/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {perk}
                </span>
              ))}
              {job.standout_perks.length > 3 && (
                <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                  +{job.standout_perks.length - 3} more
                </span>
              )}
            </div>
          )}

          {job.summary && (
            <p className="mt-2.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
              {job.summary}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge-community">
                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                Verified
              </span>
              <span className="badge-community">Warm intro</span>
            </div>
            {job.apply_url && (
              <button
                onClick={handleApply}
                className="btn-primary py-1.5 px-3.5 text-xs"
              >
                Apply
                <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
