import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#ffffff",
        panel: "#fafafa",
        soft: "#f7f7f7",
        line: "#dedede",
        ink: "#101010",
        muted: "#666666",
        faint: "#8a8a8a",
        brand: {
          50: "#f7f7f7",
          100: "#eeeeee",
          200: "#dedede",
          300: "#c4c4c4",
          400: "#8a8a8a",
          500: "#333333",
          600: "#101010",
          700: "#000000",
          800: "#000000",
          900: "#000000",
          950: "#000000",
        },
        surface: {
          900: "#0a0a0f",
          800: "#111118",
          700: "#18181f",
          600: "#1e1e28",
          500: "#25252f",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "pulse-bar": "pulseBar 1.2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseBar: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
