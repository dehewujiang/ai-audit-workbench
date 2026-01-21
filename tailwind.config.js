/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  // FIX: Added tailwindcss/typography plugin to support 'prose' classes.
  plugins: [
    require('@tailwindcss/typography'),
  ],
}