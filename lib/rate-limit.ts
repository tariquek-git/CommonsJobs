// Simple in-memory rate limiter for serverless functions
// Uses a sliding window approach per IP

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // per window

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60 * 1000);

export function getClientIP(request: Request): string {
  // Use server-derived IP, not raw x-forwarded-for
  // In Vercel, the platform sets x-real-ip reliably
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;

  // Fallback: take only the first IP from x-forwarded-for (client IP)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

export function checkRateLimit(ip: string, limit = MAX_REQUESTS, windowMs = WINDOW_MS): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `rl:${ip}`;

  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}
