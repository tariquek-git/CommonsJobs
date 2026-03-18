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
    const toggleBtn = screen.getByRole('button', { name: /Why I built Fintech Commons/i });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands on click and persists to localStorage', () => {
    renderWithRouter(<FounderSection />);
    const toggleBtn = screen.getByRole('button', { name: /Why I built Fintech Commons/i });
    fireEvent.click(toggleBtn);

    // aria-expanded should now be true
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    // Check localStorage
    expect(window.localStorage.getItem('founder-collapsed')).toBe('false');
  });

  it('respects persisted expanded state', () => {
    window.localStorage.setItem('founder-collapsed', 'false');
    renderWithRouter(<FounderSection />);
    const toggleBtn = screen.getByRole('button', { name: /Why I built Fintech Commons/i });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders the submit link', () => {
    renderWithRouter(<FounderSection />);
    expect(screen.getByText('Submit a role')).toBeInTheDocument();
  });

  it('renders the main toggle heading', () => {
    renderWithRouter(<FounderSection />);
    expect(screen.getByText('Why I built Fintech Commons')).toBeInTheDocument();
  });
});
