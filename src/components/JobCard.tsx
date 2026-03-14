import { useState } from 'react';
import type { Job } from '../lib/types';
import { getRelativeTimeLabel } from '../lib/date';
import { trackClick } from '../lib/api';
import { shareJob, getUtmParams } from '../lib/utils';

interface JobCardProps {
  job: Job;
  onSelect: (job: Job) => void;
}

function getAutoLogoUrl(job: Job): string | null {
  if (job.company_logo_url) return job.company_logo_url;
  if (job.company_url) {
    try {
      return `https://logo.clearbit.com/${new URL(job.company_url).hostname}`;
    } catch { /* ignore */ }
  }
  return null;
}

function CompanyLogo({ job }: { job: Job }) {
  const logoUrl = getAutoLogoUrl(job);
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${job.company} logo`}
        className="h-14 w-14 rounded-xl object-contain bg-gray-100 p-1.5"
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
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-base font-bold text-indigo-600">
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
  const [showCopied, setShowCopied] = useState(false);

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.apply_url) {
      trackClick(job.id, getUtmParams());
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
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
      onClick={() => onSelect(job)}
      className="relative surface-elevated p-6 lg:p-7 cursor-pointer overflow-hidden
        hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5
        transition-all duration-300 ease-out group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(job);
        }
      }}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {getAutoLogoUrl(job) ? (
            <>
              <CompanyLogo job={job} />
              <div className="hidden">
                <FallbackIcon company={job.company} />
              </div>
            </>
          ) : (
            <FallbackIcon company={job.company} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug">
                {job.title}
              </h3>
              <p className="text-sm font-medium text-gray-600 mt-1">{job.company}</p>
            </div>
            <div className="shrink-0 text-right flex items-center gap-1.5">
              {(() => {
                const diffDays = Math.floor((Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays < 7) {
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
                      Expires in {days}d
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
          </div>

          {job.standout_perks && job.standout_perks.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {job.standout_perks.slice(0, 3).map((perk) => (
                <span
                  key={perk}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {perk}
                </span>
              ))}
              {job.standout_perks.length > 3 && (
                <span className="text-xs text-indigo-600 font-medium">
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
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Warm intro
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="relative rounded-full p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
      </div>
    </article>
  );
}
