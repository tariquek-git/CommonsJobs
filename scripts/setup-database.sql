-- ============================================================
-- Fintech Commons — Complete Database Setup (Idempotent)
-- ============================================================
-- Safe to run on a fresh DB or an existing one.
-- Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS everywhere.
-- Run this in Supabase SQL Editor → click "Run" or Cmd+Enter.
-- ============================================================


-- ============================================================
-- 1. JOBS TABLE (no FK deps — created first)
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title           TEXT        NOT NULL,
  company         TEXT        NOT NULL,
  location        TEXT,
  country         TEXT,
  description     TEXT,
  summary         TEXT,
  apply_url       TEXT,
  company_url     TEXT,
  company_logo_url TEXT,
  source_type     TEXT        NOT NULL DEFAULT 'direct',
  source_name     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending',
  posted_date     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  submission_ref  TEXT,
  submitter_name  TEXT,
  submitter_email TEXT,
  tags            TEXT[]      DEFAULT '{}',
  standout_perks  TEXT[]      DEFAULT '{}',
  warm_intro_ok   BOOLEAN     DEFAULT true,
  expires_at      TIMESTAMPTZ,
  submitter_ip_hash    TEXT,
  submitter_user_agent TEXT,
  submitter_referrer   TEXT
);

-- Patch existing table if it was created with fewer or different columns
-- (handles migration from old schema where company was 'company_name')
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title              TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company            TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location           TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country            TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS summary            TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_url          TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_url        TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_logo_url   TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_type        TEXT        DEFAULT 'direct';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_name        TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status             TEXT        DEFAULT 'pending';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_date        TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submission_ref     TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submitter_name     TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submitter_email    TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tags               TEXT[]      DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS standout_perks     TEXT[]      DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS warm_intro_ok      BOOLEAN     DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at         TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submitter_ip_hash    TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submitter_user_agent TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submitter_referrer   TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min           INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max           INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency      TEXT DEFAULT 'USD';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_range         TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type      TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_arrangement     TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured             BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS view_count           INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category             TEXT;


