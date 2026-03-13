import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPassword, createAdminToken } from '../../lib/auth.js';
import { getEnv } from '../../lib/env.js';
import { checkRateLimit, getClientIP } from '../../lib/rate-limit.js';
import type { AdminLoginPayload } from '../../shared/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Rate limit admin login attempts
    const ip = getClientIP(req as unknown as Request);
    const rl = checkRateLimit(ip, 5, 5 * 60 * 1000); // 5 attempts per 5 minutes
    if (!rl.allowed) {
      return res.status(429).json({ error: 'Too many login attempts', code: 'RATE_LIMITED' });
    }

    const body = req.body as AdminLoginPayload;
    if (!body.username || !body.password) {
      return res.status(400).json({ error: 'Username and password required', code: 'BAD_REQUEST' });
    }

    const adminUsername = getEnv('ADMIN_USERNAME');
    const adminPasswordHash = getEnv('ADMIN_PASSWORD_HASH');

    if (body.username !== adminUsername) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }

    const valid = await verifyPassword(body.password, adminPasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }

    const token = createAdminToken();
    return res.status(200).json({ token });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
