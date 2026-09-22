import type { Timestamp } from "firebase-admin/firestore";

/**
 * Kategori masalah yang bisa dipilih siswa saat curhat.
 * Dipakai juga nanti untuk statistik anonim (tanpa identitas) di App B.
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

/**
 * Batas jumlah kategori yang boleh dipilih siswa dalam satu curhatan.
 *
 * Kenapa dibatasi, bukan bebas: satu masalah nyata memang sering menyentuh
 * beberapa hal sekaligus (mis. bullying yang berdampak ke kesehatan mental
 * dan akademik), tapi kalau siswa boleh mencentang semuanya, kolom kategori
 * berhenti berguna sebagai alat triase Guru BK dan statistik per kategori
 * jadi rata tanpa bentuk. Tiga memaksa siswa menimbang mana yang paling
 * penting, tanpa memaksa memilih satu saja.
 */
export const MAKS_KATEGORI = 3;

/**
 * Kategori yang otomatis ditandai prioritas di dashboard Guru BK (TAHAP 6) —
 * disortir ke atas daftar & diberi badge "Perlu Perhatian Segera" selama
 * tiketnya belum berstatus "selesai". Bukan pengganti tombol darurat (itu
 * tetap untuk situasi yang butuh bantuan SEKARANG juga), ini murni bantuan
 * triase supaya Guru BK tidak melewatkan kasus berisiko di antara antrean.
 */
export const KATEGORI_PRIORITAS: readonly KategoriCurhat[] = [
  "kekerasan",
  "kesehatan_mental",
];

export function isKategoriPrioritas(kategori: KategoriCurhat): boolean {
  return (KATEGORI_PRIORITAS as readonly string[]).includes(kategori);
}

/** True kalau SALAH SATU kategori yang dipilih siswa termasuk kategori prioritas. */
export function adaKategoriPrioritas(kategori: readonly KategoriCurhat[]): boolean {
  return kategori.some(isKategoriPrioritas);
}

/**
 * Baca field `kategori` dari dokumen Firestore apa adanya dan kembalikan
 * selalu dalam bentuk array yang sudah bersih.
 *
 * Wajib dipakai di SETIAP tempat yang membaca tiket, karena tiket yang dibuat
 * sebelum revisi multi-kategori menyimpan `kategori` sebagai STRING tunggal.
 * Dengan penormalan di sisi baca seperti ini, tiket lama tetap tampil benar
 * tanpa perlu migrasi massal dokumen Firestore (yang mahal dan berisiko untuk
 * data yang tidak bisa diambil ulang kalau gagal separuh jalan).
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

/** Gabungan label kategori untuk ditampilkan dalam satu baris ringkas. */
export function labelKategori(kategori: readonly KategoriCurhat[]): string {
  if (kategori.length === 0) return "Tanpa kategori";
  return kategori.map((k) => KATEGORI_CURHAT_LABEL[k]).join(" \u00b7 ");
}

/** Mood meter — dipilih siswa saat curhat, sebelum menulis isi curhatan. */
export const MOOD_OPTIONS = [
  "senang",
  "sedih",
  "cemas",
  "marah",
  "bingung",
  "lelah",
] as const;

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

/**
 * Status siklus hidup tiket curhat:
 * baru      → baru dibuat siswa, belum dibuka Guru BK
 * dibaca    → sudah dibuka Guru BK, belum dibalas
 * dibalas   → Guru BK sudah membalas minimal sekali
 * selesai   → ditutup (misal: masalah sudah tertangani)
 */
export type TicketStatus = "baru" | "dibaca" | "dibalas" | "selesai";

/**
 * Dokumen Firestore di collection `curhatan`, dengan Kode Konseling
 * (mis. "BK-2026-0187") sebagai Document ID — supaya lookup pakai kode
 * saat cek balasan itu langsung O(1) get-by-id, tanpa perlu query/index.
 *
 * TIDAK ADA field identitas asli siswa maupun IP address di sini,
 * sesuai spek privasi Ruang Aman BK.
 */
