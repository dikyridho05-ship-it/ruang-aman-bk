/**
 * Pemformat waktu berzona tetap untuk App B.
 *
 * Panel ini berjalan di Vercel, yang jam mesinnya UTC. Sebelum modul ini
 * ada, semua tanggal/jam diformat dengan `toLocaleString("id-ID")` tanpa
 * menyebut zona, artinya mengikuti zona MESIN PERENDER:
 * - Audit log & "run terakhir retensi" dirender di server, jadi jamnya
 *   tertulis 7 jam lebih awal dari kenyataan dan tidak pernah dikoreksi
 *   browser — Super Admin membaca pukul 06.00 untuk kejadian pukul 13.00.
 * - Tanggal hari ini di topbar ikut mundur satu hari sepanjang 00.00–07.00
 *   WIB, karena di UTC saat itu masih hari kemarin.
 * - Daftar curhatan dirender di server lalu dihidrasi di browser, jadi
 *   tanggalnya bisa berbeda antara keduanya (hydration mismatch).
 *
 * Kembarannya ada di app-a-publik/src/lib/waktu.ts. Keduanya sengaja
 * berdiri sendiri karena App A & App B adalah dua aplikasi Next.js
 * terpisah tanpa paket bersama.
 */
export const ZONA_WAKTU_SEKOLAH = "Asia/Jakarta";

const fmtTanggalWaktu = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WAKTU_SEKOLAH,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const fmtTanggalPendek = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WAKTU_SEKOLAH,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const fmtTanggalLengkap = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WAKTU_SEKOLAH,
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Tanggal + jam waktu sekolah, mis. "22 Sep 2026, 20.49". */
export function tanggalWaktu(ms: number): string {
  return fmtTanggalWaktu.format(new Date(ms));
}

/** Tanggal ringkas, mis. "22 Sep 2026". */
export function tanggalPendek(ms: number): string {
  return fmtTanggalPendek.format(new Date(ms));
}

/** Tanggal lengkap berhari, mis. "Selasa, 22 September 2026". */
export function tanggalLengkap(ms: number): string {
  return fmtTanggalLengkap.format(new Date(ms));
}
