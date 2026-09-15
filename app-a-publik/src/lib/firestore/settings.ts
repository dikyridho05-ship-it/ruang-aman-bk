import "server-only";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Pengaturan retensi & arsip otomatis (TAHAP 8) — diatur Super Admin lewat
 * App B, dibaca di sini untuk dijalankan. Default `aktif: false` sengaja:
 * menghapus data curhatan otomatis adalah keputusan sadar sekolah, bukan
 * sesuatu yang boleh menyala diam-diam.
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

export interface SekolahSettings {
  namaSekolah: string;
  /** Data URL base64 (mis. "data:image/png;base64,...") — lihat catatan di README soal Storage. */
  logoBase64: string | null;
  retensi: RetensiSettings;
}

const DEFAULT_SETTINGS: SekolahSettings = {
  namaSekolah: "Sekolah Kita",
  logoBase64: null,
  retensi: DEFAULT_RETENSI,
};

function parseRetensi(data: unknown): RetensiSettings {
  const r = (data as { retensi?: Partial<RetensiSettings> } | undefined)?.retensi;
  if (!r || typeof r !== "object") return DEFAULT_RETENSI;
  return {
    aktif: r.aktif === true,
    tutupOtomatisHari:
      typeof r.tutupOtomatisHari === "number" && r.tutupOtomatisHari >= 0
        ? r.tutupOtomatisHari
        : DEFAULT_RETENSI.tutupOtomatisHari,
    hapusOtomatisHari:
      typeof r.hapusOtomatisHari === "number" && r.hapusOtomatisHari >= 0
        ? r.hapusOtomatisHari
        : DEFAULT_RETENSI.hapusOtomatisHari,
  };
}

/**
 * Baca identitas sekolah (nama & logo) dari Firestore untuk ditampilkan di Beranda.
 * Diedit lewat App B (Super Admin) — TAHAP 5. Kalau dokumennya belum ada/belum
 * diisi, tampilkan fallback yang aman biar Beranda tidak pernah rusak/blank.
 */
export async function getSekolahSettings(): Promise<SekolahSettings> {
  try {
    const snap = await adminDb.collection("settings").doc("sekolah").get();
    if (!snap.exists) return DEFAULT_SETTINGS;

    const data = snap.data();
    return {
      namaSekolah:
        typeof data?.namaSekolah === "string" && data.namaSekolah.trim().length > 0
          ? data.namaSekolah
          : DEFAULT_SETTINGS.namaSekolah,
      logoBase64: typeof data?.logoBase64 === "string" ? data.logoBase64 : null,
      retensi: parseRetensi(data),
    };
  } catch (err) {
    console.error("[getSekolahSettings] gagal baca settings, pakai fallback:", err);
    return DEFAULT_SETTINGS;
  }
}

/** Isi dokumen `settings/latar-beranda` — foto latar halaman Beranda, diatur lewat App B. */
export interface LatarBerandaSettings {
  /** Data URL base64, atau null kalau Beranda dibiarkan polos. */
  fotoBase64: string | null;
}

/**
 * Baca foto latar Beranda. Sengaja dokumen terpisah dari `settings/sekolah`:
 * fotonya berukuran ratusan KB, sementara nama & logo sekolah dibaca di banyak
 * tempat yang tidak membutuhkan foto itu sama sekali.
 *
 * Kegagalan baca tidak boleh merusak Beranda — kembalikan null, halaman tetap
 * tampil seperti sebelum ada fitur ini.
 */
export async function getLatarBeranda(): Promise<LatarBerandaSettings> {
  try {
    const snap = await adminDb.collection("settings").doc("latar-beranda").get();
    const foto = snap.data()?.fotoBase64;
    return { fotoBase64: typeof foto === "string" && foto.length > 0 ? foto : null };
  } catch (err) {
    console.error("[getLatarBeranda] gagal baca foto latar, pakai kosong:", err);
    return { fotoBase64: null };
  }
}
