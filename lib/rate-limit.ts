// Rate limiter with Upstash Redis (distributed) and in-memory fallback.
// Redis provides consistent rate limiting across all serverless instances.
// Falls back to in-memory if UPSTASH_REDIS_REST_URL is not configured.

import { createHash } from 'crypto';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ─── In-memory fallback store ───

const memStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of memStore) {
    if (now > entry.resetAt) memStore.delete(key);
  }
}

// ─── Redis client (lazy init) ───

let redisClient: {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  ttl: (key: string) => Promise<number>;
} | null = null;
let redisInitAttempted = false;

async function getRedis() {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  // Support both Vercel integration naming (KV_REST_API_*) and manual naming
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

  if (!url || !token) return null;

  try {
    const { Redis } = await import('@upstash/redis');
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    return null;
  }
}

// ─── Client IP extraction ───

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

  const ua = getHeader('user-agent') || '';
  return 'anon_' + createHash('md5').update(ua).digest('hex').slice(0, 16);
}

// ─── Rate limit check ───

async function checkRateLimitRedis(
  ip: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = await getRedis();

  if (!redis) {
    // Fallback to in-memory
    return checkRateLimitMemory(ip, limit, windowMs);
  }

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const key = `rl:${ip}:${windowSec}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    const ttl = await redis.ttl(key);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch {
    // Redis error — fall back to in-memory
    return checkRateLimitMemory(ip, limit, windowMs);
  }
}

function checkRateLimitMemory(
  ip: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpired();
  const now = Date.now();
  const key = `rl:${ip}`;

  let entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memStore.set(key, entry);
  }
  entry.count++;

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

// Synchronous wrapper for backward compatibility — starts Redis check but
// uses memory result immediately if Redis isn't ready yet.
export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  // If Redis is already initialized, we can't use it synchronously.
  // The sync API falls back to memory. Use rateLimitOrReject for full Redis support.
  return checkRateLimitMemory(ip, limit, windowMs);
}

// Pre-configured rate limits for each endpoint type
export const RATE_LIMITS = {
  adminLogin: { limit: 3, windowMs: 15 * 60 * 1000 },
  submission: { limit: 5, windowMs: 60 * 60 * 1000 },
  warmIntro: { limit: 10, windowMs: 60 * 60 * 1000 },
  introResponse: { limit: 5, windowMs: 60 * 60 * 1000 },
  aiScrape: { limit: 10, windowMs: 10 * 60 * 1000 },
  search: { limit: 60, windowMs: 60 * 1000 },
  jobDetail: { limit: 100, windowMs: 60 * 1000 },
  click: { limit: 200, windowMs: 60 * 1000 },
  adminRead: { limit: 30, windowMs: 60 * 1000 },
} as const;

/** Check rate limit (async, uses Redis when available) and send 429 if exceeded. */
export async function rateLimitOrReject(
  ip: string,
  config: { limit: number; windowMs: number },
  res: {
    status: (code: number) => { json: (body: unknown) => unknown };
    setHeader: (k: string, v: string) => void;
  },
): Promise<boolean> {
  const result = await checkRateLimitRedis(ip, config.limit, config.windowMs);
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
