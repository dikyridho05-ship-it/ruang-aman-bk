/**
 * Satu sumber warna brand — dipakai oleh tailwind.config.ts (kelas utility)
 * dan layout.tsx (themeColor status bar). Ubah di sini saja; keduanya ikut
 * berubah otomatis.
 */
export const WARNA_BRAND = {
  50: "#f0f9ff",
  100: "#e0f2fe",
  // 200/300/800/900 ditambahkan menyusul: kelas seperti border-brand-200,
  // hover:border-brand-300, text-brand-800, dan shadow-brand-900 sudah
  // dipakai di beberapa layar, tapi nuansanya tidak pernah ada di palet —
  // Tailwind tidak menghasilkan CSS apa pun untuk kelas yang tidak
  // terdefinisi, jadi bordernya diam-diam tampil abu-abu bawaan dan efek
  // hover-nya tidak terjadi sama sekali. Nilainya mengikuti tangga warna
  // "sky" yang sama dengan nuansa yang sudah ada di sini.
  200: "#bae6fd",
  300: "#7dd3fc",
  500: "#0ea5e9",
  600: "#0284c7",
  700: "#0369a1",
  800: "#075985",
  900: "#0c4a6e",
} as const;
