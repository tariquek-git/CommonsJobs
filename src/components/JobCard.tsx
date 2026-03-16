import { useState, memo } from 'react';
import { usePostHog } from '@posthog/react';
import type { Job } from '../lib/types';
import { getRelativeTimeLabel } from '../lib/date';
import { shareJob } from '../lib/utils';
import CompanyLogo from './CompanyLogo';

interface JobCardProps {
  job: Job;
  onSelect: (job: Job) => void;
  className?: string;
}

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default memo(function JobCard({ job, onSelect, className = '' }: JobCardProps) {
  const posthog = usePostHog();
  const [showCopied, setShowCopied] = useState(false);

  const handleCardClick = () => {
    posthog?.capture('job_clicked', {
      job_id: job.id,
      job_title: job.title,
      job_source: 'job_grid',
    });
    onSelect(job);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const method = await shareJob(job);
    if (method === 'clipboard') {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`relative surface-elevated p-6 lg:p-7 cursor-pointer overflow-hidden
        hover:shadow-card-hover hover:-translate-y-0.5
        transition-all duration-300 ease-out group gradient-border ${className}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <CompanyLogo
            companyName={job.company}
            companyUrl={job.company_url}
            companyLogoUrl={job.company_logo_url}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-500 transition-colors leading-snug">
                {job.title}
              </h3>
              <p className="text-sm font-medium text-gray-600 mt-1">{job.company}</p>
            </div>
            <div className="shrink-0 text-right flex flex-wrap items-center gap-1.5">
              {job.pinned && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
                  <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                  Pinned
                </span>
              )}
              {job.featured && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60">
                  <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Featured
                </span>
              )}
              {(() => {
                const diffDays = Math.floor((Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays < 3) {
                  return (
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                      New
                    </span>
                  );
                }
                return null;
              })()}
              <span className="text-xs text-gray-600 tabular-nums">
                {getRelativeTimeLabel(job.posted_date)}
              </span>
              {(() => {
                const days = getDaysUntilExpiry(job.expires_at);
                if (days !== null && days <= 7 && days > 0) {
                  return (
                    <span className="block text-xs text-amber-600 mt-0.5">
                      Expires in {days} days
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.location && (
              <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                </svg>
                {job.location}
              </span>
            )}
            {job.salary_range && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                {job.salary_range}
              </span>
            )}
            {job.employment_type && (
              <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {job.employment_type}
              </span>
            )}
            {job.work_arrangement && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60">
                {job.work_arrangement}
              </span>
            )}
          </div>

          {job.standout_perks && job.standout_perks.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {job.standout_perks.slice(0, 3).map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {perk}
                </span>
              ))}
              {job.standout_perks.length > 3 && (
                <span className="text-xs text-brand-500 font-medium">
                  +{job.standout_perks.length - 3} more
                </span>
              )}
            </div>
          )}

          {job.summary && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-3">
              {job.summary}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {job.tags?.includes('example') && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200/60">
                  Example
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Reviewed
              </span>
              {job.warm_intro_ok && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-brand-50 to-purple-50 px-2 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200/60">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span></span>
                  Warm intro available
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="relative rounded-full p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                aria-label="Share job"
                title="Share"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                {showCopied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg animate-fade-in">
                    Link copied!
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
})
