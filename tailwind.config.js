/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Sans"', 'system-ui', 'sans-serif'],
        display: ['"Geist Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'hero': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
        'h1': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        'h3': ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      colors: {
        brand: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#C4B5FD',
          300: '#A78BFA',
          400: '#8B5CF6',
          500: '#635BFF',
          600: '#5046E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        navy: {
          900: '#0A2540',
          800: '#132D4F',
          700: '#1C3D66',
        },
        mint: {
          400: '#80E9FF',
          500: '#5CE1E6',
        },
        accent: {
          purple: '#7B61FF',
          lime: '#86EF5A',
          pink: '#FF3B8B',
          orange: '#FF6B00',
        },
      },
      boxShadow: {
        'card': '0 2px 5px -1px rgba(50,50,93,0.25), 0 1px 3px -1px rgba(0,0,0,0.3)',
        'card-hover': '0 13px 27px -5px rgba(50,50,93,0.25), 0 8px 16px -8px rgba(0,0,0,0.3)',
        'glow-purple': '0 0 20px rgba(99, 91, 255, 0.3)',
        'glow-warm': '0 0 20px rgba(255, 107, 0, 0.2)',
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-out': 'toastOut 0.3s ease-in forwards',
        'stagger-fade-up': 'staggerFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'count-up': 'countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'expand-height': 'expandHeight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'spin-slow': 'spin 6s linear infinite',
        'circuit-draw': 'circuitDraw 3s ease-out forwards',
        'circuit-pulse': 'circuitPulse 4s ease-in-out infinite',
        'wave': 'wave 1.8s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        toastIn: {
          '0%': { transform: 'translateY(100%) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        toastOut: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(100%) scale(0.95)', opacity: '0' },
        },
        staggerFadeUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        expandHeight: {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '500px', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        circuitDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        circuitPulse: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.7' },
        },
        wave: {
          '0%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(14deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '30%': { transform: 'rotate(14deg)' },
          '40%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(10deg)' },
          '60%, 100%': { transform: 'rotate(0deg)' },
        },
        'travel-down': {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        'travel-right': {
          '0%': { left: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
