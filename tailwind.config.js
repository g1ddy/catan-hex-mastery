/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: '#f3e5ab',
        'token-beige': '#f3e5ab',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}
