import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import HomePage from './pages/HomePage';
import SubmitPage from './pages/SubmitPage';
import AdminPage from './pages/AdminPage';
import JobPage from './pages/JobPage';
import CompanyPage from './pages/CompanyPage';
import Footer from './components/Footer';

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/job/:id" element={<JobPage />} />
        <Route path="/company/:slug" element={<CompanyPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}
