export const APP_NAME = 'Fintech Commons';
export const APP_DESCRIPTION = 'Fintech & Banking Job Board';

// Toast timing
export const TOAST_DURATION_MS = 4000;
export const TOAST_EXIT_MS = 300;

// Filter cache TTL (sessionStorage)
export const FILTER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Pagination
export const PAGE_SIZE = 50;

// Categories are now dynamic — fetched from /api/jobs/filters

export const FEEDS = {
  community: {
    label: 'Curated Board',
    description: 'Human-submitted roles, reviewed, warm intro possible.',
  },
} as const;

// FOUNDER_TEXT moved to src/lib/copy.ts as founder.story
// Kept here for backward compat — re-exports from copy.ts
export { founder } from './copy.js';
export const FOUNDER_TEXT = '';
