import { config, fields, singleton } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  singletons: {
    hero: singleton({
      label: 'Hero Section',
      path: 'content/hero',
      schema: {
        headline: fields.text({ label: 'Headline' }),
        subhead: fields.text({ label: 'Subhead', multiline: true }),
        badge1: fields.text({ label: 'Trust Badge 1' }),
        badge2: fields.text({ label: 'Trust Badge 2' }),
        badge3: fields.text({ label: 'Trust Badge 3' }),
        searchPlaceholder: fields.text({ label: 'Search Placeholder' }),
      },
    }),

    founder: singleton({
      label: 'Founder Section',
      path: 'content/founder',
      schema: {
        cardTitle: fields.text({ label: 'Card Title' }),
        cardSub: fields.text({ label: 'Card Subtitle' }),
        intro: fields.text({ label: 'Personal Intro', multiline: true }),
        story: fields.text({ label: 'Founder Story', multiline: true }),
        bottomStrip: fields.text({ label: 'Bottom Strip Text' }),
      },
    }),

    steps: singleton({
      label: 'How It Works',
      path: 'content/steps',
      schema: {
        sectionLabel: fields.text({ label: 'Section Label' }),
        step1Label: fields.text({ label: 'Step 1 Label' }),
        step1Sub: fields.text({ label: 'Step 1 Subtitle' }),
        step1Detail: fields.text({ label: 'Step 1 Detail', multiline: true }),
        step2Label: fields.text({ label: 'Step 2 Label' }),
        step2Sub: fields.text({ label: 'Step 2 Subtitle' }),
        step2Detail: fields.text({ label: 'Step 2 Detail', multiline: true }),
        step3Label: fields.text({ label: 'Step 3 Label' }),
        step3Sub: fields.text({ label: 'Step 3 Subtitle' }),
        step3Detail: fields.text({ label: 'Step 3 Detail', multiline: true }),
        step4Label: fields.text({ label: 'Step 4 Label' }),
        step4Sub: fields.text({ label: 'Step 4 Subtitle' }),
        step4Detail: fields.text({ label: 'Step 4 Detail', multiline: true }),
      },
    }),

    jobDetail: singleton({
      label: 'Job Detail Modal',
      path: 'content/job-detail',
      schema: {
        twoWaysIn: fields.text({ label: 'Two Ways In Heading' }),
        twoWaysInBody: fields.text({ label: 'Two Ways In Body', multiline: true }),
        realTalk: fields.text({ label: 'Real Talk Heading' }),
        standout: fields.text({ label: 'Standout Heading' }),
        fullDescription: fields.text({ label: 'Full Description Heading' }),
        applyDirectly: fields.text({ label: 'Apply Button Text' }),
        requestWarmIntro: fields.text({ label: 'Warm Intro Button Text' }),
      },
    }),

    warmIntro: singleton({
      label: 'Warm Intro Modal',
      path: 'content/warm-intro',
      schema: {
        title: fields.text({ label: 'Modal Title' }),
        description: fields.text({ label: 'Description', multiline: true }),
        howItWorks: fields.text({ label: 'How It Works', multiline: true }),
        noGuarantees: fields.text({ label: 'No Guarantees Text', multiline: true }),
        successTitle: fields.text({ label: 'Success Title' }),
        successDisclaimer: fields.text({ label: 'Success Disclaimer', multiline: true }),
      },
    }),

    submit: singleton({
      label: 'Submit Page',
      path: 'content/submit',
      schema: {
        pageTitle: fields.text({ label: 'Page Title' }),
        pageDescription: fields.text({ label: 'Description Line 1', multiline: true }),
        pageDescription2: fields.text({ label: 'Description Line 2', multiline: true }),
        warmIntroCallout: fields.text({ label: 'Warm Intro Callout', multiline: true }),
        successTitle: fields.text({ label: 'Success Title' }),
        successBody: fields.text({ label: 'Success Body', multiline: true }),
      },
    }),

    meta: singleton({
      label: 'SEO & Meta Tags',
      path: 'content/meta',
      schema: {
        title: fields.text({ label: 'Page Title' }),
        description: fields.text({ label: 'Meta Description', multiline: true }),
        ogImageAlt: fields.text({ label: 'OG Image Alt Text' }),
      },
    }),
  },
});
