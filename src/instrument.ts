import * as Sentry from '@sentry/react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import { useEffect } from 'react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,

    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,

    // Session replay — capture 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      // React Router v6 integration for automatic route-based tracing
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
      }),
    ],

    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'Network request failed',
      'Load failed',
      'Failed to fetch',
    ],

    // Don't send PII
    sendDefaultPii: false,
  });
}
