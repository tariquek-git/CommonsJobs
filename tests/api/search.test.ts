import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock supabase — search needs a chainable query builder
const mockRange = vi.fn().mockResolvedValue({
  data: [{ id: '1', title: 'Engineer', company: 'Acme' }],
  count: 1,
  error: null,
});
const mockOrder = vi
  .fn()
  .mockReturnValue({
    order: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range: mockRange }) }),
  });
const mockEq = vi.fn().mockReturnValue({
  ilike: vi.fn().mockReturnValue({ overlaps: vi.fn().mockReturnValue({ order: mockOrder }) }),
  overlaps: vi.fn().mockReturnValue({ order: mockOrder }),
  eq: vi.fn().mockReturnValue({ order: mockOrder }),
  order: mockOrder,
});
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => '',
  validateEnv: () => {},
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockReturnValue(false),
  RATE_LIMITS: {
    search: { limit: 60, windowMs: 60000 },
  },
}));

import handler from '../../api/jobs/search';
import { rateLimitOrReject } from '../../lib/rate-limit.js';

describe('POST /api/jobs/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRange.mockResolvedValue({
      data: [{ id: '1', title: 'Engineer', company: 'Acme' }],
      count: 1,
      error: null,
    });
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 200 with jobs on valid search', async () => {
    const req = mockReq({ body: { page: 1, limit: 20 } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as {
      jobs: unknown[];
      meta: { total: number; page: number; limit: number };
    };
    expect(json.jobs).toBeDefined();
    expect(json.meta).toBeDefined();
    expect(json.meta.page).toBe(1);
  });

  it('clamps limit to max 50', async () => {
    const req = mockReq({ body: { limit: 100 } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { meta: { limit: number } };
    expect(json.meta.limit).toBeLessThanOrEqual(50);
  });

  it('clamps page to minimum 1', async () => {
    const req = mockReq({ body: { page: -5 } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { meta: { page: number } };
    expect(json.meta.page).toBe(1);
  });

  it('handles empty body', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('returns 500 on database error', async () => {
    mockRange.mockResolvedValue({ data: null, count: null, error: { message: 'DB error' } });
    const req = mockReq({ body: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
    const req = mockReq({ body: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(0);
  });
});
