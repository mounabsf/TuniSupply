/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f4f8f7",                                  // --bg
        brun: "#25343b",                                   // --text
        rouille: { DEFAULT: "#0f9d78", dark: "#0b7a5d" },  // --primary / --primary-dark
        danger: "#e5484d",
        success: "#2f9e44",
      },
      fontFamily: {
        display: ['"Segoe UI"', "system-ui", "sans-serif"],
        sans: ['"Segoe UI"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};