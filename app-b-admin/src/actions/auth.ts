"use server";

import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  createAdminSession,
  clearAdminSession,
  type HasilSesiAdmin,
} from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";
import { PESAN_BUTUH_KODE, punyaAksesSekolah } from "@/lib/akses/akses-sekolah";
import { PERAN_PEMOHON, type PeranPemohon } from "@/types/admin";

/**
 * Dipanggil dari halaman login SETELAH sign-in Firebase Auth berhasil di
 * client (email/password atau Google) — sama polanya dengan loginGuruAction
 * di App A. Metode sign-in tidak memengaruhi apa pun di sini: yang menentukan
 * boleh masuk tetap dokumen `admins/{uid}` dengan `aktif: true`.
 */
export async function loginAdminAction(idToken: string): Promise<HasilSesiAdmin> {
  if (!(await punyaAksesSekolah())) return { success: false, error: PESAN_BUTUH_KODE };
  return createAdminSession(idToken);
}

export async function logoutAdminAction(): Promise<void> {
  await clearAdminSession();
  redirect("/login");
}

/**
 * Batas permintaan yang boleh menunggu sekaligus. Tiap akun Google cuma
 * bisa punya satu permintaan (dokumen keyed UID), tapi orang iseng bisa
 * memakai banyak akun — batas ini menjaga daftar persetujuan tetap bisa
 * dibaca manusia dan tidak bisa dibanjiri.
 */
const MAKS_PERMINTAAN_MENUNGGU = 25;

const ajukanSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80, "Nama maksimal 80 karakter."),
  peran: z.enum(PERAN_PEMOHON as unknown as [PeranPemohon, ...PeranPemohon[]], {
    message: "Pilih peranmu di sekolah.",
  }),
});

export type HasilAjukan =
  | { success: true; status: "menunggu" | "sudah-admin" }
  | { success: false; error: string };

/**
 * "Daftar" di App B = MENGAJUKAN akses, bukan langsung jadi Super Admin.
 * Super Admin bisa mengubah identitas sekolah, mengelola akun Guru BK, dan
 * melihat statistik — kalau pendaftaran langsung aktif, siapa pun yang tahu
 * alamat App B bisa mengambil alih. Permintaan baru tercatat di
 * `permintaanAdmin/{uid}` dan baru berlaku setelah disetujui Super Admin
 * yang sudah ada (lihat actions/akun-admin.ts).
 */
export async function ajukanAksesAdminAction(
  idToken: string,
  input: { nama: string; peran: string }
): Promise<HasilAjukan> {
  if (!(await punyaAksesSekolah())) return { success: false, error: PESAN_BUTUH_KODE };
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    return { success: false, error: "Sesi Google tidak valid. Coba masuk dengan Google lagi." };
  }

  if (!decoded.email || decoded.email_verified !== true) {
    return {
      success: false,
      error: "Email akun ini belum terverifikasi. Pakai akun Google yang emailnya aktif.",
    };
  }

  const parsed = ajukanSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const adminSnap = await adminDb.collection("admins").doc(decoded.uid).get();
  if (adminSnap.exists && adminSnap.data()?.aktif === true) {
    return { success: true, status: "sudah-admin" };
  }

  const ref = adminDb.collection("permintaanAdmin").doc(decoded.uid);
  const existing = await ref.get();
  if (existing.exists && existing.data()?.status === "menunggu") {
    return { success: true, status: "menunggu" };
  }

  const jumlahMenunggu = await adminDb
    .collection("permintaanAdmin")
    .where("status", "==", "menunggu")
    .count()
    .get();
  if (jumlahMenunggu.data().count >= MAKS_PERMINTAAN_MENUNGGU) {
    return {
      success: false,
      error:
        "Antrean permintaan akses sedang penuh. Minta Super Admin sekolahmu memproses permintaan yang ada dulu.",
    };
  }

  await ref.set({
    nama: parsed.data.nama,
    peran: parsed.data.peran,
    email: decoded.email,
    status: "menunggu",
    diajukanPada: FieldValue.serverTimestamp(),
  });

  await catatAudit(
    `${parsed.data.nama} (${decoded.email})`,
    "Mengajukan akses Super Admin",
    `Peran: ${parsed.data.peran}`
  );

  return { success: true, status: "menunggu" };
}
