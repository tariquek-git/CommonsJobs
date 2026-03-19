import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../../lib/auth.js';
import { getSupabase } from '../../lib/supabase.js';
import { getEnv } from '../../lib/env.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req as unknown as Request)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const checks: Record<string, { status: 'ok' | 'error'; detail?: string }> = {};

  // Check Supabase connectivity
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('jobs').select('id').limit(1);
    checks.supabase = error ? { status: 'error', detail: error.message } : { status: 'ok' };
  } catch (err) {
    checks.supabase = {
      status: 'error',
      detail: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  // Check Resend API key
  const resendKey = getEnv('RESEND_API_KEY');
  checks.resend = resendKey
    ? { status: 'ok' }
    : { status: 'error', detail: 'RESEND_API_KEY not set' };

  // Check required env vars
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ADMIN_TOKEN_SECRET',
    'RESEND_API_KEY',
    'CRON_SECRET',
    'ANTHROPIC_API_KEY',
  ];
  const missingVars = requiredVars.filter((v) => !getEnv(v));
  checks.environment =
    missingVars.length === 0
      ? { status: 'ok' }
      : { status: 'error', detail: `Missing: ${missingVars.join(', ')}` };

  // Check analytics env vars (only runtime-relevant ones)
  // Note: SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN are build-time only (source map upload)
  // and are NOT available at runtime in Vercel serverless functions — don't check them here.
  // Client-side analytics (PostHog token, Sentry DSN, GA4 ID) are embedded at build time via VITE_ prefix.
  const analyticsVars = ['POSTHOG_PERSONAL_API_KEY', 'POSTHOG_PROJECT_ID'];
  const missingAnalytics = analyticsVars.filter((v) => !getEnv(v));
  checks.analytics =
    missingAnalytics.length === 0
      ? { status: 'ok' }
      : { status: 'error', detail: `Missing: ${missingAnalytics.join(', ')}` };

  const overall = Object.values(checks).every((c) => c.status === 'ok') ? 'healthy' : 'degraded';

  return res.status(overall === 'healthy' ? 200 : 503).json({
    status: overall,
    checks,
    timestamp: new Date().toISOString(),
  });
}
