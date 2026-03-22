import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock supabase
const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'mock-job-id' }, error: null });
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

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
  rateLimitOrReject: vi.fn().mockResolvedValue(false),
  RATE_LIMITS: {
    submission: { limit: 5, windowMs: 3600000 },
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import handler from '../../api/jobs/submissions';
import { rateLimitOrReject } from '../../lib/rate-limit.js';

describe('POST /api/jobs/submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { id: 'mock-job-id' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 201 on valid submission', async () => {
    const req = mockReq({
      body: {
        title: 'Software Engineer',
        company: 'Acme Corp',
        apply_url: 'https://acme.com/jobs/1',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(201);
    const json = res._json as { success: boolean; submission_ref: string };
    expect(json.success).toBe(true);
    expect(json.submission_ref).toMatch(/^CJ-/);
  });

  it('rejects missing required fields', async () => {
    const req = mockReq({ body: { title: 'Engineer' } }); // missing company
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('silently accepts honeypot submissions', async () => {
    const req = mockReq({
      body: {
        title: 'Engineer',
        company: 'Acme',
        website: 'spambot.com', // honeypot field
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { success: boolean }).success).toBe(true);
    // Should NOT have called insert
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    const req = mockReq({
      body: {
        title: 'Software Engineer',
        company: 'Acme Corp',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { code: string }).code).toBe('STORAGE_ERROR');
  });

  it('returns 429 when rate limited', async () => {
    (rateLimitOrReject as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const req = mockReq({
      body: { title: 'Engineer', company: 'Acme' },
    });
    const res = mockRes();
    await handler(req, res);
    // Handler returns early, status set by rateLimitOrReject
    expect(res._status).toBe(0);
  });

  it('rejects invalid email', async () => {
    const req = mockReq({
      body: {
        title: 'Engineer',
        company: 'Acme',
        submitter_email: 'not-an-email',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('rejects overly long title', async () => {
    const req = mockReq({
      body: {
        title: 'x'.repeat(201),
        company: 'Acme',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });
});
