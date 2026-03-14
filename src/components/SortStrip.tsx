import type { SortOption, SearchMeta } from '../lib/types';

const CATEGORIES = ['Engineering', 'Product', 'Operations', 'Sales/BD', 'Remote'];

interface SortStripProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  meta: SearchMeta | null;
  onRefresh: () => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function SortStrip({ sort, onSortChange, meta, onRefresh, tags, onTagsChange }: SortStripProps) {
  const toggleTag = (tag: string) => {
    onTagsChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  };

  return (
    <div className="space-y-3 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {meta?.total ?? 0} {meta?.total === 1 ? 'role' : 'roles'}
          </span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-white dark:bg-navy-900 border border-gray-200 dark:border-navy-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleTag(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tags.includes(cat)
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {cat}
          </button>
        ))}
        {tags.length > 0 && (
          <button
            onClick={() => onTagsChange([])}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
