import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0c",
        panel: "#141417",
        "panel-raised": "#1b1b1f",
        border: "#26262b",
        "border-subtle": "#1e1e22",
        accent: {
          DEFAULT: "#7c6cf0",
          soft: "#5a4fd1",
          glow: "#a89bff",
        },
        text: {
          primary: "#f2f2f5",
          secondary: "#a1a1aa",
          muted: "#6b6b73",
        },
        status: {
          success: "#3ecf8e",
          warning: "#eab308",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset",
        glow: "0 0 24px rgba(124, 108, 240, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
