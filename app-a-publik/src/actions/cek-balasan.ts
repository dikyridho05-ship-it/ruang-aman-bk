"use server";

import { verifyAndCreateSiswaSession } from "@/lib/session/siswa-session";
import {
  catatPercobaanGagal,
  periksaBatasPercobaan,
  resetPercobaan,
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

  // Sebelum ini, halaman cek balasan tidak punya pembatas percobaan sama
  // sekali: siapa pun bisa mencoba password berulang-ulang tanpa hambatan.
  const batas = await periksaBatasPercobaan(NAMA_BATAS, MAKS_PERCOBAAN, JEDA_DETIK);
  if (batas.diblokir) {
    const menit = Math.ceil(batas.sisaDetik / 60);
    return {
      success: false,
      error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit, atau buka halaman "Lupa Kode".`,
    };
  }

  const hasil = await verifyAndCreateSiswaSession(kode, password);

  if (!hasil.success) {
    await catatPercobaanGagal(NAMA_BATAS, MAKS_PERCOBAAN, JEDA_DETIK);
    return hasil;
  }

  await resetPercobaan(NAMA_BATAS);
  return hasil;
}
