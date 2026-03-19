import { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import type { Job } from '../lib/types';
import { getRelativeTimeLabel } from '../lib/date';
import { getJobShareUrl, getJobShareText, copyToClipboard } from '../lib/utils';
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
  const navigate = useNavigate();
  const [showCopied, setShowCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close share menu on click-outside or Escape
  useEffect(() => {
    if (!shareOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [shareOpen]);

  const handleCardClick = () => {
    posthog?.capture('job_clicked', {
      job_id: job.id,
      job_title: job.title,
      job_source: 'job_grid',
    });
    onSelect(job);
  };

  const trackShare = (method: string) => {
    posthog?.capture('job_shared', {
      method,
      job_id: job.id,
      job_title: job.title,
    });
  };

  const handleShareLinkedIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getJobShareUrl(job);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
    trackShare('linkedin');
    setShareOpen(false);
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getJobShareUrl(job);
    const text = getJobShareText(job);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      '_blank',
      'noopener,noreferrer',
    );
    trackShare('whatsapp');
    setShareOpen(false);
  };

  const handleShareEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getJobShareUrl(job);
    const text = getJobShareText(job);
    const subject = `${job.title} at ${job.company}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + '\n\n' + url)}`;
    trackShare('email');
    setShareOpen(false);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getJobShareUrl(job);
    await copyToClipboard(url);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
    trackShare('copy');
    setShareOpen(false);
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(
                    `/company/${encodeURIComponent(job.company.toLowerCase().replace(/\s+/g, '-'))}`,
                  );
                }}
                className="text-sm font-medium text-gray-600 hover:text-brand-500 transition-colors mt-1 text-left"
              >
                {job.company}
              </button>
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
                const diffDays = Math.floor(
                  (Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24),
                );
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
            {(() => {
              const loc = job.location;
              const arr = job.work_arrangement;
              const isRemote = arr?.toLowerCase() === 'remote';
              const isHybrid = arr?.toLowerCase() === 'hybrid';
              const locationIsRemote = loc?.toLowerCase() === 'remote';

              // Show location pin (skip if location is just "Remote" and arrangement is already Remote)
              if (loc && !(locationIsRemote && isRemote)) {
                return (
                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"
                      />
                    </svg>
                    {loc}
                  </span>
                );
              }
              return null;
            })()}
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
                {job.work_arrangement === 'Hybrid' &&
                job.location &&
                job.location.toLowerCase() !== 'remote'
                  ? `Hybrid · ${job.location}`
                  : job.work_arrangement}
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
            <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-3">{job.summary}</p>
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
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                  </span>
                  Warm intro available
                </span>
              )}
            </div>
            <div className="relative flex items-center gap-2" ref={shareRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShareOpen(!shareOpen);
                }}
                className="relative rounded-full p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                aria-label="Share job"
                title="Share"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                  />
                </svg>
                {showCopied && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg animate-fade-in">
                    Link copied!
                  </span>
                )}
              </button>

              {/* Share dropdown */}
              {shareOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-44 rounded-xl bg-white border border-gray-200 shadow-lg py-1.5 z-20 animate-scale-in">
                  <button
                    onClick={handleShareLinkedIn}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-4 w-4 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    Share on LinkedIn
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-4 w-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Share on WhatsApp
                  </button>
                  <button
                    onClick={handleShareEmail}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    Share via Email
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleCopyLink}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.061a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757"
                      />
                    </svg>
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});
