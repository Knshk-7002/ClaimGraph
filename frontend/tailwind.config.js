/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0f1115',
          panel: '#161922',
          panel2: '#1d212c',
        },
        border: '#2a2f3d',
        accent: '#5b9cff',
        good: '#4ade80',
        bad: '#f87171',
        warn: '#fbbf24',
      },
    },
  },
  plugins: [],
}
