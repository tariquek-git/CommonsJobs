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

  it('shows founder text when expanded', () => {
    render(<FounderSection />);
    // Initially expanded (first visit)
    expect(screen.getByText(/Job boards were built/)).toBeInTheDocument();
  });

  it('collapses and persists to localStorage', () => {
    render(<FounderSection />);
    const toggleBtn = screen.getByText('Why I built Commons Jobs');
    fireEvent.click(toggleBtn);

    // Founder text should be hidden
    expect(screen.queryByText(/Job boards were built/)).not.toBeInTheDocument();

    // Check localStorage
    expect(window.localStorage.getItem('founder-collapsed')).toBe('true');
  });

  it('respects persisted collapsed state', () => {
    window.localStorage.setItem('founder-collapsed', 'true');
    render(<FounderSection />);
    expect(screen.queryByText(/Job boards were built/)).not.toBeInTheDocument();
  });

  it('renders Community Board explanation', () => {
    render(<FounderSection />);
    expect(screen.getByText('Community Board')).toBeInTheDocument();
  });

  it('renders please note box', () => {
    render(<FounderSection />);
    expect(screen.getByText(/Please note:/)).toBeInTheDocument();
  });
});
