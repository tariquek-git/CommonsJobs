import type { SortOption, SearchMeta } from '../lib/types';

interface SortStripProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  meta: SearchMeta | null;
  onRefresh: () => void;
}

export default function SortStrip({ sort, onSortChange, meta, onRefresh }: SortStripProps) {
  return (
    <div className="flex items-center justify-between lg:hidden">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {meta?.total ?? 0} {meta?.total === 1 ? 'role' : 'roles'}
        </span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <button onClick={onRefresh} className="btn-ghost text-xs" aria-label="Refresh">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}
