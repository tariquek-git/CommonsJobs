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
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {meta?.total ?? 0} {meta?.total === 1 ? 'role' : 'roles'}
        </span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="bg-white dark:bg-navy-900 border border-gray-300 dark:border-navy-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <button
        onClick={onRefresh}
        className="btn-ghost text-xs p-2"
        aria-label="Refresh"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      </button>
    </div>
  );
}
