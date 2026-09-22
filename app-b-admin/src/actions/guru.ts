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

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "Password minimal 6 karakter.")
    .max(100, "Password maksimal 100 karakter."),
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

/**
 * Atur ulang password satu akun Guru BK dari panel Super Admin.
 *
 * Ini jaring pengaman untuk kasus guru yang tidak bisa masuk lagi dan
 * tautan "Lupa password?" di App A tidak menolong — misalnya akunnya
 * terlanjur diambil alih penyedia Google (Firebase mencabut kredensial
 * password lama ketika akun beremail belum terverifikasi masuk lewat
 * penyedia tepercaya). Sebelum ada ini, satu-satunya jalan lewat panel
 * adalah hapus lalu buat ulang akunnya — yang menghasilkan UID BARU, dan
 * ikut memutus penugasan tiket (`guruDitugaskan.uid`) serta langganan
 * notifikasi milik guru itu. updateUser() memasang password pada UID yang
 * sama, jadi semua kaitan lamanya utuh.
 */
export async function resetPasswordGuruAction(
  uid: string,
  passwordBaru: string
): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const parsed = resetPasswordSchema.safeParse({ password: passwordBaru });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Password tidak valid." };
  }

  // WAJIB: pastikan UID-nya memang Guru BK terdaftar. Tanpa cek ini, Server
  // Action ini jadi alat untuk mengganti password akun Firebase Auth MANA
  // PUN di proyek ini — termasuk akun Super Admin — cukup dengan mengirim
  // UID lain dari browser.
  const guruDoc = await adminDb.collection("guru").doc(uid).get();
  if (!guruDoc.exists) {
    return { success: false, error: "Akun ini bukan Guru BK terdaftar." };
  }

  try {
    await adminAuth.updateUser(uid, { password: parsed.data.password });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/user-not-found") {
      return {
        success: false,
        error: "Akun Firebase Auth-nya sudah tidak ada. Hapus entri ini lalu buat akun baru.",
      };
    }
    console.error("[resetPasswordGuruAction] updateUser gagal:", err);
    return { success: false, error: "Gagal mengatur ulang password. Coba lagi." };
  }

  // Cabut sesi yang sedang berjalan. Password diatur ulang biasanya justru
  // karena akunnya bermasalah, jadi sesi lama tidak boleh tetap hidup —
  // App A memverifikasi cookie sesinya dengan checkRevoked=true (lihat
  // app-a-publik/src/lib/session/guru-session.ts), jadi efeknya langsung.
  await adminAuth.revokeRefreshTokens(uid).catch(() => {});

  // Nama yang dicatat diambil dari dokumen Firestore, bukan dari nama yang
  // dikirim browser — audit log tidak boleh bisa diisi nama karangan hanya
  // dengan mengubah argumen pemanggilan. Detail audit juga SENGAJA tidak
  // memuat passwordnya: halaman audit log bisa dibaca Super Admin mana pun.
  const namaTercatat = (guruDoc.data()?.nama as string) ?? "(tanpa nama)";
  await catatAudit(admin.nama, "Atur Ulang Password Guru BK", namaTercatat);

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
