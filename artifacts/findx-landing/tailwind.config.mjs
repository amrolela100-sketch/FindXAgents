/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Moclaw monochrome primary palette — white/grey scale
        primary: {
          DEFAULT: "#ffffff",
          hover:   "oklch(0.9 0 0)",
          light:   "oklch(0.85 0 0)",
          50:  "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          400: "#A1A1AA",
          500: "#71717A",
          600: "#52525B",
          700: "#3F3F46",
          800: "#27272A",
          900: "#18181B",
        },
        // Amber kept as accent / warning only
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
        },
      },
      fontFamily: {
        sans:  ["Inter", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      animation: {
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-up":   "fadeUp 0.6s ease forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
