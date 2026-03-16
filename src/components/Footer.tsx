import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import TermsModal from './TermsModal';

export default function Footer() {
  const posthog = usePostHog();
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const handleBugReport = () => {
    const description = window.prompt('Describe the issue you encountered:');
    if (description && description.trim()) {
      posthog?.capture('bug_report', {
        page: window.location.pathname,
        description: description.trim(),
        userAgent: navigator.userAgent,
      });
      alert("Thanks for the report! We'll look into it.");
    }
  };

  return (
    <>
      <footer className="bg-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top section — multi-column */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-12 border-b border-white/10">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-pink flex items-center justify-center text-xs font-bold text-white">
                  FC
                </div>
                <span className="font-bold text-lg">Fintech Commons</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Community-reviewed fintech & banking roles. Real talk, not corporate fluff.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/" className="text-white/60 hover:text-white transition-colors">Browse Jobs</Link></li>
                <li><Link to="/submit" className="text-white/60 hover:text-white transition-colors">Submit a Role</Link></li>
              </ul>
            </div>

            {/* About */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">About</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="https://www.linkedin.com/in/tariquekhan1/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">
                    Built by Tarique Khan
                  </a>
                </li>
                <li>
                  <button onClick={() => setShowContact(true)} className="text-white/60 hover:text-white transition-colors">
                    Contact
                  </button>
                </li>
                <li>
                  <button onClick={handleBugReport} className="text-white/60 hover:text-white transition-colors flex items-center gap-1.5">
                    Report a Bug
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152-6.135 23.846 23.846 0 01.497-5.14c.04-.2-.022-.404-.144-.558a.682.682 0 00-.496-.247c-.59-.045-1.184-.068-1.782-.068-5.032 0-9.36 3.064-11.21 7.42A23.856 23.856 0 0112 12.75z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 9.75h-3m3 3h-3m14.25-3h3m-3 3h3M12 15.75v6" />
                    </svg>
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal & Open Source */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Legal & Open Source</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button onClick={() => setShowTerms(true)} className="text-white/60 hover:text-white transition-colors">
                    Terms & Conditions
                  </button>
                </li>
                <li><span className="text-white/60">MIT License</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-6 text-xs text-white/30">
            <span>&copy; {new Date().getFullYear()} Fintech Commons</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const feedback = window.prompt('How can we improve? Share your feedback:');
                  if (feedback && feedback.trim()) {
                    posthog?.capture('user_feedback', {
                      page: window.location.pathname,
                      feedback: feedback.trim(),
                    });
                    alert('Thanks for the feedback!');
                  }
                }}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                Feedback
              </button>
            </div>
          </div>
        </div>
      </footer>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      {/* Contact modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowContact(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Get in touch</h2>
              <button onClick={() => setShowContact(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Work</p>
                  <a href="mailto:Tarique.khan@brimfinancial.com" className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
                    Tarique.khan@brimfinancial.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Personal</p>
                  <a href="mailto:Tariquek@gmail.com" className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
                    Tariquek@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Phone</p>
                  <a href="tel:905-399-8352" className="text-sm text-brand-500 hover:text-brand-600 transition-colors">
                    905-399-8352
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
