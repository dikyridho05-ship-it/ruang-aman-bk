"use server";

import { bacaPengaturanAkses, pasangCookieAkses } from "@/lib/akses/akses-sekolah";
import { kodeCocok, PANJANG_KODE_MAKS } from "@/lib/akses/token-akses";
import {
  catatPercobaanGagal,
  periksaBatasPercobaan,
  resetPercobaan,
} from "@/lib/security/rate-limit";

const NAMA_BATAS = "kode_sekolah";
const MAKS_PERCOBAAN = 5;
const JEDA_DETIK = 300;

/**
 * Masukkan Kode Akses Sekolah. Yang disimpan di perangkat hanya token
 * bertanda tangan (lihat lib/akses/token-akses.ts) — tidak ada data siswa.
 */
export async function masukDenganKodeAksesAction(
  masukan: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const batas = await periksaBatasPercobaan(NAMA_BATAS, MAKS_PERCOBAAN, JEDA_DETIK);
  if (batas.diblokir) {
    const menit = Math.max(1, Math.ceil(batas.sisaDetik / 60));
    return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.` };
  }

  const akses = await bacaPengaturanAkses();
  // Gerbang mati (belum ada kode) — tidak ada yang perlu diperiksa.
  if (!akses.aktif || !akses.kode) return { success: true };

  if (typeof masukan !== "string" || masukan.length > PANJANG_KODE_MAKS * 2 || !kodeCocok(masukan, akses.kode)) {
    await catatPercobaanGagal(NAMA_BATAS, MAKS_PERCOBAAN, JEDA_DETIK);
    return { success: false, error: "Kode akses salah. Tanyakan kode yang benar ke Guru BK atau wali kelasmu." };
  }

  await resetPercobaan(NAMA_BATAS);
  await pasangCookieAkses(akses.kode);
  return { success: true };
}
