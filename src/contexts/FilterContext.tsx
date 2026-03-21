import { createContext, useContext } from 'react';
import type { SortOption, SearchMeta } from '../lib/types';
import type { FiltersResponse } from '../lib/api';

export interface FilterContextValue {
  // Current filter state
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  category: string | null;
  setCategory: (category: string | null) => void;

  // Metadata
  meta: SearchMeta | null;
  refresh: () => void;

  // Available filter options
  availableCategories: FiltersResponse['categories'];
  availableTags: FiltersResponse['tags'];
}

export const FilterContext = createContext<FilterContextValue | null>(null);

export function useFilterContext(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilterContext must be used within a FilterContext.Provider');
  }
  return ctx;
}
