"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { getSekolahSettings } from "@/lib/firestore/settings";
import { jalankanRetensi } from "@/lib/retensi/jalankan";
import { catatAudit } from "@/lib/audit/log";

type UpdateResult = { success: boolean; error?: string };
type JalankanResult =
  | { success: true; tutupCount: number; hapusCount: number }
  | { success: false; error: string };

const retensiSchema = z.object({
  aktif: z.boolean(),
  tutupOtomatisHari: z.coerce.number().int().min(0).max(3650),
  hapusOtomatisHari: z.coerce.number().int().min(0).max(3650),
});

/** Form terpisah dari identitas sekolah (PengaturanForm) — konsekuensinya beda kelas: ini bisa menghapus data. */
export async function updateRetensiSettingsAction(formData: FormData): Promise<UpdateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const parsed = retensiSchema.safeParse({
    aktif: formData.get("aktif") === "on",
    tutupOtomatisHari: formData.get("tutupOtomatisHari"),
    hapusOtomatisHari: formData.get("hapusOtomatisHari"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  await adminDb
    .collection("settings")
    .doc("sekolah")
    .set({ retensi: parsed.data }, { merge: true });

  await catatAudit(
    admin.nama,
    "Ubah Pengaturan Retensi",
    parsed.data.aktif
      ? `Aktif — tutup otomatis ${parsed.data.tutupOtomatisHari} hari, hapus otomatis ${parsed.data.hapusOtomatisHari} hari`
      : "Dimatikan"
  );

  return { success: true };
}

/** Tombol "Jalankan Sekarang" — jalur manual tanpa perlu deploy/cron eksternal (lihat app-a-publik/api/retensi untuk versi cron). */
export async function jalankanRetensiSekarangAction(): Promise<JalankanResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const settings = await getSekolahSettings();
  if (!settings.retensi.aktif) {
    return { success: false, error: "Retensi otomatis belum diaktifkan — aktifkan dulu di atas." };
  }

  const hasil = await jalankanRetensi(adminDb, settings.retensi);

  await catatAudit(
    `Sistem (dijalankan manual oleh ${admin.nama})`,
    "Jalankan Retensi",
    `${hasil.tutupCount} tiket ditutup otomatis, ${hasil.hapusCount} tiket dihapus permanen`
  );

  return { success: true, ...hasil };
}
