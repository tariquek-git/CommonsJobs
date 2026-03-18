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
    accentColor: 'bg-brand-500',
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
    accentColor: 'bg-[#FF3B8B]',
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
    accentColor: 'bg-emerald-500',
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
    accentColor: 'bg-[#7B61FF]',
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

  const textHeading = dark ? 'text-white' : 'text-gray-900';
  const textBody = dark ? 'text-white/75' : 'text-gray-600';
  const textMuted = dark ? 'text-white/60' : 'text-gray-500';
  const borderColor = dark ? 'border-white/[0.08]' : 'border-gray-100';

  return (
    <div className="space-y-4">
      {/* ── Why I built Fintech Commons — collapsible ── */}
      <div
        className={`rounded-2xl border overflow-hidden transition-colors duration-200 ${
          dark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-gray-200/50 shadow-card'
        }`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left group"
          aria-expanded={!collapsed}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg flex-shrink-0" role="img" aria-label="wave">
              &#x1F44B;
            </span>
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
            className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${
              dark ? 'text-white/30' : 'text-gray-400'
            } ${collapsed ? '' : 'rotate-180'} group-hover:${dark ? 'text-white/50' : 'text-gray-500'}`}
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
          className={`grid transition-all duration-500 ease-out ${
            collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className="overflow-hidden">
            <div className={`px-5 pb-5 border-t ${borderColor}`}>
              {/* Personal intro */}
              <p
                className={`text-sm leading-relaxed mt-4 mb-3 ${
                  dark ? 'text-white/70' : 'text-gray-600'
                }`}
              >
                <span>I'm </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new Event('open-bio'));
                  }}
                  className={`font-semibold transition-colors cursor-pointer ${
                    dark ? 'text-white/90 hover:text-white' : 'text-gray-800 hover:text-brand-500'
                  }`}
                >
                  Tarique
                </button>
                <span>. By day I do biz dev at </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new Event('open-about'));
                  }}
                  className={`font-semibold transition-colors cursor-pointer ${
                    dark ? 'text-white/90 hover:text-white' : 'text-gray-800 hover:text-brand-500'
                  }`}
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
      </div>

      {/* ── How It Works ── */}
      <div
        ref={stepsRef}
        className={`rounded-2xl border overflow-hidden ${
          dark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-gray-200/50 shadow-card'
        }`}
      >
        <div className="px-5 sm:px-8 py-5 sm:py-6">
          {/* Section label */}
          <p
            className={`text-[10px] font-semibold tracking-[0.15em] uppercase mb-5 ${
              dark ? 'text-white/30' : 'text-gray-400'
            }`}
          >
            How it works
          </p>

          {/* ─── Desktop: horizontal stepper + detail panel ─── */}
          <div className="hidden md:block">
            {/* Horizontal step bar */}
            <div className="flex items-center justify-between mb-6">
              {STEPS.map((step, i) => {
                const isActive = activeStep === i;
                const isPast = activeStep > i;
                return (
                  <div key={step.label} className="contents">
                    <button
                      onClick={() => {
                        setActiveStep(i);
                        setPaused(true);
                      }}
                      onMouseEnter={() => {
                        setActiveStep(i);
                        setPaused(true);
                      }}
                      onMouseLeave={() => setPaused(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                        isActive ? (dark ? 'bg-white/[0.07]' : 'bg-gray-50') : ''
                      } ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      {/* Numbered icon */}
                      <div
                        className={`relative h-10 w-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center flex-shrink-0 transition-all duration-400 ${
                          isActive
                            ? 'scale-110 shadow-lg ' + step.shadow
                            : isPast
                              ? 'opacity-50'
                              : 'opacity-25'
                        }`}
                      >
                        {isActive && (
                          <div
                            className={`absolute -inset-1 rounded-xl bg-gradient-to-br ${step.gradient} opacity-20 blur-md animate-pulse`}
                          />
                        )}
                        <svg
                          className="h-5 w-5 text-white relative z-10"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          {step.icon}
                        </svg>
                      </div>
                      <div className="text-left">
                        <p
                          className={`text-sm font-semibold transition-colors duration-300 ${
                            isActive ? textHeading : dark ? 'text-white/35' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p
                          className={`text-[11px] transition-colors duration-300 ${
                            isActive ? textMuted : dark ? 'text-white/20' : 'text-gray-300'
                          }`}
                        >
                          {step.sub}
                        </p>
                      </div>
                    </button>

                    {/* Connector line with fill */}
                    {i < STEPS.length - 1 && (
                      <div className="flex items-center px-1 flex-shrink-0">
                        <div
                          className={`relative w-8 h-0.5 rounded-full overflow-hidden ${
                            dark ? 'bg-white/[0.06]' : 'bg-gray-200'
                          }`}
                        >
                          <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: activeStep > i ? '100%' : activeStep === i ? '60%' : '0%',
                              background: dark
                                ? 'linear-gradient(to right, rgba(99,91,255,0.5), rgba(255,59,139,0.3))'
                                : 'linear-gradient(to right, #635BFF, #FF3B8B)',
                              opacity: activeStep >= i ? 1 : 0,
                            }}
                          />
                          {activeStep === i && (
                            <div className="absolute inset-y-0 left-0 w-full flex items-center">
                              <div
                                className="h-1.5 w-1.5 rounded-full bg-white shadow-sm shadow-white/50"
                                style={{
                                  animation: `travel-right ${CYCLE_MS}ms ease-in-out infinite`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail panel */}
            <div className="relative overflow-hidden" style={{ minHeight: '60px' }}>
              {STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className={`transition-all duration-400 ease-out ${
                    activeStep === i
                      ? 'opacity-100 translate-y-0 relative'
                      : 'opacity-0 translate-y-2 absolute inset-x-0 top-0 pointer-events-none'
                  }`}
                >
                  <div
                    className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                      dark ? 'bg-white/[0.03]' : 'bg-gray-50/80'
                    }`}
                  >
                    <div
                      className={`h-5 w-1 rounded-full flex-shrink-0 mt-0.5 bg-gradient-to-b ${step.gradient}`}
                    />
                    <div>
                      <p
                        className={`text-[11px] font-semibold tracking-wide uppercase mb-1 ${
                          dark ? 'text-white/40' : 'text-gray-400'
                        }`}
                      >
                        Step {i + 1}
                      </p>
                      <p className={`text-sm ${textBody} leading-relaxed`}>{step.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
              {STEPS.map((step, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveStep(i);
                    setPaused(true);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-400 ${
                    activeStep === i
                      ? `w-8 ${step.accentColor}`
                      : `w-1.5 ${dark ? 'bg-white/15' : 'bg-gray-200'}`
                  }`}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ─── Mobile: vertical timeline ─── */}
          <div className="md:hidden space-y-0">
            {STEPS.map((step, i) => {
              const isActive = activeStep === i;
              return (
                <button
                  key={step.label}
                  onClick={() => {
                    setActiveStep(i);
                    setPaused(true);
                  }}
                  className={`w-full text-left flex gap-3.5 transition-all duration-400 ${
                    stepsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {/* Left: icon + connector line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`relative h-10 w-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center transition-all duration-400 ${
                        isActive ? 'scale-110 shadow-lg ' + step.shadow : 'opacity-35 scale-95'
                      }`}
                    >
                      {isActive && (
                        <div
                          className={`absolute -inset-1 rounded-xl bg-gradient-to-br ${step.gradient} opacity-20 blur-md animate-pulse`}
                        />
                      )}
                      <svg
                        className="h-5 w-5 text-white relative z-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        {step.icon}
                      </svg>
                    </div>
                    {/* Connector line with fill effect */}
                    {i < STEPS.length - 1 && (
                      <div
                        className={`relative w-0.5 flex-1 my-1.5 rounded-full overflow-hidden ${
                          dark ? 'bg-white/[0.06]' : 'bg-gray-200'
                        }`}
                      >
                        {/* Fill bar — grows from top */}
                        <div
                          className="absolute top-0 left-0 w-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            height: activeStep > i ? '100%' : activeStep === i ? '50%' : '0%',
                            background: dark
                              ? 'linear-gradient(to bottom, rgba(99,91,255,0.5), rgba(255,59,139,0.3))'
                              : 'linear-gradient(to bottom, #635BFF, #FF3B8B)',
                            opacity: activeStep >= i ? 1 : 0,
                          }}
                        />
                        {/* Traveling dot */}
                        {activeStep === i && (
                          <div className="absolute inset-x-0 top-0 h-full flex justify-center">
                            <div
                              className="h-1.5 w-1.5 rounded-full bg-white shadow-sm shadow-white/50"
                              style={{
                                animation: `travel-down ${CYCLE_MS}ms ease-in-out infinite`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: text content */}
                  <div className={`pb-5 ${i === STEPS.length - 1 ? '' : ''}`}>
                    <p
                      className={`text-sm font-semibold transition-colors duration-300 ${
                        isActive ? textHeading : dark ? 'text-white/35' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                      <span
                        className={`ml-2 text-[11px] font-normal ${
                          isActive ? textMuted : dark ? 'text-white/20' : 'text-gray-300'
                        }`}
                      >
                        {step.sub}
                      </span>
                    </p>
                    {/* Detail — only show for active step */}
                    <div
                      className={`grid transition-all duration-400 ease-out ${
                        isActive
                          ? 'grid-rows-[1fr] opacity-100 mt-1.5'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className={`text-[13px] leading-relaxed ${textBody}`}>{step.detail}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className={`border-t ${borderColor} px-5 sm:px-8 py-2.5 flex items-center justify-between ${
            dark ? 'bg-white/[0.02]' : 'bg-gray-50'
          }`}
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
