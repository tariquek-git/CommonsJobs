import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../lib/constants';
import { useScrolled } from '../hooks/useScrolled';
import AboutModal from './AboutModal';

interface HeaderProps {
  dark?: boolean;
}

export default function Header({ dark = false }: HeaderProps) {
  const location = useLocation();
  const [showAbout, setShowAbout] = useState(false);
  const scrolled = useScrolled(10);

  const onDark = dark && !scrolled;

  return (
    <>
      <div className={`h-20 ${dark ? 'bg-navy-900' : ''}`} />
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-sm shadow-gray-900/[0.04] border-b border-gray-200/60'
            : dark
              ? 'bg-navy-900 border-b border-white/10'
              : 'bg-white/80 backdrop-blur-xl border-b border-gray-200/60'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-pink font-bold text-white text-sm shadow-sm">
              FC
            </div>
            <div className="flex flex-col">
              <span className={`text-2xl font-bold tracking-tight transition-colors leading-tight ${
                onDark ? 'text-white group-hover:text-accent-pink' : 'text-gray-900 group-hover:text-brand-500'
              }`}>
                {APP_NAME}
              </span>
              <span className={`text-sm leading-tight hidden sm:block ${
                onDark ? 'text-white/75' : 'text-gray-600'
              }`}>
                Real roles. Warm intros.
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`btn-ghost px-4 ${
                onDark
                  ? (location.pathname === '/' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10')
                  : (location.pathname === '/' ? 'text-gray-900 bg-gray-100/80' : '')
              }`}
            >
              Jobs
            </Link>
            <a
              href="https://www.brimfinancial.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-ghost px-3 text-sm hidden sm:inline-flex items-center gap-1.5 ${
                onDark ? 'text-white/70 hover:text-white hover:bg-white/10' : ''
              }`}
              title="Brim Financial"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V8.999a3 3 0 013-3h12a3 3 0 013 3v.35M12 6.75h.008v.008H12V6.75z" />
              </svg>
              Brim
            </a>
            <button
              onClick={() => setShowAbout(true)}
              className={`btn-ghost px-4 flex items-center gap-1.5 ${
                onDark ? 'text-white/70 hover:text-white hover:bg-white/10' : ''
              }`}
              title="About Tarique"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                onDark ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-500'
              }`}>
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
