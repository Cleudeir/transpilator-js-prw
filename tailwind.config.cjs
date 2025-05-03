/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/styles/index.css",
    // "./node_modules/flowbite/**/*.js" // Temporarily removed
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // require('flowbite/plugin') // Temporarily removed
  ],
} 