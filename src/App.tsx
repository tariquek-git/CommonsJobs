import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import HomePage from './pages/HomePage';
import Footer from './components/Footer';

// Lazy-load secondary pages for smaller initial bundle
const JobPage = lazy(() => import('./pages/JobPage'));
const CompanyPage = lazy(() => import('./pages/CompanyPage'));
const SubmitPage = lazy(() => import('./pages/SubmitPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

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
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
    </>
  );
}
