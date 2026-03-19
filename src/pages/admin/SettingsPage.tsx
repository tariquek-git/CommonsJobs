import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getRuntime, getAdminHealth } from '../../lib/api';
import type { RuntimeInfo } from '../../lib/types';

export default function SettingsPage() {
  const { token } = useAdminAuth();
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [health, setHealth] = useState<Record<string, { status: string; detail?: string }> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const fetchRuntime = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [info, h] = await Promise.all([getRuntime(token), getAdminHealth(token)]);
      setRuntime(info);
      setHealth(h.checks);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRuntime();
  }, [fetchRuntime]);

  useEffect(() => {
    document.title = 'Settings | Admin';
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">System configuration and health</p>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700">System Health</h3>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-36 bg-gray-200 rounded" />
            </div>
          ) : runtime ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${runtime.storage.healthy ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                  <span className="text-sm text-gray-700">Database (Supabase)</span>
                </div>
                <span className="text-xs text-gray-500">
                  {runtime.storage.healthy ? 'Connected' : 'Error'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${runtime.ai.configured ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                  <span className="text-sm text-gray-700">AI Provider ({runtime.ai.provider})</span>
                </div>
                <span className="text-xs text-gray-500">
                  {runtime.ai.configured ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-700">Total Jobs</span>
                <span className="text-sm font-medium text-gray-900">
                  {runtime.storage.jobCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-700">Total Clicks</span>
                <span className="text-sm font-medium text-gray-900">
                  {runtime.storage.clickCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Uptime</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.floor(runtime.uptime / 60)} min
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to fetch system info</p>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {[
              'Engineering',
              'Product',
              'Design',
              'Data',
              'Operations',
              'Sales/BD',
              'Marketing',
              'Finance',
              'Compliance/Risk',
              'Leadership',
            ].map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700"
              >
                {cat}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Categories are defined in{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded">src/lib/constants.ts</code>.
            Database-driven category management coming in a future update.
          </p>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700">Integrations</h3>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: 'supabase', name: 'Supabase', desc: 'Database and storage' },
            { key: 'resend', name: 'Resend', desc: 'Transactional email' },
            { key: 'environment', name: 'Core Environment', desc: 'Required API keys and secrets' },
            { key: 'analytics', name: 'Analytics APIs', desc: 'PostHog, Sentry, GA4 server-side' },
          ].map((integration, i) => {
            const check = health?.[integration.key];
            const isOk = check?.status === 'ok';
            return (
              <div
                key={integration.key}
                className={`flex items-center justify-between py-2 ${i < 3 ? 'border-b border-gray-50' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{integration.name}</p>
                  <p className="text-xs text-gray-500">{integration.desc}</p>
                </div>
                {!health ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">
                    Checking...
                  </span>
                ) : isOk ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                ) : (
                  <span
                    className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                    title={check?.detail}
                  >
                    {check?.detail?.slice(0, 30) || 'Issue'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Environment */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700">Environment Variables Needed</h3>
        </div>
        <div className="p-5">
          <div className="text-xs font-mono bg-gray-50 rounded-lg p-4 space-y-1 text-gray-600">
            <p>
              <span className="text-emerald-600"># Analytics (server-side)</span>
            </p>
            <p>POSTHOG_PERSONAL_API_KEY=phx_...</p>
            <p>GA_PROPERTY_ID=123456789</p>
            <p>
              GA_SERVICE_ACCOUNT_JSON={'{'} ... {'}'}
            </p>
            <p className="mt-2">
              <span className="text-emerald-600"># Email</span>
            </p>
            <p>RESEND_API_KEY=re_...</p>
            <p>ADMIN_NOTIFICATION_EMAIL=tarique@...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
