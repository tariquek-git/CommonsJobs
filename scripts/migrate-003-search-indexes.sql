-- Migration 003: Add search performance indexes
-- Run this in Supabase SQL Editor
-- All statements are idempotent (IF NOT EXISTS)

-- GIN index for array overlap on tags (used by search endpoint overlaps() filter)
CREATE INDEX IF NOT EXISTS idx_jobs_tags_gin
  ON jobs USING GIN(tags)
  WHERE status = 'active';

-- B-tree index for category filter
CREATE INDEX IF NOT EXISTS idx_jobs_category
  ON jobs(category)
  WHERE status = 'active';

-- Composite index for email_logs warm intro queries (dedup checks)
CREATE INDEX IF NOT EXISTS idx_email_logs_intro_event
  ON email_logs(related_warm_intro_id, event_type);

-- Composite index for email_logs job queries (dedup checks)
CREATE INDEX IF NOT EXISTS idx_email_logs_job_event
  ON email_logs(related_job_id, event_type);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
