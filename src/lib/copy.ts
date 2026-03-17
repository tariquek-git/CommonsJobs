/**
 * All user-facing copy, sourced from content/ JSON files (managed by Keystatic).
 *
 * Voice rules:
 *   - First person ("I" not "we") except where Brim is the subject.
 *   - Short sentences. No em dashes. Periods and commas only.
 *   - Tone shifts by context:
 *       hero / founder  → casual, direct, personal
 *       brim / about    → professional but human
 *       warm intro      → warm, reassuring, honest
 *       legal           → responsible, light humor (lives in TermsModal, not here)
 *       errors / UI     → helpful, brief
 *   - Say "real" at most twice across the whole site.
 *   - Say "humanize" only as a feature name, not a mantra.
 *   - "Black hole" once. "Ghost jobs" once.
 */

// Content from Keystatic-managed JSON files (bundled at build time by Vite)
import heroContent from '../../content/hero/index.json';
import founderContent from '../../content/founder/index.json';
import stepsContent from '../../content/steps/index.json';
import jobDetailContent from '../../content/job-detail/index.json';
import warmIntroContent from '../../content/warm-intro/index.json';
import submitContent from '../../content/submit/index.json';
import metaContent from '../../content/meta/index.json';

// ─── Hero ────────────────────────────────────────────────────────
export const hero = {
  headline: heroContent.headline,
  subhead: heroContent.subhead,
  trustBadges: [heroContent.badge1, heroContent.badge2, heroContent.badge3] as const,
  searchPlaceholder: heroContent.searchPlaceholder,
};

// ─── Founder Section ─────────────────────────────────────────────
export const founder = {
  cardTitle: founderContent.cardTitle,
  cardSub: founderContent.cardSub,
  intro: founderContent.intro,
  story: founderContent.story,
  bottomStrip: founderContent.bottomStrip,
};

// ─── How It Works (pipeline steps) ──────────────────────────────
export const steps = {
  sectionLabel: stepsContent.sectionLabel,
  items: [
    {
      label: stepsContent.step1Label,
      sub: stepsContent.step1Sub,
      detail: stepsContent.step1Detail,
    },
    {
      label: stepsContent.step2Label,
      sub: stepsContent.step2Sub,
      detail: stepsContent.step2Detail,
    },
    {
      label: stepsContent.step3Label,
      sub: stepsContent.step3Sub,
      detail: stepsContent.step3Detail,
    },
    {
      label: stepsContent.step4Label,
      sub: stepsContent.step4Sub,
      detail: stepsContent.step4Detail,
    },
  ] as const,
};

// ─── Job Detail Modal ────────────────────────────────────────────
export const jobDetail = {
  ...jobDetailContent,
  companyWebsite: 'Company website',
  linkCopied: 'Link copied!',
  copyLink: 'Copy Link',
};

// ─── Warm Intro Modal ────────────────────────────────────────────
export const warmIntro = {
  title: warmIntroContent.title,
  subtitle: (title: string, company: string) => `for ${title} at ${company}`,
  description: warmIntroContent.description,
  howItWorks: warmIntroContent.howItWorks,
  noGuarantees: warmIntroContent.noGuarantees,
  fields: {
    name: 'Your Name',
    email: 'Your Email',
    emailHelper: 'So I can follow up with you. Never shared with anyone.',
    linkedin: 'LinkedIn',
    linkedinHelper: 'optional, but helps',
    about: 'A bit about you',
    aboutHelper: 'optional',
    aboutPlaceholder: 'Tell us about yourself and why this role caught your eye',
    aboutFooter: 'This goes directly to the job poster along with your intro.',
  },
  validation: 'Name and email are required.',
  success: {
    title: warmIntroContent.successTitle,
    body: (company: string) =>
      `I'll reach out to the hiring contact at ${company} on your behalf. If there's a connection, you'll hear from me via email.`,
    disclaimer: warmIntroContent.successDisclaimer,
    cta: 'Got it, thanks',
  },
  buttons: {
    cancel: 'Cancel',
    submit: 'Request Intro',
    submitting: 'Sending...',
    footer: "I'll get this in front of the right person.",
  },
};

