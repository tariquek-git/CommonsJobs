import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePostHog } from '@posthog/react';
import TermsModal from './TermsModal';

export default function Footer() {
  const posthog = usePostHog();
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAiDisclosure, setShowAiDisclosure] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [formText, setFormText] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleFormSubmit = (type: 'bug_report' | 'user_feedback') => {
    if (!formText.trim()) return;
    posthog?.capture(type, {
      page: window.location.pathname,
      [type === 'bug_report' ? 'description' : 'feedback']: formText.trim(),
      name: formName.trim() || undefined,
      email: formEmail.trim() || undefined,
      ...(type === 'bug_report' ? { userAgent: navigator.userAgent } : {}),
    });
    setFormText('');
    setFormName('');
    setFormEmail('');
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setShowBugReport(false);
      setShowFeedback(false);
    }, 2000);
  };

  return (
    <>
      <footer className="bg-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Multi-column links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 py-10 border-b border-white/10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-pink flex items-center justify-center text-xs font-bold text-white">
                  FC
                </div>
                <span className="font-bold text-lg">Fintech Commons</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Community-reviewed fintech & banking roles. Real talk, not corporate jargon.
              </p>
            </div>

            {/* Navigate */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
                Navigate
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link
                    to="/"
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    Browse Jobs
                  </Link>
                </li>
                <li>
                  <Link
                    to="/submit"
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    Submit a Role
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setShowBio(true)}
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                    Built by Tarique
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowContact(true)}
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal & More */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
                Legal & More
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button
                    onClick={() => setShowTerms(true)}
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                      />
                    </svg>
                    The Fine Print
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowAiDisclosure(true)}
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                    AI & Tools Disclosure
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowBugReport(true)}
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75z"
                      />
                    </svg>
                    Report a Bug
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowFeedback(true)}
                    className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                      />
                    </svg>
                    Feedback
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* WhatsApp Community */}
          <div className="py-6 border-b border-white/10">
            <a
              href="https://chat.whatsapp.com/F2uXa3KjZ3UAzKnrsfx1pG"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/20 px-5 py-4 group hover:from-emerald-600/30 hover:to-emerald-500/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6 text-emerald-400 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Join the Fintech Commons WhatsApp group
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">
                    Connect with the community, get updates, share opportunities
                  </p>
                </div>
              </div>
              <svg
                className="h-4 w-4 text-white/40 group-hover:text-white/70 transition-colors shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                />
              </svg>
            </a>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-6 text-xs text-white/30">
            <span>&copy; {new Date().getFullYear()} Fintech Commons</span>
          </div>
        </div>
      </footer>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

      {/* Contact modal */}
      {/* AI & Tools Disclosure Modal */}
      {showAiDisclosure && (
        <div
          className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiDisclosure(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg glass-panel p-0 overflow-hidden animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200/60 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-brand-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
                AI & Tools Disclosure
              </h2>
              <button
                onClick={() => setShowAiDisclosure(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 text-sm text-gray-600 leading-relaxed">
              <div className="rounded-xl bg-brand-50/50 border border-brand-200/40 p-4">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-1.5">
                  The short version
                </p>
                <p className="text-sm text-brand-800">
                  AI was used for a vast majority of this project. Without it, Fintech Commons
                  wouldn't exist. But it's not just about AI — it's everything built around it.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1.5">
                  Why I'm disclosing this
                </h4>
                <p>
                  It goes without saying at this point — but I think it's important to be upfront.
                  AI played a central role in building Fintech Commons, across code, copy, design
                  decisions, and problem-solving. I want people to know that, not because it
                  diminishes the work, but because I think transparency about how things are built
                  matters.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1.5">The AI models</h4>
                <p>
                  This project was built using a combination of AI models from multiple providers,
                  each used for different tasks throughout the process:
                </p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-brand-400" />
                    <span>
                      <span className="font-medium text-gray-900">Anthropic (Claude)</span> — Claude
                      Opus, Sonnet, and Haiku for code generation, architecture decisions,
                      debugging, and copy
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>
                      <span className="font-medium text-gray-900">OpenAI</span> — GPT models for
                      brainstorming, drafting, and various development tasks
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>
                      <span className="font-medium text-gray-900">Google (Gemini)</span> — Gemini
                      models for research, content generation, and supplementary tasks
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1.5">
                  The tools & ecosystem
                </h4>
                <p>
                  But here's the thing — AI alone didn't build this. It was the glue that brought
                  everything together. The real story is the ecosystem of tools that made it
                  possible for one person to ship something like this:
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">Vercel</p>
                    <p className="text-xs text-gray-500">Deployment & hosting</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">Supabase</p>
                    <p className="text-xs text-gray-500">Database & auth</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">PostHog</p>
                    <p className="text-xs text-gray-500">Analytics & session replay</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">Resend</p>
                    <p className="text-xs text-gray-500">Transactional email</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">Sentry</p>
                    <p className="text-xs text-gray-500">Error tracking & monitoring</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">Google Tag Manager</p>
                    <p className="text-xs text-gray-500">Tag management & GA</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">GitHub</p>
                    <p className="text-xs text-gray-500">Version control & CI</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">React + Vite</p>
                    <p className="text-xs text-gray-500">Frontend framework</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">Tailwind CSS</p>
                    <p className="text-xs text-gray-500">Styling & design system</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900">Claude Code</p>
                    <p className="text-xs text-gray-500">AI-powered development</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1.5">The bigger picture</h4>
                <p>
                  I think one of the great things about this moment isn't just AI itself — it's
                  everything built around it. The combination of AI with modern developer tools,
                  open-source libraries, and cloud infrastructure has made it possible for anyone
                  with an idea and determination to build something real. That's true of any new
                  technology. The tools lower the barrier; the vision and persistence are still on
                  you.
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-4">
                <p className="text-xs text-gray-600">
                  Have questions about how this was built? I'm happy to walk you through it.{' '}
                  <button
                    onClick={() => {
                      setShowAiDisclosure(false);
                      setShowContact(true);
                    }}
                    className="text-brand-500 hover:text-brand-600 font-medium underline underline-offset-2 transition-colors"
                  >
                    Reach out
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugReport && (
        <div
          className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBugReport(false);
              setFormText('');
              setFormName('');
              setFormEmail('');
              setFormSubmitted(false);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm glass-panel p-6 overflow-hidden animate-scale-in space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152-6.135 23.846 23.846 0 01.497-5.14c.04-.2-.022-.404-.144-.558a.682.682 0 00-.496-.247c-.59-.045-1.184-.068-1.782-.068-5.032 0-9.36 3.064-11.21 7.42A23.856 23.856 0 0112 12.75z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 7.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 9.75h-3m3 3h-3m14.25-3h3m-3 3h3M12 15.75v6"
                  />
                </svg>
                Report a Bug
              </h2>
              <button
                onClick={() => {
                  setShowBugReport(false);
                  setFormText('');
                  setFormName('');
                  setFormEmail('');
                  setFormSubmitted(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {formSubmitted ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium text-emerald-600">
                  Thanks for the report! We'll look into it.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Name"
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                    autoFocus
                  />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                  />
                </div>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Describe the issue you encountered..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 resize-none"
                  rows={4}
                />
                <button
                  onClick={() => handleFormSubmit('bug_report')}
                  disabled={!formText.trim()}
                  className="btn-primary w-full py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Report
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div
          className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFeedback(false);
              setFormText('');
              setFormName('');
              setFormEmail('');
              setFormSubmitted(false);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm glass-panel p-6 overflow-hidden animate-scale-in space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-brand-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
                Feedback
              </h2>
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFormText('');
                  setFormName('');
                  setFormEmail('');
                  setFormSubmitted(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {formSubmitted ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium text-emerald-600">Thanks for the feedback!</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Name"
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                    autoFocus
                  />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
                  />
                </div>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="How can we improve? Share your thoughts..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 resize-none"
                  rows={4}
                />
                <button
                  onClick={() => handleFormSubmit('user_feedback')}
                  disabled={!formText.trim()}
                  className="btn-primary w-full py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send Feedback
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bio Modal — same glass-panel design */}
      {showBio && (
        <div
          className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBio(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg glass-panel p-0 overflow-hidden animate-scale-in max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200/60 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900">About Me</h3>
              <button
                onClick={() => setShowBio(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Profile */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-600 shrink-0">
                  TK
                </div>
                <div>
                  <a
                    href="https://www.linkedin.com/in/tariquekhan1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-semibold text-gray-900 hover:text-brand-500 transition-colors"
                  >
                    Tarique Khan
                  </a>
                  <p className="text-xs text-gray-500">
                    Business Development &middot; Brim Financial
                  </p>
                </div>
              </div>

              {/* Why I built this */}
              <div className="rounded-xl bg-brand-50/50 border border-brand-200/40 p-4">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2">
                  Why I built Fintech Commons
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Job search in fintech is broken. Listings are vague, recruiters ghost, and warm
                  intros only happen if you know the right people. I got tired of watching good
                  people apply into black holes &mdash; so I built something about it.
                </p>
              </div>

              {/* What this is */}
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Fintech Commons is a community-powered job board where every listing is reviewed
                  by a real person. AI helps cut through the corporate speak, but a human vets every
                  role before it goes live. If you see a job here, someone stood behind it.
                </p>
              </div>

              {/* Background */}
              <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Background
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  I work in business development at{' '}
                  <a
                    href="https://www.brimfinancial.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-500 hover:text-brand-600 font-medium"
                  >
                    Brim Financial
                  </a>
                  , helping banks and brands figure out their card and payments strategy. I&rsquo;ve
                  spent years in fintech &mdash; across issuing, acquiring, payments infrastructure,
                  and program management.
                </p>
              </div>

              {/* Community */}
              <div className="rounded-xl bg-emerald-50/50 border border-emerald-200/40 p-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
                  Join the community
                </p>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  The board only works if people participate. Post roles, share with your network,
                  or just connect with others in the space.
                </p>
                <a
                  href="https://chat.whatsapp.com/F2uXa3KjZ3UAzKnrsfx1pG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Join WhatsApp Group
                </a>
              </div>

              {/* Contact links */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Get in touch
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://www.linkedin.com/in/tariquekhan1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A66C2]/10 px-3 py-2 text-xs font-medium text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>
                  <a
                    href="mailto:Tarique.khan@brimfinancial.com"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    Work Email
                  </a>
                  <a
                    href="mailto:Tariquek@gmail.com"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                    Personal Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContact && (
        <div
          className="fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowContact(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm glass-panel p-6 overflow-hidden animate-scale-in space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Get in touch</h2>
              <button
                onClick={() => setShowContact(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Work</p>
                  <a
                    href="mailto:Tarique.khan@brimfinancial.com"
                    className="text-sm text-brand-500 hover:text-brand-600 transition-colors"
                  >
                    Tarique.khan@brimfinancial.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="h-4 w-4 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Personal</p>
                  <a
                    href="mailto:Tariquek@gmail.com"
                    className="text-sm text-brand-500 hover:text-brand-600 transition-colors"
                  >
                    Tariquek@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="h-4 w-4 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Phone</p>
                  <a
                    href="tel:905-399-8352"
                    className="text-sm text-brand-500 hover:text-brand-600 transition-colors"
                  >
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
