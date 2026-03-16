# Fintech Commons

Community-driven fintech and banking job board with AI-powered job descriptions, warm introductions, and company profiles.

**Live:** [fintechcommons.com](https://fintechcommons.com)

## Stack

- **Frontend:** React 19 + TypeScript 5.7 + Vite 6 + Tailwind CSS 3.4
- **Backend:** Vercel Serverless Functions (Node.js 20)
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude (job description humanization, URL scraping)
- **Email:** Resend (admin notifications)
- **Analytics:** PostHog (events, session recording)

## Project Structure

```
src/              → React SPA (components, pages, hooks, lib)
api/              → Vercel serverless API endpoints
lib/              → Backend utilities (auth, CORS, rate limiting, logging)
shared/           → Shared types and validation (frontend + backend)
tests/            → Vitest tests (unit, frontend, API)
public/           → Static assets (favicon, OG image, robots.txt)
.github/          → CI/CD workflows
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (for database)

### Setup

```bash
# Clone and install
git clone <repo-url> && cd commonsjobs
npm install

# Configure environment
cp .env.example .env
# Fill in required values (see Environment Variables below)

# Run locally
npm run dev          # Frontend: http://localhost:5173
```

### Environment Variables

See `.env.example` for full list. Required:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ADMIN_USERNAME` | Admin dashboard username |
| `ADMIN_PASSWORD_HASH` | bcryptjs-hashed admin password |
| `ADMIN_TOKEN_SECRET` | JWT signing secret (32+ chars) |
| `CRON_SECRET` | Bearer token for Vercel cron auth |
| `ANTHROPIC_API_KEY` | Claude API key for AI features |
| `RESEND_API_KEY` | Resend API key for emails |

## Scripts

```bash
npm run dev           # Start dev server
npm run build         # Type-check + production build
npm run preview       # Preview production build
npm test              # Run tests (Vitest)
npm run test:watch    # Watch mode
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier format
npm run format:check  # Prettier check (CI)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs/search` | Search jobs with filters |
| `GET` | `/api/jobs/:id` | Get single job |
| `POST` | `/api/jobs/submissions` | Submit a new job |
| `POST` | `/api/jobs/warm-intro` | Request warm intro |
| `POST` | `/api/ai/scrape-url` | Scrape job from URL |
| `POST` | `/api/ai/generate-summary` | AI humanize description |
| `POST` | `/api/auth/admin-login` | Admin login |
| `GET` | `/api/admin/jobs` | List jobs (admin) |
| `PATCH` | `/api/admin/jobs/:id` | Update job (admin) |
| `GET` | `/api/admin/analytics` | Analytics dashboard |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/sitemap` | XML sitemap |

## Deployment

Deployed on Vercel. Pushes to `main` trigger automatic deployment.

- **Cron:** Daily job expiry at 00:00 UTC (`/api/cron/expire`)
- **Security:** CSP, HSTS, X-Frame-Options, rate limiting, SSRF protection
- **OG Tags:** Bot-only dynamic meta tags for social sharing

## License

MIT
