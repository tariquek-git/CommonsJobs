import { useRef, useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useInView } from '../hooks/useInView';
import { FOUNDER_TEXT } from '../lib/constants';
import { Link } from 'react-router-dom';

interface FounderSectionProps {
  dark?: boolean;
}

const STEPS = [
  {
    label: 'Submit',
    sub: 'You post the role',
    detail: "Paste a job URL or description. That's it — takes 30 seconds.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    ),
    gradient: 'from-brand-500 to-brand-600',
    shadow: 'shadow-brand-500/20',
    color: 'brand',
  },
  {
    label: 'Humanize',
    sub: 'AI rewrites the fluff',
    detail:
      'AI cuts through the corporate speak and rewrites it as real talk — what someone in the role would actually care about.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    ),
    gradient: 'from-accent-pink to-accent-orange',
    shadow: 'shadow-[#FF3B8B]/20',
    color: 'pink',
  },
  {
    label: 'Review',
    sub: 'A human vets it',
    detail:
      "I personally review every listing. If it's vague, misleading, or just a recruiter blast — it doesn't go live.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    gradient: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/20',
    color: 'emerald',
  },
  {
    label: 'Connect',
    sub: 'Apply or warm intro',
    detail:
      "Apply directly, or request a warm intro — I'll pass your info to the poster. No pressure on either side.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    ),
    gradient: 'from-accent-purple to-brand-400',
    shadow: 'shadow-[#7B61FF]/20',
    color: 'purple',
  },
];

const CYCLE_MS = 3000;

