/**
 * Logika murni pengelolaan sesi siswa — sengaja dipisah dari
 * `siswa-session.ts` yang menyentuh Firestore dan cookie Next.js.
 *
 * Bagian inilah yang paling mudah salah diam-diam (sesi kedaluwarsa yang tidak
 * terbuang, perangkat lama yang tidak pernah tergeser), jadi dibuat supaya bisa
 * diuji langsung tanpa perlu basis data maupun server.
 */
import { createHash } from "crypto";

export type PetaSesi = Record<string, number>; // hash token -> kedaluwarsa (ms)

export const MAKS_PERANGKAT = 5;
export const DURASI_SESI_MS = 1000 * 60 * 60 * 24 * 30; // 30 hari

/**
 * Token disimpan sebagai HASH. Kalau isi dokumen tiket sampai terbaca orang
 * lain, sesi yang sedang berjalan tetap tidak bisa dibajak.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buangYangKedaluwarsa(peta: PetaSesi, sekarang = Date.now()): PetaSesi {
  const bersih: PetaSesi = {};
  for (const [hash, sampai] of Object.entries(peta ?? {})) {
    if (typeof sampai === "number" && sampai > sekarang) bersih[hash] = sampai;
  }
  return bersih;
}

/** Sisakan hanya N perangkat terbaru supaya dokumen tiket tidak membengkak. */
export function batasiJumlah(peta: PetaSesi, maks = MAKS_PERANGKAT): PetaSesi {
  const urut = Object.entries(peta ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, maks);
  return Object.fromEntries(urut);
}

/** Menyusun peta sesi baru setelah seseorang berhasil masuk dari satu perangkat. */
export function tambahSesi(
  petaLama: PetaSesi | undefined,
  tokenBaru: string,
  sekarang = Date.now()
): PetaSesi {
  return batasiJumlah({
    ...buangYangKedaluwarsa(petaLama ?? {}, sekarang),
    [hashToken(tokenBaru)]: sekarang + DURASI_SESI_MS,
  });
}

export function sesiMasihBerlaku(
  peta: PetaSesi | undefined,
  token: string,
  sekarang = Date.now()
): boolean {
  const sampai = (peta ?? {})[hashToken(token)];
  return typeof sampai === "number" && sampai > sekarang;
}

export function hapusSesi(peta: PetaSesi | undefined, token: string): PetaSesi {
  const salinan = { ...(peta ?? {}) };
  delete salinan[hashToken(token)];
  return salinan;
}
