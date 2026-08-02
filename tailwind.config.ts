import type { Config } from "tailwindcss";

// Tokens mirror prithivi-app/lib/theme/app_colors.dart (design system v5):
// near-black graphite base + ONE deep-azure accent gradient; the blue lives in
// the accent only, never in surfaces or body text. Coin gold for coin glyphs
// only; flat semantic danger.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgtop: "#0A0E14",
        bgbottom: "#05070B",
        surface: { DEFAULT: "#0C1017", alt: "#141922" },
        hairline: "rgba(160,166,174,0.14)",
        accent: { DEFAULT: "#2472C4", deep: "#14539B" },
        onaccent: "#F2F6FA",
        ink: { DEFAULT: "#EDEFF2", soft: "#98A0AB", muted: "#6B727C" },
        coin: "#EAB308",
        danger: "#F87171",
      },
      fontFamily: {
        display: ['"Chakra Petch"', "system-ui", "sans-serif"],
        numbers: ["Orbitron", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "22px" },
      boxShadow: {
        glow: "0 0 24px -2px rgba(36, 114, 196, 0.3)",
        "glow-sm": "0 0 16px -4px rgba(36, 114, 196, 0.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
