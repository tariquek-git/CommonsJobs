import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { ToastProvider } from './components/Toast';
import { initSentry } from './lib/sentry';
import './index.css';

import posthog from 'posthog-js';
import { PostHogProvider, PostHogErrorBoundary } from '@posthog/react';

// Initialize Sentry before anything else
initSentry();

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  person_profiles: 'always',
  capture_pageview: false, // Manual SPA pageview tracking in App.tsx
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '[data-ph-mask]',
  },
});

// Register super properties on every event
const params = new URLSearchParams(window.location.search);
posthog.register({
  platform: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  referrer: document.referrer || 'direct',
  utm_source: params.get('utm_source') || undefined,
  utm_medium: params.get('utm_medium') || undefined,
  utm_campaign: params.get('utm_campaign') || undefined,
});

const SentryFallback = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
    }}
  >
    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>Something went wrong</div>
      <p style={{ color: '#64748B', marginBottom: '1.5rem' }}>
        We hit an unexpected error. Try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '9999px',
          background: '#635BFF',
          color: 'white',
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Refresh Page
      </button>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={SentryFallback}
      onError={(error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        posthog.capture('$exception', {
          $exception_message: err.message,
          $exception_stack: err.stack,
        });
      }}
    >
      <PostHogProvider client={posthog}>
        <PostHogErrorBoundary>
          <BrowserRouter>
            <ToastProvider>
              <App />
            </ToastProvider>
          </BrowserRouter>
        </PostHogErrorBoundary>
      </PostHogProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
