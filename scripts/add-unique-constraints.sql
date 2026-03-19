-- Prevent duplicate warm intro requests for the same job+email
-- Only applies to non-rejected intros (allows re-request after rejection)
CREATE UNIQUE INDEX IF NOT EXISTS warm_intros_job_email_unique
ON warm_intros(job_id, email) WHERE status != 'rejected';
