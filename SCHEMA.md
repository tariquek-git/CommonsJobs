# Commons Jobs - Database Schema

## Supabase PostgreSQL

### Table: `jobs`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| title | text | NOT NULL | Job title |
| company | text | NOT NULL | Company name |
| location | text | | City/region |
| country | text | | ISO country code or name |
| description | text | | Full job description |
| summary | text | | AI-generated or manual summary |
| apply_url | text | | External application URL |
| company_url | text | | Company website |
| company_logo_url | text | | Logo URL (auto-resolved or manual) |
| source_type | text | NOT NULL, default 'direct' | 'direct' or 'aggregated' |
| source_name | text | | e.g. 'community', 'linkedin', 'indeed' |
| status | text | 'pending' | 'pending', 'active', 'rejected', 'archived' |
| posted_date | timestamptz | now() | When job was posted/ingested |
| created_at | timestamptz | now() | Row creation time |
| updated_at | timestamptz | now() | Last update time (trigger) |
| submission_ref | text | UNIQUE | Reference ID for submissions |
| submitter_name | text | | Submitter display name |
| submitter_email | text | | Optional submitter contact |
| submitter_ip_hash | text | | SHA-256 hashed submitter IP |
| submitter_user_agent | text | | Submitter browser User-Agent |
| submitter_referrer | text | | HTTP Referer on submission |
| tags | text[] | '{}' | Array of tags |
| standout_perks | text[] | '{}' | Array of perk highlights |
| warm_intro_ok | boolean | true | Whether warm intros are enabled |
| expires_at | timestamptz | | Auto-expiry timestamp |
| referral_source | text | | How the poster found the site |
| salary_min | integer | | Minimum salary |
| salary_max | integer | | Maximum salary |
| salary_currency | text | 'USD' | ISO currency code |
| salary_range | text | | Free-text salary range |
| employment_type | text | | Full-time, Part-time, Contract, etc. |
| work_arrangement | text | | Remote, Hybrid, On-site |
| featured | boolean | false | Featured badge |
| pinned | boolean | false | Pin to top of results |
| view_count | integer | 0 | Page view counter |
| category | text | | Job category (e.g. Engineering, Data) |

**Indexes:**
- `idx_jobs_status` on `status`
- `idx_jobs_source_type` on `source_type`
- `idx_jobs_country` on `country`
- `idx_jobs_posted_date` on `posted_date DESC`
- `idx_jobs_submission_ref` on `submission_ref` (unique)

### Table: `clicks`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| job_id | uuid | | FK to jobs.id ON DELETE CASCADE |
| ip_hash | text | | SHA-256 hashed IP for privacy |
| user_agent | text | | Browser User-Agent |
| referrer | text | | HTTP Referer header |
| utm_source | text | | UTM source parameter |
| utm_medium | text | | UTM medium parameter |
| utm_campaign | text | | UTM campaign parameter |
| created_at | timestamptz | now() | Click timestamp |

**Indexes:**
- `idx_clicks_job_id` on `job_id`
- `idx_clicks_created_at` on `created_at DESC`

### Table: `warm_intros`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| job_id | uuid | NOT NULL | FK to jobs.id ON DELETE CASCADE |
| name | text | NOT NULL | Candidate name |
| email | text | NOT NULL | Candidate email |
| linkedin | text | | Optional LinkedIn profile URL |
| message | text | | Custom message (max 2000 chars) |
| ip_hash | text | | SHA-256 hashed IP for privacy |
| user_agent | text | | HTTP User-Agent header |
| referrer | text | | HTTP Referer header |
| status | text | 'pending' | CHECK: pending, contacted, accepted, connected, followed_up, declined, no_response |
| created_at | timestamptz | now() | |
| referrer_name | text | | Person who referred the candidate |
| referrer_company | text | | Company of referrer |
| response_token | uuid | gen_random_uuid() | UNIQUE — token for contact response endpoint |
| contact_responded_at | timestamptz | | When hiring contact responded |
| contact_response | text | | accepted, declined, or more_info |
| contact_note | text | | Optional message from contact |
| status_updated_at | timestamptz | now() | Last status change timestamp |

**Indexes:**
- `idx_warm_intros_job_id` on `job_id`
- `idx_warm_intros_email` on `email`
- `idx_warm_intros_status` on `status`
- `idx_warm_intros_created_at` on `created_at DESC`
- `idx_warm_intros_response_token` on `response_token` (unique, partial)
- `idx_warm_intros_status_updated` on `(status, status_updated_at)`
- `warm_intros_job_email_unique` on `(job_id, email)` WHERE status != 'rejected'

### Table: `email_logs`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| event_type | text | NOT NULL | e.g. 'admin_warm_intro', 'candidate_thank_you' |
| recipient | text | NOT NULL | Email address |
| subject | text | NOT NULL | Email subject line |
| related_job_id | uuid | | FK to jobs.id ON DELETE SET NULL |
| related_warm_intro_id | uuid | | FK to warm_intros.id ON DELETE SET NULL |
| status | text | 'sent' | CHECK: sent, failed, bounced |
| error_message | text | | Error details if failed/bounced |
| metadata | jsonb | '{}' | Contains: from, body_text, resend_id |
| created_at | timestamptz | now() | |

**Indexes:**
- `idx_email_logs_event_type` on `event_type`
- `idx_email_logs_recipient` on `recipient`
- `idx_email_logs_created_at` on `created_at DESC`
- `idx_email_logs_job_id` on `related_job_id`
- `idx_email_logs_intro_id` on `related_warm_intro_id`
- `idx_email_logs_dedup` on `(related_job_id, event_type, status)` WHERE status = 'sent'
- `idx_email_logs_intro_dedup` on `(related_warm_intro_id, event_type, status)` WHERE status = 'sent'

### Table: `job_subscribers`

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| email | text | NOT NULL | Subscriber email (unique) |
| name | text | | Optional subscriber name |
| type | text | 'candidate' | 'candidate' or 'employer' |
| categories | text[] | '{}' | Job categories to follow |
| tags | text[] | '{}' | Skill tags to follow |
| work_arrangement | text | | Remote, Hybrid, On-site, or NULL (any) |
| location | text | | Preferred location or NULL (any) |
| frequency | text | 'instant' | 'instant' or 'weekly' |
| active | boolean | true | Is subscription active |
| unsubscribe_token | text | encode(gen_random_bytes(16),'hex') | 32-char hex token for unsubscribe link |
| ip_hash | text | | SHA-256 hashed signup IP |
| referrer | text | | HTTP Referer from signup |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**Indexes:**
- `idx_job_subscribers_email` on `email` (unique)
- `idx_job_subscribers_active` on `active` WHERE active = true
- `idx_job_subscribers_categories_gin` on `categories` USING GIN WHERE active = true

### Row Level Security

All tables have RLS enabled:
- **jobs**: Public read where `status = 'active'`; service role full access
- **clicks**: Public insert only; service role full access
- **warm_intros**: Public insert only; service role full access
- **email_logs**: Service role only (no public access)
- **job_subscribers**: Public insert only; service role full access
