/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F1117",
        card: "#1A1D2E",
        accent: "#6366F1",
        gold: "#EFBF04",
        success: "#22C55E",
        danger: "#EF4444",
      }
    },
  },
  plugins: [],
}