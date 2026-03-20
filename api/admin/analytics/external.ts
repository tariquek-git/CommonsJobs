import { getEnv } from '../../../lib/env.js';
import { apiHandler } from '../../../lib/api-handler.js';

/**
 * GET /api/admin/analytics/external
 *
 * Aggregates analytics from external providers:
 * - PostHog: pageviews, unique users, sessions, top pages
 * - Sentry: error count, unresolved issues
 * - Vercel: latest deployment status, web analytics
 * - GA4: active users (via GA4 Measurement Protocol not needed — use Data API)
 *
 * Each provider is optional — returns null if API key is missing.
 */

interface PostHogData {
  pageviews7d: number;
  uniqueUsers7d: number;
  topPages: { path: string; views: number }[];
  sessionCount7d: number;
  funnelEvents: { event: string; label: string; count: number }[];
  utmBreakdown: { source: string; count: number }[];
}

interface SentryData {
  unresolvedIssues: number;
  errorsToday: number;
  errors7d: number;
}

interface VercelData {
  lastDeployment: {
    state: string;
    createdAt: number;
    url: string;
    commitMessage?: string;
  } | null;
  domains: string[];
}

interface ExternalAnalytics {
  posthog: PostHogData | null;
  sentry: SentryData | null;
  vercel: VercelData | null;
  configured: {
    posthog: boolean;
    sentry: boolean;
    vercel: boolean;
    ga4: boolean;
  };
}

async function fetchPostHog(): Promise<PostHogData | null> {
  const apiKey = getEnv('POSTHOG_PERSONAL_API_KEY');
  const projectId = getEnv('POSTHOG_PROJECT_ID');
  const host = getEnv('POSTHOG_API_HOST', 'https://us.posthog.com');

  if (!apiKey || !projectId) return null;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    // Fetch event counts for last 7 days
    const [pageviewRes, personsRes] = await Promise.all([
      // Pageview count
      fetch(
        `${host}/api/projects/${projectId}/events/?event=$pageview&after=${sevenDaysAgo}&limit=1`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      ),
      // Unique persons
      fetch(
        `${host}/api/projects/${projectId}/insights/trend/?events=[{"id":"$pageview","math":"dau"}]&date_from=-7d&date_to=${now}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      ),
    ]);

    // Get total pageviews via query
    const insightsRes = await fetch(
      `${host}/api/projects/${projectId}/insights/trend/?events=[{"id":"$pageview","math":"total"}]&date_from=-7d`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    let pageviews7d = 0;
    let uniqueUsers7d = 0;
    let sessionCount7d = 0;

    if (insightsRes.ok) {
      const insightsData = await insightsRes.json();
      const results = insightsData.result || [];
      if (results[0]?.aggregated_value) {
        pageviews7d = Math.round(results[0].aggregated_value);
      } else if (results[0]?.data) {
        pageviews7d = results[0].data.reduce((s: number, v: number) => s + v, 0);
      }
    }

    if (personsRes.ok) {
      const personsData = await personsRes.json();
      const results = personsData.result || [];
      if (results[0]?.data) {
        uniqueUsers7d = results[0].data.reduce((s: number, v: number) => s + v, 0);
      }
    }

    // Session count via events
    const sessionRes = await fetch(
      `${host}/api/projects/${projectId}/insights/trend/?events=[{"id":"$pageview","math":"unique_session"}]&date_from=-7d`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (sessionRes.ok) {
      const sessionData = await sessionRes.json();
      const results = sessionData.result || [];
      if (results[0]?.data) {
        sessionCount7d = results[0].data.reduce((s: number, v: number) => s + v, 0);
      }
    }

    // Top pages
    const topPagesRes = await fetch(
      `${host}/api/projects/${projectId}/insights/trend/?events=[{"id":"$pageview","math":"total"}]&breakdown=$current_url&breakdown_type=event&date_from=-7d`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    const topPages: { path: string; views: number }[] = [];
    if (topPagesRes.ok) {
      const topPagesData = await topPagesRes.json();
      const results = topPagesData.result || [];
      for (const r of results.slice(0, 10)) {
        const url = r.breakdown_value || r.label || 'unknown';
        const views = r.data
          ? r.data.reduce((s: number, v: number) => s + v, 0)
          : r.aggregated_value || 0;
        try {
          const path = new URL(url).pathname;
          topPages.push({ path, views: Math.round(views) });
        } catch {
          topPages.push({ path: url, views: Math.round(views) });
        }
      }
      topPages.sort((a, b) => b.views - a.views);
    }

    // Funnel events: job views → apply clicks → warm intros
    const funnelEvents: PostHogData['funnelEvents'] = [];
    const funnelQueries = [
      { id: 'job_detail_viewed', label: 'Job Views' },
      { id: 'job_apply_clicked', label: 'Apply Clicks' },
      { id: 'warm_intro_requested', label: 'Intro Requests' },
      { id: 'job_submitted', label: 'Jobs Submitted' },
    ];
    try {
      const eventsParam = funnelQueries.map((e) => `{"id":"${e.id}","math":"total"}`).join(',');
      const funnelRes = await fetch(
        `${host}/api/projects/${projectId}/insights/trend/?events=[${eventsParam}]&date_from=-7d`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (funnelRes.ok) {
        const funnelData = await funnelRes.json();
        for (let i = 0; i < (funnelData.result || []).length; i++) {
          const r = funnelData.result[i];
          const count = r.data
            ? r.data.reduce((s: number, v: number) => s + v, 0)
            : r.aggregated_value || 0;
          funnelEvents.push({
            event: funnelQueries[i].id,
            label: funnelQueries[i].label,
            count: Math.round(count),
          });
        }
      }
    } catch {
      // Non-critical — continue without funnel data
    }

    // UTM source breakdown
    const utmBreakdown: PostHogData['utmBreakdown'] = [];
    try {
      const utmRes = await fetch(
        `${host}/api/projects/${projectId}/insights/trend/?events=[{"id":"$pageview","math":"total"}]&breakdown=$initial_utm_source&breakdown_type=person&date_from=-7d`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (utmRes.ok) {
        const utmData = await utmRes.json();
        for (const r of (utmData.result || []).slice(0, 10)) {
          const source = r.breakdown_value || r.label || 'direct';
          const count = r.data
            ? r.data.reduce((s: number, v: number) => s + v, 0)
            : r.aggregated_value || 0;
          if (count > 0) {
            utmBreakdown.push({ source, count: Math.round(count) });
          }
        }
        utmBreakdown.sort((a, b) => b.count - a.count);
      }
    } catch {
      // Non-critical
    }

    return {
      pageviews7d,
      uniqueUsers7d,
      topPages: topPages.slice(0, 8),
      sessionCount7d,
      funnelEvents,
      utmBreakdown,
    };
  } catch {
    return null;
  }
}

async function fetchSentry(): Promise<SentryData | null> {
  const authToken = getEnv('SENTRY_AUTH_TOKEN');
  const org = getEnv('SENTRY_ORG');
  const project = getEnv('SENTRY_PROJECT');

  if (!authToken || !org || !project) return null;

  try {
    const [issuesRes, statsRes] = await Promise.all([
      // Unresolved issues
      fetch(
        `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&limit=1`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      ),
      // Error stats for last 7 days (24h resolution)
      fetch(
        `https://sentry.io/api/0/projects/${org}/${project}/stats/?stat=received&resolution=1d&since=${Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      ),
    ]);

    let unresolvedIssues = 0;
    let errorsToday = 0;
    let errors7d = 0;

    if (issuesRes.ok) {
      // The X-Total-Count header has the count for paginated results
      const totalHeader = issuesRes.headers.get('X-Hits') || issuesRes.headers.get('X-Total-Count');
      if (totalHeader) {
        unresolvedIssues = parseInt(totalHeader, 10) || 0;
      } else {
        // Fall back to counting the response
        const issues = await issuesRes.json();
        unresolvedIssues = Array.isArray(issues) ? issues.length : 0;
      }
    }

    if (statsRes.ok) {
      const stats: [number, number][] = await statsRes.json();
      if (Array.isArray(stats)) {
        errors7d = stats.reduce((sum, [, count]) => sum + count, 0);
        // Last entry is today
        errorsToday = stats.length > 0 ? stats[stats.length - 1][1] : 0;
      }
    }

    return { unresolvedIssues, errorsToday, errors7d };
  } catch {
    return null;
  }
}