export interface CurhatTicket {
  kode: string;
  /**
   * Kategori masalah yang dipilih siswa — 1 sampai MAKS_KATEGORI kategori.
   *
   * CATATAN: dokumen tiket yang dibuat sebelum revisi multi-kategori masih
   * berisi string tunggal di Firestore. Jangan pernah membaca field ini
   * langsung; lewatkan dulu ke normalizeKategori().
   */
  kategori: KategoriCurhat[];
  mood: Mood;
  judul: string;
  namaSamaran: string;
  /** Hash bcrypt — password asli TIDAK PERNAH disimpan. */
  passwordHash: string;
  status: TicketStatus;
  /** Fitur "Saya siap bertemu Guru BK" dari spek awal. */
  siapBertemuGuruBk: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** TAHAP 8 — perangkat siswa yang berlangganan notifikasi balasan UNTUK TIKET INI SAJA. */
  siswaPushSubscriptions?: PushSubscriptionRecord[];
  /** TAHAP 8 — Guru BK yang menangani tiket ini, kalau sudah ditugaskan. */
  guruDitugaskan?: GuruTugas | null;
  /** true kalau status "selesai" di sini didapat dari retensi otomatis, bukan Guru BK. */
  ditutupOtomatis?: boolean;
  /** Timestamp epoch ms saat siswa terakhir kali membuka/membaca ruang chat. */
  dibacaSiswaAtMs?: number | null;
}

/**
 * Dokumen di subcollection `curhatan/{kode}/pesan` — riwayat chat
 * ala WhatsApp antara siswa (anonim) dan Guru BK.
 */
export interface CurhatMessage {
  pengirim: "siswa" | "guru";
  isi: string;
  /**
   * TAHAP 11 — data URL base64 ("data:image/jpeg;base64,...") gambar yang
   * dilampirkan, kalau ada. Disimpan LANGSUNG di dokumen ini (bukan Firebase
   * Storage) supaya tidak perlu upgrade akun ke plan Blaze — makanya ukuran
   * dibatasi kecil di sisi client (lihat lib/image/kompres-gambar.ts) &
   * divalidasi ulang di server (lihat actions/chat.ts).
   */
  gambar?: string;
  createdAt: Timestamp;
}

/**
 * Versi CurhatMessage yang aman dikirim dari Server Component/Action ke
 * Client Component — Timestamp (instance class Firestore) tidak bisa
 * di-serialize langsung sebagai props, jadi diubah ke epoch ms biasa.
 */
export interface SerializedMessage {
  pengirim: "siswa" | "guru";
  isi: string;
  gambar?: string;
  createdAtMs: number;
}

/**
 * Bentuk `PushSubscription` browser (dari `pushManager.subscribe().toJSON()`)
 * yang disimpan di Firestore — TAHAP 6, notifikasi Guru BK. Tidak berisi
 * identitas apa pun, cuma "alamat pengiriman" push notification milik satu
 * browser/perangkat tertentu.
 */
export interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/** Profil Guru BK — dokumen di collection `guru`, keyed pakai Firebase Auth UID. */
export interface GuruProfile {
  nama: string;
  email: string;
  aktif: boolean;
  /** Perangkat/browser yang sudah mengaktifkan notifikasi push (TAHAP 6). */
  pushSubscriptions?: PushSubscriptionRecord[];
}

/** Guru BK yang ditugaskan menangani satu tiket (TAHAP 8) — nama didenormalisasi biar dashboard tidak perlu join. */
export interface GuruTugas {
  uid: string;
  nama: string;
}

/**
 * Satu baris tiket seperti yang dipakai panel Guru BK (daftar curhatan,
 * panel samping, dan endpoint pagination /api/guru/tickets).
 *
 * Sengaja BUKAN CurhatTicket apa adanya: dokumen Firestore berisi
 * passwordHash, langganan push, dan Timestamp yang tidak bisa di-serialize
 * sebagai props Client Component — bentuk ini cuma memuat yang benar-benar
 * ditampilkan. `prioritas` dihitung di sisi baca (lihat adaKategoriPrioritas),
 * tidak pernah disimpan di Firestore.
 */
export interface TicketRow {
  kode: string;
  kategori: KategoriCurhat[];
  mood: Mood;
  judul: string;
  status: TicketStatus;
  createdAtMs: number;
  prioritas: boolean;
  guruDitugaskan: GuruTugas | null;
}
