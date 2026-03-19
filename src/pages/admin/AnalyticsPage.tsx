import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { getAnalytics } from '../../lib/api';
import type { AnalyticsData } from '../../lib/api';

type DateRange = '7d' | '30d' | '90d';

function MiniChart({
  data,
  color,
  label,
}: {
  data: { date: string; count: number }[];
  color: string;
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h4>
        <span className="text-lg font-bold text-gray-900">{total}</span>
      </div>
      <div className="flex items-end gap-[2px] h-24">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t-sm transition-all duration-300 cursor-pointer hover:opacity-80"
            style={{
              height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
              backgroundColor: d.count > 0 ? color : 'rgb(229 231 235)',
            }}
            title={`${d.date}: ${d.count}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { token } = useAdminAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Current API only supports 30d — we'll filter client-side for shorter ranges
      // and show placeholder for 90d until PostHog/GA integration
      const result = await getAnalytics(token);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    document.title = 'Analytics | Admin';
  }, []);

  // Filter data based on date range
  const filteredData = data
    ? {
        ...data,
        clicksByDay: dateRange === '7d' ? data.clicksByDay.slice(-7) : data.clicksByDay,
        introsByDay: dateRange === '7d' ? data.introsByDay.slice(-7) : data.introsByDay,
      }
    : null;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-3 w-16 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Traffic, engagement, and conversion metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range picker */}
          <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  dateRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAnalytics}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchAnalytics} className="text-xs text-red-600 underline mt-1">
            Try again
          </button>
        </div>
      )}

      {filteredData && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Apply Clicks
              </p>
              <p className="text-3xl font-bold text-brand-600 mt-1">
                {filteredData.totals.clicks30d}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last {dateRange}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Connections
              </p>
              <p className="text-3xl font-bold text-accent-pink mt-1">
                {filteredData.totals.intros30d}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last {dateRange}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Active Jobs
              </p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {filteredData.statusCounts.active || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Current</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending Review
              </p>
              <p className="text-3xl font-bold text-amber-600 mt-1">
                {filteredData.statusCounts.pending || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Awaiting action</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MiniChart
              data={filteredData.clicksByDay}
              color="rgb(99 91 255)"
              label="Apply Clicks"
            />
            <MiniChart
              data={filteredData.introsByDay}
              color="rgb(255 59 139)"
              label="Connections"
            />
          </div>

          {/* PostHog / GA placeholder */}
          {dateRange === '90d' && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 border-dashed p-8 text-center">
              <svg
                className="h-10 w-10 text-gray-300 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-600">Extended analytics coming soon</p>
              <p className="text-xs text-gray-400 mt-1">
                90-day trends require PostHog and Google Analytics API integration.
              </p>
              <p className="text-xs text-gray-400">
                Add{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded">POSTHOG_PERSONAL_API_KEY</code>{' '}
                and <code className="bg-gray-100 px-1 py-0.5 rounded">GA_PROPERTY_ID</code> to
                enable.
              </p>
            </div>
          )}

          {/* Top jobs */}
          {filteredData.topJobs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Top Jobs by Clicks
              </h3>
              <div className="space-y-2">
                {filteredData.topJobs.map((job, i) => {
                  const maxClicks = filteredData.topJobs[0]?.clicks || 1;
                  return (
                    <div key={job.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5 text-right shrink-0 tabular-nums">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-900 truncate">{job.title}</span>
                          <span className="text-sm font-semibold text-brand-600 tabular-nums shrink-0 ml-3">
                            {job.clicks}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full transition-all duration-500"
                            style={{ width: `${(job.clicks / maxClicks) * 100}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{job.company}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Jobs by Status
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(filteredData.statusCounts).map(([status, count]) => {
                const colors: Record<string, string> = {
                  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  pending: 'bg-amber-50 text-amber-700 border-amber-200',
                  rejected: 'bg-red-50 text-red-700 border-red-200',
                  archived: 'bg-gray-50 text-gray-500 border-gray-200',
                };
                return (
                  <div
                    key={status}
                    className={`rounded-lg border p-3 ${colors[status] || 'bg-gray-50 border-gray-200'}`}
                  >
                    <p className="text-xs capitalize font-medium">{status}</p>
                    <p className="text-2xl font-bold mt-0.5">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
