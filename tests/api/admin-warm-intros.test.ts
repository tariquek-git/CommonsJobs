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

// Mock supabase — two queries: warm_intros then jobs
const mockOrder = vi.fn().mockResolvedValue({ data: mockIntrosData, error: null });
const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
const mockIntroSelect = vi.fn().mockReturnValue({ order: mockOrder, eq: mockEq });
const mockIn = vi.fn().mockResolvedValue({ data: mockJobsData, error: null });
const mockJobSelect = vi.fn().mockReturnValue({ in: mockIn });

// Update mocks
const mockUpdateSingle = vi
  .fn()
  .mockResolvedValue({ data: { id: 'intro-1', status: 'contacted' }, error: null });
const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'warm_intros') {
    return { select: mockIntroSelect, update: mockUpdate };
  }
  // jobs table
  return { select: mockJobSelect };
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

import listHandler from '../../api/admin/warm-intros';
import statusHandler from '../../api/admin/warm-intros/[id]/status';
import { requireAdmin } from '../../lib/auth.js';

describe('GET /api/admin/warm-intros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockOrder.mockResolvedValue({ data: mockIntrosData, error: null });
    mockIn.mockResolvedValue({ data: mockJobsData, error: null });
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
    expect(mockEq).toHaveBeenCalledWith('status', 'pending');
  });
});

describe('PATCH /api/admin/warm-intros/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockUpdateSingle.mockResolvedValue({
      data: { id: 'intro-1', status: 'contacted' },
      error: null,
    });
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
    const req = mockReq({ method: 'PATCH', query: { id: 'intro-1' }, body: { status: 'invalid' } });
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
