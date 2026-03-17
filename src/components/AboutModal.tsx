import { useEffect, useRef } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[60] flex bg-black/40 backdrop-blur-sm px-4 animate-fade-in ${
        isMobile ? 'items-end' : 'items-center justify-center'
      }`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div
        className={`w-full max-w-lg glass-panel p-0 overflow-hidden animate-scale-in ${
          isMobile
            ? 'rounded-t-2xl rounded-b-none max-h-[90vh] overflow-y-auto'
            : 'max-h-[80vh] overflow-y-auto'
        }`}
      >
        {isMobile && (
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200/60 px-6 py-4 flex items-center justify-between z-10">
          <h3
            id="about-modal-title"
            className="text-lg font-bold bg-gradient-to-r from-brand-500 to-purple-600 bg-clip-text text-transparent"
          >
            About Brim
          </h3>
          <button
            onClick={onClose}
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
          {/* Brim Financial — with shimmer glow */}
          <div className="relative rounded-xl overflow-hidden shadow-glow-purple animate-glow-pulse">
            {/* Animated shimmer border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/0 via-brand-400/50 to-brand-500/0 animate-shimmer bg-[length:200%_100%]" />
            <div className="relative m-[1.5px] rounded-[11px] bg-gradient-to-br from-brand-50 to-purple-50 p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-lg font-bold text-brand-500 shrink-0">
                  B
                </div>
                <div>
                  <a
                    href="https://www.brimfinancial.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-bold text-gray-900 hover:text-brand-500 transition-colors"
                  >
                    Brim Financial
                  </a>
                  <p className="text-xs text-gray-500">Modern cards and payments infrastructure</p>
                </div>
              </div>

              <p className="text-[11px] font-medium text-brand-600 mt-2 mb-3">
                Built for banks, credit unions, fintechs, and non-bank lenders
              </p>

              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                Brim is one of the fastest growing enterprise fintech companies, powering modern
                payment experiences for financial institutions, fintechs, and non-FI lenders. Our
                end-to-end, turnkey platform delivers a full suite of credit, debit, prepaid, and
                secured card programs &mdash; along with cross-border payments, ACH, and Real-Time
                Payments.
              </p>

              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                The platform solves one of the industry&rsquo;s biggest challenges: reducing the
                complexity and timelines of payments and card program launches. Brim&rsquo;s modular
                stack enables rapid deployment of consumer, SMB, and corporate card programs in as
                little as 8&ndash;10 weeks, compared to the industry norm of 12&ndash;18 months.
              </p>

              {/* Results highlight */}
              <div className="rounded-lg bg-white/90 border border-brand-200/60 p-3.5 mb-4">
                <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-widest mb-2.5">
                  Platform Results
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-brand-600">40&ndash;70%</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                      Spend increase post-migration
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-brand-600">90%</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                      Reduction in manual processes
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-brand-600">8&ndash;10 wks</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                      Program launch timeline
                    </p>
                  </div>
                </div>
              </div>

              {/* Client logos */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Trusted by
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { name: 'Affinity Credit Union', url: 'affinitycu.ca' },
                    { name: 'Zolve', url: 'zolve.com' },
                    { name: 'PayFacto', url: 'payfacto.com' },
                    { name: 'Manulife Financial', url: 'manulife.com' },
                    { name: 'Laurentian Bank', url: 'laurentianbank.ca' },
                    { name: 'CWB Bank', url: 'cwbank.com' },
                    { name: 'Air France-KLM', url: 'airfranceklm.com' },
                    { name: 'Zoomer Carp', url: 'zoomermedia.ca' },
                  ].map((client) => (
                    <div
                      key={client.name}
                      className="flex items-center gap-1.5 rounded-lg bg-white/80 border border-white px-2.5 py-1.5 shadow-sm"
                    >
                      <img
                        src={`https://logo.clearbit.com/${client.url}`}
                        alt={client.name}
                        className="h-4 w-4 rounded-sm object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="text-[11px] font-medium text-gray-700">{client.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who our partners serve */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Who our partners serve
                </p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="rounded-lg bg-white/80 border border-brand-100/60 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
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
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                      <p className="text-xs font-semibold text-gray-800">Consumer</p>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Consumer card programs
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 border border-brand-100/60 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
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
                          d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0V8.999a3 3 0 013-3h12a3 3 0 013 3v.35M12 6.75h.008v.008H12V6.75z"
                        />
                      </svg>
                      <p className="text-xs font-semibold text-gray-800">SMB</p>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Small business solutions
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 border border-brand-100/60 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
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
                          d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
                        />
                      </svg>
                      <p className="text-xs font-semibold text-gray-800">Commercial</p>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Corporate & commercial cards
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-white/80 border border-brand-100/60 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
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
                        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                      />
                    </svg>
                    <p className="text-xs font-semibold text-gray-800">Payments</p>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Cross-border payments, ACH, and Real-Time Payments
                  </p>
                </div>
              </div>

              {/* Recognition */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Recognition
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { award: 'Best Card Issuing Platform', event: 'Big Bank Theory 2025' },
                    { award: 'Best Card for SMBs', event: 'SMB Finance 2025' },
                    { award: 'PayTech Start-up of the Year', event: 'Banking Tech Awards 2025' },
                    { award: 'Best Business Payments System', event: 'PayTech Awards 2025' },
                    { award: 'Best as-a-Service Solution', event: 'Banking Tech Awards USA 2025' },
                    { award: 'Deloitte Fast 50 Canada', event: '' },
                    { award: 'Deloitte Fast 500 NA', event: '' },
                  ].map((item) => (
                    <span
                      key={item.award}
                      className="inline-flex items-center gap-1.5 rounded-md bg-white/80 border border-brand-100/60 px-2.5 py-1.5 text-[10px] font-medium text-gray-600"
                    >
                      <svg
                        className="h-3 w-3 text-amber-500 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 1l2.928 6.472L20 8.347l-5.072 4.629L16.18 20 10 16.472 3.82 20l1.252-7.024L0 8.347l7.072-.875L10 1z" />
                      </svg>
                      <span>
                        {item.award}
                        {item.event && (
                          <span className="text-gray-400"> &middot; {item.event}</span>
                        )}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="https://www.brimfinancial.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm"
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
                      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                    />
                  </svg>
                  brimfinancial.com
                </a>
                <a
                  href="https://www.linkedin.com/company/baborim/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A66C2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#004182] transition-colors shadow-sm"
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Brim LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-xl bg-emerald-50/50 border border-emerald-200/40 p-4">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
              Get in touch
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 text-emerald-500 shrink-0"
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
                <div>
                  <a
                    href="mailto:Tarique.khan@brimfinancial.com"
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    Tarique.khan@brimfinancial.com
                  </a>
                  <span className="text-xs text-emerald-600/60 ml-1.5">work</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <svg
                  className="h-4 w-4 text-emerald-500 shrink-0"
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
                <div>
                  <a
                    href="mailto:Tariquek@gmail.com"
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    Tariquek@gmail.com
                  </a>
                  <span className="text-xs text-emerald-600/60 ml-1.5">personal</span>
                </div>
              </div>
            </div>
          </div>

          {/* About Tarique — the builder */}
          <div className="rounded-xl bg-gray-50 border border-gray-200/60 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-600 shrink-0">
                TK
              </div>
              <div>
                <a
                  href="https://www.linkedin.com/in/tariquekhan1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-gray-900 hover:text-brand-500 transition-colors"
                >
                  Tarique Khan
                </a>
                <p className="text-xs text-gray-500">Business Development at Brim</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              I work in BD at Brim, helping banks and brands figure out their card strategy. Built
              Fintech Commons on the side because I got tired of watching good people apply into
              black holes. This is my way of making hiring in fintech a little more human.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href="https://www.linkedin.com/in/tariquekhan1/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A66C2]/10 px-3 py-1.5 text-xs font-medium text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                Tarique's LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
