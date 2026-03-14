import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import AboutModal from './AboutModal';

export default function BottomNav() {
  const location = useLocation();
  const [showAbout, setShowAbout] = useState(false);

  const items = [
    {
      label: 'Jobs',
      path: '/',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
    },
    {
      label: 'Submit',
      path: '/submit',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      label: 'About',
      path: '#about',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/80 backdrop-blur-xl border-t border-gray-200/60" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {items.map((item) =>
            item.path === '#about' ? (
              <button
                key={item.label}
                onClick={() => setShowAbout(true)}
                className="flex flex-col items-center gap-0.5 text-gray-400 active:scale-95 transition-transform min-w-[64px]"
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 active:scale-95 transition-transform min-w-[64px] ${
                  location.pathname === item.path
                    ? 'text-indigo-600'
                    : 'text-gray-400'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
}
