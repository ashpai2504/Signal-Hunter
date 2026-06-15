import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand accents
        hunter: "#00843D", // Hunter Industries green
        fx: "#C8A24B", // FX Luminaire warm gold
        lumascape: "#1F6FEB", // Lumascape architectural blue
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