async function fetchVercel(): Promise<VercelData | null> {
  const token = getEnv('VERCEL_TOKEN');
  const projectId = getEnv('VERCEL_PROJECT_ID', '');
  const teamId = getEnv('VERCEL_TEAM_ID', '');

  if (!token) return null;

  try {
    const [deployRes, projectRes] = await Promise.all([
      fetch(
        `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=1&target=production`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ),
      fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    let lastDeployment: VercelData['lastDeployment'] = null;
    let domains: string[] = [];

    if (deployRes.ok) {
      const deployData = await deployRes.json();
      const deploy = deployData.deployments?.[0];
      if (deploy) {
        lastDeployment = {
          state: deploy.readyState || deploy.state || 'UNKNOWN',
          createdAt: deploy.createdAt || deploy.created,
          url: deploy.url || '',
          commitMessage: deploy.meta?.githubCommitMessage || undefined,
        };
      }
    }

    if (projectRes.ok) {
      const projectData = await projectRes.json();
      domains = (projectData.alias || projectData.domains || []).map(
        (d: { domain: string } | string) => (typeof d === 'string' ? d : d.domain),
      );
    }

    return { lastDeployment, domains };
  } catch {
    return null;
  }
}

export default apiHandler(
  { methods: ['GET'], auth: 'admin', name: 'admin/analytics/external' },
  async (_req, res) => {
    // Fetch all providers in parallel — each returns null if not configured
    const [posthog, sentry, vercel] = await Promise.all([
      fetchPostHog(),
      fetchSentry(),
      fetchVercel(),
    ]);

    const result: ExternalAnalytics = {
      posthog,
      sentry,
      vercel,
      configured: {
        posthog: !!getEnv('POSTHOG_PERSONAL_API_KEY'),
        sentry: !!getEnv('SENTRY_AUTH_TOKEN') && !!getEnv('SENTRY_ORG'),
        vercel: !!getEnv('VERCEL_TOKEN'),
        ga4: !!getEnv('GA_PROPERTY_ID'),
      },
    };

    // Cache for 2 minutes — these are expensive API calls
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    return res.status(200).json(result);
  },
);
