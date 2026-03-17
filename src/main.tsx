// Sentry must be imported FIRST, before any other modules
import './instrument';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { ToastProvider } from './components/Toast';
import { checkClientEnv } from './lib/env-check';
import './index.css';

// Warn about missing env vars in development
checkClientEnv();

// Load Google Tag Manager dynamically (avoids Vite inline-script parse errors)
(function () {
  const w = window as unknown as Record<string, unknown>;
  const d = document;
  const l = 'dataLayer';
  const i = 'GTM-5D8P73GF';
  (w[l] as unknown[]) = (w[l] as unknown[]) || [];
  (w[l] as unknown[]).push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const f = d.getElementsByTagName('script')[0];
  const j = d.createElement('script');
  j.async = true;
  j.src = `https://www.googletagmanager.com/gtm.js?id=${i}`;
  f.parentNode!.insertBefore(j, f);
})();

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
