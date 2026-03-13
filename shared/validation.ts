import type { SubmissionPayload } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const URL_PATTERN = /^https?:\/\/.+\..+/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TITLE_LENGTH = 200;
const MAX_COMPANY_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 15000;
const MAX_SUMMARY_LENGTH = 2000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;

export function validateSubmission(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Invalid payload'] };
  }

  const data = payload as Record<string, unknown>;

  // Required fields
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > MAX_TITLE_LENGTH) {
    errors.push(`Title must be under ${MAX_TITLE_LENGTH} characters`);
  }

  if (!data.company || typeof data.company !== 'string' || data.company.trim().length === 0) {
    errors.push('Company is required');
  } else if (data.company.length > MAX_COMPANY_LENGTH) {
    errors.push(`Company must be under ${MAX_COMPANY_LENGTH} characters`);
  }

  // Optional fields with validation
  if (data.apply_url !== undefined && data.apply_url !== null && data.apply_url !== '') {
    if (typeof data.apply_url !== 'string' || !URL_PATTERN.test(data.apply_url)) {
      errors.push('Apply URL must be a valid HTTP/HTTPS URL');
    }
  }

  if (data.company_url !== undefined && data.company_url !== null && data.company_url !== '') {
    if (typeof data.company_url !== 'string' || !URL_PATTERN.test(data.company_url)) {
      errors.push('Company URL must be a valid HTTP/HTTPS URL');
    }
  }

  if (data.submitter_email !== undefined && data.submitter_email !== null && data.submitter_email !== '') {
    if (typeof data.submitter_email !== 'string' || !EMAIL_PATTERN.test(data.submitter_email)) {
      errors.push('Submitter email must be valid');
    }
  }

  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be text');
    } else if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description must be under ${MAX_DESCRIPTION_LENGTH} characters`);
    }
  }

  if (data.summary !== undefined && data.summary !== null) {
    if (typeof data.summary !== 'string') {
      errors.push('Summary must be text');
    } else if (data.summary.length > MAX_SUMMARY_LENGTH) {
      errors.push(`Summary must be under ${MAX_SUMMARY_LENGTH} characters`);
    }
  }

  if (data.tags !== undefined && data.tags !== null) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else {
      if (data.tags.length > MAX_TAGS) {
        errors.push(`Maximum ${MAX_TAGS} tags allowed`);
      }
      for (const tag of data.tags) {
        if (typeof tag !== 'string' || tag.length > MAX_TAG_LENGTH) {
          errors.push(`Each tag must be text under ${MAX_TAG_LENGTH} characters`);
          break;
        }
      }
    }
  }

  // Honeypot check - "website" field should be empty
  if (data.website && typeof data.website === 'string' && data.website.trim().length > 0) {
    // Silently reject spam - return valid-looking response but flag it
    return { valid: false, errors: ['__spam__'] };
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function sanitizeSubmission(payload: SubmissionPayload): SubmissionPayload {
  return {
    title: sanitizeString(payload.title),
    company: sanitizeString(payload.company),
    location: payload.location ? sanitizeString(payload.location) : undefined,
    country: payload.country ? sanitizeString(payload.country) : undefined,
    description: payload.description ? payload.description.trim() : undefined,
    summary: payload.summary ? payload.summary.trim() : undefined,
    apply_url: payload.apply_url?.trim(),
    company_url: payload.company_url?.trim(),
    tags: payload.tags?.map((t) => sanitizeString(t)),
    submitter_email: payload.submitter_email?.trim(),
  };
}
