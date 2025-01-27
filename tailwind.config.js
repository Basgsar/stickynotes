/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      transitionTimingFunction: {
        'bounce-custom': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      boxShadow: {
        'inner-custom': 'inset 1px 1px 2px rgba(255,255,255,0.95), inset -1px -1px 2px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
}