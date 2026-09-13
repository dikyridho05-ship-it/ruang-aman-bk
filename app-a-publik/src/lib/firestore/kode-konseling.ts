import "server-only";
import { randomInt } from "crypto";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Menghasilkan Kode Konseling unik, format: BK-{tahun}-{6 karakter acak}
 * Contoh: BK-2026-7K3M9Q
 *
 * DULU kodenya berurutan (BK-2026-0187). Itu diganti karena kode berurutan
 * bisa ditebak seluruhnya oleh orang luar — cukup mencoba 0001, 0002, dan
 * seterusnya, lalu tinggal menebak password. Dengan kode acak, penyerang harus
 * menebak DUA hal sekaligus, dan itu digabung dengan pembatas percobaan di
 * halaman cek balasan membuat penebakan jadi tidak masuk akal secara praktis.
 *
 * Kode LAMA yang berurutan tetap berlaku — yang berubah hanya kode yang dibuat
 * sejak sekarang.
 *
 * Abjadnya sengaja tanpa I, O, 0, dan 1 supaya tidak ada siswa yang salah baca
 * catatannya sendiri.
 */
const ABJAD = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PANJANG = 6;
const MAKS_PERCOBAAN = 8;

function acak(): string {
  return Array.from({ length: PANJANG }, () => ABJAD[randomInt(ABJAD.length)]).join("");
}

export async function generateKodeKonseling(): Promise<string> {
  const tahun = new Date().getFullYear();

  // Ruang kemungkinannya 32^6 (lebih dari satu miliar) untuk satu tahun, jadi
  // bentrok praktis tidak terjadi. Pemeriksaan ini tetap ada supaya kalau toh
  // bentrok, yang terjadi adalah kode baru — bukan menimpa curhatan siswa lain.
  for (let i = 0; i < MAKS_PERCOBAAN; i++) {
    const kode = `BK-${tahun}-${acak()}`;
    const snap = await adminDb.collection("curhatan").doc(kode).get();
    if (!snap.exists) return kode;
  }

  throw new Error("Gagal membuat Kode Konseling unik. Coba kirim ulang sebentar lagi.");
}
