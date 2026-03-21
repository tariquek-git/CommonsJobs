import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockReq, mockRes } from './helpers';

// ── Proxy chain helper ──
function chain(resolvedValue: () => unknown) {
  const make = (): unknown =>
    new Proxy(() => {}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (fn: (v: unknown) => void) => Promise.resolve(fn(resolvedValue()));
        }
        if (prop === 'catch' || prop === 'finally') {
          return () => Promise.resolve(resolvedValue());
        }
        return make();
      },
      apply() {
        return make();
      },
    });
  return make();
}

// ── Mock data ──
const mockActiveJobs = [
  { category: 'Engineering', tags: ['typescript', 'react', 'payments'] },
  { category: 'Engineering', tags: ['python', 'payments', 'fintech'] },
  { category: 'Product', tags: ['fintech', 'agile'] },
  { category: 'Design', tags: ['figma', 'ux'] },
];

const mockSitemapJobs = [
  { id: 'job-1', posted_date: '2026-03-14T00:00:00Z' },
  { id: 'job-2', posted_date: '2026-03-12T00:00:00Z' },
  { id: 'job-3', posted_date: '2026-03-10T00:00:00Z' },
];

let filtersResult: unknown;
let sitemapResult: unknown;

const mockFrom = vi.fn().mockImplementation(() => {
  // The chain proxy will resolve to either filtersResult or sitemapResult
  // We determine which based on the test setup
  return chain(() => filtersResult);
});

// For sitemap, we need a separate mock that returns sitemapResult
const mockFromSitemap = vi.fn().mockImplementation(() => {
  return chain(() => sitemapResult);
});

// We use a flag to switch behavior between filter and sitemap tests
let useSitemapMock = false;

vi.mock('../../lib/supabase.js', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => {
      if (useSitemapMock) return mockFromSitemap(...args);
      return mockFrom(...args);
    },
  }),
  getJobsTable: () => 'jobs',
}));

vi.mock('../../lib/env.js', () => ({
  getEnv: () => '',
  validateEnv: () => {},
}));

vi.mock('../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import filtersHandler from '../../api/jobs/filters';
import sitemapHandler from '../../api/sitemap';

// ═══════════════════════════════════════════════════════════
// GET /api/jobs/filters
// ═══════════════════════════════════════════════════════════
describe('GET /api/jobs/filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSitemapMock = false;
    filtersResult = { data: mockActiveJobs, error: null };
  });

  it('rejects non-GET methods', async () => {
    const req = mockReq({ method: 'POST' });
    const res = mockRes();
    await filtersHandler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns categories and tags with counts', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await filtersHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as {
      categories: { name: string; count: number }[];
      tags: { name: string; count: number }[];
    };

    // Categories sorted by count desc
    expect(json.categories).toHaveLength(3);
    expect(json.categories[0].name).toBe('Engineering');
    expect(json.categories[0].count).toBe(2);
    expect(json.categories[1].name).toBe('Product');
    expect(json.categories[1].count).toBe(1);

    // Tags normalized to lowercase, sorted by count desc
    expect(json.tags.length).toBeGreaterThan(0);
    const paymentsTag = json.tags.find((t) => t.name === 'payments');
    expect(paymentsTag).toBeDefined();
    expect(paymentsTag!.count).toBe(2);
    const fintechTag = json.tags.find((t) => t.name === 'fintech');
    expect(fintechTag).toBeDefined();
    expect(fintechTag!.count).toBe(2);
  });

  it('returns empty categories and tags when no active jobs', async () => {
    filtersResult = { data: [], error: null };
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await filtersHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as {
      categories: unknown[];
      tags: unknown[];
    };
    expect(json.categories).toHaveLength(0);
    expect(json.tags).toHaveLength(0);
  });

  it('sets Cache-Control header for CDN caching', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await filtersHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._headers['Cache-Control']).toContain('s-maxage=600');
    expect(res._headers['Cache-Control']).toContain('stale-while-revalidate');
  });

  it('handles null tags gracefully', async () => {
    filtersResult = {
      data: [
        { category: 'Engineering', tags: null },
        { category: 'Product', tags: ['fintech'] },
      ],
      error: null,
    };
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await filtersHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { categories: unknown[]; tags: unknown[] };
    expect(json.categories).toHaveLength(2);
  });

  it('returns 500 on database error', async () => {
    filtersResult = { data: null, error: { message: 'DB error' } };
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await filtersHandler(req, res);
    expect(res._status).toBe(500);
    expect((res._json as { error: string }).error).toContain('Failed to fetch filters');
  });

  it('filters tags with count >= 2 when more than 10 unique tags', async () => {
    // Create 15 unique tags, some with count=1, some with count>=2
    const manyTagJobs = [
      { category: 'Engineering', tags: ['a', 'b', 'c', 'd', 'e', 'f'] },
      { category: 'Engineering', tags: ['a', 'b', 'g', 'h', 'i', 'j'] },
      { category: 'Product', tags: ['k', 'l', 'm', 'n', 'o'] },
    ];
    filtersResult = { data: manyTagJobs, error: null };
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await filtersHandler(req, res);
    expect(res._status).toBe(200);
    const json = res._json as { tags: { name: string; count: number }[] };
    // Only tags with count >= 2 should be returned (a and b)
    for (const tag of json.tags) {
      expect(tag.count).toBeGreaterThanOrEqual(2);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// GET /api/sitemap
// ═══════════════════════════════════════════════════════════
describe('GET /api/sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSitemapMock = true;
    sitemapResult = { data: mockSitemapJobs, error: null };
  });

  it('returns valid XML with correct content type', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sitemapHandler(req, res);
    expect(res._status).toBe(200);
    expect(res._headers['Content-Type']).toBe('application/xml');
    const xml = res._body as string;
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it('includes static pages (home, submit)', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sitemapHandler(req, res);
    const xml = res._body as string;
    expect(xml).toContain('<loc>https://www.fintechcommons.com/</loc>');
    expect(xml).toContain('<loc>https://www.fintechcommons.com/submit</loc>');
  });

  it('includes job URLs from active jobs', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sitemapHandler(req, res);
    const xml = res._body as string;
    expect(xml).toContain('<loc>https://www.fintechcommons.com/job/job-1</loc>');
    expect(xml).toContain('<loc>https://www.fintechcommons.com/job/job-2</loc>');
    expect(xml).toContain('<loc>https://www.fintechcommons.com/job/job-3</loc>');
  });

  it('includes lastmod dates for job URLs', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sitemapHandler(req, res);
    const xml = res._body as string;
    expect(xml).toContain('<lastmod>2026-03-14</lastmod>');
    expect(xml).toContain('<lastmod>2026-03-12</lastmod>');
  });

  it('sets Cache-Control header', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sitemapHandler(req, res);
    expect(res._headers['Cache-Control']).toContain('s-maxage=3600');
  });

  it('returns empty sitemap on database error (graceful fallback)', async () => {
    sitemapResult = { data: null, error: { message: 'DB error' } };
    // The handler catches and returns an empty XML
    // However, the proxy chain may cause data to be null,
    // which the handler handles by using (jobs || [])
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sitemapHandler(req, res);
    // Should still produce valid XML (empty urlset or with static pages)
    expect(res._status).toBe(200);
  });

  it('handles empty jobs list', async () => {
    sitemapResult = { data: [], error: null };
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await sitemapHandler(req, res);
    expect(res._status).toBe(200);
    const xml = res._body as string;
    // Should still have static pages
    expect(xml).toContain('fintechcommons.com/</loc>');
    // Should NOT have any /job/ URLs
    expect(xml).not.toContain('/job/');
  });
});
