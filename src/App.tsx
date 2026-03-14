import { Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SubmitPage from './pages/SubmitPage';
import AdminPage from './pages/AdminPage';
import JobPage from './pages/JobPage';

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-lg text-gray-600">Page not found.</p>
        <Link to="/" className="inline-block mt-2 text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-2">
          Back to jobs
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/job/:id" element={<JobPage />} />
      <Route path="/submit" element={<SubmitPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
