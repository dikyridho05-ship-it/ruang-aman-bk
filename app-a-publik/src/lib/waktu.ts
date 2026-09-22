/**
 * Pemformat waktu yang hasilnya SAMA di server dan di browser.
 *
 * Halaman-halaman ini dirender lebih dulu di server (Vercel, jam mesinnya
 * UTC) lalu dihidrasi di perangkat guru/siswa (WIB, UTC+7). Kalau
 * formatnya mengikuti zona waktu masing-masing, teks jam yang ditulis
 * server berbeda dari yang dihitung ulang browser: React melaporkan
 * hydration mismatch, dan untuk sesaat jam yang terbaca memang salah —
 * pesan yang dikirim pukul 20.49 WIB sempat tampil sebagai 13.49.
 *
 * Seluruh pemakai aplikasi ini berada di satu sekolah di Indonesia bagian
 * barat, jadi zonanya dipatok di sini, bukan diserahkan ke setelan
 * perangkat. Kalau suatu saat dipakai sekolah di zona lain, satu konstanta
 * di bawah ini yang perlu diubah.
 */
export const ZONA_WAKTU_SEKOLAH = "Asia/Jakarta";

const fmtJam = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WAKTU_SEKOLAH,
  hour: "2-digit",
  minute: "2-digit",
});

const fmtTanggalPendek = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WAKTU_SEKOLAH,
  day: "2-digit",
  month: "short",
});

const fmtTanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WAKTU_SEKOLAH,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// "en-CA" dipilih khusus karena keluarannya YYYY-MM-DD — bentuk yang bisa
// dibandingkan langsung sebagai string untuk menentukan "hari yang sama",
// tanpa perlu mengutak-atik offset jam sendiri.
const fmtKunciHari = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_WAKTU_SEKOLAH,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Jam:menit waktu sekolah, mis. "20.49". */
export function jamSekolah(ms: number): string {
  return fmtJam.format(new Date(ms));
}

/** Tanggal ringkas, mis. "22 Sep". */
export function tanggalPendek(ms: number): string {
  return fmtTanggalPendek.format(new Date(ms));
}

/** Tanggal lengkap, mis. "22 September 2026". */
export function tanggalPanjang(ms: number): string {
  return fmtTanggalPanjang.format(new Date(ms));
}

/** Penanda hari (YYYY-MM-DD) menurut waktu sekolah — untuk perbandingan. */
export function kunciHari(ms: number): string {
  return fmtKunciHari.format(new Date(ms));
}

const SEHARI_MS = 24 * 60 * 60 * 1000;

/** "Hari ini" / "Kemarin" / tanggal lengkap — dipakai pembatas tanggal di chat. */
export function labelHari(ms: number): string {
  const kunci = kunciHari(ms);
  const sekarang = Date.now();
  if (kunci === kunciHari(sekarang)) return "Hari ini";
  if (kunci === kunciHari(sekarang - SEHARI_MS)) return "Kemarin";
  return tanggalPanjang(ms);
}
