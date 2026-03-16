import type { SortOption } from '../lib/types';
import type { SearchMeta } from '../lib/types';
import { useCountUp } from '../hooks/useCountUp';
import { CATEGORIES } from '../lib/constants';

interface FilterRailProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  meta: SearchMeta | null;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function FilterRail({ sort, onSortChange, meta, tags, onTagsChange }: FilterRailProps) {
  const roleCount = useCountUp(meta?.total ?? 0, 600, !!meta);

  const toggleTag = (tag: string) => {
    onTagsChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  };

  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Sort by</h3>
          <div className="space-y-1">
            {(['newest', 'oldest'] as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => onSortChange(option)}
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

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Category</h3>
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleTag(cat)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                  tags.includes(cat)
                    ? 'bg-brand-50 text-brand-500 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
            {tags.length > 0 && (
              <button
                onClick={() => onTagsChange([])}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-700 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {meta && (
          <div className="surface-tinted p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Feed Info</h3>
            <p className="text-sm text-gray-700 font-bold text-brand-500">
              {roleCount} {meta.total === 1 ? 'role' : 'roles'}
            </p>
          </div>
        )}

        <div className="text-sm text-gray-600 leading-relaxed">
          Real roles, reviewed by a real person. Warm intros available.
        </div>
      </div>
    </aside>
  );
}
