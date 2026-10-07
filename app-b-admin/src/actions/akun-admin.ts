"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";
import type { AdminAccount, PermintaanAdmin } from "@/types/admin";

type MutateResult = { success: boolean; error?: string };

const SESI_HABIS = "Sesi login habis, silakan login ulang.";

export async function getAkunAdminData(): Promise<
  | { success: true; admins: AdminAccount[]; permintaan: PermintaanAdmin[] }
  | { success: false; error: string }
> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: SESI_HABIS };

  const [adminSnap, permintaanSnap] = await Promise.all([
    adminDb.collection("admins").get(),
    adminDb.collection("permintaanAdmin").where("status", "==", "menunggu").get(),
  ]);

  const admins: AdminAccount[] = adminSnap.docs
    .map((d) => ({
      uid: d.id,
      nama: (d.data().nama as string) ?? "(tanpa nama)",
      email: (d.data().email as string) ?? "",
      aktif: d.data().aktif === true,
    }))
    .sort((a, b) => Number(b.aktif) - Number(a.aktif) || a.nama.localeCompare(b.nama, "id"));

  const permintaan: PermintaanAdmin[] = permintaanSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        nama: (data.nama as string) ?? "",
        email: (data.email as string) ?? "",
        peran: (data.peran as string) ?? "",
        status: "menunggu" as const,
        diajukanMs: data.diajukanPada?.toMillis ? (data.diajukanPada.toMillis() as number) : 0,
      };
    })
    .sort((a, b) => a.diajukanMs - b.diajukanMs);

  return { success: true, admins, permintaan };
}

/** Jumlah permintaan menunggu — untuk penanda di navigasi. Gagal baca = 0, tidak boleh merusak layout. */
export async function hitungPermintaanMenunggu(): Promise<number> {
  // File "use server": fungsi ini juga bisa dipanggil sebagai Server Action,
  // jadi tetap dijaga — orang yang belum masuk tidak perlu tahu angkanya.
  const admin = await getAuthenticatedAdmin();
  if (!admin) return 0;
  try {
    const snap = await adminDb
      .collection("permintaanAdmin")
      .where("status", "==", "menunggu")
      .count()
      .get();
    return snap.data().count;
  } catch {
    return 0;
  }
}

/**
 * Setujui permintaan: buat `admins/{uid}` aktif lalu tandai permintaan
 * disetujui, dalam satu transaksi supaya tidak ada keadaan setengah jadi
 * (permintaan "disetujui" tapi akun admin tidak terbentuk, atau sebaliknya).
 */
export async function setujuiPermintaanAction(uid: string): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: SESI_HABIS };

  const permintaanRef = adminDb.collection("permintaanAdmin").doc(uid);
  const adminRef = adminDb.collection("admins").doc(uid);

  let nama = "";
  let email = "";
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(permintaanRef);
      if (!snap.exists || snap.data()?.status !== "menunggu") {
        throw new Error("BUKAN_MENUNGGU");
      }
      nama = snap.data()?.nama as string;
      email = snap.data()?.email as string;
      tx.set(adminRef, {
        nama,
        email,
        aktif: true,
        disetujuiOleh: admin.uid,
        dibuatPada: FieldValue.serverTimestamp(),
      });
      tx.update(permintaanRef, {
        status: "disetujui",
        diprosesOleh: admin.uid,
        diprosesPada: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "BUKAN_MENUNGGU") {
      return { success: false, error: "Permintaan ini sudah diproses Super Admin lain." };
    }
    console.error("[setujuiPermintaanAction]", err);
    return { success: false, error: "Gagal menyetujui. Coba lagi." };
  }

  await catatAudit(admin.nama, "Menyetujui akses Super Admin", `${nama} (${email})`);
  revalidatePath("/akun-admin");
  return { success: true };
}

export async function tolakPermintaanAction(uid: string): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: SESI_HABIS };

  const ref = adminDb.collection("permintaanAdmin").doc(uid);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.status !== "menunggu") {
    return { success: false, error: "Permintaan ini sudah diproses Super Admin lain." };
  }
  await ref.update({
    status: "ditolak",
    diprosesOleh: admin.uid,
    diprosesPada: FieldValue.serverTimestamp(),
  });

  await catatAudit(
    admin.nama,
    "Menolak akses Super Admin",
    `${snap.data()?.nama as string} (${snap.data()?.email as string})`
  );
  revalidatePath("/akun-admin");
  return { success: true };
}

/**
 * Aktifkan/nonaktifkan Super Admin lain. Dua pagar:
 * - tidak bisa menonaktifkan diri sendiri (supaya tidak ada yang terkunci
 *   dari akunnya sendiri karena salah klik);
 * - Super Admin aktif terakhir tidak bisa dinonaktifkan sama sekali.
 * Menonaktifkan juga mencabut sesi yang sedang berjalan (revokeRefreshTokens),
 * sama seperti penonaktifan akun Guru BK.
 */
export async function ubahStatusAdminAction(uid: string, aktif: boolean): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: SESI_HABIS };
  if (uid === admin.uid) {
    return { success: false, error: "Kamu tidak bisa mengubah status akunmu sendiri." };
  }

  const ref = adminDb.collection("admins").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "Akun tidak ditemukan." };

  if (!aktif) {
    const jumlahAktif = await adminDb
      .collection("admins")
      .where("aktif", "==", true)
      .count()
      .get();
    if (jumlahAktif.data().count <= 1) {
      return { success: false, error: "Harus selalu ada minimal satu Super Admin aktif." };
    }
  }

  await ref.update({ aktif });
  if (!aktif) {
    try {
      await adminAuth.revokeRefreshTokens(uid);
    } catch (err) {
      console.error("[ubahStatusAdminAction] revoke gagal:", err);
    }
  }

  await catatAudit(
    admin.nama,
    aktif ? "Mengaktifkan Super Admin" : "Menonaktifkan Super Admin",
    `${snap.data()?.nama as string} (${snap.data()?.email as string})`
  );
  revalidatePath("/akun-admin");
  return { success: true };
}
