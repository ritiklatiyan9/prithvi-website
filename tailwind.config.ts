import type { Config } from "tailwindcss";

// Tokens mirror prithivi-app/lib/theme/app_colors.dart (design system v5):
// Ludo navy base + ONE cyan-to-royal-blue accent gradient; coin gold for
// coin glyphs only; flat semantic danger.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgtop: "#0C2E61",
        bgbottom: "#071A3D",
        surface: { DEFAULT: "#0D2857", alt: "#123B72" },
        hairline: "rgba(148,163,184,0.14)",
        accent: { DEFAULT: "#67D6FF", deep: "#1689E8" },
        onaccent: "#061A32",
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
        glow: "0 0 24px -2px rgba(103, 214, 255, 0.25)",
        "glow-sm": "0 0 16px -4px rgba(103, 214, 255, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
