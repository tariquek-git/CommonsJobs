const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_TOKEN_SECRET'] as const;

// These aren't required at startup but will cause runtime failures if missing.
// We warn instead of throwing so the app can still boot for local dev / partial testing.
const WARN_VARS = ['ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'CRON_SECRET'] as const;

const OPTIONAL_VARS = {
  STORAGE_PROVIDER: 'supabase',
  SUPABASE_JOBS_TABLE: 'jobs',
  SUPABASE_CLICKS_TABLE: 'clicks',
  CLIENT_ORIGIN: 'http://localhost:5173',
  TRUST_PROXY: '1',
  AI_TIMEOUT_MS: '8000',
} as const;

export function validateEnv(): void {
  // Skip validation in test mode
  if (process.env.NODE_ENV === 'test') return;

  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (secret && secret.length < 32) {
    throw new Error('ADMIN_TOKEN_SECRET must be at least 32 characters');
  }

  // Warn about optional-but-important vars
  const missingWarn = WARN_VARS.filter((key) => !process.env[key]);
  if (missingWarn.length > 0) {
    console.warn(`[env] Missing optional vars (features will degrade): ${missingWarn.join(', ')}`);
  }
}

export function getEnv(key: string, fallback?: string): string {
  return process.env[key] || fallback || OPTIONAL_VARS[key as keyof typeof OPTIONAL_VARS] || '';
}

export function getEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}
