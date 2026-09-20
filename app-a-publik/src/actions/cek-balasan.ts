"use server";

import { verifyAndCreateSiswaSession } from "@/lib/session/siswa-session";
import {
  catatPercobaanGagalTarget,
  periksaBatasPercobaanTarget,
  resetPercobaanTarget,
} from "@/lib/security/rate-limit";

const NAMA_BATAS = "cek_balasan";
const MAKS_PERCOBAAN = 5;
const JEDA_DETIK = 300; // 5 menit

export async function verifyCurhatAccessAction(
  kode: string,
  password: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!kode?.trim() || !password) {
    return { success: false, error: "Kode dan password wajib diisi." };
  }

  const target = kode.trim().toUpperCase();

  // Dikunci ke Kode Konseling yang diserang, bukan ke cookie klien — skrip
  // yang tidak menyimpan cookie (curl) tidak bisa lagi mulai hitungan dari
  // nol dengan menghapusnya.
  const batas = await periksaBatasPercobaanTarget(NAMA_BATAS, target, MAKS_PERCOBAAN, JEDA_DETIK);
  if (batas.diblokir) {
    const menit = Math.ceil(batas.sisaDetik / 60);
    return {
      success: false,
      error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit, atau buka halaman "Lupa Kode".`,
    };
  }

  const hasil = await verifyAndCreateSiswaSession(kode, password);

  if (!hasil.success) {
    await catatPercobaanGagalTarget(NAMA_BATAS, target, MAKS_PERCOBAAN, JEDA_DETIK);
    return hasil;
  }

  await resetPercobaanTarget(NAMA_BATAS, target);
  return hasil;
}
