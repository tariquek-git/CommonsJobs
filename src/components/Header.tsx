import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../lib/constants';
import { useScrolled } from '../hooks/useScrolled';
import AboutModal from './AboutModal';

export default function Header() {
  const location = useLocation();
  const [showAbout, setShowAbout] = useState(false);
  const scrolled = useScrolled(10);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-sm shadow-gray-900/[0.04] border-b border-gray-200/60'
            : 'bg-white/80 backdrop-blur-xl border-b border-gray-200/60'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 font-bold text-white text-sm shadow-sm">
              FC
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                {APP_NAME}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-500 leading-tight hidden sm:block">
                Jobs — Fintech & Banking
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`btn-ghost px-4 ${location.pathname === '/' ? 'text-gray-900 dark:text-gray-100 bg-gray-100/80 dark:bg-navy-800' : ''}`}
            >
              Jobs
            </Link>
            <button
              onClick={() => setShowAbout(true)}
              className="btn-ghost px-4 flex items-center gap-1.5"
              title="About Tarique"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                TK
              </div>
              <span className="hidden sm:inline text-sm">About</span>
            </button>
            <Link
              to="/submit"
              className="btn-primary text-sm hidden lg:inline-flex"
            >
              <svg className="h-4 w-4 mr-1.5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Submit a Role
            </Link>
          </nav>
        </div>
      </header>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
}
