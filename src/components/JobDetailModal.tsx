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

  const isDirect = job.source_type === 'direct';

  const handleApply = () => {
    if (job.apply_url) {
      trackClick(job.id);
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm overflow-y-auto pt-12 pb-12 px-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-2xl glass-panel p-0 overflow-hidden animate-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-lg font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
              {job.company_logo_url ? (
                <img
                  src={job.company_logo_url}
                  alt={job.company}
                  className="h-12 w-12 rounded-xl object-contain bg-gray-100 dark:bg-gray-800 p-1.5"
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
                {job.location && <span>{job.location}</span>}
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

          {/* Summary */}
          {job.summary && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Summary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                {job.summary}
              </p>
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
                  className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400"
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
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  Company website
                </a>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          {job.apply_url && (
            <button onClick={handleApply} className="btn-primary">
              Apply Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
