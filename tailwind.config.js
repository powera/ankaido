/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Only scan Math Games files for Tailwind classes
    "./react/Activities/MiniGames/*.{js,ts,jsx,tsx}",
    "./react/Activities/MathGamesActivity.jsx",
  ],
  theme: {
    extend: {
      // Keep minimal theme extensions
    },
  },
  plugins: [],
  // Disable preflight (base styles) to avoid conflicts with your existing CSS
  corePlugins: {
    preflight: false,
  },
}