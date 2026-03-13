import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRelativeTimeLabel, formatDate } from '../../src/lib/date';

describe('getRelativeTimeLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for less than 1 minute ago', () => {
    const date = new Date('2026-03-12T11:59:30Z').toISOString();
    expect(getRelativeTimeLabel(date)).toBe('Just now');
  });

  it('returns minutes for less than 1 hour ago', () => {
    const date = new Date('2026-03-12T11:30:00Z').toISOString();
    expect(getRelativeTimeLabel(date)).toBe('30m ago');
  });

  it('returns hours for less than 24 hours ago', () => {
    const date = new Date('2026-03-12T06:00:00Z').toISOString();
    expect(getRelativeTimeLabel(date)).toBe('6h ago');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    const date = new Date('2026-03-11T12:00:00Z').toISOString();
    expect(getRelativeTimeLabel(date)).toBe('Yesterday');
  });

  it('returns days for less than 7 days ago', () => {
    const date = new Date('2026-03-08T12:00:00Z').toISOString();
    expect(getRelativeTimeLabel(date)).toBe('4d ago');
  });

  it('returns weeks for less than 30 days ago', () => {
    const date = new Date('2026-02-26T12:00:00Z').toISOString();
    expect(getRelativeTimeLabel(date)).toBe('2w ago');
  });

  it('returns months for less than 365 days ago', () => {
    const date = new Date('2026-01-12T12:00:00Z').toISOString();
    expect(getRelativeTimeLabel(date)).toBe('1mo ago');
  });
});

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-03-12T12:00:00Z');
    expect(result).toContain('March');
    expect(result).toContain('12');
    expect(result).toContain('2026');
  });
});