-- ============================================================
-- 2. CLICKS TABLE (FK → jobs)
-- ============================================================
CREATE TABLE IF NOT EXISTS clicks (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id       UUID        REFERENCES jobs(id) ON DELETE CASCADE,
  ip_hash      TEXT,
  user_agent   TEXT,
  referrer     TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clicks ADD COLUMN IF NOT EXISTS ip_hash      TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS user_agent   TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS referrer     TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE clicks ADD COLUMN IF NOT EXISTS utm_campaign TEXT;


-- ============================================================
-- 3. WARM_INTROS TABLE (FK → jobs, referenced by email_logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS warm_intros (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id     UUID        REFERENCES jobs(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  linkedin   TEXT,
  message    TEXT,
  ip_hash    TEXT,
  user_agent TEXT,
  referrer   TEXT,
  status     TEXT        DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS linkedin   TEXT;
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS message    TEXT;
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS ip_hash    TEXT;
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS referrer   TEXT;
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'pending';


-- ============================================================
-- 4. EMAIL_LOGS TABLE (FK → jobs AND warm_intros — last table)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type            TEXT        NOT NULL,
  recipient             TEXT        NOT NULL,
  subject               TEXT        NOT NULL,
  related_job_id        UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  related_warm_intro_id UUID        REFERENCES warm_intros(id) ON DELETE SET NULL,
  status                TEXT        NOT NULL DEFAULT 'sent',
  error_message         TEXT,
  metadata              JSONB       DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 5. DATA MIGRATION (old column names → new)
-- ============================================================
-- If migrating from old schema with company_name, copy data over
UPDATE jobs SET company = company_name WHERE company IS NULL AND company_name IS NOT NULL;
UPDATE jobs SET company = 'Unknown' WHERE company IS NULL;


-- ============================================================
-- 6. DATA CLEANUP + CHECK CONSTRAINTS
-- ============================================================

-- Fix any rows with invalid status values before adding constraints
UPDATE jobs SET status = 'archived'
  WHERE status IS NULL OR status NOT IN ('pending', 'active', 'rejected', 'archived');
UPDATE jobs SET source_type = 'direct'
  WHERE source_type IS NULL OR source_type NOT IN ('direct', 'aggregated');
UPDATE warm_intros SET status = 'contacted' WHERE status = 'sent';
UPDATE warm_intros SET status = 'pending'
  WHERE status IS NULL OR status NOT IN ('pending', 'contacted', 'connected', 'no_response');
UPDATE email_logs SET status = 'sent'
  WHERE status IS NULL OR status NOT IN ('sent', 'failed', 'bounced');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_status') THEN
    ALTER TABLE jobs ADD CONSTRAINT chk_jobs_status
      CHECK (status IN ('pending', 'active', 'rejected', 'archived'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_source_type') THEN
    ALTER TABLE jobs ADD CONSTRAINT chk_jobs_source_type
      CHECK (source_type IN ('direct', 'aggregated'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_warm_intros_status') THEN
    ALTER TABLE warm_intros ADD CONSTRAINT chk_warm_intros_status
      CHECK (status IN ('pending', 'contacted', 'connected', 'no_response'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_email_logs_status') THEN
    ALTER TABLE email_logs ADD CONSTRAINT chk_email_logs_status
      CHECK (status IN ('sent', 'failed', 'bounced'));
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 6. INDEXES
-- ============================================================

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status_source_posted
  ON jobs(status, source_type, posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at
  ON jobs(expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_submission_ref
  ON jobs(submission_ref)
  WHERE submission_ref IS NOT NULL;

-- clicks
CREATE INDEX IF NOT EXISTS idx_clicks_job_created
  ON clicks(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at
  ON clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_utm_source
  ON clicks(utm_source)
  WHERE utm_source IS NOT NULL;

-- warm_intros
CREATE INDEX IF NOT EXISTS idx_warm_intros_job_id
  ON warm_intros(job_id);
CREATE INDEX IF NOT EXISTS idx_warm_intros_email
  ON warm_intros(email);
CREATE INDEX IF NOT EXISTS idx_warm_intros_status
  ON warm_intros(status);
CREATE INDEX IF NOT EXISTS idx_warm_intros_created_at
  ON warm_intros(created_at DESC);

-- email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_event_type
  ON email_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient
  ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at
  ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_job
  ON email_logs(related_job_id);

-- Clean up old buggy index (referenced clicked_at which no code uses)
DROP INDEX IF EXISTS idx_clicks_job_clicked;


-- ============================================================
-- 7. UPDATED_AT AUTO-TRIGGER on jobs
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

-- ---- jobs ----
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'jobs_public_read') THEN
    CREATE POLICY jobs_public_read ON jobs
      FOR SELECT USING (status = 'active' AND source_type = 'direct');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'jobs_public_insert') THEN
    CREATE POLICY jobs_public_insert ON jobs
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'jobs_service_all') THEN
    CREATE POLICY jobs_service_all ON jobs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ---- clicks ----
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clicks' AND policyname = 'clicks_public_insert') THEN
    CREATE POLICY clicks_public_insert ON clicks
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clicks' AND policyname = 'clicks_service_all') THEN
    CREATE POLICY clicks_service_all ON clicks
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ---- warm_intros ----
ALTER TABLE warm_intros ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warm_intros' AND policyname = 'warm_intros_public_insert') THEN
    CREATE POLICY warm_intros_public_insert ON warm_intros
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warm_intros' AND policyname = 'warm_intros_service_all') THEN
    CREATE POLICY warm_intros_service_all ON warm_intros
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ---- email_logs ----
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'email_logs_service_only') THEN
    CREATE POLICY email_logs_service_only ON email_logs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;


-- ============================================================
-- 9. TABLE COMMENTS
-- ============================================================
COMMENT ON TABLE jobs        IS 'Core job listings — community-submitted and aggregated';
COMMENT ON TABLE clicks      IS 'Click-through tracking for job apply links';
COMMENT ON TABLE warm_intros IS 'Warm introduction requests from candidates to job posters';
COMMENT ON TABLE email_logs  IS 'Audit trail for all outbound emails (Resend)';


-- ============================================================
-- 10. RELOAD PostgREST SCHEMA CACHE
-- ============================================================
-- Required after adding columns so Supabase API recognizes them
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- ✅ DONE — You should see "Success. No rows returned"
-- ============================================================
