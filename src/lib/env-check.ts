/**
 * Client-side environment variable validation.
 * Logs warnings in dev if required vars are missing.
 * Never throws — gracefully degrades in production.
 */
export function checkClientEnv() {
  const warnings: string[] = [];

  if (!import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN) {
    warnings.push('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN is not set — analytics disabled');
  }
  if (!import.meta.env.VITE_PUBLIC_POSTHOG_HOST) {
    warnings.push('VITE_PUBLIC_POSTHOG_HOST is not set — analytics disabled');
  }
  if (!import.meta.env.VITE_SENTRY_DSN) {
    warnings.push('VITE_SENTRY_DSN is not set — error tracking disabled');
  }

  if (warnings.length > 0) {
    console.warn(
      `[Fintech Commons] Missing environment variables:\n${warnings.map((w) => `  ⚠️  ${w}`).join('\n')}`,
    );
  }
}
