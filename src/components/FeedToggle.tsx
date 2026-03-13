import type { FeedType } from '../lib/types';
import { FEEDS } from '../lib/constants';

interface FeedToggleProps {
  feed: FeedType;
  onChange: (feed: FeedType) => void;
}

export default function FeedToggle({ feed, onChange }: FeedToggleProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-800">
      {(Object.entries(FEEDS) as [FeedType, (typeof FEEDS)[FeedType]][]).map(([key, config]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
            feed === key
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          aria-pressed={feed === key}
        >
          {config.label}
        </button>
      ))}
    </div>
  );
}
