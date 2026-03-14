import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showEmail, setShowEmail] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[60] flex bg-black/40 dark:bg-black/60 backdrop-blur-sm px-4 animate-fade-in ${
        isMobile ? 'items-end' : 'items-center justify-center'
      }`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className={`w-full max-w-md glass-panel p-0 overflow-hidden animate-scale-in ${
        isMobile ? 'rounded-t-2xl rounded-b-none max-h-[90vh] overflow-y-auto' : ''
      }`}>
        {isMobile && (
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-navy-600" />
          </div>
        )}

        {/* Header — big, friendly, personal */}
        <div className="relative bg-indigo-50 dark:bg-indigo-900/20 px-6 pt-6 pb-6">
          <button onClick={onClose} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/60 hover:bg-white/80 dark:bg-navy-800/60 dark:hover:bg-navy-800 text-gray-500 transition-colors" aria-label="Close">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white dark:bg-navy-900 shadow-sm text-2xl font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
              TK
            </div>
            <div>
              <h3 id="about-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">Hey, I'm Tarique</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">I built Fintech Commons — and here's why.</p>
            </div>
          </div>
        </div>

        {/* Bio content */}
        <div className="px-6 pt-5 pb-6 space-y-4">

          {/* What I do */}
          <div className="rounded-xl bg-gray-50 dark:bg-navy-900/40 border border-gray-200/60 dark:border-navy-700/30 p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">What I do</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              By day, I'm in Business Development at <span className="font-medium">Brim Financial</span> — helping banks, fintechs, and non-FIs launch modern card and payment programs. If you've tapped a card recently, there's a decent chance I had something to do with the plumbing behind it.
            </p>
          </div>

          {/* Why I built this */}
          <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200/40 dark:border-indigo-800/20 p-4">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2">Why I built this</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              After years in fintech, I got tired of watching good people apply into black holes. Fintech Commons is my attempt to make hiring feel more human — real roles, reviewed by a real person, with the option for a warm intro instead of a cold apply.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="https://www.linkedin.com/in/tariquekhan1/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A66C2]/10 dark:bg-[#0A66C2]/15 px-3 py-2 text-sm font-medium text-[#0A66C2] dark:text-[#4B9AE4] hover:bg-[#0A66C2]/20 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>

            <a
              href="https://www.brimfinancial.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-navy-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V8.999a3 3 0 013-3h12a3 3 0 013 3v.35M12 6.75h.008v.008H12V6.75z" />
              </svg>
              Brim Financial
            </a>

            <button
              onClick={() => setShowEmail(!showEmail)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-navy-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-navy-700 transition-colors"
              aria-expanded={showEmail}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {showEmail ? 'Hide email' : 'Show email'}
            </button>
          </div>

          {/* Email reveal */}
          {showEmail && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/20 p-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <a
                  href="mailto:Tarique.khan@Brimfinancial.com"
                  className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Tarique.khan@Brimfinancial.com
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
