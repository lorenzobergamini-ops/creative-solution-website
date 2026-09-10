import type { Config } from "tailwindcss";

/**
 * Tailwind CSS configuration — Creative Solution design system.
 *
 * Every color below maps to a CSS custom property defined in
 * src/app/globals.css. This keeps the design system in one place and lets
 * the accent color be overridden at runtime (see layout.tsx and the README,
 * section "Decisioni tecniche e default" > Accent color).
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        accent: "var(--accent)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;