export default function FounderSection({ dark = false }: FounderSectionProps) {
  const [collapsed, setCollapsed] = useLocalStorage('founder-collapsed', true);
  const contentRef = useRef<HTMLDivElement>(null);
  const { ref: stepsRef, inView: stepsVisible } = useInView();
  const [activeStep, setActiveStep] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-cycle through steps
  useEffect(() => {
    if (!stepsVisible || paused) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, [stepsVisible, paused]);

  const cardBg = dark
    ? 'bg-white/[0.06] border-white/10 backdrop-blur-sm'
    : 'bg-white border-gray-200/50 shadow-card';
  const textHeading = dark ? 'text-white' : 'text-gray-900';
  const textBody = dark ? 'text-white/80' : 'text-gray-600';
  const textMuted = dark ? 'text-white/70' : 'text-gray-500';
  const textChevron = dark ? 'text-white/50' : 'text-gray-400';
  const hoverBg = dark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const borderColor = dark ? 'border-white/10' : 'border-gray-100';

  return (
    <div className="space-y-4">
      {/* Collapsible founder message */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center justify-between px-5 py-4 text-left ${hoverBg} transition-colors`}
          aria-expanded={!collapsed}
        >
          <div>
            <span className={`text-sm font-semibold ${dark ? 'text-white/80' : 'text-gray-700'}`}>
              Why I built Fintech Commons
            </span>
            <p className={`text-xs mt-0.5 ${dark ? 'text-white/40' : 'text-gray-400'}`}>
              Job search is broken. Here's what I'm doing about it.
            </p>
          </div>
          <svg
            className={`h-4 w-4 ${textChevron} transition-transform duration-300 ${
              collapsed ? '' : 'rotate-180'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          ref={contentRef}
          className={`overflow-hidden transition-all duration-300 ease-out ${
            collapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
          }`}
        >
          <div className={`px-5 pb-5 border-t ${borderColor}`}>
            <p className={`text-sm ${textBody} leading-relaxed whitespace-pre-line mt-4`}>
              {FOUNDER_TEXT}
            </p>
          </div>
        </div>
      </div>

      {/* How It Works — animated pipeline */}
      <div
        ref={stepsRef}
        className={`rounded-2xl border overflow-hidden ${cardBg}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="px-5 sm:px-8 py-6 sm:py-8">
          {/* Step icons row */}
          <div className="flex items-start justify-between sm:justify-center sm:gap-0">
            {STEPS.map((step, i) => {
              const isActive = activeStep === i;
              const isPast = activeStep > i;

              return (
                <div key={step.label} className="contents">
                  {/* Step */}
                  <button
                    onClick={() => {
                      setActiveStep(i);
                      setPaused(true);
                    }}
                    className={`flex flex-col items-center text-center flex-1 transition-all duration-500 cursor-pointer ${
                      stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: `${i * 150}ms` }}
                  >
                    <div
                      className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg ${step.shadow} mb-3 transition-all duration-500 ${
                        isActive
                          ? 'scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-transparent'
                          : isPast
                            ? 'opacity-60 scale-95'
                            : 'opacity-40 scale-90'
                      }`}
                    >
                      {/* Pulse ring on active */}
                      {isActive && (
                        <div
                          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.gradient} animate-ping opacity-20`}
                        />
                      )}
                      <svg
                        className="h-7 w-7 sm:h-8 sm:w-8 text-white relative z-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        {step.icon}
                      </svg>
                    </div>
                    <p
                      className={`text-sm font-bold transition-all duration-300 ${
                        isActive ? textHeading : dark ? 'text-white/40' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`text-xs mt-0.5 hidden sm:block transition-all duration-300 ${
                        isActive ? textMuted : dark ? 'text-white/20' : 'text-gray-300'
                      }`}
                    >
                      {step.sub}
                    </p>
                  </button>

                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex items-center pt-7 sm:pt-8 px-1 sm:px-3 transition-all duration-500 ${stepsVisible ? 'opacity-100' : 'opacity-0'}`}
                      style={{ transitionDelay: `${i * 150 + 75}ms` }}
                    >
                      <div className="relative w-8 sm:w-14 h-1 flex items-center">
                        {/* Background track */}
                        <div
                          className={`absolute inset-0 h-0.5 top-1/2 -translate-y-1/2 rounded-full ${
                            dark ? 'bg-white/10' : 'bg-gray-200'
                          }`}
                        />
                        {/* Fill bar — animates when this connector is the active transition */}
                        <div
                          className="absolute left-0 h-0.5 top-1/2 -translate-y-1/2 rounded-full transition-all duration-[2000ms] ease-out"
                          style={{
                            width: activeStep > i ? '100%' : activeStep === i ? '100%' : '0%',
                            background: dark
                              ? 'linear-gradient(to right, rgba(255,255,255,0.5), rgba(255,255,255,0.3))'
                              : `linear-gradient(to right, var(--tw-gradient-from, #635BFF), var(--tw-gradient-to, #FF3B8B))`,
                            opacity: activeStep >= i ? 1 : 0,
                          }}
                        />
                        {/* Traveling dot */}
                        {activeStep === i && (
                          <div
                            className="absolute h-2 w-2 rounded-full bg-white shadow-lg shadow-white/50 animate-travel-dot"
                            style={{
                              animation: `travel-dot ${CYCLE_MS}ms ease-in-out infinite`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active step description — slides in */}
          <div className="mt-6 sm:mt-8 relative overflow-hidden" style={{ minHeight: '60px' }}>
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className={`transition-all duration-500 ${
                  activeStep === i
                    ? 'opacity-100 translate-y-0 relative'
                    : 'opacity-0 translate-y-2 absolute inset-x-0 top-0 pointer-events-none'
                }`}
              >
                <div
                  className={`rounded-xl p-4 ${
                    dark
                      ? 'bg-white/[0.06] border border-white/10'
                      : 'bg-gray-50 border border-gray-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${step.gradient}`}
                    />
                    <p
                      className={`text-xs font-semibold ${
                        dark ? 'text-white/70' : 'text-gray-600'
                      }`}
                    >
                      Step {i + 1}: {step.label}
                    </p>
                  </div>
                  <p className={`text-sm ${textBody} leading-relaxed`}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveStep(i);
                  setPaused(true);
                }}
                className={`rounded-full transition-all duration-300 ${
                  activeStep === i
                    ? `h-1.5 w-6 ${dark ? 'bg-white/60' : 'bg-brand-500'}`
                    : `h-1.5 w-1.5 ${dark ? 'bg-white/20' : 'bg-gray-300'} hover:${dark ? 'bg-white/40' : 'bg-gray-400'}`
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className={`border-t ${borderColor} px-5 sm:px-8 py-3 flex items-center justify-between ${dark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}
        >
          <p className={`text-xs ${textMuted}`}>
            Automation does the heavy lifting. The trust stays human.
          </p>
          <Link
            to="/submit"
            className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors flex items-center gap-1"
          >
            Submit a role
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
