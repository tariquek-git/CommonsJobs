// ── Job Types ──

export type SourceType = 'direct' | 'aggregated';
export type JobStatus = 'pending' | 'active' | 'rejected' | 'archived';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  country: string | null;
  description: string | null;
  summary: string | null;
  apply_url: string | null;
  company_url: string | null;
  company_logo_url: string | null;
  source_type: SourceType;
  source_name: string | null;
  status: JobStatus;
  posted_date: string;
  created_at: string;
  updated_at: string;
  submission_ref: string | null;
  submitter_email: string | null;
  tags: string[];
}

// ── API Request/Response Types ──

export type FeedType = 'community' | 'webpulse';
export type SortOption = 'newest' | 'oldest';

export interface SearchRequest {
  feed: FeedType;
  sort?: SortOption;
  page?: number;
  limit?: number;
  location?: string;
  tags?: string[];
}

export interface AggregatedPolicy {
  country: string;
  maxAgeDays: number;
  maxResults: number;
  maxPerCompany: number;
}

export interface SearchMeta {
  total: number;
  page: number;
  limit: number;
  aggregatedPolicyApplied: boolean;
  aggregatedCounts?: {
    beforePolicy: number;
    afterPolicy: number;
  };
  policy?: AggregatedPolicy;
}

export interface SearchResponse {
  jobs: Job[];
  meta: SearchMeta;
}

export interface SubmissionPayload {
  title: string;
  company: string;
  location?: string;
  country?: string;
  description?: string;
  summary?: string;
  apply_url?: string;
  company_url?: string;
  tags?: string[];
  submitter_email?: string;
  // Honeypot - should be empty
  website?: string;
}

export interface SubmissionResponse {
  success: boolean;
  submission_ref: string;
  message: string;
}

export interface ClickPayload {
  job_id: string;
}

// ── AI Types ──

export interface AIResult<T = string> {
  result: T;
  fallback: boolean;
}

// ── Admin Types ──

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
}

export interface RuntimeInfo {
  storage: {
    provider: string;
    healthy: boolean;
    jobCount: number;
    clickCount: number;
  };
  ai: {
    provider: string;
    configured: boolean;
  };
  uptime: number;
}

// ── API Error ──

export interface APIError {
  error: string;
  code: string;
  details?: unknown;
}
