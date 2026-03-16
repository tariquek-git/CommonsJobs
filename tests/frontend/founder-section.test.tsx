import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FounderSection from '../../src/components/FounderSection';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('FounderSection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders collapsed toggle text', () => {
    renderWithRouter(<FounderSection />);
    expect(screen.getByText('Why I built Fintech Commons')).toBeInTheDocument();
  });

  it('starts collapsed by default (text in DOM but visually hidden)', () => {
    renderWithRouter(<FounderSection />);
    const textEl = screen.getByText(/Tarique/);
    expect(textEl.closest('[class*="max-h-0"]')).toBeTruthy();
  });

  it('expands on click and persists to localStorage', () => {
    renderWithRouter(<FounderSection />);
    const toggleBtn = screen.getByText('Why I built Fintech Commons');
    fireEvent.click(toggleBtn);

    // Founder text is now visible (no max-h-0)
    const textEl = screen.getByText(/Tarique/);
    expect(textEl.closest('[class*="max-h-0"]')).toBeNull();

    // Check localStorage
    expect(window.localStorage.getItem('founder-collapsed')).toBe('false');
  });

  it('respects persisted expanded state', () => {
    window.localStorage.setItem('founder-collapsed', 'false');
    renderWithRouter(<FounderSection />);
    const textEl = screen.getByText(/Tarique/);
    expect(textEl.closest('[class*="max-h-0"]')).toBeNull();
  });

  it('renders the pipeline steps', () => {
    renderWithRouter(<FounderSection />);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders the main toggle heading', () => {
    renderWithRouter(<FounderSection />);
    expect(screen.getByText('Why I built Fintech Commons')).toBeInTheDocument();
  });
});
