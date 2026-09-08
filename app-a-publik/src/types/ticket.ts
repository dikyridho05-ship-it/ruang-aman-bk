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
  kategori: KategoriCurhat;
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
  /** TAHAP 8 — true kalau status "selesai" di sini didapat dari retensi otomatis, bukan Guru BK. */
  ditutupOtomatis?: boolean;
}

/**
 * Dokumen di subcollection `curhatan/{kode}/pesan` — riwayat chat
 * ala WhatsApp antara siswa (anonim) dan Guru BK.
 */
export interface CurhatMessage {
  pengirim: "siswa" | "guru";
  isi: string;
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
