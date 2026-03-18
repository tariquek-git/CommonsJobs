export const APP_NAME = 'Fintech Commons';
export const APP_DESCRIPTION = 'Fintech & Banking Job Board';

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
