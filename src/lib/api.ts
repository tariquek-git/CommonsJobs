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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
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

export async function trackClick(jobId: string): Promise<void> {
  // Fire and forget - don't block on click tracking
  fetch(`${BASE}/jobs/${jobId}/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function requestWarmIntro(payload: WarmIntroPayload): Promise<{ success: boolean; message: string }> {
  return request('/jobs/warm-intro', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── AI API ──

export interface HumanizeResponse {
  humanized_description: string;
  standout_perks: string[];
}

export async function humanizeJob(description: string, title: string): Promise<AIResult<HumanizeResponse>> {
  return request('/ai/generate-summary', {
    method: 'POST',
    body: JSON.stringify({ description, title }),
  });
}

export async function scrapeUrl(url: string): Promise<AIResult<{ title?: string; company?: string; description?: string; location?: string }>> {
  return request('/ai/scrape-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
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

export async function getAdminJobs(token: string, status?: string, page = 1): Promise<{ jobs: Job[]; meta: { total: number; page: number; limit: number } }> {
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
