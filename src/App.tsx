import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import Footer from './components/Footer';

// Lazy-load all pages for smaller initial bundle
const HomePage = lazy(() => import('./pages/HomePage'));
const JobPage = lazy(() => import('./pages/JobPage'));
const CompanyPage = lazy(() => import('./pages/CompanyPage'));
const SubmitPage = lazy(() => import('./pages/SubmitPage'));
const IntroResponsePage = lazy(() => import('./pages/IntroResponsePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// Lazy-load admin sub-pages
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const JobsPage = lazy(() => import('./pages/admin/JobsPage'));
const JobEditorPage = lazy(() => import('./pages/admin/JobEditorPage'));
const IntrosPage = lazy(() => import('./pages/admin/IntrosPage'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const EmailPage = lazy(() => import('./pages/admin/EmailPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-lg text-gray-600">Page not found.</p>
        <Link
          to="/"
          className="inline-block mt-2 text-brand-500 hover:text-brand-600 font-medium underline underline-offset-2"
        >
          Back to jobs
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const posthog = usePostHog();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    posthog?.capture('$pageview');
  }, [location.pathname, posthog]);

  return (
    <>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/job/:id" element={<JobPage />} />
          <Route path="/company/:slug" element={<CompanyPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/intro-response" element={<IntroResponsePage />} />

          {/* Admin routes — nested under AdminPage (handles auth + layout) */}
          <Route path="/admin" element={<AdminPage />}>
            <Route index element={<DashboardPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/new" element={<JobEditorPage />} />
            <Route path="jobs/:id" element={<JobEditorPage />} />
            <Route path="intros" element={<IntrosPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="email" element={<EmailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {/* Hide footer on admin pages */}
      {!isAdmin && <Footer />}
    </>
  );
}
