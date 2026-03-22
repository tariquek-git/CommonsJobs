import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock supabase
const mockIntroSingle = vi.fn().mockResolvedValue({ data: { id: 'mock-intro-id' }, error: null });
const mockIntroSelect = vi.fn().mockReturnValue({ single: mockIntroSingle });
const mockInsert = vi.fn().mockReturnValue({ select: mockIntroSelect });
const mockEmailInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelectSingle = vi.fn().mockResolvedValue({
  data: { title: 'Engineer', company: 'Acme' },
  error: null,
});
const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'warm_intros') {
    return { insert: mockInsert };
  }
  if (table === 'email_logs') {
    return { insert: mockEmailInsert };
  }
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: mockSelectSingle,
      }),
    }),
  };
});

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
    warmIntro: { limit: 10, windowMs: 3600000 },
  },
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}));

import handler from '../../api/jobs/warm-intro';
import { rateLimitOrReject } from '../../lib/rate-limit.js';

describe('POST /api/jobs/warm-intro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIntroSingle.mockResolvedValue({ data: { id: 'mock-intro-id' }, error: null });
    mockIntroSelect.mockReturnValue({ single: mockIntroSingle });
    mockInsert.mockReturnValue({ select: mockIntroSelect });
  });

  it('rejects non-POST methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 201 on valid request', async () => {
    const req = mockReq({
      body: {
        job_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(201);
    expect((res._json as { success: boolean }).success).toBe(true);
  });

  it('rejects missing required fields', async () => {
    const req = mockReq({
      body: { job_id: '123', name: 'John' }, // missing email
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('rejects missing name', async () => {
    const req = mockReq({
      body: { job_id: '123', email: 'john@example.com' }, // missing name
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('rejects invalid email format', async () => {
    const req = mockReq({
      body: {
        job_id: '123',
        name: 'John',
        email: 'not-valid',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect((res._json as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 on database insert failure', async () => {
    mockIntroSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    mockIntroSelect.mockReturnValue({ single: mockIntroSingle });
    mockInsert.mockReturnValue({ select: mockIntroSelect });
    const req = mockReq({
      body: {
        job_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John',
        email: 'john@example.com',
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
      body: {
        job_id: '123',
        name: 'John',
        email: 'john@example.com',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(0); // rateLimitOrReject handles the response
  });

  it('accepts optional linkedin and message fields', async () => {
    const req = mockReq({
      body: {
        job_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        linkedin: 'https://linkedin.com/in/johndoe',
        message: 'Very interested in this role',
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedin: 'https://linkedin.com/in/johndoe',
        message: 'Very interested in this role',
      }),
    );
  });

  it('rejects empty body', async () => {
    const req = mockReq({ body: null });
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });
});
