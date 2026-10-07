import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Plus Jakarta Sans — dirancang di Indonesia (Tokotype). Dimuat dari
        // paket npm @fontsource (lihat layout.tsx), bukan Google Fonts, jadi
        // ikut ter-bundle dan tetap tampil walau jaringan sekolah membatasi.
        sans: ['"Plus Jakarta Sans Variable"', "system-ui", "sans-serif"],
      },
      colors: {
        // Okt 2026: palet App B pindah dari ungu (violet) ke "tinta" — biru
        // navy yang satu keluarga dengan biru sky App A, supaya dua aplikasi
        // ini terasa satu produk. Nama kunci `admin` sengaja dipertahankan
        // supaya kelas lama (bg-admin-600, text-admin-700, …) ikut berganti
        // warna tanpa harus diubah satu per satu.
        admin: {
          50: "#f1f6fb",
          100: "#e1ecf6",
          200: "#c3d7ea",
          300: "#93b6d6",
          400: "#5f8fbd",
          500: "#2f6ea6",
          600: "#1d5a8f",
          700: "#164873",
          800: "#10365a",
          900: "#0c2340",
        },
        // Biru sky App A — dipakai di App B hanya untuk aksen kecil (titik
        // status, sorotan hari ini di kalender) supaya ada benang merah.
        langit: {
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        kertas: "#f4f7fa",
      },
    },
  },
  plugins: [],
};

export default config;
