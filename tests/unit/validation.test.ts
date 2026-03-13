import { describe, it, expect } from 'vitest';
import { validateSubmission, sanitizeString, sanitizeSubmission } from '../../shared/validation';

describe('validateSubmission', () => {
  it('accepts a valid submission', () => {
    const result = validateSubmission({
      title: 'Software Engineer',
      company: 'Acme Corp',
      apply_url: 'https://acme.com/jobs/1',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing title', () => {
    const result = validateSubmission({ company: 'Acme Corp' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('rejects missing company', () => {
    const result = validateSubmission({ title: 'Engineer' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Company is required');
  });

  it('rejects empty title', () => {
    const result = validateSubmission({ title: '   ', company: 'Acme' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('rejects invalid apply URL', () => {
    const result = validateSubmission({
      title: 'Engineer',
      company: 'Acme',
      apply_url: 'not-a-url',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Apply URL must be a valid HTTP/HTTPS URL');
  });

  it('accepts valid HTTP URL', () => {
    const result = validateSubmission({
      title: 'Engineer',
      company: 'Acme',
      apply_url: 'http://example.com/jobs',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = validateSubmission({
      title: 'Engineer',
      company: 'Acme',
      submitter_email: 'bad-email',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Submitter email must be valid');
  });

  it('rejects too many tags', () => {
    const result = validateSubmission({
      title: 'Engineer',
      company: 'Acme',
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Maximum 10 tags allowed');
  });

  it('detects honeypot spam', () => {
    const result = validateSubmission({
      title: 'Engineer',
      company: 'Acme',
      website: 'spambot.com',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('__spam__');
  });

  it('rejects non-object payload', () => {
    expect(validateSubmission(null).valid).toBe(false);
    expect(validateSubmission('string').valid).toBe(false);
    expect(validateSubmission(undefined).valid).toBe(false);
  });

  it('rejects title over max length', () => {
    const result = validateSubmission({
      title: 'x'.repeat(201),
      company: 'Acme',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('200 characters');
  });
});

describe('sanitizeString', () => {
  it('escapes HTML characters', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
});

describe('sanitizeSubmission', () => {
  it('sanitizes all string fields', () => {
    const result = sanitizeSubmission({
      title: '  <b>Engineer</b>  ',
      company: 'Acme & Co',
    });
    expect(result.title).toBe('&lt;b&gt;Engineer&lt;/b&gt;');
    expect(result.company).toBe('Acme & Co');
  });
});
