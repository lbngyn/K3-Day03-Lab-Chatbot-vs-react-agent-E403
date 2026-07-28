/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        thought: {
          bg: '#fef3c7',
          text: '#d97706',
          border: '#fde68a'
        },
        action: {
          bg: '#eef2ff',
          text: '#4f46e5',
          border: '#c7d2fe'
        },
        observation: {
          bg: '#ecfdf5',
          text: '#059669',
          border: '#a7f3d0'
        },
        guardrail: {
          bg: '#ffe4e6',
          text: '#e11d48',
          border: '#fecdd3'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
