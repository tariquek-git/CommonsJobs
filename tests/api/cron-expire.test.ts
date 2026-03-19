import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock supabase
const mockSelectResult = vi.fn().mockResolvedValue({ data: [{ id: 'expired-1' }], error: null });
const mockLt = vi.fn().mockReturnValue({ select: mockSelectResult });
const mockNot = vi.fn().mockReturnValue({ lt: mockLt });
const mockEq = vi.fn().mockReturnValue({ not: mockNot });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Set CRON_SECRET for tests
const CRON_SECRET = 'test-cron-secret-12345';
vi.stubEnv('CRON_SECRET', CRON_SECRET);

import handler from '../../api/cron/expire';

describe('GET /api/cron/expire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    mockSelectResult.mockResolvedValue({ data: [{ id: 'expired-1' }], error: null });
  });

  it('rejects missing authorization', async () => {
    const req = mockReq({ method: 'GET', headers: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('rejects invalid secret', async () => {
    const req = mockReq({
      method: 'GET',
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it('expires jobs with valid secret', async () => {
    const req = mockReq({
      method: 'GET',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { expired: number; timestamp: string };
    expect(json.expired).toBe(1);
    expect(json.timestamp).toBeTruthy();
  });

  it('returns 0 when no jobs to expire', async () => {
    mockSelectResult.mockResolvedValue({ data: [], error: null });
    const req = mockReq({
      method: 'GET',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { expired: number }).expired).toBe(0);
  });

  it('returns 500 on database error', async () => {
    mockSelectResult.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const req = mockReq({
      method: 'GET',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
  });

  it('returns 500 when CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET;
    const req = mockReq({
      method: 'GET',
      headers: { authorization: 'Bearer anything' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
  });
});
