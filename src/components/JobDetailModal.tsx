import { useEffect, useRef } from 'react';
import type { Job } from '../lib/types';
import { formatDate, getRelativeTimeLabel } from '../lib/date';
import { trackClick } from '../lib/api';

interface JobDetailModalProps {
  job: Job | null;
  onClose: () => void;
}

export default function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!job) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [job, onClose]);

  if (!job) return null;

  const handleApply = () => {
    if (job.apply_url) {
      trackClick(job.id);
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto pt-12 pb-12 px-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-2xl glass-panel p-0 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-navy-700/40">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 dark:bg-accent-900/20 text-lg font-bold text-accent-600 dark:text-accent-400 shrink-0">
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  alt={job.company}
                  className="h-12 w-12 rounded-xl object-contain bg-gray-100 dark:bg-navy-800 p-1.5"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                  }}
                />
              ) : (
                job.company.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-snug">{job.title}</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">{job.company}</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-400 dark:text-gray-500">
                {job.location && (
                  <span className="inline-flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                    </svg>
                    {job.location}
                  </span>
                )}
                <span>{getRelativeTimeLabel(job.posted_date)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-2 -mt-1 -mr-1"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Trust cue */}
          <div className="flex items-center gap-2">
            <span className="badge-community">
              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              Community verified
            </span>
            <span className="badge-community">Warm intro possible</span>
          </div>

          {/* Summary */}
          {job.summary && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                {job.summary}
              </p>
            </div>
          )}

          {/* Standout Perks */}
          {job.standout_perks && job.standout_perks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What Stands Out</h3>
              <div className="flex flex-wrap gap-2">
                {job.standout_perks.map((perk) => (
                  <span
                    key={perk}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/15 px-3 py-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/30"
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

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Full Description</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto pr-2">
                {job.description}
              </div>
            </div>
          )}

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-gray-100 dark:bg-navy-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Posted {formatDate(job.posted_date)}
            {job.company_url && (
              <>
                {' · '}
                <a
                  href={job.company_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300"
                >
                  Company website
                </a>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-navy-700/40">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          {job.apply_url && (
            <button onClick={handleApply} className="btn-primary">
              Apply Now
              <svg className="h-4 w-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
