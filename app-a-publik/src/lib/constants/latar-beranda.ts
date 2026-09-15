/**
 * Seberapa samar foto gedung sekolah tampil di belakang Beranda.
 *
 * 25% dipilih supaya foto masih jelas terbaca sebagai gedung sekolah, tapi
 * kontras teks di atasnya (slate-900 di atas slate-50) tetap jauh di atas
 * ambang WCAG AA.
 *
 * PENTING — nilai ini SENGAJA diduplikasi di:
 *   app-b-admin/src/lib/constants/latar-beranda.ts (pratinjau admin)
 *
 * Kedua app tidak berbagi package, jadi tidak ada single source of truth
 * yang benar-benar bisa diimpor lintas app. Kalau nilai ini diubah di satu
 * tempat, WAJIB ubah di tempat lain juga — kalau tidak, pratinjau admin
 * akan beda dengan tampilan asli.
 */
export const OPASITAS_LATAR_BERANDA = 0.25;
