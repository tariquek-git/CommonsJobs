-- ============================================================
-- Migration 004: Job Subscribers (Job Alerts)
-- ============================================================
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS job_subscribers (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT        NOT NULL,
  name            TEXT,
  type            TEXT        NOT NULL DEFAULT 'candidate',  -- 'candidate' or 'employer'
  categories      TEXT[]      DEFAULT '{}',    -- e.g. {"Engineering", "Data"}
  tags            TEXT[]      DEFAULT '{}',    -- e.g. {"python", "remote", "startup"}
  work_arrangement TEXT,                        -- "Remote", "Hybrid", "On-site", or NULL (any)
  location        TEXT,                         -- preferred location, or NULL (any)
  frequency       TEXT        NOT NULL DEFAULT 'instant', -- 'instant' or 'weekly'
  active          BOOLEAN     DEFAULT true,
  unsubscribe_token TEXT      NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  ip_hash         TEXT,
  referrer        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one subscription per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_subscribers_email
  ON job_subscribers(email);

-- Fast lookup for active subscribers
CREATE INDEX IF NOT EXISTS idx_job_subscribers_active
  ON job_subscribers(active) WHERE active = true;

-- Fast category matching
CREATE INDEX IF NOT EXISTS idx_job_subscribers_categories_gin
  ON job_subscribers USING GIN(categories) WHERE active = true;

-- RLS
ALTER TABLE job_subscribers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_subscribers' AND policyname = 'subscribers_public_insert') THEN
    CREATE POLICY subscribers_public_insert ON job_subscribers
      FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_subscribers' AND policyname = 'subscribers_service_all') THEN
    CREATE POLICY subscribers_service_all ON job_subscribers
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

COMMENT ON TABLE job_subscribers IS 'Email subscribers for job alerts — candidates and employers';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
