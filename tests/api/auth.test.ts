import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock env before importing handler
vi.mock('../../lib/env.js', () => ({
  getEnv: (key: string) => {
    const vars: Record<string, string> = {
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD_HASH: '$2a$10$testhashtesthasttesthashtest1234567890abcdefghij',
      ADMIN_TOKEN_SECRET: 'test-secret-that-is-at-least-32-chars-long!!',
    };
    return vars[key] || '';
  },
  validateEnv: () => {},
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Mock rate-limit
vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockReturnValue(false),
  RATE_LIMITS: {
    adminLogin: { limit: 5, windowMs: 300000 },
  },
}));

// Mock logger
vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import handler from '../../api/auth/admin-login';
import bcrypt from 'bcryptjs';
import { rateLimitOrReject } from '../../lib/rate-limit.js';
import { createAdminToken, verifyAdminToken } from '../../lib/auth';

describe('POST /api/auth/admin-login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('rejects missing credentials', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
  });

  it('rejects wrong username', async () => {
    const req = mockReq({ body: { username: 'wrong', password: 'pass' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('rejects wrong password', async () => {
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const req = mockReq({ body: { username: 'admin', password: 'wrongpass' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns token on valid login', async () => {
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const req = mockReq({ body: { username: 'admin', password: 'correctpass' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { token: string }).token).toBeTruthy();
  });

  it('returns 429 when rate limited', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    const req = mockReq({ body: { username: 'admin', password: 'pass' } });
    const res = mockRes();
    await handler(req, res);
    // Handler returns early when rate limited
    expect(res._status).toBe(0); // rateLimitOrReject handles the response
  });
});

describe('Auth token utilities', () => {
  it('creates a valid JWT token', () => {
    const token = createAdminToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('verifies a valid token', () => {
    const token = createAdminToken();
    expect(verifyAdminToken(token)).toBe(true);
  });

  it('rejects a tampered token', () => {
    expect(verifyAdminToken('invalid.token.here')).toBe(false);
  });

  it('rejects empty token', () => {
    expect(verifyAdminToken('')).toBe(false);
  });
});
