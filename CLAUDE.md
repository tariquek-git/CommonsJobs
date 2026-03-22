# CLAUDE.md — Fintech Commons (commons-jobs)

## Project Overview

Community-driven fintech & banking job board with AI-powered descriptions, warm introductions, and company profiles.

- **Live**: https://fintechcommons.com
- **Vercel project**: `fintech-commons`
- **Repo**: `tariquek-git/CommonsJobs`

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript 5.7 + Vite 6 + Tailwind CSS 3.4 |
| Backend | Vercel Serverless Functions (Node.js 20) |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude (Haiku → structure, Sonnet → humanized copy) |
| Email | Resend |
| Analytics | PostHog (events + session recording) |
| Error tracking | Sentry |
| Auth | JWT + bcryptjs (admin only) |

## Project Structure

```
src/                → React SPA
  components/       → UI components (JobCard, JobDetailModal, WarmIntroModal, FilterRail, etc.)
  components/admin/ → Admin panel components (AdminLayout, LoginPage)
  pages/            → Route pages (HomePage, JobPage, CompanyPage, SubmitPage, IntroResponsePage)
  pages/admin/      → Admin pages (Dashboard, Jobs, Intros, Analytics, Email, Settings)
  hooks/            → Custom hooks (useJobs, useFilters, useAdmin, useAdminAuth, etc.)
  lib/              → Frontend utilities (api, constants, copy, date, env-check, logo, types, utils)
api/                → Vercel serverless endpoints (31+)
lib/                → Backend utilities (ai, api-handler, auth, cors, email, env, logger, rate-limit, response, supabase)
shared/             → Shared types & validation (frontend + backend)
tests/              → Vitest tests (15 suites, 132 tests)
scripts/            → SQL migrations, seed data, utilities
```

## Commands

```bash
npm run dev           # Vite dev server → http://localhost:5173
npm run build         # tsc -b && vite build
npm test              # vitest run (132 tests)
npm run lint          # eslint
npm run lint:fix      # eslint --fix
npm run format        # prettier --write
```

## Key Architecture Decisions

- **AI pipeline**: Two-step — Haiku extracts structured data from job URLs (Greenhouse/Ashby/Lever API aware), Sonnet generates humanized copy. Fallback mode if AI unavailable.
- **Warm intro flow**: Request → admin notification → hiring contact response via UUID token → follow-up emails → connect. Cron sends reminders at Day 5, Day 10.
- **Security**: Input sanitization, SSRF protection on URL scraping, honeypot spam rejection, IP hashing for privacy, rate limiting on all public endpoints, timing-safe auth, JWT 2h expiry.
- **SEO**: XML sitemap, dynamic OG meta (bot-only rendering), JSON-LD structured data.
- **Path aliases**: `@/` → src, `@shared/` → shared, `@lib/` → lib.

## Database

5 tables in Supabase (see SCHEMA.md for full DDL):
- `jobs` — Core listings (39+ columns)
- `clicks` — Click-through tracking with IP hashing
- `warm_intros` — Intro request pipeline with status workflow
- `email_logs` — Outbound email audit trail
- `job_subscribers` — Job alert subscriptions

All tables have RLS enabled. See `scripts/` for migrations.

## Conventions

- TypeScript strict mode enabled
- Shared types live in `shared/types.ts`, validation in `shared/validation.ts`
- API handlers use `apiHandler()` wrapper from `lib/api-handler.ts` for unified error handling, CORS, and rate limiting
- Frontend API calls go through `src/lib/api.ts`
- Tests use vitest with jsdom for frontend tests
- Pre-commit: husky + lint-staged (prettier + eslint)

## Environment Variables

See `.env.example` for full list. Required for local dev:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_TOKEN_SECRET`
- `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`
