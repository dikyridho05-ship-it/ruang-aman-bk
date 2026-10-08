import type { Config } from "tailwindcss";
import { WARNA_BRAND } from "./src/lib/constants/warna";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: WARNA_BRAND,
        // Navy tinta — warna teks judul & elemen tegas, satu keluarga dengan
        // biru sky brand (dan sama dengan warna utama dasbor Super Admin).
        tinta: {
          DEFAULT: "#0c2340",
          soft: "#3b5574",
        },
        kertas: "#f4f7fa",
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
