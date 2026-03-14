import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FounderSection from '../../src/components/FounderSection';

describe('FounderSection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders collapsed toggle text', () => {
    render(<FounderSection />);
    expect(screen.getByText('Why I built Commons Jobs')).toBeInTheDocument();
  });

  it('starts collapsed by default (text in DOM but visually hidden)', () => {
    render(<FounderSection />);
    const textEl = screen.getByText(/Job boards were built/);
    expect(textEl.closest('[class*="max-h-0"]')).toBeTruthy();
  });

  it('expands on click and persists to localStorage', () => {
    render(<FounderSection />);
    const toggleBtn = screen.getByText('Why I built Commons Jobs');
    fireEvent.click(toggleBtn);

    // Founder text is now visible (no max-h-0)
    const textEl = screen.getByText(/Job boards were built/);
    expect(textEl.closest('[class*="max-h-0"]')).toBeNull();

    // Check localStorage
    expect(window.localStorage.getItem('founder-collapsed')).toBe('false');
  });

  it('respects persisted expanded state', () => {
    window.localStorage.setItem('founder-collapsed', 'false');
    render(<FounderSection />);
    const textEl = screen.getByText(/Job boards were built/);
    expect(textEl.closest('[class*="max-h-0"]')).toBeNull();
  });

  it('renders How it works explainer', () => {
    render(<FounderSection />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('A real person posts a role')).toBeInTheDocument();
    expect(screen.getByText('Human-reviewed, not algorithm-sorted')).toBeInTheDocument();
    expect(screen.getByText('Apply direct, or ask for a warm intro')).toBeInTheDocument();
  });

  it('renders please note box', () => {
    render(<FounderSection />);
    expect(screen.getByText(/Please note:/)).toBeInTheDocument();
  });
});
