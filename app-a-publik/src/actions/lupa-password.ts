"use server";

import { adminDb } from "@/lib/firebase/admin";
import { hashPassword } from "@/lib/crypto/password";
import { Timestamp } from "firebase-admin/firestore";
import { verifyAndCreateSiswaSession } from "@/lib/session/siswa-session";
import {
  catatPercobaanGagalTarget,
  periksaBatasPercobaanTarget,
  resetPercobaanTarget,
} from "@/lib/security/rate-limit";

const NAMA_BATAS = "lupa_password";
const MAKS_PERCOBAAN = 5;
const JEDA_DETIK = 600; // 10 menit

/**
 * Memulihkan password siswa yang lupa — TANPA membocorkan data pribadi atau merusak privasi.
 *
 * Siswa membuktikan kepemilikan tiket dengan dua hal:
 * 1. Kode Konseling yang dia miliki (misal: BK-2026-7K3M9Q)
 * 2. Nama Samaran yang dia pilih saat mengirim curhatan
 *
 * Jika cocok, siswa dapat langsung membuat password baru.
 */
export async function resetPasswordSiswaAction(
  kodeInput: string,
  namaSamaranInput: string,
  passwordBaru: string
): Promise<{ success: true; kode: string } | { success: false; error: string }> {
  const kode = kodeInput?.trim().toUpperCase();
  const namaSamaran = namaSamaranInput?.trim();

  if (!kode || !namaSamaran) {
    return { success: false, error: "Kode Konseling dan Nama Samaran wajib diisi." };
  }

  if (!passwordBaru || passwordBaru.length < 8) {
    return { success: false, error: "Password baru minimal 8 karakter." };
  }

  if (passwordBaru.length > 72) {
    return { success: false, error: "Password maksimal 72 karakter." };
  }

  // Dikunci ke Kode Konseling yang diserang, bukan ke cookie klien — lihat
  // catatan di lib/security/rate-limit.ts soal kenapa pembatas berbasis
  // cookie bisa dilewati begitu saja oleh skrip yang tidak menyimpan cookie.
  const batas = await periksaBatasPercobaanTarget(NAMA_BATAS, kode, MAKS_PERCOBAAN, JEDA_DETIK);
  if (batas.diblokir) {
    const menit = Math.ceil(batas.sisaDetik / 60);
    return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.` };
  }

  const ticketRef = adminDb.collection("curhatan").doc(kode);
  const snap = await ticketRef.get();

  if (!snap.exists) {
    await catatPercobaanGagalTarget(NAMA_BATAS, kode, MAKS_PERCOBAAN, JEDA_DETIK);
    return { success: false, error: "Kode Konseling atau Nama Samaran tidak cocok." };
  }

  const data = snap.data() ?? {};
  const namaTersimpan = typeof data.namaSamaran === "string" ? data.namaSamaran.trim() : "";

  // Perbandingan nama samaran (case-insensitive)
  if (namaTersimpan.toLowerCase() !== namaSamaran.toLowerCase()) {
    await catatPercobaanGagalTarget(NAMA_BATAS, kode, MAKS_PERCOBAAN, JEDA_DETIK);
    return { success: false, error: "Kode Konseling atau Nama Samaran tidak cocok." };
  }

  // Update password baru DAN cabut semua sesi yang sedang berjalan di semua
  // perangkat (sesiSiswa dikosongkan). Kalau tidak, siapa pun yang sudah
  // punya sesi aktif di tiket ini — misalnya karena mengambilnya lewat celah
  // di atas, atau HP yang dulu dipinjam teman — tetap punya akses penuh
  // sampai 30 hari meski passwordnya baru saja diganti.
  const newHash = await hashPassword(passwordBaru);
  await ticketRef.update({
    passwordHash: newHash,
    sesiSiswa: {},
    sessionToken: null,
    sessionExpiresAt: null,
    updatedAt: Timestamp.now(),
  });

  await resetPercobaanTarget(NAMA_BATAS, kode);

  // Sekaligus buatkan sesi login siswa BARU (satu-satunya yang sah sekarang)
  // agar bisa langsung buka percakapan.
  await verifyAndCreateSiswaSession(kode, passwordBaru);

  return { success: true, kode };
}
