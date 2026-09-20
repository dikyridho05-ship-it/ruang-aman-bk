"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyPassword } from "@/lib/crypto/password";
import {
  catatPercobaanGagalTarget,
  periksaBatasPercobaanTarget,
  resetPercobaanTarget,
} from "@/lib/security/rate-limit";

const NAMA_BATAS = "lupa_kode";
const MAKS_PERCOBAAN = 5;
const JEDA_DETIK = 600; // 10 menit
// Dulu 50 — tiap kandidat butuh satu verifikasi bcrypt (~200ms), jadi 50
// kandidat berarti sampai ~10 detik CPU untuk SATU permintaan tanpa login.
// Nama samaran yang dipakai berulang oleh lebih dari segelintir siswa sudah
// dianggap terlalu umum untuk dipulihkan lewat jalur ini (lihat penolakan
// "ambigu" di bawah), jadi batas kecil ini tidak mengorbankan siswa yang
// nama samarannya cukup unik.
const MAKS_KANDIDAT = 10;

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
): Promise<{ success: true; kode: string } | { success: false; error: string }> {
  const nama = namaSamaran?.trim();
  if (!nama || !password) {
    return { success: false, error: "Nama samaran dan password wajib diisi." };
  }

  // Dikunci ke Nama Samaran yang diserang (bukan cookie klien) — lihat
  // catatan di lib/security/rate-limit.ts.
  const batas = await periksaBatasPercobaanTarget(NAMA_BATAS, nama, MAKS_PERCOBAAN, JEDA_DETIK);
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
    await catatPercobaanGagalTarget(NAMA_BATAS, nama, MAKS_PERCOBAAN, JEDA_DETIK);
    // Pesan seragam: tidak memberi tahu apakah nama samarannya yang salah atau
    // passwordnya — supaya orang luar tidak bisa menebak-nebak nama samaran
    // siapa yang pernah dipakai.
    return { success: false, error: "Nama samaran atau password salah." };
  }

  if (cocok.length > 1) {
    // Dua siswa berbeda kebetulan memakai nama samaran DAN password yang
    // sama-sama cocok — bukan skenario teoretis untuk nama/password umum di
    // kalangan anak sekolah (mis. "Anonim" + "12345678"). Mengembalikan
    // keduanya berarti membocorkan tiket satu siswa ke siswa lain. Kasus
    // ambigu seperti ini SENGAJA ditolak; siswa diarahkan memakai Kode
    // Konseling-nya langsung (lewat "Lupa Password") atau menghubungi Guru
    // BK, bukan lewat pencarian nama samaran.
    await catatPercobaanGagalTarget(NAMA_BATAS, nama, MAKS_PERCOBAAN, JEDA_DETIK);
    return {
      success: false,
      error:
        "Nama samaran dan password ini cocok dengan lebih dari satu tiket, jadi tidak bisa dipastikan mana yang punyamu. Coba pakai kombinasi yang lebih unik lain kali, atau hubungi Guru BK langsung.",
    };
  }

  await resetPercobaanTarget(NAMA_BATAS, nama);
  return { success: true, kode: cocok[0] };
}
