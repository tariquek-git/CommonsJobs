-- ============================================================
-- EMAIL_LOGS TABLE — standalone, no FK dependencies
-- Safe to run multiple times (IF NOT EXISTS)
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type            TEXT        NOT NULL,
  recipient             TEXT        NOT NULL,
  subject               TEXT        NOT NULL,
  related_job_id        UUID,
  related_warm_intro_id UUID,
  status                TEXT        NOT NULL DEFAULT 'sent',
  error_message         TEXT,
  metadata              JSONB       DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_event_type ON email_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_job_id ON email_logs(related_job_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_intro_id ON email_logs(related_warm_intro_id);

-- Composite index for duplicate prevention queries
CREATE INDEX IF NOT EXISTS idx_email_logs_dedup
  ON email_logs(related_job_id, event_type, status)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_email_logs_intro_dedup
  ON email_logs(related_warm_intro_id, event_type, status)
  WHERE status = 'sent';

-- Row-level security: only service_role can insert/read
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy (safe for re-runs)
DROP POLICY IF EXISTS "Service role full access" ON email_logs;
CREATE POLICY "Service role full access" ON email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
