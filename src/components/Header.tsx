import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../lib/constants';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 dark:bg-indigo-500 font-bold text-white text-lg shadow-sm">
            C
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {APP_NAME}
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`btn-ghost ${location.pathname === '/' ? 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800' : ''}`}
          >
            Jobs
          </Link>
          <ThemeToggle />
          <Link
            to="/submit"
            className="btn-primary text-sm"
          >
            Submit a Role
          </Link>
        </nav>
      </div>
    </header>
  );
}
