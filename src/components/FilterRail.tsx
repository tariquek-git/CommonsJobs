import type { SortOption } from '../lib/types';
import { useFilterContext } from '../contexts/FilterContext';
import { useCountUp } from '../hooks/useCountUp';

export default function FilterRail() {
  const {
    sort,
    setSort,
    meta,
    tags,
    setTags,
    category,
    setCategory,
    availableCategories,
    availableTags,
  } = useFilterContext();
  const roleCount = useCountUp(meta?.total ?? 0, 600, !!meta);

  const toggleCategory = (cat: string) => {
    setCategory(category === cat ? null : cat);
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const hasFilters = !!(category || tags.length > 0);

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Sort by
          </h3>
          <div className="space-y-1">
            {(['newest', 'oldest'] as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => setSort(option)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                  sort === option
                    ? 'bg-brand-50 text-brand-500 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {option === 'newest' ? 'Newest first' : 'Oldest first'}
              </button>
            ))}
          </div>
        </div>

        {availableCategories.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Category
            </h3>
            <div className="space-y-1">
              {availableCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200 flex items-center justify-between ${
                    category === cat.name
                      ? 'bg-brand-50 text-brand-500 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                  <span className="text-xs text-gray-400 font-normal">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {availableTags.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Popular tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => toggleTag(tag.name)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    tags.includes(tag.name)
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasFilters && (
          <button
            onClick={() => {
              setCategory(null);
              setTags([]);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-700 transition-colors"
          >
            Clear all filters
          </button>
        )}

        {meta && (
          <div className="surface-tinted p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Feed Info
            </h3>
            <p className="text-sm text-gray-700 font-bold text-brand-500">
              {roleCount} {meta.total === 1 ? 'role' : 'roles'}
            </p>
          </div>
        )}

        <div className="text-sm text-gray-600 leading-relaxed">
          Every role is reviewed. Warm intros available.
        </div>
      </div>
    </aside>
  );
}
