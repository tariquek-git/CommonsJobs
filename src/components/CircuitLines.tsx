import { useEffect, useRef, useState } from 'react';

export default function CircuitLines() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!svgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      preserveAspectRatio="none"
      style={{ zIndex: 0 }}
    >
      {/* Left branch */}
      <path
        d="M 50% 15% L 25% 30% L 25% 55%"
        fill="none"
        stroke="#635BFF"
        strokeWidth="1"
        opacity="0.1"
        strokeDasharray="6 12"
        className={visible ? 'animate-circuit-pulse' : ''}
        style={{ animationDelay: '1s' }}
      />

      {/* Right branch */}
      <path
        d="M 50% 40% L 75% 55% L 75% 80%"
        fill="none"
        stroke="#FF3B8B"
        strokeWidth="1"
        opacity="0.08"
        strokeDasharray="6 12"
        className={visible ? 'animate-circuit-pulse' : ''}
        style={{ animationDelay: '2s' }}
      />

      {/* Secondary left branch */}
      <path
        d="M 25% 55% L 15% 70%"
        fill="none"
        stroke="#FF6B00"
        strokeWidth="1"
        opacity="0.06"
        strokeDasharray="4 10"
        className={visible ? 'animate-circuit-pulse' : ''}
        style={{ animationDelay: '2.5s' }}
      />

      {/* Junction dots */}
      <circle
        cx="50%"
        cy="15%"
        r="2.5"
        fill="#635BFF"
        opacity={visible ? '0.2' : '0'}
        className="transition-opacity duration-1000"
      />
      <circle
        cx="25%"
        cy="30%"
        r="2.5"
        fill="#635BFF"
        opacity={visible ? '0.15' : '0'}
        className="transition-opacity duration-1000"
        style={{ transitionDelay: '0.5s' }}
      />
      <circle
        cx="50%"
        cy="40%"
        r="2.5"
        fill="#7B61FF"
        opacity={visible ? '0.2' : '0'}
        className="transition-opacity duration-1000"
        style={{ transitionDelay: '1s' }}
      />
      <circle
        cx="25%"
        cy="55%"
        r="2"
        fill="#FF3B8B"
        opacity={visible ? '0.15' : '0'}
        className="transition-opacity duration-1000"
        style={{ transitionDelay: '1.5s' }}
      />
      <circle
        cx="75%"
        cy="55%"
        r="2.5"
        fill="#FF3B8B"
        opacity={visible ? '0.18' : '0'}
        className="transition-opacity duration-1000"
        style={{ transitionDelay: '2s' }}
      />
      <circle
        cx="75%"
        cy="80%"
        r="2"
        fill="#FF6B00"
        opacity={visible ? '0.15' : '0'}
        className="transition-opacity duration-1000"
        style={{ transitionDelay: '2.5s' }}
      />
      <circle
        cx="15%"
        cy="70%"
        r="2"
        fill="#FF6B00"
        opacity={visible ? '0.12' : '0'}
        className="transition-opacity duration-1000"
        style={{ transitionDelay: '3s' }}
      />
    </svg>
  );
}
