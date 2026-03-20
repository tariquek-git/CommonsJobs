import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IntroResponsePage from '../../src/pages/IntroResponsePage';

function renderPage(route = '/intro-response') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <IntroResponsePage />
    </MemoryRouter>,
  );
}

describe('IntroResponsePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows error when no token provided', () => {
    renderPage('/intro-response');
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Invalid link/)).toBeInTheDocument();
  });

  it('shows confirm state when token is present', () => {
    renderPage('/intro-response?token=abc-123');
    expect(screen.getByText('Warm Intro Request')).toBeInTheDocument();
    expect(screen.getByText('Yes, make the intro')).toBeInTheDocument();
    expect(screen.getByText('Not right now')).toBeInTheDocument();
  });

  it('shows optional note textarea', () => {
    renderPage('/intro-response?token=abc-123');
    expect(screen.getByLabelText(/Any notes/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Looks great/)).toBeInTheDocument();
  });

  it('submits accepted action and shows success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ success: true, action: 'accepted', message: 'Intro incoming!' }),
    });

    renderPage('/intro-response?token=valid-token');
    fireEvent.click(screen.getByText('Yes, make the intro'));

    await waitFor(() => {
      expect(screen.getByText("You're connected! Intro emails sent.")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/intro-response',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('submits declined action and shows success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, action: 'declined', message: 'Noted.' }),
    });

    renderPage('/intro-response?token=valid-token');
    fireEvent.click(screen.getByText('Not right now'));

    await waitFor(() => {
      expect(screen.getByText('Thanks for letting us know.')).toBeInTheDocument();
      expect(screen.getByText('Noted.')).toBeInTheDocument();
    });
  });

  it('handles already responded state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          already_responded: true,
          message: 'You already responded.',
        }),
    });

    renderPage('/intro-response?token=valid-token');
    fireEvent.click(screen.getByText('Yes, make the intro'));

    await waitFor(() => {
      expect(screen.getByText('Already responded')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: 'Token expired' }),
    });

    renderPage('/intro-response?token=valid-token');
    fireEvent.click(screen.getByText('Yes, make the intro'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Token expired')).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderPage('/intro-response?token=valid-token');
    fireEvent.click(screen.getByText('Yes, make the intro'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows submitting spinner during request', async () => {
    let resolvePromise: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    renderPage('/intro-response?token=valid-token');
    fireEvent.click(screen.getByText('Yes, make the intro'));

    expect(screen.getByText('Recording your response...')).toBeInTheDocument();

    // Resolve to clean up
    resolvePromise!({
      json: () => Promise.resolve({ success: true, action: 'accepted', message: 'Done' }),
    });
  });

  it('includes note in the API request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, action: 'accepted', message: 'Done' }),
    });

    renderPage('/intro-response?token=valid-token');

    const textarea = screen.getByPlaceholderText(/Looks great/);
    fireEvent.change(textarea, { target: { value: 'Great candidate!' } });
    fireEvent.click(screen.getByText('Yes, make the intro'));

    await waitFor(() => {
      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.note).toBe('Great candidate!');
    });
  });

  it('shows fallback text on error state', () => {
    renderPage('/intro-response');
    expect(screen.getByText(/Reply to the email from Tarique/)).toBeInTheDocument();
  });

  it('has link to homepage on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, action: 'accepted', message: 'Done' }),
    });

    renderPage('/intro-response?token=valid-token');
    fireEvent.click(screen.getByText('Yes, make the intro'));

    await waitFor(() => {
      expect(screen.getByText('Visit Fintech Commons')).toBeInTheDocument();
    });
  });
});
