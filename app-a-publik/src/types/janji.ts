import type { PihakJanji, StatusJanji } from "@/lib/janji/aturan";

/**
 * Dokumen `janjiTemu/{id}` — janji temu tatap muka siswa ↔ Guru BK.
 *
 * Disimpan di koleksi tingkat atas (bukan subkoleksi tiket) supaya kalender
 * bisa mengambil "semua janji minggu ini" dengan satu query rentang waktu.
 * Isinya sengaja minim: tidak ada judul/isi curhatan. App B (Super Admin)
 * membaca koleksi ini HANYA untuk jam & nama Guru BK, tanpa `kodeTiket`.
 */
export interface JanjiTemuDoc {
  kodeTiket: string;
  waktuMulaiMs: number;
  durasiMenit: number;
  tempat: string;
  status: StatusJanji;
  /** Siapa yang ditunggu jawabannya selagi status "menunggu". */
  menungguPihak: PihakJanji | null;
  diusulkanOleh: PihakJanji;
  /** Pesan singkat dari pihak yang terakhir mengusulkan waktu. */
  catatan: string;
  /** Guru BK yang mengonfirmasi / mengusulkan. */
  guru: { uid: string; nama: string } | null;
  dibuatMs: number;
  diperbaruiMs: number;
  /** Diisi saat status "dibatalkan". */
  dibatalkanOleh?: PihakJanji;
}

/** Bentuk yang dikirim ke komponen klien. */
export interface JanjiTemu extends JanjiTemuDoc {
  id: string;
}

/** Ringkasan untuk daftar "janji hari ini" di panel Guru BK. */
export interface JanjiRingkas {
  id: string;
  kodeTiket: string;
  waktuMulaiMs: number;
  status: JanjiTemuDoc["status"];
  menungguPihak: PihakJanji | null;
  guruNama: string | null;
}
