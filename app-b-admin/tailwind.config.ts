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
        // 100/200/300/800 ditambahkan menyusul: kelas bg-admin-100,
        // bg-admin-200, hover:border-admin-300, dan text-admin-800 sudah
        // dipakai di topbar, kalender, dan halaman statistik, tapi
        // nuansanya tidak pernah ada di sini — Tailwind tidak menghasilkan
        // CSS untuk kelas yang tidak terdefinisi, jadi avatar di topbar
        // tampil tanpa latar & tanpa warna huruf sama sekali. Nilainya
        // mengikuti tangga "violet" yang sama dengan nuansa yang ada.
        admin: {
          50: "#faf5ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
