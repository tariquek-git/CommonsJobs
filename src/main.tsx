// Sentry must be imported FIRST, before any other modules
import './instrument';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { ToastProvider } from './components/Toast';
import './index.css';

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

ReactDOM.createRoot(document.getElementById('root')!, {
  // React 19 error handlers — Sentry captures these automatically
  onCaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    posthog.capture('$exception', {
      $exception_message: error instanceof Error ? error.message : String(error),
      $exception_stack: error instanceof Error ? error.stack : undefined,
      component_stack: errorInfo.componentStack,
      severity: 'caught',
    });
  }),
  onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
    posthog.capture('$exception', {
      $exception_message: error instanceof Error ? error.message : String(error),
      $exception_stack: error instanceof Error ? error.stack : undefined,
      component_stack: errorInfo.componentStack,
      severity: 'uncaught',
    });
  }),
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
