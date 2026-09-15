import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palet netral & menenangkan — cocok untuk konteks konseling.
        // Sesuaikan nanti dengan warna identitas sekolah (TAHAP 3/5).
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
      },
      keyframes: {
        // Getaran pendek untuk penanda "maks 3" saat siswa menekan kategori
        // berlebih. Amplitudonya kecil (3px) & sekali jalan — tujuannya
        // memberi tahu "tidak bisa", bukan menarik perhatian terus-menerus.
        getar: {
          "0%, 100%": { transform: "translateX(0)" },
          "15%, 45%, 75%": { transform: "translateX(-3px)" },
          "30%, 60%, 90%": { transform: "translateX(3px)" },
        },
      },
      animation: {
        getar: "getar 0.45s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
