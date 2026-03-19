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
  referrer_name?: string;
  referrer_company?: string;
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
  category?: string;
  tags?: string[];
  prompt_version?: string;
}

// ── Filters API ──

export interface FiltersResponse {
  categories: { name: string; count: number }[];
  tags: { name: string; count: number }[];
}

export async function getFilters(): Promise<FiltersResponse> {
  return request('/jobs/filters');
}

export async function humanizeJob(
  description: string,
  title: string,
  preExtracted?: Record<string, string | undefined>,
): Promise<AIResult<HumanizeResponse>> {
  return request('/ai/generate-summary', {
    method: 'POST',
    body: JSON.stringify({ description, title, preExtracted }),
  });
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

export async function getAdminHealth(token: string): Promise<{
  status: string;
  checks: Record<string, { status: string; detail?: string }>;
}> {
  return request('/admin/health', { headers: authHeaders(token) });
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

export async function updateJobStatus(
  token: string,
  jobId: string,
  status: string,
  opts?: { rejection_reason?: string; rejection_message?: string },
): Promise<Job> {
  return request(`/admin/jobs/${jobId}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status, ...opts }),
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
  referrer_name: string | null;
  referrer_company: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  job_id: string;
  // Job context
  job_title: string;
  job_company: string;
  job_status: string;
  job_apply_url: string | null;
  job_submitter_email: string | null;
  job_submitter_name: string | null;
  // Email context
  email_count: number;
  last_email_at: string | null;
  email_types: string[];
  // Timing
  days_in_status: number;
  is_stale: boolean;
  needs_reminder: boolean;
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
  extra?: { contact_name?: string; contact_email?: string; contact_role?: string },
): Promise<{ success: boolean }> {
  return request(`/admin/warm-intros/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status, ...extra }),
  });
}

export async function sendIntroFollowUp(
  token: string,
  id: string,
): Promise<{ success: boolean; message: string }> {
  return request(`/admin/warm-intros/${id}/follow-up`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

// ─── Email Logs ───

export interface EmailLog {
  id: string;
  event_type: string;
  recipient: string;
  subject: string;
  status: string;
  error_message: string | null;
  from: string | null;
  body_text: string | null;
  resend_id: string | null;
  related_job_id: string | null;
  related_warm_intro_id: string | null;
  created_at: string;
}

export interface EmailLogRecipient {
  email: string;
  count: number;
  last_sent: string;
  event_types: string[];
}

export interface EmailLogsResponse {
  logs: EmailLog[];
  recipients: EmailLogRecipient[];
  total: number;
}

// ── Job Alerts / Subscribe ──

export interface SubscribeRequest {
  email: string;
  name?: string;
  type?: 'candidate' | 'employer';
  categories?: string[];
  tags?: string[];
  work_arrangement?: string;
  location?: string;
  frequency?: 'instant' | 'weekly';
}

export async function subscribe(
  payload: SubscribeRequest,
): Promise<{ subscribed: boolean; message: string }> {
  return request('/subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Email Logs ──

export async function getEmailLogs(
  token: string,
  filters?: {
    job_id?: string;
    intro_id?: string;
    recipient?: string;
    event_type?: string;
    limit?: number;
  },
): Promise<EmailLogsResponse> {
  const params = new URLSearchParams();
  if (filters?.job_id) params.set('job_id', filters.job_id);
  if (filters?.intro_id) params.set('intro_id', filters.intro_id);
  if (filters?.recipient) params.set('recipient', filters.recipient);
  if (filters?.event_type) params.set('event_type', filters.event_type);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return request(`/admin/email/logs${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(token),
  });
}
