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
| source_type | text | NOT NULL | 'direct' or 'aggregated' |
| source_name | text | | e.g. 'community', 'linkedin', 'indeed' |
| status | text | 'pending' | 'pending', 'active', 'rejected', 'archived' |
| posted_date | timestamptz | now() | When job was posted/ingested |
| created_at | timestamptz | now() | Row creation time |
| updated_at | timestamptz | now() | Last update time |
| submission_ref | text | UNIQUE | Reference ID for submissions |
| submitter_email | text | | Optional submitter contact |
| tags | text[] | '{}' | Array of tags |

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
| job_id | uuid | NOT NULL | FK to jobs.id |
| clicked_at | timestamptz | now() | Click timestamp |
| ip_hash | text | | SHA-256 hashed IP for privacy |

**Indexes:**
- `idx_clicks_job_id` on `job_id`
- `idx_clicks_clicked_at` on `clicked_at DESC`

### Row Level Security
- Public read on `jobs` where `status = 'active'`
- Service role has full access (used by API)
- `clicks` insert-only for public, full access for service role
