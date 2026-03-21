import { useEffect, useRef, useState } from 'react';
import type { Job } from '../lib/types';
import { formatDate, getRelativeTimeLabel } from '../lib/date';
import { trackClick } from '../lib/api';
import { shareJob, getUtmParams, isSafeUrl } from '../lib/utils';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useFocusTrap } from '../hooks/useFocusTrap';
import WarmIntroModal from './WarmIntroModal';
import CompanyLogo from './CompanyLogo';
import { usePostHog } from '@posthog/react';
import { CloseIcon, LocationPinIcon, StarIcon } from './Icons';

interface JobDetailModalProps {
  job: Job | null;
  onClose: () => void;
}

export default function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const posthog = usePostHog();
  useFocusTrap(overlayRef, !!job);

  useEffect(() => {
    if (!job) return;

    posthog?.capture('job_detail_viewed', {
      job_id: job.id,
      job_title: job.title,
      company: job.company,
      location: job.location,
      has_warm_intro: job.warm_intro_ok,
    });

    // Update URL so the address bar is shareable
    const previousUrl = window.location.pathname + window.location.search;
    window.history.pushState({ jobModal: true }, '', `/job/${job.id}`);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handlePopState = () => {
      onClose();
    };

    document.addEventListener('keydown', handleEsc);
    window.addEventListener('popstate', handlePopState);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('popstate', handlePopState);
      document.body.style.overflow = '';
      // Restore previous URL when modal closes (unless browser back was used)
      if (window.location.pathname === `/job/${job.id}`) {
        window.history.replaceState(null, '', previousUrl);
      }
    };
  }, [job, onClose, posthog]);

  if (!job) return null;

  const handleApply = () => {
    if (job.apply_url && isSafeUrl(job.apply_url)) {
      trackClick(job.id, getUtmParams());
      posthog?.capture('job_apply_clicked', {
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        source: 'modal',
      });
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async () => {
    const method = await shareJob(job);
    posthog?.capture('job_shared', {
      job_id: job.id,
      job_title: job.title,
      company: job.company,
      method: method || 'cancelled',
    });
    if (method === 'clipboard') {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleWarmIntroOpen = () => {
    posthog?.capture('warm_intro_modal_opened', {
      job_id: job.id,
      job_title: job.title,
      company: job.company,
    });
    setShowIntro(true);
  };

  return (
    <>
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in ${
          isMobile
            ? 'flex items-end'
            : 'flex items-start justify-center overflow-y-auto pt-12 pb-12 px-4'
        }`}
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${job.title} at ${job.company}`}
      >
        <div
          className={`w-full glass-panel p-0 overflow-hidden animate-slide-up ${
            isMobile ? 'max-h-[90vh] rounded-t-2xl rounded-b-none overflow-y-auto' : 'max-w-2xl'
          }`}
        >
          {/* Mobile drag handle */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-200/60">
            <div className="flex items-start gap-4">
              <CompanyLogo
                companyName={job.company}
                companyUrl={job.company_url}
                companyLogoUrl={job.company_logo_url}
                size="sm"
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-snug">{job.title}</h2>
                <p className="text-gray-600 mt-0.5">{job.company}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="h-3.5 w-3.5"
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
                      {job.location}
                    </span>
                  )}
                  <span>{getRelativeTimeLabel(job.posted_date)}</span>
                </div>
                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {job.salary_range && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
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
                          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {job.salary_range}
                    </span>
                  )}
                  {job.employment_type && (
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {job.employment_type}
                    </span>
                  )}
                  {job.work_arrangement && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200/60">
                      {job.work_arrangement}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors -mt-1 -mr-1"
              aria-label="Close"
            >
              <svg
                className="h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Trust cue */}
            <div className="flex items-center gap-2">
              {job.featured && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/60">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Featured
                </span>
              )}
              {job.tags?.includes('example') && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/60">
                  Example
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <svg
                  className="h-3 w-3 mr-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
                Reviewed
              </span>
            </div>

            {/* Summary */}
            {job.summary && (
              <div className="rounded-xl bg-brand-50/50 border border-brand-200/40 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-brand-500 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                    />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-1.5">
                      The Real Talk
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{job.summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Standout Perks */}
            {job.standout_perks && job.standout_perks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  What Stands Out
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.standout_perks.map((perk) => (
                    <span
                      key={perk}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 border border-brand-200/60"
                    >
                      <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Original Job Description */}
            {job.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  Original Job Description
                </h3>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line rounded-xl border border-gray-200/60 p-4 max-h-96 overflow-y-auto">
                  {job.description}
                </div>
              </div>
            )}

            {/* Source link — original posting */}
            {job.apply_url && (
              <div className="flex items-center gap-2 text-sm">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.06a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757"
                  />
                </svg>
                <a
                  href={job.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 hover:text-brand-700 font-medium"
                >
                  View original posting ↗
                </a>
              </div>
            )}

            {/* Apply callout box */}
            <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-gray-400 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Two ways in</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    <span className="font-semibold">Apply directly</span> and the link goes straight
                    to {job.company}'s application. Or{' '}
                    <span className="font-semibold">request a warm intro</span> and I'll put your
                    name in front of the right person.
                  </p>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="text-xs text-gray-600">
              Posted {formatDate(job.posted_date)}
              {job.company_url && (
                <>
                  {' · '}
                  <a
                    href={job.company_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-500 hover:text-brand-700"
                  >
                    Company website
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200/60 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="relative rounded-full p-2.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                aria-label="Share job"
                title="Share"
              >
                <svg
                  className="h-5 w-5"
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
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg animate-fade-in">
                    Link copied!
                  </span>
                )}
              </button>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/job/${job.id}`;
                  try {
                    await navigator.clipboard.writeText(url);
                  } catch {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                  }
                  posthog?.capture('job_link_copied', { job_id: job.id, job_title: job.title });
                  setShowCopied(true);
                  setTimeout(() => setShowCopied(false), 2000);
                }}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <svg
                  className="h-3.5 w-3.5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.82"
                  />
                </svg>
                Copy Link
              </button>
            </div>
            <div className="flex items-center gap-3">
              {job.apply_url && (
                <button onClick={handleApply} className="btn-secondary">
                  Apply Directly
                  <svg
                    className="h-4 w-4 ml-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={handleWarmIntroOpen}
                className="btn-primary bg-gradient-to-r from-brand-500 to-accent-purple hover:from-brand-600 hover:to-accent-purple/90 shadow-md shadow-brand-500/20"
              >
                <svg
                  className="h-4 w-4 mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                Request Warm Intro
              </button>
            </div>
          </div>
        </div>
      </div>

      {showIntro && <WarmIntroModal job={job} onClose={() => setShowIntro(false)} />}
    </>
  );
}
