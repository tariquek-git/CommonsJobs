import type {
  SearchRequest,
  SearchResponse,
  Job,
  SubmissionPayload,
  SubmissionResponse,
  AdminLoginPayload,
  AdminLoginResponse,
  RuntimeInfo,
  AIResult,
} from './types';

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    let message = body.error || `HTTP ${res.status}`;
    if (body.details && Array.isArray(body.details)) {
      message += ': ' + body.details.join(', ');
    }
    throw new ApiError(message, res.status);
  }

  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Public API ──

export async function searchJobs(params: SearchRequest): Promise<SearchResponse> {
  return request('/jobs/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getJob(id: string): Promise<Job> {
  return request(`/jobs/${id}`);
}

export async function submitJob(payload: SubmissionPayload): Promise<SubmissionResponse> {
  return request('/jobs/submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function trackClick(
  jobId: string,
  utmParams?: { utm_source?: string; utm_medium?: string; utm_campaign?: string },
): Promise<void> {
  // Fire and forget - don't block on click tracking
  fetch(`${BASE}/jobs/${jobId}/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(utmParams || {}),
  }).catch(() => {});
}

// ── Warm Intro ──

export interface WarmIntroPayload {
  job_id: string;
  name: string;
  email: string;
  linkedin?: string;
  message?: string;
}

export async function requestWarmIntro(
  payload: WarmIntroPayload,
): Promise<{ success: boolean; message: string }> {
  return request('/jobs/warm-intro', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── AI API ──

export interface HumanizeResponse {
  rejection?: string;
  title?: string;
  company?: string;
  location?: string;
  country?: string;
  company_url?: string;
  salary_range?: string;
  employment_type?: string;
  work_arrangement?: string;
  humanized_description: string;
  standout_perks: string[];
  prompt_version?: string;
}

export async function humanizeJob(
  description: string,
  title: string,
  preExtracted?: Record<string, string | undefined>,
): Promise<AIResult<HumanizeResponse>> {
  const res = await fetch(`${BASE}/ai/generate-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, title, preExtracted }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI request failed' }));
    throw new ApiError(err.error || `HTTP ${res.status}`, res.status);
  }
  const body = await res.json();
  return body;
}

export async function scrapeUrl(url: string): Promise<
  AIResult<{
    title?: string;
    company?: string;
    description?: string;
    location?: string;
    country?: string;
    company_url?: string;
    salary_range?: string;
    employment_type?: string;
    work_arrangement?: string;
  }>
> {
  const res = await fetch(`${BASE}/ai/scrape-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Scrape request failed' }));
    throw new ApiError(err.error || `HTTP ${res.status}`, res.status);
  }
  const body = await res.json();
  return body;
}

// ── Admin API ──

export async function adminLogin(payload: AdminLoginPayload): Promise<AdminLoginResponse> {
  return request('/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getRuntime(token: string): Promise<RuntimeInfo> {
  return request('/admin/runtime', {
    headers: authHeaders(token),
  });
}

export async function getAdminJobs(
  token: string,
  status?: string,
  page = 1,
): Promise<{ jobs: Job[]; meta: { total: number; page: number; limit: number } }> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  return request(`/admin/jobs?${params}`, {
    headers: authHeaders(token),
  });
}

export async function updateJobStatus(token: string, jobId: string, status: string): Promise<Job> {
  return request(`/admin/jobs/${jobId}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
}

export async function getAdminJob(token: string, jobId: string): Promise<Job> {
  return request(`/admin/jobs/${jobId}`, {
    headers: authHeaders(token),
  });
}

export async function updateJob(token: string, jobId: string, updates: Partial<Job>): Promise<Job> {
  return request(`/admin/jobs/${jobId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(updates),
  });
}

// ── Analytics API ──

export interface AnalyticsData {
  clicksByDay: { date: string; count: number }[];
  introsByDay: { date: string; count: number }[];
  topJobs: { id: string; title: string; company: string; clicks: number }[];
  statusCounts: Record<string, number>;
  totals: { clicks30d: number; intros30d: number };
}

export async function getAnalytics(token: string): Promise<AnalyticsData> {
  return request('/admin/analytics', {
    headers: authHeaders(token),
  });
}

// ── External Analytics API ──

export interface ExternalAnalytics {
  posthog: {
    pageviews7d: number;
    uniqueUsers7d: number;
    topPages: { path: string; views: number }[];
    sessionCount7d: number;
  } | null;
  sentry: {
    unresolvedIssues: number;
    errorsToday: number;
    errors7d: number;
  } | null;
  vercel: {
    lastDeployment: {
      state: string;
      createdAt: number;
      url: string;
      commitMessage?: string;
    } | null;
    domains: string[];
  } | null;
  configured: {
    posthog: boolean;
    sentry: boolean;
    vercel: boolean;
    ga4: boolean;
  };
}

export async function getExternalAnalytics(token: string): Promise<ExternalAnalytics> {
  return request('/admin/analytics/external', {
    headers: authHeaders(token),
  });
}

// ── Warm Intros Admin API ──

export interface WarmIntroRecord {
  id: string;
  name: string;
  email: string;
  linkedin: string | null;
  message: string | null;
  status: string;
  created_at: string;
  job_id: string;
  job_title: string;
  job_company: string;
  job_submitter_email: string | null;
  job_submitter_name: string | null;
}

export async function getWarmIntros(
  token: string,
  status?: string,
): Promise<{ intros: WarmIntroRecord[] }> {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/admin/warm-intros${params}`, {
    headers: authHeaders(token),
  });
}

export async function updateWarmIntroStatus(
  token: string,
  id: string,
  status: string,
): Promise<{ success: boolean }> {
  return request(`/admin/warm-intros/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
}