// ─── Submit Form ─────────────────────────────────────────────────
export const submit = {
  pageTitle: submitContent.pageTitle,
  pageDescription: submitContent.pageDescription,
  pageDescription2: submitContent.pageDescription2,
  workflow: {
    step1: 'Paste & submit',
    step2: 'AI humanizes',
    step3: 'I review it',
    step4: 'People connect',
  },
  warmIntroCallout: submitContent.warmIntroCallout,
  sections: {
    paste: 'Paste the job',
    jobUrl: 'Job URL',
    jobUrlPlaceholder: 'https://company.com/careers/role',
    description: 'Full Job Description',
    descriptionPlaceholder:
      "Paste the full job description here. Corporate speak is welcome, that's what the AI is for...",
    autofillHelper: "Paste URL and click Auto-fill. We'll scrape and humanize in one step.",
    realTalk: 'The real talk',
    realTalkPlaceholder: 'What would someone in this role actually want to know?',
    realTalkHelper: "Auto-generated when you click 'Humanize with AI', or write your own...",
    perks: 'Standout perks',
    perksHelper: 'Beyond health, dental, 401k, PTO',
    perksPlaceholder: 'e.g., 4-day work week, equity, remote-first',
    aboutYou: 'About you',
  },
  buttons: {
    autofill: 'Auto-fill',
    humanize: 'Humanize with AI',
    humanizeAndFill: 'Humanize & fill details',
    submit: 'Submit for Review',
    submitting: 'Submitting...',
    submitAnother: 'Submit Another',
  },
  ai: {
    powered:
      'Powered by Claude (Anthropic). AI auto-fills what it can. Review and edit everything below.',
    startingPoint: 'You can update any field. AI is just a starting point.',
    scraping: 'Scraping...',
    humanizing: 'Humanizing...',
    couldNotAutofill: "Couldn't auto-fill. Enter details manually.",
    couldNotAutofillUrl: 'Could not auto-fill from URL. Please enter details manually.',
    autofilled: 'Auto-filled from URL!',
    scrapedAndHumanized: 'Scraped & humanized. All fields filled!',
    humanizedPartial: (fields: string) => `Humanized! Please fill in: ${fields}`,
    humanizedFull: 'Job post humanized. All fields filled!',
    tooSlow: 'AI took too long. Try again or fill in manually.',
    unavailable: 'AI temporarily unavailable. You can still edit and submit manually.',
    unavailableBanner:
      'AI features are temporarily unavailable. You can still edit and submit manually.',
    tooManyRequests: 'Too many requests. Try again in a few seconds.',
    aiDown: 'AI is temporarily down. You can still submit manually.',
    notValid: (reason: string) => `This doesn't look like a valid job posting: ${reason}`,
  },
  success: {
    title: submitContent.successTitle,
    body: submitContent.successBody,
    refLabel: 'Reference ID',
  },
  warmIntroToggle: "Allow warm intros. I'll notify you when candidates reach out.",
};

// ─── Filter / Sort ───────────────────────────────────────────────
export const filters = {
  sortBy: 'Sort by',
  newest: 'Newest first',
  oldest: 'Oldest first',
  category: 'Category',
  clearFilters: 'Clear filters',
  feedInfo: 'Feed Info',
  feedDescription: 'Every role is reviewed. Warm intros available.',
};

// ─── Job Grid (empty / error states) ─────────────────────────────
export const jobGrid = {
  error: {
    title: 'Having trouble loading roles',
    body: 'This usually resolves in a few seconds. Give it another shot.',
    cta: 'Try Again',
  },
  empty: {
    title: 'No roles found',
    body: 'Check back soon or submit a role to get started.',
    cta: 'Submit a Role',
  },
};

// ─── Feedback Banner ─────────────────────────────────────────────
export const feedback = {
  banner: 'Help improve Fintech Commons!',
  cta: 'Share feedback',
  modalTitle: 'Feedback',
  placeholder: 'What would make this site more useful for you?',
  thanks: 'Thanks for the feedback!',
  submit: 'Send Feedback',
};

// ─── Meta / SEO ──────────────────────────────────────────────────
export const meta = {
  title: metaContent.title,
  description: metaContent.description,
  ogImageAlt: metaContent.ogImageAlt,
};
