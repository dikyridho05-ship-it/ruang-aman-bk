"use server";

import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";
import type { GuruAccount } from "@/types/admin";

type ListResult = { success: true; guru: GuruAccount[] } | { success: false; error: string };
type MutateResult = { success: boolean; error?: string };

const createGuruSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
});

export async function listGuruAction(): Promise<ListResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const snap = await adminDb.collection("guru").orderBy("nama", "asc").get();
  const guru: GuruAccount[] = snap.docs.map((d) => ({
    uid: d.id,
    nama: (d.data().nama as string) ?? "(tanpa nama)",
    email: (d.data().email as string) ?? "",
    aktif: d.data().aktif === true,
  }));

  return { success: true, guru };
}

/**
 * Buat akun Guru BK baru: akun Firebase Auth (email/password) + dokumen
 * `guru/{uid}` dengan `aktif: true`. Dua langkah ini WAJIB sinkron — kalau
 * pembuatan dokumen Firestore gagal setelah akun Auth berhasil dibuat, akun
 * Auth langsung dihapus lagi supaya tidak ada akun "yatim" yang bisa login
 * tapi tidak pernah lolos pengecekan `guru/{uid}.aktif`.
 */
export async function createGuruAction(formData: FormData): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const parsed = createGuruSchema.safeParse({
    nama: formData.get("nama"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const { nama, email, password } = parsed.data;

  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({ email, password, displayName: nama });
    uid = userRecord.uid;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return { success: false, error: "Email ini sudah terdaftar." };
    }
    console.error("[createGuruAction] createUser gagal:", err);
    return { success: false, error: "Gagal membuat akun. Coba lagi." };
  }

  try {
    await adminDb.collection("guru").doc(uid).set({ nama, email, aktif: true });
  } catch (err) {
    console.error("[createGuruAction] tulis dokumen guru gagal, rollback akun Auth:", err);
    await adminAuth.deleteUser(uid).catch(() => {});
    return { success: false, error: "Gagal menyimpan data Guru BK. Coba lagi." };
  }

  await catatAudit(admin.nama, "Tambah Akun Guru BK", `${nama} (${email})`);

  return { success: true };
}

/**
 * Aktifkan/nonaktifkan akun. Menonaktifkan juga langsung mencabut
 * (revoke) sesi Firebase Auth yang sedang berjalan punya Guru BK
 * tersebut — bukan cuma mengandalkan pengecekan `aktif` di request
 * berikutnya — supaya efeknya instan walau dia lagi login di app lain.
 */
export async function setGuruAktifAction(
  uid: string,
  aktif: boolean,
  nama: string
): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  await adminDb.collection("guru").doc(uid).update({ aktif });
  if (!aktif) {
    await adminAuth.revokeRefreshTokens(uid).catch(() => {});
  }

  await catatAudit(admin.nama, aktif ? "Aktifkan Akun Guru BK" : "Nonaktifkan Akun Guru BK", nama);

  return { success: true };
}

export async function deleteGuruAction(uid: string, nama: string): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  await adminDb.collection("guru").doc(uid).delete();
  await adminAuth.deleteUser(uid).catch((err) => {
    // Dokumen Firestore-nya sudah terhapus (efek langsung: akun ini tidak
    // lolos lagi cek getAuthenticatedGuru di App A) walau hapus akun Auth-nya
    // gagal — jadi tidak perlu gagalkan seluruh aksi, cukup dicatat.
    console.error("[deleteGuruAction] hapus akun Auth gagal:", err);
  });

  await catatAudit(admin.nama, "Hapus Akun Guru BK", nama);

  return { success: true };
}
