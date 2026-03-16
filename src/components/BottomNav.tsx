import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import AboutModal from './AboutModal';

export default function BottomNav() {
  const location = useLocation();
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/80 backdrop-blur-xl border-t border-gray-200/60" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {/* Jobs */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 active:scale-95 transition-transform min-w-[56px] ${
              location.pathname === '/' ? 'text-brand-500' : 'text-gray-600'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            <span className="text-xs font-medium">Jobs</span>
          </Link>

          {/* Submit */}
          <Link
            to="/submit"
            className={`flex flex-col items-center gap-0.5 active:scale-95 transition-transform min-w-[56px] ${
              location.pathname === '/submit' ? 'text-brand-500' : 'text-gray-600'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-xs font-medium">Submit</span>
          </Link>

          {/* Brim */}
          <a
            href="https://www.brimfinancial.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 text-gray-600 active:scale-95 transition-transform min-w-[56px]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V8.999a3 3 0 013-3h12a3 3 0 013 3v.35M12 6.75h.008v.008H12V6.75z" />
            </svg>
            <span className="text-xs font-medium">Brim</span>
          </a>

          {/* About Me */}
          <button
            onClick={() => setShowAbout(true)}
            className="flex flex-col items-center gap-0.5 text-gray-600 active:scale-95 transition-transform min-w-[56px]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-xs font-medium">About</span>
          </button>
        </div>
      </nav>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
}
