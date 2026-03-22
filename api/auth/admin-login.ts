import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPassword, createAdminToken } from '../../lib/auth.js';
import { getEnv } from '../../lib/env.js';
import { getClientIP, rateLimitOrReject, RATE_LIMITS } from '../../lib/rate-limit.js';
import type { AdminLoginPayload } from '../../shared/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const ip = getClientIP(req);
  if (await rateLimitOrReject(ip, RATE_LIMITS.adminLogin, res)) return;

  try {
    const body = req.body as AdminLoginPayload;

    if (!body.username || !body.password) {
      return res.status(400).json({ error: 'Username and password required', code: 'BAD_REQUEST' });
    }

    const adminUsername = getEnv('ADMIN_USERNAME');
    const adminPasswordHash = getEnv('ADMIN_PASSWORD_HASH');

    // Always run bcrypt comparison to prevent timing-based username enumeration
    // This must be a valid bcrypt hash so bcrypt.compare() takes consistent time
    const dummyHash = '$2a$10$Xo8w/MioJhSDxWR9mOjjeuht8qFwXSaMZDn1Wp//8V8hoTGQLxLcm';
    const hashToCheck = body.username === adminUsername ? adminPasswordHash : dummyHash;
    const valid = await verifyPassword(body.password, hashToCheck);

    if (body.username !== adminUsername || !valid) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }

    const token = createAdminToken();
    return res.status(200).json({ token });
  } catch (err) {
    const { logger } = await import('../../lib/logger.js');
    logger.error('Admin login error', { endpoint: 'admin-login', error: err });
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}
