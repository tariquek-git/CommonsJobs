interface FilterChipsProps {
  activeFilters: string[];
  onToggle: (filter: string) => void;
  onClear: () => void;
}

const FILTER_OPTIONS = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'On-site', value: 'onsite' },
  { label: 'Senior', value: 'senior' },
  { label: 'Mid-level', value: 'mid' },
  { label: 'Junior', value: 'junior' },
  { label: 'Engineering', value: 'engineering' },
  { label: 'Product', value: 'product' },
  { label: 'Design', value: 'design' },
  { label: 'Data', value: 'data' },
  { label: 'Operations', value: 'operations' },
];

export default function FilterChips({ activeFilters, onToggle, onClear }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_OPTIONS.map(({ label, value }) => {
        const active = activeFilters.includes(value);
        return (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={active ? 'filter-chip-active' : 'filter-chip'}
          >
            {active && (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {label}
          </button>
        );
      })}
      {activeFilters.length > 0 && (
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-accent-600 transition-colors ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export { FILTER_OPTIONS };
