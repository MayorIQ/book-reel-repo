import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      colors: {
        sand: {
          50: '#fffbf5',
          100: '#fff5e6',
          200: '#ffe8c8',
          300: '#f5d4a0',
          400: '#e8c07a',
          500: '#d4af7d',
          600: '#c49a5a',
          700: '#a67c3d',
          800: '#8a6530',
          900: '#6d4f26',
          950: '#3d2a14',
        },
        warm: {
          50: '#fdf8f3',
          100: '#f5ebe0',
          200: '#e8d5c0',
          300: '#d4b896',
          400: '#c49d70',
          500: '#b08050',
          600: '#946840',
          700: '#7a5535',
          800: '#5f422a',
          900: '#3d2a1c',
          950: '#2a1c12',
        },
        concrete: {
          50: '#fafaf9',
          100: '#f0efed',
          200: '#dddbd7',
          300: '#c5c2bc',
          400: '#a8a49c',
          500: '#8a857c',
          600: '#706b63',
          700: '#5a5650',
          800: '#45423e',
          900: '#302e2b',
          950: '#1a1917',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
export default config

