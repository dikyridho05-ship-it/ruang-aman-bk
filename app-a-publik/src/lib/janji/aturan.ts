/**
 * Aturan janji temu tatap muka — logika MURNI (tanpa Firestore), supaya
 * bisa diuji langsung (lihat scripts/uji-janji.ts) dan dipakai bersama
 * oleh Server Actions siswa & Guru BK.
 *
 * Semua perhitungan jam memakai waktu sekolah (WIB, UTC+7) secara
 * eksplisit, bukan zona waktu mesin: server Vercel berjalan di UTC, jadi
 * `new Date().getDay()` di sana bisa menunjuk hari KEMARIN antara pukul
 * 00.00–07.00 WIB.
 */
import { HARI_LIBUR_NASIONAL_2026, CUTI_BERSAMA_2026 } from "@/lib/kalender/data-nasional";

export const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

/** Jam layanan sama dengan JamLayananBadge: Senin–Jumat 07.30–15.30. */
export const JAM_MULAI_MENIT = 7 * 60 + 30;
export const JAM_SELESAI_MENIT = 15 * 60 + 30;
export const DURASI_JANJI_MENIT = 30;

/** Berapa hari sekolah ke depan yang bisa dipilih. */
export const JUMLAH_HARI_PILIHAN = 10;

/** Jarak minimal dari sekarang ke slot paling awal yang boleh dipilih. */
export const JEDA_MINIMAL_MS = 2 * 60 * 60 * 1000;

export const HARI_KEY = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"] as const;
export type HariKey = (typeof HARI_KEY)[number];

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Tanggal yang sekolah pasti tutup (libur nasional + cuti bersama). */
export const TANGGAL_LIBUR: ReadonlySet<string> = new Set(
  [...HARI_LIBUR_NASIONAL_2026, ...CUTI_BERSAMA_2026].map((e) => e.tanggal)
);

/** Bagian-bagian tanggal WIB dari epoch ms. */
export function bagianWib(ms: number) {
  const d = new Date(ms + OFFSET_WIB_MS);
  return {
    tahun: d.getUTCFullYear(),
    bulan: d.getUTCMonth() + 1,
    tanggal: d.getUTCDate(),
    hari: d.getUTCDay(),
    menit: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

/** "YYYY-MM-DD" menurut WIB. */
export function kunciTanggalWib(ms: number): string {
  const b = bagianWib(ms);
  return `${b.tahun}-${String(b.bulan).padStart(2, "0")}-${String(b.tanggal).padStart(2, "0")}`;
}

/** Epoch ms untuk tanggal & menit-sejak-tengah-malam WIB tertentu. */
export function msDariWib(tahun: number, bulan: number, tanggal: number, menit: number): number {
  return Date.UTC(tahun, bulan - 1, tanggal, 0, menit) - OFFSET_WIB_MS;
}

/** Hari (minggu..sabtu) menurut WIB — pengganti `new Date().getDay()` di server. */
export function hariWib(ms: number): HariKey {
  return HARI_KEY[bagianWib(ms).hari];
}

/** "Selasa, 14 Okt" */
export function labelTanggalJanji(ms: number): string {
  const b = bagianWib(ms);
  return `${NAMA_HARI[b.hari]}, ${b.tanggal} ${NAMA_BULAN[b.bulan - 1]}`;
}

/** "10.30" */
export function labelJamJanji(ms: number): string {
  const { menit } = bagianWib(ms);
  return `${String(Math.floor(menit / 60)).padStart(2, "0")}.${String(menit % 60).padStart(2, "0")}`;
}

/** "Selasa, 14 Okt, 10.30–11.00" */
export function labelWaktuJanji(ms: number): string {
  return `${labelTanggalJanji(ms)}, ${labelJamJanji(ms)}–${labelJamJanji(ms + DURASI_JANJI_MENIT * 60_000)}`;
}

export interface HariLayanan {
  kunci: string;
  label: string;
  /** Awal setiap slot 30 menit (epoch ms) yang belum lewat. */
  slot: number[];
}

/**
 * Daftar hari yang bisa dipilih untuk janji temu.
 *
 * @param hariAdaPiket hari yang punya Guru BK piket. `null` = jadwal piket
 *   belum diatur sama sekali, jadi semua hari kerja dianggap ada layanan
 *   (supaya fitur tetap bisa dipakai sekolah yang belum mengisi jadwal).
 */
export function daftarHariLayanan(
  sekarangMs: number,
  hariAdaPiket: ReadonlySet<HariKey> | null,
  libur: ReadonlySet<string> = TANGGAL_LIBUR,
  jumlahHari = JUMLAH_HARI_PILIHAN
): HariLayanan[] {
  const hasil: HariLayanan[] = [];
  const awal = bagianWib(sekarangMs);
  // Batas aman 40 hari kalender supaya tidak berputar selamanya kalau
  // (misalnya) piket cuma diisi hari Minggu.
  for (let i = 0; i < 40 && hasil.length < jumlahHari; i++) {
    const tengahMalam = msDariWib(awal.tahun, awal.bulan, awal.tanggal + i, 0);
    const b = bagianWib(tengahMalam);
    if (b.hari === 0 || b.hari === 6) continue;
    const kunci = kunciTanggalWib(tengahMalam);
    if (libur.has(kunci)) continue;
    if (hariAdaPiket && !hariAdaPiket.has(HARI_KEY[b.hari])) continue;

    const slot: number[] = [];
    for (let m = JAM_MULAI_MENIT; m + DURASI_JANJI_MENIT <= JAM_SELESAI_MENIT; m += DURASI_JANJI_MENIT) {
      const ms = tengahMalam + m * 60_000;
      if (ms >= sekarangMs + JEDA_MINIMAL_MS) slot.push(ms);
    }
    if (slot.length > 0) hasil.push({ kunci, label: labelTanggalJanji(tengahMalam), slot });
  }
  return hasil;
}

/** Apakah `ms` persis salah satu slot sah saat ini (dipakai validasi server). */
export function slotSah(
  ms: number,
  sekarangMs: number,
  hariAdaPiket: ReadonlySet<HariKey> | null,
  libur: ReadonlySet<string> = TANGGAL_LIBUR
): boolean {
  return daftarHariLayanan(sekarangMs, hariAdaPiket, libur).some((h) => h.slot.includes(ms));
}

// ---------- status ----------

export type StatusJanji = "menunggu" | "dikonfirmasi" | "dibatalkan" | "selesai" | "tidak-hadir";
export type PihakJanji = "siswa" | "guru";

/** Janji yang masih "hidup" — memblokir slot & menahan tiket punya janji aktif. */
export function janjiMasihAktif(status: StatusJanji): boolean {
  return status === "menunggu" || status === "dikonfirmasi";
}
