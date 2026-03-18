import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/Toast';
import { checkClientEnv } from './lib/env-check';
import './index.css';

// Warn about missing env vars in development
checkClientEnv();

// Defer Sentry loading — load after first paint to keep critical path lean
const sentryReady = import('./instrument').then(() => import('@sentry/react'));

import posthog from 'posthog-js';
import { PostHogProvider, PostHogErrorBoundary } from '@posthog/react';

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

// Helper: capture exception to PostHog (works before Sentry loads)
function captureException(
  error: unknown,
  errorInfo: { componentStack?: string | null },
  severity: string,
) {
  posthog.capture('$exception', {
    $exception_message: error instanceof Error ? error.message : String(error),
    $exception_stack: error instanceof Error ? error.stack : undefined,
    component_stack: errorInfo.componentStack,
    severity,
  });
}

// Wire up Sentry error handlers once loaded, fall back to PostHog-only until then
let onCaughtError = (error: unknown, errorInfo: { componentStack?: string | null }) =>
  captureException(error, errorInfo, 'caught');
let onUncaughtError = (error: unknown, errorInfo: { componentStack?: string | null }) =>
  captureException(error, errorInfo, 'uncaught');

sentryReady
  .then((Sentry) => {
    onCaughtError = Sentry.reactErrorHandler((error, errorInfo) =>
      captureException(error, errorInfo, 'caught'),
    );
    onUncaughtError = Sentry.reactErrorHandler((error, errorInfo) =>
      captureException(error, errorInfo, 'uncaught'),
    );
  })
  .catch(() => {
    /* Sentry failed to load — PostHog-only error tracking continues */
  });

ReactDOM.createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => onCaughtError(error, errorInfo),
  onUncaughtError: (error, errorInfo) => onUncaughtError(error, errorInfo),
}).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </PostHogErrorBoundary>
    </PostHogProvider>
  </React.StrictMode>,
);
