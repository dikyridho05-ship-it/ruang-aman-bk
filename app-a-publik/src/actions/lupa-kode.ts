"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyPassword } from "@/lib/crypto/password";
import {
  catatPercobaanGagal,
  periksaBatasPercobaan,
  resetPercobaan,
} from "@/lib/security/rate-limit";

const NAMA_BATAS = "lupa_kode";
const MAKS_PERCOBAAN = 5;
const JEDA_DETIK = 600; // 10 menit
const MAKS_KANDIDAT = 50;

/**
 * Memulihkan Kode Konseling yang hilang — TANPA merusak anonimitas.
 *
 * Siswa membuktikan kepemilikan dengan dua hal yang cuma dia tahu: nama
 * samaran yang dia pilih sendiri dan password yang dia buat sendiri. Tidak ada
 * email, tidak ada NISN, tidak ada identitas apa pun yang diminta — persis
 * seperti saat dia mengirim curhatan.
 *
 * Keamanannya setara dengan halaman cek balasan: password tetap wajib benar.
 * Yang berbeda hanya siswa tidak perlu mengingat deretan kode. Karena nama
 * samaran lebih mudah ditebak daripada kode, pembatas percobaannya dibuat
 * lebih ketat (5 percobaan, jeda 10 menit).
 */
export async function pulihkanKodeAction(
  namaSamaran: string,
  password: string
): Promise<{ success: true; kode: string[] } | { success: false; error: string }> {
  const nama = namaSamaran?.trim();
  if (!nama || !password) {
    return { success: false, error: "Nama samaran dan password wajib diisi." };
  }

  const batas = await periksaBatasPercobaan(NAMA_BATAS, MAKS_PERCOBAAN, JEDA_DETIK);
  if (batas.diblokir) {
    const menit = Math.ceil(batas.sisaDetik / 60);
    return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.` };
  }

  const snap = await adminDb
    .collection("curhatan")
    .where("namaSamaran", "==", nama)
    .limit(MAKS_KANDIDAT)
    .get();

  const cocok: string[] = [];
  for (const doc of snap.docs) {
    const hash = doc.data()?.passwordHash as string | undefined;
    if (hash && (await verifyPassword(password, hash))) cocok.push(doc.id);
  }

  if (cocok.length === 0) {
    await catatPercobaanGagal(NAMA_BATAS, MAKS_PERCOBAAN, JEDA_DETIK);
    // Pesan seragam: tidak memberi tahu apakah nama samarannya yang salah atau
    // passwordnya — supaya orang luar tidak bisa menebak-nebak nama samaran
    // siapa yang pernah dipakai.
    return { success: false, error: "Nama samaran atau password salah." };
  }

  await resetPercobaan(NAMA_BATAS);
  return { success: true, kode: cocok };
}
