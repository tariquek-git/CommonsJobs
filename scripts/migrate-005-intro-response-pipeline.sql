-- ============================================================
-- Migration 005: Warm Intro Response Pipeline
-- ============================================================
-- Adds token-based contact response flow and new pipeline statuses.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- New columns for contact response tracking
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS response_token       UUID DEFAULT gen_random_uuid();
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS contact_responded_at TIMESTAMPTZ;
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS contact_response     TEXT;  -- 'accepted', 'declined', 'more_info'
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS contact_note         TEXT;  -- optional message from contact
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS status_updated_at    TIMESTAMPTZ DEFAULT NOW();

-- Index for fast token lookups (public endpoint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_warm_intros_response_token
  ON warm_intros(response_token) WHERE response_token IS NOT NULL;

-- Index for cron queries on status + age
CREATE INDEX IF NOT EXISTS idx_warm_intros_status_updated
  ON warm_intros(status, status_updated_at);

-- Update status constraint to include new statuses
-- Drop old constraint first, then add new one
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_warm_intros_status') THEN
    ALTER TABLE warm_intros DROP CONSTRAINT chk_warm_intros_status;
  END IF;

  -- Add updated constraint with new statuses
  ALTER TABLE warm_intros ADD CONSTRAINT chk_warm_intros_status
    CHECK (status IN ('pending', 'contacted', 'accepted', 'connected', 'followed_up', 'declined', 'no_response'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: set status_updated_at for existing rows that don't have it
UPDATE warm_intros
SET status_updated_at = created_at
WHERE status_updated_at IS NULL;

-- Backfill: generate response_token for existing rows
UPDATE warm_intros
SET response_token = gen_random_uuid()
WHERE response_token IS NULL;
