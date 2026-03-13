import type { SortOption } from '../lib/types';
import type { SearchMeta } from '../lib/types';

interface FilterRailProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  meta: SearchMeta | null;
}

export default function FilterRail({ sort, onSortChange, meta }: FilterRailProps) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Sort by</h3>
          <div className="space-y-1">
            {(['newest', 'oldest'] as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => onSortChange(option)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  sort === option
                    ? 'bg-accent-50 dark:bg-accent-900/15 text-accent-600 dark:text-accent-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-navy-800'
                }`}
              >
                {option === 'newest' ? 'Newest first' : 'Oldest first'}
              </button>
            ))}
          </div>
        </div>

        {meta && (
          <div className="surface-tinted p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Feed Info</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {meta.total} {meta.total === 1 ? 'role' : 'roles'}
            </p>
          </div>
        )}

        <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          Community Board shows human-submitted, reviewed roles with possible warm intros.
        </div>
      </div>
    </aside>
  );
}
