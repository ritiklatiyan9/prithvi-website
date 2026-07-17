import type { Config } from "tailwindcss";

// Tokens mirror prithivi-app/lib/theme/app_colors.dart (design system v4):
// graphite-navy base + ONE neon-green accent gradient; coin gold for coin
// glyphs only; flat semantic danger.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgtop: "#10151F",
        bgbottom: "#0A0E17",
        surface: { DEFAULT: "#151C2C", alt: "#1C2438" },
        hairline: "rgba(148,163,184,0.14)",
        accent: { DEFAULT: "#05FF08", deep: "#00C853" },
        onaccent: "#041A06",
        ink: { DEFAULT: "#F1F5F9", soft: "#94A3B8", muted: "#64748B" },
        coin: "#EAB308",
        danger: "#F87171",
      },
      fontFamily: {
        display: ['"Chakra Petch"', "system-ui", "sans-serif"],
        numbers: ["Orbitron", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "22px" },
      boxShadow: {
        glow: "0 0 24px -2px rgba(5, 255, 8, 0.25)",
        "glow-sm": "0 0 16px -4px rgba(5, 255, 8, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
