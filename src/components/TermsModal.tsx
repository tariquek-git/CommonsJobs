import { useEffect, useRef } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface TermsModalProps {
  onClose: () => void;
}

export default function TermsModal({ onClose }: TermsModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
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
      className={`fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in ${
        isMobile ? 'items-end' : 'items-center justify-center'
      }`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div
        className={`w-full max-w-lg glass-panel p-0 overflow-hidden animate-scale-in ${
          isMobile
            ? 'rounded-t-2xl rounded-b-none max-h-[90vh] overflow-y-auto'
            : 'max-h-[80vh] overflow-y-auto'
        }`}
      >
        {isMobile && (
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200/60 px-6 py-4 flex items-center justify-between">
          <h3 id="terms-modal-title" className="text-lg font-bold text-gray-900">
            The Fine Print
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 text-sm text-gray-600 leading-relaxed">
          <div className="rounded-xl bg-amber-50/50 border border-amber-200/40 p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">
              The short version
            </p>
            <p className="text-sm text-amber-800">
              This is a hobby project. Be a decent human. Be respectful and use the platform in good
              faith.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">What this is</h4>
            <p>
              Fintech Commons is a side project built and maintained by Tarique Khan. It is not a
              company, not a startup, and not backed by anyone. It exists because job boards should
              be better, and sometimes a hobby project is the fastest way to prove that.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Open source</h4>
            <p>
              The source code for Fintech Commons is available under the{' '}
              <span className="font-medium text-gray-900">MIT License</span>. That means you can use
              it, fork it, modify it, sell it — whatever. Just include the copyright notice and
              license. Standard MIT stuff.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Your data</h4>
            <p>
              If you submit a job or request a warm intro, I store the info you provide (name,
              email, LinkedIn, message). I don't sell it, share it with third parties, or use it for
              marketing. Emails are only used to connect you with the relevant person. That's it.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Play fair</h4>
            <p>
              Don't post fake jobs. Don't spam warm intros. Don't scrape the site. Don't use it to
              harvest emails. Don't do anything you wouldn't want done to you. You know the deal.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Analytics & cookies</h4>
            <p>
              We use PostHog for basic analytics and session replay to understand how people use the
              site and fix bugs. Form inputs are masked in replays. We don't run ads or share
              analytics data with third parties.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">AI & tools disclosure</h4>
            <p>
              AI was used extensively to build this project — across code, copy, and design
              decisions — using a combination of models from Anthropic (Claude), OpenAI, and Google
              (Gemini). Without AI, this project wouldn't exist. But it's not just AI — it's the
              ecosystem: Vercel, Supabase, PostHog, Resend, GitHub, and the open-source libraries
              that made it all possible. AI was the glue; the tools around it are what made building
              accessible.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">No guarantees</h4>
            <p>
              This is pre-alpha software built in spare time. It may break, go down, lose data, or
              disappear entirely. There are no SLAs, no uptime guarantees, and no warranties of any
              kind. Use it as-is. If it helps you land a job or hire someone great, that's the whole
              point.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Open source</h4>
            <p>
              Fintech Commons is open source under the{' '}
              <a
                href="https://github.com/tariquek-git/CommonJobs-MVP/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-500 hover:text-brand-600 font-medium underline underline-offset-2"
              >
                MIT License
              </a>
              . You're free to use, modify, and distribute the code. If you build something cool
              with it, let me know.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-4">
            <p className="text-xs text-gray-600">
              Last updated: March 2026. If you have questions, reach out to Tarique directly —
              there's no legal department because there's no company.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
