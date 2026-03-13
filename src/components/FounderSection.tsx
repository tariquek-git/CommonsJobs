import { useLocalStorage } from '../hooks/useLocalStorage';
import { FOUNDER_TEXT, PLEASE_NOTE, FEEDS } from '../lib/constants';

export default function FounderSection() {
  const [collapsed, setCollapsed] = useLocalStorage('founder-collapsed', false);

  return (
    <div className="space-y-4">
      {/* Collapsible founder message */}
      <div className="surface-elevated overflow-hidden">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          aria-expanded={!collapsed}
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Why I built Commons Jobs
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
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
        {!collapsed && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mt-4">
              {FOUNDER_TEXT}
            </p>
          </div>
        )}
      </div>

      {/* Feed explanation boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="surface-tinted p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">
            Community Board
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {FEEDS.community.description}
          </p>
        </div>
        <div className="rounded-xl p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-1.5">
            Web Pulse
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {FEEDS.webpulse.description}
          </p>
        </div>
      </div>

      {/* Please note */}
      <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 px-4 py-3">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <span className="font-semibold">Please note:</span>{' '}
          {PLEASE_NOTE.replace('Please note: ', '')}
        </p>
      </div>
    </div>
  );
}
