import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palet berbeda dari App A supaya dev/QA gampang membedakan
        // sedang membuka dashboard internal, bukan portal publik.
        admin: {
          50: "#faf5ff",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
