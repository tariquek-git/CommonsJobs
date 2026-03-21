import type { SortOption } from '../lib/types';
import { useFilterContext } from '../contexts/FilterContext';
import { usePostHog } from '@posthog/react';

export default function SortStrip() {
  const {
    sort,
    setSort,
    meta,
    refresh,
    tags,
    setTags,
    category,
    setCategory,
    availableCategories,
    availableTags,
  } = useFilterContext();
  const posthog = usePostHog();

  const hasFilters = !!(category || tags.length > 0);

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      posthog?.capture('job_filter_applied', {
        filter_type: 'tag',
        tag,
        action: 'removed',
      });
      setTags(tags.filter((t) => t !== tag));
    } else {
      posthog?.capture('job_filter_applied', {
        filter_type: 'tag',
        tag,
        action: 'added',
      });
      setTags([...tags, tag]);
    }
  };

  const toggleCategory = (cat: string) => {
    const newCategory = category === cat ? null : cat;
    posthog?.capture('job_filter_applied', {
      filter_type: 'category',
      category: cat,
      action: category === cat ? 'removed' : 'added',
    });
    setCategory(newCategory);
  };

  const handleSortChange = (value: SortOption) => {
    posthog?.capture('job_filter_applied', {
      filter_type: 'sort',
      sort: value,
    });
    setSort(value);
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
        <button onClick={refresh} className="btn-ghost text-xs p-2" aria-label="Refresh">
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
      {availableCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {availableCategories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => toggleCategory(cat.name)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                category === cat.name ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {cat.name}
              <span
                className={`ml-1 text-xs ${category === cat.name ? 'text-white/70' : 'text-gray-400'}`}
              >
                {cat.count}
              </span>
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={() => {
                setCategory(null);
                setTags([]);
              }}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {availableTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {availableTags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => toggleTag(tag.name)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                tags.includes(tag.name)
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
