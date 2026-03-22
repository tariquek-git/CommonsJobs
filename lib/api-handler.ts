import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'crypto';
import { requireAdmin, extractToken } from './auth.js';
import { getClientIP, rateLimitOrReject } from './rate-limit.js';
import { logger } from './logger.js';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';

interface HandlerConfig {
  methods: HttpMethod[];
  auth?: 'admin' | 'cron' | 'none';
  rateLimit?: { limit: number; windowMs: number };
  /** Label for error logging (defaults to the URL path) */
  name?: string;
}

type HandlerFn = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

/**
 * Wraps an API handler with standard boilerplate:
 * - Method validation → 405
 * - Auth check (admin JWT or cron secret) → 401
 * - Rate limiting → 429
 * - try-catch with structured logging → 500
 */
export function apiHandler(config: HandlerConfig, fn: HandlerFn) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Method check
    if (!config.methods.includes(req.method as HttpMethod)) {
      return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    }

    // Auth check
    const auth = config.auth || 'none';
    if (auth === 'admin') {
      if (!requireAdmin(req as unknown as Request)) {
        return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }
    } else if (auth === 'cron') {
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        return res.status(500).json({ error: 'CRON_SECRET not configured' });
      }
      const authHeader = req.headers.authorization || '';
      const expected = `Bearer ${cronSecret}`;
      // Timing-safe comparison to prevent secret enumeration
      const authBuf = Buffer.from(authHeader);
      const expectedBuf = Buffer.from(expected);
      if (authBuf.length !== expectedBuf.length || !timingSafeEqual(authBuf, expectedBuf)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Rate limiting
    if (config.rateLimit) {
      const ip = getClientIP(req);
      if (rateLimitOrReject(ip, config.rateLimit, res)) return;
    }

    // Execute handler with error boundary
    try {
      return await fn(req, res);
    } catch (err) {
      const endpoint = config.name || req.url || 'unknown';
      logger.error('Unhandled API error', { endpoint, error: err });
      return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  };
}
