import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// Mock data
const mockIntrosData = [
  {
    id: 'intro-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    linkedin: 'https://linkedin.com/in/jane',
    message: 'Interested in this role',
    status: 'pending',
    created_at: '2026-03-14T00:00:00Z',
    job_id: 'job-1',
  },
];

const mockJobsData = [
  {
    id: 'job-1',
    title: 'Engineer',
    company: 'Acme',
    submitter_email: 'hr@acme.com',
    submitter_name: 'HR Team',
  },
];

// Helper to create a chain that resolves at any point
function chain(resolvedValue: unknown) {
  const _self: Record<string, unknown> = {};
  const make = (): unknown =>
    new Proxy(() => {}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (fn: (v: unknown) => void) => Promise.resolve(fn(resolvedValue));
        }
        if (prop === 'catch' || prop === 'finally') {
          return () => Promise.resolve(resolvedValue);
        }
        return make();
      },
      apply() {
        return make();
      },
    });
  return make() as typeof self;
}

let introsResult: unknown;
let jobsResult: unknown;
let _introSingleResult: unknown;
let _updateResult: unknown;
let emailLogsResult: unknown;

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'warm_intros') {
    // Could be list query or single query — both chains end with await
    // The list handler: .select().order().limit() → resolves
    // The status handler first call: .select().eq().single() → resolves introSingleResult
    // The status handler update: .update().eq().select().single() → resolves updateResult
    return chain(introsResult);
  }
  if (table === 'email_logs') {
    return chain(emailLogsResult);
  }
  // jobs table
  return chain(jobsResult);
});

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({ from: mockFrom }),
  getJobsTable: () => 'jobs',
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => 'test-secret',
  validateEnv: () => {},
}));

vi.mock('../../lib/auth.js', () => ({
  requireAdmin: vi.fn().mockReturnValue(true),
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../lib/email.js', () => ({
  sendIntroContacted: vi.fn().mockResolvedValue({}),
  sendIntroToRequester: vi.fn().mockResolvedValue({}),
  sendIntroToContact: vi.fn().mockResolvedValue({}),
  sendIntroNoResponse: vi.fn().mockResolvedValue({}),
}));

import listHandler from '../../api/admin/warm-intros';
import statusHandler from '../../api/admin/warm-intros/[id]/status';
import { requireAdmin } from '../../lib/auth.js';

describe('GET /api/admin/warm-intros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    introsResult = { data: mockIntrosData, error: null };
    jobsResult = { data: mockJobsData, error: null };
    emailLogsResult = { data: [], error: null };
  });

  it('rejects non-GET methods', async () => {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();
    await listHandler(req, res);
    expect(res._status).toBe(405);
  });

  it('rejects unauthorized requests', async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await listHandler(req, res);
    expect(res._status).toBe(401);
  });

  it('returns warm intros with job info', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await listHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { intros: Record<string, unknown>[] };
    expect(json.intros).toHaveLength(1);
    expect(json.intros[0].name).toBe('Jane Doe');
    expect(json.intros[0].job_title).toBe('Engineer');
    expect(json.intros[0].job_company).toBe('Acme');
    expect(json.intros[0].job_submitter_email).toBe('hr@acme.com');
  });

  it('supports status filter', async () => {
    const req = mockReq({ method: 'GET', query: { status: 'pending' } });
    const res = mockRes();
    await listHandler(req, res);
    expect(res._status).toBe(200);
  });
});

describe('PATCH /api/admin/warm-intros/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    // First from('warm_intros') returns the single intro, second returns update result
    introsResult = {
      data: {
        id: 'intro-1',
        name: 'Jane',
        email: 'jane@test.com',
        linkedin: null,
        message: 'hi',
        job_id: 'job-1',
        status: 'pending',
      },
      error: null,
    };
    jobsResult = { data: mockJobsData[0], error: null };
    emailLogsResult = { data: [], error: null };
  });

  it('rejects non-PATCH methods', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await statusHandler(req, res);
    expect(res._status).toBe(405);
  });

  it('rejects unauthorized requests', async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'intro-1' },
      body: { status: 'contacted' },
    });
    const res = mockRes();
    await statusHandler(req, res);
    expect(res._status).toBe(401);
  });

  it('rejects invalid status', async () => {
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'intro-1' },
      body: { status: 'invalid' },
    });
    const res = mockRes();
    await statusHandler(req, res);
    expect(res._status).toBe(400);
  });

  it('updates status on valid request', async () => {
    const req = mockReq({
      method: 'PATCH',
      query: { id: 'intro-1' },
      body: { status: 'contacted' },
    });
    const res = mockRes();
    await statusHandler(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { success: boolean }).success).toBe(true);
  });

  it('rejects missing id', async () => {
    const req = mockReq({ method: 'PATCH', body: { status: 'contacted' } });
    const res = mockRes();
    await statusHandler(req, res);
    expect(res._status).toBe(400);
  });
});
