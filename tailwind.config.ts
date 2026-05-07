import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        rv: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
          border: "var(--color-border)",
          text: "var(--color-text)",
          "text-soft": "var(--color-text-soft)",
          "text-muted": "var(--color-text-muted)",
          primary: "var(--color-primary)",
          "primary-dark": "var(--color-primary-dark)",
          "primary-soft": "var(--color-primary-soft)",
          accent: "var(--color-accent)",
          "accent-soft": "var(--color-accent-soft)",
          highlight: "var(--color-highlight)",
          "highlight-soft": "var(--color-highlight-soft)",
          error: "var(--color-error)",
          "error-soft": "var(--color-error-soft)"
        }
      },
      borderRadius: {
        rvsm: "var(--radius-sm)",
        rvmd: "var(--radius-md)",
        rvlg: "var(--radius-lg)"
      },
      boxShadow: {
        rvsm: "var(--shadow-sm)",
        rvmd: "var(--shadow-md)"
      },
      fontFamily: {
        title: ["var(--font-title)"],
        body: ["var(--font-body)"]
      }
    }
  },
  plugins: []
};

export default config;
