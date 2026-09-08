/**
 * Profil Super Admin — dokumen di collection `admins`, keyed pakai Firebase
 * Auth UID (pola sama seperti collection `guru` di App A: akun Firebase
 * Auth yang belum terdaftar & aktif di sini TETAP DITOLAK login).
 */
export interface AdminProfile {
  nama: string;
  email: string;
  aktif: boolean;
}

/**
 * Ringkasan akun Guru BK untuk ditampilkan di dashboard App B — dilengkapi
 * `uid` (Document ID di collection `guru`, sekaligus Firebase Auth UID)
 * karena di sini Super Admin perlu tahu ID-nya untuk aksi aktif/nonaktif/hapus.
 */
export interface GuruAccount {
  uid: string;
  nama: string;
  email: string;
  aktif: boolean;
}

/**
 * Pengaturan retensi & arsip otomatis (TAHAP 8) — sengaja diduplikasi persis
 * dari app-a-publik/src/lib/firestore/settings.ts (App A & App B tetap dua
 * aplikasi terpisah). Default `aktif: false`: menghapus data curhatan
 * otomatis adalah keputusan sadar sekolah, bukan sesuatu yang boleh menyala
 * diam-diam.
 */
export interface RetensiSettings {
  aktif: boolean;
  /** 0 = fitur tutup-otomatis dimatikan meski `aktif` true. */
  tutupOtomatisHari: number;
  /** 0 = fitur hapus-otomatis dimatikan meski `aktif` true. */
  hapusOtomatisHari: number;
}

export const DEFAULT_RETENSI: RetensiSettings = {
  aktif: false,
  tutupOtomatisHari: 30,
  hapusOtomatisHari: 180,
};

/** Identitas sekolah — dokumen `settings/sekolah`, dibaca & diubah dari sini. */
export interface SekolahSettings {
  namaSekolah: string;
  logoBase64: string | null;
  retensi: RetensiSettings;
}

/** Satu baris di collection `auditLog` (TAHAP 8) — jejak aktivitas Super Admin & retensi otomatis. */
export interface AuditLogEntry {
  id: string;
  waktuMs: number;
  aktor: string;
  aksi: string;
  detail: string;
}

/**
 * Jadwal piket Guru BK (TAHAP 9) — dokumen `settings/piket`, satu field per
 * hari berisi daftar UID Guru BK yang bertugas. Sengaja pakai UID mentah
 * (bukan didenormalisasi nama seperti `guruDitugaskan`) karena halaman yang
 * menampilkannya (form pengaturan di sini, dashboard Guru BK di App A) sama-
 * sama sudah perlu ambil daftar Guru BK lengkap untuk keperluan lain juga —
 * jadi resolve nama tinggal join di tempat, tidak nambah baca Firestore.
 */
export type HariPiket = "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu";

export const HARI_PIKET: readonly HariPiket[] = [
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
  "minggu",
];

export const HARI_PIKET_LABEL: Record<HariPiket, string> = {
  senin: "Senin",
  selasa: "Selasa",
  rabu: "Rabu",
  kamis: "Kamis",
  jumat: "Jumat",
  sabtu: "Sabtu",
  minggu: "Minggu",
};

export type JadwalPiket = Record<HariPiket, string[]>;

export const JADWAL_PIKET_KOSONG: JadwalPiket = {
  senin: [],
  selasa: [],
  rabu: [],
  kamis: [],
  jumat: [],
  sabtu: [],
  minggu: [],
};

/** Satu template balasan cepat (TAHAP 9) — collection `templateBalasan`, dipakai Guru BK di App A saat membalas curhatan. */
export interface TemplateBalasan {
  id: string;
  judul: string;
  isi: string;
}

/**
 * Hasil eksekusi retensi otomatis TERAKHIR (TAHAP 9) — ditulis oleh
 * `jalankanRetensi()` sendiri (App A maupun App B, dua-duanya menulis ke
 * dokumen Firestore yang sama karena satu backend) supaya Super Admin bisa
 * lihat "kapan retensi terakhir jalan" tanpa harus buka audit log manual.
 */
export interface RetensiTerakhir {
  waktuMs: number;
  tutupCount: number;
  hapusCount: number;
  sukses: boolean;
  pesanError?: string;
}

/** Indikator kesehatan sistem (TAHAP 9) — gabungan status retensi terakhir + jumlah dokumen tersimpan. */
export interface SistemStatus {
  retensiTerakhir: RetensiTerakhir | null;
  totalTiket: number;
  totalAuditLog: number;
}
