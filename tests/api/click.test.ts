import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock supabase
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
  getClicksTable: () => 'clicks',
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => '',
  validateEnv: () => {},
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    click: { limit: 200, windowMs: 60000 },
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import handler from '../../api/jobs/[id]/click';
import { rateLimitOrReject } from '../../lib/rate-limit.js';

describe('POST /api/jobs/[id]/click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: job exists and is active
    mockSingle.mockResolvedValue({
      data: { id: 'c83dda7c-3725-4c09-9d15-9e8f2c3052c9', status: 'active' },
      error: null,
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET', query: { id: 'c83dda7c-3725-4c09-9d15-9e8f2c3052c9' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('rejects missing job ID', async () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
  });

  it('rejects invalid UUID format', async () => {
    const req = mockReq({ query: { id: 'not-a-uuid' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { error: string }).error).toBe('Invalid job ID format');
  });

  it('returns 404 for non-existent job', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const req = mockReq({ query: { id: 'c83dda7c-3725-4c09-9d15-9e8f2c3052c9' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  it('rejects click on inactive job', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'c83dda7c-3725-4c09-9d15-9e8f2c3052c9', status: 'pending' },
      error: null,
    });
    const req = mockReq({ query: { id: 'c83dda7c-3725-4c09-9d15-9e8f2c3052c9' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  it('tracks click for active job', async () => {
    const req = mockReq({ query: { id: 'c83dda7c-3725-4c09-9d15-9e8f2c3052c9' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { tracked: boolean }).tracked).toBe(true);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const req = mockReq({ query: { id: 'c83dda7c-3725-4c09-9d15-9e8f2c3052c9' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(0);
  });
});
