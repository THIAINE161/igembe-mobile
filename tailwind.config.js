/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#16a34a',
        primaryDark: '#15803d',
        primaryLight: '#dcfce7',
      }
    },
  },
  plugins: [],
}