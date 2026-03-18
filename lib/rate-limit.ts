// In-memory rate limiter with per-endpoint configuration.
// On serverless each instance has its own store — provides burst protection
// per instance. Acceptable for MVP traffic; upgrade to Redis/Upstash at scale.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function getClientIP(
  request: Request | { headers: Record<string, string | string[] | undefined> },
): string {
  const getHeader = (name: string): string | undefined => {
    if ('get' in request.headers && typeof request.headers.get === 'function') {
      return request.headers.get(name) ?? undefined;
    }
    const val = (request.headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(val) ? val[0] : val;
  };

  const realIP = getHeader('x-real-ip');
  if (realIP) return realIP;

  const forwarded = getHeader('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
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

// Pre-configured rate limits for each endpoint type
export const RATE_LIMITS = {
  adminLogin: { limit: 5, windowMs: 5 * 60 * 1000 },
  submission: { limit: 5, windowMs: 60 * 60 * 1000 },
  warmIntro: { limit: 10, windowMs: 60 * 60 * 1000 },
  aiScrape: { limit: 10, windowMs: 10 * 60 * 1000 },
  search: { limit: 60, windowMs: 60 * 1000 },
  jobDetail: { limit: 100, windowMs: 60 * 1000 },
  click: { limit: 200, windowMs: 60 * 1000 },
  adminRead: { limit: 30, windowMs: 60 * 1000 },
} as const;

/** Check rate limit and send 429 if exceeded. Returns true if request was blocked. */
export function rateLimitOrReject(
  ip: string,
  config: { limit: number; windowMs: number },
  res: {
    status: (code: number) => { json: (body: unknown) => unknown };
    setHeader: (k: string, v: string) => void;
  },
): boolean {
  const result = checkRateLimit(ip, config.limit, config.windowMs);
  res.setHeader('X-RateLimit-Limit', String(config.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res
      .status(429)
      .json({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
    return true;
  }
  return false;
}
