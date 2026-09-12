import type { Config } from "tailwindcss";

// Shared warm light palette and bundled Manrope typography.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgtop: "#FFFEFC",
        bgbottom: "#FAF9F7",
        surface: { DEFAULT: "#FFFFFF", alt: "#F5F3EF" },
        hairline: "#D6D1C9",
        accent: { DEFAULT: "#C7501B", deep: "#A93D13" },
        onaccent: "#F2F6FA",
        ink: { DEFAULT: "#242320", soft: "#65615C", muted: "#77716A" },
        coin: "#EAB308",
        danger: "#B83232",
      },
      fontFamily: {
        display: ['"Manrope"', "system-ui", "sans-serif"],
        numbers: ["Manrope", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "18px" },
      boxShadow: {
        glow: "0 4px 12px rgba(80, 49, 24, 0.08)",
        "glow-sm": "0 2px 8px rgba(80, 49, 24, 0.04)",
      },
    },
  },
  plugins: [],
} satisfies Config;
