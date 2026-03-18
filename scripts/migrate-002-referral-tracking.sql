-- Migration 002: Add referral tracking columns
-- Run this in Supabase SQL Editor

-- warm_intros: track who referred the candidate
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS referrer_name    TEXT;
ALTER TABLE warm_intros ADD COLUMN IF NOT EXISTS referrer_company TEXT;

-- jobs: track how job submitters heard about Fintech Commons
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Reload schema cache so Supabase API picks up new columns
NOTIFY pgrst, 'reload schema';
