// Structured JSON logger for Vercel serverless.
// Outputs one JSON line per log entry for easy filtering in Vercel dashboard.

interface LogData {
  [key: string]: unknown;
}

function serialize(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function log(level: 'info' | 'warn' | 'error', message: string, data?: LogData) {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  // Normalize error field to string
  if (entry.error && typeof entry.error !== 'string') {
    entry.error = serialize(entry.error);
  }
  console[level](JSON.stringify(entry));
}

export const logger = {
  info: (message: string, data?: LogData) => log('info', message, data),
  warn: (message: string, data?: LogData) => log('warn', message, data),
  error: (message: string, data?: LogData) => log('error', message, data),
};
