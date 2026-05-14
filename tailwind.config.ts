import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        pulse2: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
