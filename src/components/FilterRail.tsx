import type { SortOption, FeedType } from '../lib/types';
import type { SearchMeta } from '../lib/types';

interface FilterRailProps {
  feed: FeedType;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  meta: SearchMeta | null;
}

export default function FilterRail({ feed, sort, onSortChange, meta }: FilterRailProps) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Sort */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Sort by</h3>
          <div className="space-y-1">
            {(['newest', 'oldest'] as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => onSortChange(option)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  sort === option
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {option === 'newest' ? 'Newest first' : 'Oldest first'}
              </button>
            ))}
          </div>
        </div>

        {/* Feed info */}
        {meta && (
          <div className="surface-tinted p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Feed Info</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {meta.total} {meta.total === 1 ? 'role' : 'roles'}
            </p>
            {meta.aggregatedPolicyApplied && meta.policy && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Country: {meta.policy.country}</p>
                <p>Max age: {meta.policy.maxAgeDays} days</p>
                <p>Cap: {meta.policy.maxResults} roles</p>
                <p>Per company: {meta.policy.maxPerCompany}</p>
                {meta.aggregatedCounts && (
                  <p className="mt-1 text-gray-400 dark:text-gray-500">
                    {meta.aggregatedCounts.beforePolicy} found → {meta.aggregatedCounts.afterPolicy} after policy
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feed context */}
        <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          {feed === 'community'
            ? 'Community Board shows human-submitted, reviewed roles with possible warm intros.'
            : 'Web Pulse shows aggregated Canadian fintech roles, filtered by freshness and quality policy.'}
        </div>
      </div>
    </aside>
  );
}
