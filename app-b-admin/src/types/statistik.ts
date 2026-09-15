/**
 * Kategori & mood curhatan — App B tidak mengimpor apa pun dari App A (dua
 * aplikasi Next.js yang sepenuhnya terpisah, lihat catatan di
 * lib/firebase/admin.ts), jadi daftar ini sengaja diduplikasi persis dari
 * app-a-publik/src/types/ticket.ts. Kalau kategori/mood berubah di sana,
 * ubah juga di sini.
 */
export const KATEGORI_CURHAT = [
  "akademik",
  "bullying",
  "keluarga",
  "percintaan",
  "teman",
  "kesehatan_mental",
  "kekerasan",
  "lainnya",
] as const;

export type KategoriCurhat = (typeof KATEGORI_CURHAT)[number];

export const KATEGORI_CURHAT_LABEL: Record<KategoriCurhat, string> = {
  akademik: "Akademik",
  bullying: "Bullying",
  keluarga: "Keluarga",
  percintaan: "Percintaan",
  teman: "Pertemanan",
  kesehatan_mental: "Kesehatan Mental",
  kekerasan: "Kekerasan",
  lainnya: "Lainnya",
};

/** Sama seperti KATEGORI_PRIORITAS di App A (TAHAP 6) — dipakai untuk kartu "Prioritas aktif". */
export const KATEGORI_PRIORITAS: readonly KategoriCurhat[] = ["kekerasan", "kesehatan_mental"];

/** Sama seperti MAKS_KATEGORI di App A — satu curhatan boleh punya sampai 3 kategori. */
export const MAKS_KATEGORI = 3;

/**
 * Salinan normalizeKategori() dari App A (types/ticket.ts) — lihat catatan di
 * atas soal kenapa daftar ini diduplikasi, bukan diimpor.
 *
 * Tiket yang dibuat sebelum revisi multi-kategori menyimpan `kategori` sebagai
 * string tunggal di Firestore, jadi statistik WAJIB membacanya lewat sini
 * supaya angka tiket lama tidak hilang dari grafik.
 */
export function normalizeKategori(raw: unknown): KategoriCurhat[] {
  const daftar = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const hasil: KategoriCurhat[] = [];

  for (const item of daftar) {
    if (typeof item !== "string") continue;
    if (!(KATEGORI_CURHAT as readonly string[]).includes(item)) continue;
    const kategori = item as KategoriCurhat;
    if (hasil.includes(kategori)) continue;
    hasil.push(kategori);
    if (hasil.length >= MAKS_KATEGORI) break;
  }

  return hasil;
}

export const MOOD_OPTIONS = ["senang", "sedih", "cemas", "marah", "bingung", "lelah"] as const;

export type Mood = (typeof MOOD_OPTIONS)[number];

export const MOOD_LABEL: Record<Mood, string> = {
  senang: "Senang",
  sedih: "Sedih",
  cemas: "Cemas",
  marah: "Marah",
  bingung: "Bingung",
  lelah: "Lelah",
};

export const MOOD_EMOJI: Record<Mood, string> = {
  senang: "😊",
  sedih: "😢",
  cemas: "😰",
  marah: "😠",
  bingung: "😕",
  lelah: "😩",
};

export type TicketStatus = "baru" | "dibaca" | "dibalas" | "selesai";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  baru: "Baru",
  dibaca: "Dibaca",
  dibalas: "Dibalas",
  selesai: "Selesai",
};

/** Satu titik pada tren bulanan — `bulan` dipakai sebagai key sort ("2026-09"), `label` untuk tampilan ("Sep 2026"). */
export interface TrenBulanan {
  bulan: string;
  label: string;
  jumlah: number;
}

/**
 * Hasil agregasi statistik anonim — TIDAK ADA field identitas apa pun
 * (bukan judul, bukan namaSamaran, bukan kode konseling per-siswa). Murni
 * angka hitung, sesuai janji spesifikasi awal "statistik jenis masalah
 * tanpa identitas" untuk kepala sekolah (TAHAP 7).
 */
export interface StatistikCurhatan {
  totalKeseluruhan: number;
  total30HariTerakhir: number;
  prioritasAktif: number;
  perKategori: Record<KategoriCurhat, number>;
  perMood: Record<Mood, number>;
  perStatus: Record<TicketStatus, number>;
  trenBulanan: TrenBulanan[];
  dibuatPada: number;
}
