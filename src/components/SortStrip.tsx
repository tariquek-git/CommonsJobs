import type { SortOption, SearchMeta } from '../lib/types';
import { usePostHog } from '@posthog/react';
import { CATEGORIES } from '../lib/constants';

interface SortStripProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  meta: SearchMeta | null;
  onRefresh: () => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  category: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function SortStrip({
  sort,
  onSortChange,
  meta,
  onRefresh,
  tags,
  onTagsChange,
  category,
  onCategoryChange,
}: SortStripProps) {
  const posthog = usePostHog();

  const toggleCategory = (cat: string) => {
    const newCategory = category === cat ? null : cat;
    posthog?.capture('job_filter_applied', {
      filter_type: 'category',
      category: cat,
      action: category === cat ? 'removed' : 'added',
    });
    onCategoryChange(newCategory);
  };

  const handleSortChange = (value: SortOption) => {
    posthog?.capture('job_filter_applied', {
      filter_type: 'sort',
      sort: value,
    });
    onSortChange(value);
  };

  return (
    <div className="space-y-3 lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-brand-500">
            {meta?.total ?? 0} {meta?.total === 1 ? 'role' : 'roles'}
          </span>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="bg-white border border-gray-200 rounded-lg text-sm text-gray-700 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <button onClick={onRefresh} className="btn-ghost text-xs p-2" aria-label="Refresh">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              category === cat ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
        {category && (
          <button
            onClick={() => onCategoryChange(null)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
