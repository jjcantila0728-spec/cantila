/* ============================================================
   Cantila brand — Tailwind theme.extend partial
   ------------------------------------------------------------
   Vendored from ../../brand/tokens/tailwind.partial.ts so the
   Console can build standalone (Coolify clones only this repo,
   not the cantila monorepo). Keep in sync with the canonical
   copy in cantila/brand/tokens/tailwind.partial.ts.
   ============================================================ */

export const cantilaTheme = {
  colors: {
    bg: "#0b0c0e",
    surface: "#131419",
    "surface-2": "#1a1c22",
    "surface-3": "#22242c",
    border: "#2b2d36",
    "border-soft": "#202128",
    ink: "#ece9e3",
    "ink-dim": "#9a9ca6",
    "ink-faint": "#5f626c",
    ember: "#ff6a3d",
    "ember-bright": "#ff8159",
    "ember-dim": "#bd4d2b",
    "ember-on-light": "#d44e21",
    "ember-ink": "#1a0e08",
    live: "#3ddc84",
    "live-dim": "#1d6b41",
    warn: "#f6b352",
    down: "#ff5d6e",
    info: "#6aa3ff",
    violet: "#a78bfa",
    "light-bg": "#fbfaf7",
    "light-surface": "#f4f1ea",
    "light-surface-2": "#eae6dd",
    "light-ink": "#1a1c22",
    "light-ink-dim": "#4a4d57",
    "light-ink-faint": "#9a9ca6",
    "light-border": "#dcd6c9",
    "light-border-soft": "#e8e2d4",
  },
  fontFamily: {
    display: ['"Clash Display"', "ui-sans-serif", "system-ui", "sans-serif"],
    sans: ['"Switzer"', "ui-sans-serif", "system-ui", "sans-serif"],
    mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
  },
  fontSize: {
    "2xs": ["0.6875rem", { lineHeight: "1rem" }] as [string, { lineHeight: string }],
    hero: ["3.5rem", { lineHeight: "1.05" }] as [string, { lineHeight: string }],
  },
  letterSpacing: {
    "cantila-tight": "-0.012em",
    "cantila-tighter": "-0.015em",
    "cantila-display": "-0.02em",
    "cantila-kv": "0.14em",
  },
  borderRadius: {
    xl: "0.875rem",
    "2xl": "1.125rem",
  },
  boxShadow: {
    panel:
      "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 32px -16px rgba(0,0,0,0.7)",
    glow:
      "0 0 0 1px rgba(255,106,61,0.25), 0 8px 30px -8px rgba(255,106,61,0.35)",
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
};

export default cantilaTheme;
