import { useRef, useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useInView } from '../hooks/useInView';
import { founder, steps as stepsConfig } from '../lib/copy';
import { Link } from 'react-router-dom';

interface FounderSectionProps {
  dark?: boolean;
}

const STEPS = [
  {
    label: stepsConfig.items[0].label,
    sub: stepsConfig.items[0].sub,
    detail: stepsConfig.items[0].detail,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    ),
    gradient: 'from-brand-500 to-brand-600',
    shadow: 'shadow-brand-500/20',
    accentBorder: 'border-l-brand-500',
  },
  {
    label: stepsConfig.items[1].label,
    sub: stepsConfig.items[1].sub,
    detail: stepsConfig.items[1].detail,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    ),
    gradient: 'from-accent-pink to-accent-orange',
    shadow: 'shadow-[#FF3B8B]/20',
    accentBorder: 'border-l-[#FF3B8B]',
  },
  {
    label: stepsConfig.items[2].label,
    sub: stepsConfig.items[2].sub,
    detail: stepsConfig.items[2].detail,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    gradient: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-500/20',
    accentBorder: 'border-l-emerald-500',
  },
  {
    label: stepsConfig.items[3].label,
    sub: stepsConfig.items[3].sub,
    detail: stepsConfig.items[3].detail,
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    ),
    gradient: 'from-accent-purple to-brand-400',
    shadow: 'shadow-[#7B61FF]/20',
    accentBorder: 'border-l-[#7B61FF]',
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
    ? 'bg-white/[0.05] border-white/[0.08] backdrop-blur-md'
    : 'bg-white border-gray-200/50 shadow-card';
  const textHeading = dark ? 'text-white' : 'text-gray-900';
  const textBody = dark ? 'text-white/75' : 'text-gray-600';
  const textMuted = dark ? 'text-white/60' : 'text-gray-500';
  const textChevron = dark ? 'text-white/40' : 'text-gray-400';
  const hoverBg = dark ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-50';
  const borderColor = dark ? 'border-white/[0.08]' : 'border-gray-100';

  return (
    <div className="space-y-3">
      {/* Why I built Fintech Commons — with personal intro */}
      <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${cardBg}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center justify-between px-5 py-3.5 text-left ${hoverBg} transition-colors`}
          aria-expanded={!collapsed}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-pink flex items-center justify-center text-sm shadow-lg shadow-brand-500/20 flex-shrink-0">
              &#x1F44B;
            </div>
            <div>
              <span className={`text-sm font-semibold ${dark ? 'text-white/85' : 'text-gray-700'}`}>
                {founder.cardTitle}
              </span>
              <p className={`text-xs mt-0.5 ${dark ? 'text-white/35' : 'text-gray-400'}`}>
                {founder.cardSub}
              </p>
            </div>
          </div>
          <svg
            className={`h-4 w-4 ${textChevron} transition-transform duration-300 flex-shrink-0 ${
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
          className={`overflow-hidden transition-all duration-500 ease-out ${
            collapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'
          }`}
        >
          <div className={`px-5 pb-5 border-t ${borderColor}`}>
            {/* Personal intro */}
            <p
              className={`text-sm ${dark ? 'text-white/70' : 'text-gray-600'} leading-relaxed mt-4 mb-3`}
            >
              <span>I'm </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new Event('open-bio'));
                }}
                className={`font-semibold ${dark ? 'text-white/90 hover:text-white' : 'text-gray-800 hover:text-brand-500'} transition-colors cursor-pointer`}
              >
                Tarique
              </button>
              <span>. By day I do biz dev at </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new Event('open-about'));
                }}
                className={`font-semibold ${dark ? 'text-white/90 hover:text-white' : 'text-gray-800 hover:text-brand-500'} transition-colors cursor-pointer`}
              >
                Brim Financial
              </button>
              <span>. By night I built this.</span>
            </p>
            {/* Founder story */}
            <p className={`text-sm ${textBody} leading-relaxed whitespace-pre-line`}>
              {founder.story}
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
        <div className="px-5 sm:px-8 py-5 sm:py-6">
          {/* Section header */}
          <p
            className={`text-[10px] font-semibold tracking-[0.15em] uppercase mb-5 ${dark ? 'text-white/30' : 'text-gray-400'}`}
          >
            How it works
          </p>

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
                    className={`flex flex-col items-center text-center flex-1 transition-all duration-500 cursor-pointer will-change-transform ${
                      stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: `${i * 120}ms` }}
                  >
                    <div
                      className={`relative h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-2 sm:mb-3 transition-all duration-500 will-change-transform ${
                        isActive
                          ? 'scale-110 shadow-xl ' + step.shadow
                          : isPast
                            ? 'opacity-60 scale-95 shadow-md'
                            : 'opacity-35 scale-90 shadow-sm'
                      }`}
                    >
                      {/* Soft glow on active — replaces ping */}
                      {isActive && (
                        <div
                          className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${step.gradient} opacity-25 blur-md animate-pulse`}
                        />
                      )}
                      <svg
                        className="h-6 w-6 sm:h-7 sm:w-7 text-white relative z-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        {step.icon}
                      </svg>
                    </div>
                    <p
                      className={`text-xs sm:text-sm font-bold transition-all duration-300 ${
                        isActive ? textHeading : dark ? 'text-white/35' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`text-[10px] sm:text-xs mt-0.5 transition-all duration-300 leading-tight ${
                        isActive ? textMuted : dark ? 'text-white/20' : 'text-gray-300'
                      }`}
                    >
                      {step.sub}
                    </p>
                  </button>

                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex items-center pt-5 sm:pt-7 px-0.5 sm:px-3 transition-all duration-500 ${stepsVisible ? 'opacity-100' : 'opacity-0'}`}
                      style={{ transitionDelay: `${i * 120 + 60}ms` }}
                    >
                      <div className="relative w-5 sm:w-14 h-1 flex items-center">
                        {/* Background track */}
                        <div
                          className={`absolute inset-0 h-[2px] top-1/2 -translate-y-1/2 rounded-full ${
                            dark ? 'bg-white/[0.08]' : 'bg-gray-200'
                          }`}
                        />
                        {/* Fill bar */}
                        <div
                          className="absolute left-0 h-[2px] top-1/2 -translate-y-1/2 rounded-full transition-all duration-[2000ms] ease-out"
                          style={{
                            width: activeStep > i ? '100%' : activeStep === i ? '100%' : '0%',
                            background: dark
                              ? 'linear-gradient(to right, rgba(255,255,255,0.4), rgba(255,255,255,0.2))'
                              : `linear-gradient(to right, #635BFF, #FF3B8B)`,
                            opacity: activeStep >= i ? 1 : 0,
                          }}
                        />
                        {/* Traveling dot */}
                        {activeStep === i && (
                          <div
                            className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-lg shadow-white/40"
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
          <div className="mt-5 sm:mt-6 relative overflow-hidden" style={{ minHeight: '56px' }}>
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className={`transition-all duration-500 ease-out ${
                  activeStep === i
                    ? 'opacity-100 translate-y-0 relative'
                    : 'opacity-0 translate-y-2 absolute inset-x-0 top-0 pointer-events-none'
                }`}
              >
                <div
                  className={`rounded-xl p-3.5 border-l-2 ${step.accentBorder} ${
                    dark
                      ? 'bg-white/[0.04] border border-l-2 border-white/[0.06]'
                      : 'bg-gray-50 border border-l-2 border-gray-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${step.gradient}`}
                    />
                    <p
                      className={`text-[11px] font-semibold tracking-wide uppercase ${
                        dark ? 'text-white/50' : 'text-gray-500'
                      }`}
                    >
                      Step {i + 1} &middot; {step.label}
                    </p>
                  </div>
                  <p className={`text-sm ${textBody} leading-relaxed`}>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveStep(i);
                  setPaused(true);
                }}
                className={`rounded-full transition-all duration-300 ${
                  activeStep === i
                    ? `h-2 w-7 ${dark ? 'bg-white/50' : 'bg-brand-500'}`
                    : `h-2 w-2 ${dark ? 'bg-white/15 hover:bg-white/30' : 'bg-gray-300 hover:bg-gray-400'}`
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className={`border-t ${borderColor} px-5 sm:px-8 py-2.5 flex items-center justify-between ${dark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}
        >
          <p className={`text-xs ${dark ? 'text-white/35' : 'text-gray-400'}`}>
            {founder.bottomStrip}
          </p>
          <Link
            to="/submit"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200 ${
              dark
                ? 'bg-white/[0.08] text-white/80 hover:bg-white/[0.14] hover:text-white'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
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
