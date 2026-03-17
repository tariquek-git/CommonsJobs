import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '../lib/constants';
import { useScrolled } from '../hooks/useScrolled';
import FeedbackBanner from './FeedbackBanner';

interface HeaderProps {
  dark?: boolean;
}

export default function Header({ dark = false }: HeaderProps) {
  const location = useLocation();
  const [bannerVisible, setBannerVisible] = useState(
    () => localStorage.getItem('feedback_banner_dismissed') !== '1',
  );
  const scrolled = useScrolled(10);

  const onDark = dark && !scrolled;

  return (
    <>
      <div className={`${bannerVisible ? 'h-[116px]' : 'h-20'} ${dark ? 'bg-navy-900' : ''}`} />
      <div className="fixed top-0 left-0 right-0 z-50">
        <FeedbackBanner onDismiss={() => setBannerVisible(false)} />
        <header
          className={`transition-all duration-300 ${
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
                <span
                  className={`text-2xl font-bold tracking-tight transition-colors leading-tight ${
                    onDark
                      ? 'text-white group-hover:text-accent-pink'
                      : 'text-gray-900 group-hover:text-brand-500'
                  }`}
                >
                  {APP_NAME}
                </span>
                <span
                  className={`text-sm leading-tight hidden sm:block ${
                    onDark ? 'text-white/75' : 'text-gray-600'
                  }`}
                >
                  Real roles. Warm intros.
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className={`btn-ghost px-4 ${
                  onDark
                    ? location.pathname === '/'
                      ? 'text-white bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    : location.pathname === '/'
                      ? 'text-gray-900 bg-gray-100/80'
                      : ''
                }`}
              >
                Jobs
              </Link>
              <Link to="/submit" className="btn-primary text-sm hidden lg:inline-flex">
                <svg
                  className="h-4 w-4 mr-1.5 -ml-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Submit a Role
              </Link>
            </nav>
          </div>
        </header>
      </div>
    </>
  );
}
