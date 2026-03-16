# Changelog

All notable changes to Fintech Commons will be documented in this file.

## [1.0.0] - 2026-03-16

### Added
- Job board with search, filters (tags, category), and sorting (newest/oldest)
- Client-side keyword search with URL-persisted `?q=` param
- AI-powered job description humanization via Claude
- Warm intro request system with email notifications
- Admin panel with job management, analytics, and warm intro tracking
- Job submission form with AI scraping and preview
- PostHog analytics integration with feedback collection
- Feedback collection at top banner and footer (name, email, message)
- Bug report modal in footer with PostHog tracking
- Daily job expiry cron via Vercel
- SEO: XML sitemap, dynamic OG meta tags, JSON-LD schema
- Bot-only OG rendering for Vercel cost optimization
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Company logo fallback chain (Clearbit, favicon.im, Google, Icon Horse)
- 3D animated globe on hero section
- WhatsApp community link in footer
- AI & Tools Disclosure modal
- Terms & Conditions modal
- About Me modal with founder info
- Mobile bottom navigation
- Pin-to-top feature for featured jobs
- "New" badge for jobs posted within 3 days
- Rate limiting on all public API endpoints
- SSRF protection on URL scraping endpoint
