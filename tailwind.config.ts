import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // surfaces — deep, slightly warm charcoal
        bg: "#0b0c0e",
        surface: "#131419",
        "surface-2": "#1a1c22",
        "surface-3": "#22242c",
        border: "#2b2d36",
        "border-soft": "#202128",
        // ink
        ink: "#ece9e3",
        "ink-dim": "#9a9ca6",
        "ink-faint": "#5f626c",
        // signature ember accent — "ship it"
        ember: "#ff6a3d",
        "ember-bright": "#ff8159",
        "ember-dim": "#bd4d2b",
        // status
        live: "#3ddc84",
        "live-dim": "#1d6b41",
        warn: "#f6b352",
        down: "#ff5d6e",
        info: "#6aa3ff",
        violet: "#a78bfa",
      },
      fontFamily: {
        display: ['"Clash Display"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Switzer"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 32px -16px rgba(0,0,0,0.7)",
        glow: "0 0 0 1px rgba(255,106,61,0.25), 0 8px 30px -8px rgba(255,106,61,0.35)",
        lift: "0 18px 50px -24px rgba(0,0,0,0.85)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(61,220,132,0.45)" },
          "70%": { boxShadow: "0 0 0 6px rgba(61,220,132,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(61,220,132,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.15" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        blink: "blink 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
