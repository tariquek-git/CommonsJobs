import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock supabase
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'sub-1' }, error: null });
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
const mockUpdateEq = vi
  .fn()
  .mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
const mockUpdateEqActive = vi.fn().mockReturnValue(mockUpdateEq);
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEqActive });
const mockFrom = vi.fn().mockReturnValue({
  upsert: mockUpsert,
  update: mockUpdate,
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => '',
  validateEnv: () => {},
}));

vi.mock('../../lib/rate-limit.js', () => ({
  getClientIP: () => '127.0.0.1',
  rateLimitOrReject: vi.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    submission: { limit: 5, windowMs: 3600000 },
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import handler from '../../api/subscribe';
import { rateLimitOrReject } from '../../lib/rate-limit.js';

describe('POST /api/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { id: 'sub-1' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockSelect });
  });

  it('rejects non-POST/GET methods', async () => {
    const req = mockReq({ method: 'DELETE' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('rejects missing email', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('BAD_REQUEST');
  });

  it('rejects invalid email format', async () => {
    const req = mockReq({ body: { email: 'not-an-email' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('subscribes with valid email', async () => {
    const req = mockReq({ body: { email: 'test@example.com' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { subscribed: boolean }).subscribed).toBe(true);
  });

  it('includes unsubscribe_token in upsert', async () => {
    const req = mockReq({ body: { email: 'test@example.com' } });
    const res = mockRes();
    await handler(req, res);
    // Check that upsert was called with unsubscribe_token
    const upsertCall = mockUpsert.mock.calls[0]?.[0];
    expect(upsertCall).toHaveProperty('unsubscribe_token');
    expect(upsertCall.unsubscribe_token).toHaveLength(64); // 32 bytes hex
  });

  it('validates categories against whitelist', async () => {
    const req = mockReq({
      body: {
        email: 'test@example.com',
        categories: ['Engineering', 'Invalid', 'Data'],
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    // Only valid categories passed through
    const upsertCall = mockUpsert.mock.calls[0]?.[0];
    expect(upsertCall.categories).toEqual(['Engineering', 'Data']);
  });

  it('returns 500 on database error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const req = mockReq({ body: { email: 'test@example.com' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const req = mockReq({ body: { email: 'test@example.com' } });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(0);
  });
});

describe('GET /api/subscribe?action=unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { email: 'test@example.com' }, error: null });
    mockUpdateEq.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    mockUpdateEqActive.mockReturnValue(mockUpdateEq);
    mockUpdate.mockReturnValue({ eq: mockUpdateEqActive });
  });

  it('rejects short token', async () => {
    const req = mockReq({
      method: 'GET',
      query: { action: 'unsubscribe', token: 'short' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('handles valid unsubscribe token', async () => {
    const req = mockReq({
      method: 'GET',
      query: { action: 'unsubscribe', token: 'a'.repeat(64) },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  it('handles invalid/used token gracefully', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockUpdateEq.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    const req = mockReq({
      method: 'GET',
      query: { action: 'unsubscribe', token: 'b'.repeat(64) },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200); // Always 200 to prevent enumeration
  });
});
