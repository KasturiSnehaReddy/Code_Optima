/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-teal': '#008080',
        'custom-teal-dark': '#006666',
        'custom-gray': '#808080',
        'custom-gray-dark': '#666666',
        'custom-white': '#ffffff',
        'custom-light-gray': '#f5f5f5',
        'custom-border': '#e0e0e0',
      }
    },
  },
  plugins: [],
}