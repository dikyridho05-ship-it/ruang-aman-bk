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
