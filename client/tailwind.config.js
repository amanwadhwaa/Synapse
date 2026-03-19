/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Instrument Serif', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Cascadia Code', 'ui-monospace', 'monospace'],
      },
      colors: {
        synapse: {
          bg: '#030303',
          card: '#080808',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
          emerald: '#10B981',
        },
      },
      animation: {
        'float': 'float-orb 8s ease-in-out infinite',
        'float-slow': 'float-orb 12s ease-in-out infinite',
        'float-slower': 'float-orb 15s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'spin-border': 'spin-border 4s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'snappy': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
}