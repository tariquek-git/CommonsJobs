import { useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useInView } from '../hooks/useInView';
import { FOUNDER_TEXT } from '../lib/constants';

export default function FounderSection() {
  const [collapsed, setCollapsed] = useLocalStorage('founder-collapsed', true);
  const contentRef = useRef<HTMLDivElement>(null);
  const { ref: stepsRef, inView: stepsVisible } = useInView();

  return (
    <div className="space-y-4">
      {/* Collapsible founder message — first */}
      <div className="surface-elevated overflow-hidden">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          aria-expanded={!collapsed}
        >
          <span className="text-sm font-semibold text-gray-700">
            Why I built Fintech Commons
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
              collapsed ? '' : 'rotate-180'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          ref={contentRef}
          className={`overflow-hidden transition-all duration-300 ease-out ${
            collapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
          }`}
        >
          <div className="px-5 pb-5 border-t border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mt-4">
              {FOUNDER_TEXT}
            </p>
          </div>
        </div>
      </div>

      {/* How it works — human-over-automation theme */}
      <div ref={stepsRef} className="surface-elevated p-5 sm:p-6">
        <h3 className="text-h3 text-gray-900 font-semibold uppercase tracking-wider mb-5 flex items-center gap-2">
          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          How it works
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Step 1 */}
          <div
            className={`relative flex sm:flex-col items-start gap-3 sm:items-center sm:text-center transition-all duration-500 ${
              stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{ transitionDelay: '0ms' }}
          >
            <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="sm:mt-2">
              <p className="text-sm font-semibold text-gray-900">A real person posts a role</p>
              <p className="text-sm text-gray-600 leading-relaxed mt-0.5">
                No bots, no scrapers, no algorithms. A human submitted this because they thought it was worth sharing.
              </p>
            </div>
            <div className="hidden sm:block absolute -right-3 top-6 text-gray-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`relative flex sm:flex-col items-start gap-3 sm:items-center sm:text-center transition-all duration-500 ${
              stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="sm:mt-2">
              <p className="text-sm font-semibold text-gray-900">Human-reviewed, not algorithm-sorted</p>
              <p className="text-sm text-gray-600 leading-relaxed mt-0.5">
                Every listing is read by a person and translated from corporate-speak into plain language. No black-box algorithms deciding what you see.
              </p>
            </div>
            <div className="hidden sm:block absolute -right-3 top-6 text-gray-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`flex sm:flex-col items-start gap-3 sm:items-center sm:text-center transition-all duration-500 ${
              stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="sm:mt-2">
              <p className="text-sm font-semibold text-gray-900">Apply direct, or ask for a warm intro</p>
              <p className="text-sm text-gray-600 leading-relaxed mt-0.5">
                Apply on your own, or ask for a warm intro and I'll try to get it in front of the right person.
              </p>
            </div>
          </div>
        </div>

        {/* Automation + human note */}
        <div className="mt-5 rounded-xl bg-indigo-50/50 border-l-4 border-l-indigo-400 px-4 py-3 flex items-start gap-2.5">
          <svg className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <p className="text-sm text-indigo-700 leading-relaxed">
            Automation handles the plumbing — posting, formatting, expiry, notifications. But the trust part stays human. Real people post, real people review, real people connect. That's the whole point.
          </p>
        </div>
      </div>

      {/* Community callout */}
      <div className="surface-elevated p-5 sm:p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">This wouldn't be possible without you</h3>
        <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto mb-4">
          If you're personally hiring, or know someone who is — post the role. Help them find the right person, or it might be the right person who finds you. What I need most right now is posts. Once the roles are here, I'll work on getting them in front of the right people.
        </p>
        <a
          href="#submit"
          className="btn-primary inline-flex"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Post a role
          <svg className="h-4 w-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </a>
      </div>

      {/* Pre-alpha note */}
      <div className="rounded-xl bg-amber-50/40 border border-amber-200/60 px-4 py-3">
        <p className="text-sm text-amber-700 leading-relaxed">
          <span className="font-semibold">Please note:</span>{' '}
          This is pre-alpha. Things may break, look weird, or change drastically. You're seeing it early because your feedback matters more than polish right now.
        </p>
      </div>
    </div>
  );
}
