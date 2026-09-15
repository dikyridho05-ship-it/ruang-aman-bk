import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import {
  DEFAULT_RETENSI,
  type LatarBerandaSettings,
  type RetensiSettings,
  type SekolahSettings,
} from "@/types/admin";

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
 * Baca identitas sekolah saat ini untuk ditampilkan sebagai nilai awal di
 * form Pengaturan — struktur & fallback-nya sengaja identik dengan
 * app-a-publik/src/lib/firestore/settings.ts supaya kedua app selalu
 * "melihat" bentuk data yang sama walau independen satu sama lain.
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

/**
 * Baca foto latar Beranda dari dokumennya sendiri (`settings/latar-beranda`).
 * Dipisah dari getSekolahSettings() supaya halaman yang cuma butuh nama/logo
 * tidak ikut menarik ratusan KB foto — lihat catatan di actions/latar-beranda.ts.
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
