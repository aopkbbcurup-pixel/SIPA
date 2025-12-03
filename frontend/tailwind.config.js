/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#047857", // Emerald 700
          light: "#10b981",   // Emerald 500
          dark: "#064e3b",    // Emerald 900
        },
        accent: {
          DEFAULT: "#f97316", // Orange 500
          hover: "#ea580c",   // Orange 600
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
