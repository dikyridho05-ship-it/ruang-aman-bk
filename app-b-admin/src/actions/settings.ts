"use server";

import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";

// Logo disimpan sebagai base64 LANGSUNG di dokumen Firestore (bukan Firebase
// Storage) — keputusan arsitektur dari TAHAP 3 supaya proyek tidak perlu
// upgrade ke plan Blaze (berbayar) hanya demi satu logo kecil. Karena itu
// ukurannya dijaga ketat: dokumen Firestore dibatasi 1 MiB total, base64
// menambah ~33% dari ukuran file asli.
const MAX_LOGO_BYTES = 300 * 1024; // 300 KB (file asli, sebelum di-encode base64)
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

const namaSchema = z
  .string()
  .trim()
  .min(2, "Nama sekolah minimal 2 karakter.")
  .max(120, "Nama sekolah maksimal 120 karakter.");

type UpdateResult = { success: boolean; error?: string };

/**
 * `formData` dikirim langsung dari <form action={...}> di client — Next.js
 * Server Actions bisa menerima FormData berisi File apa adanya (multipart),
 * jadi tidak perlu encode base64 manual di browser. Validasi & konversi ke
 * base64 SEMUA terjadi di sini, di server.
 */
export async function updateSekolahSettingsAction(formData: FormData): Promise<UpdateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const namaParsed = namaSchema.safeParse(formData.get("namaSekolah"));
  if (!namaParsed.success) {
    return {
      success: false,
      error: namaParsed.error.issues[0]?.message ?? "Nama sekolah tidak valid.",
    };
  }

  const update: Record<string, unknown> = {
    namaSekolah: namaParsed.data,
    updatedAt: FieldValue.serverTimestamp(),
  };

  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!ALLOWED_LOGO_TYPES.includes(logoFile.type)) {
      return { success: false, error: "Logo harus berformat PNG, JPEG, atau WebP." };
    }
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { success: false, error: "Ukuran logo maksimal 300 KB." };
    }

    const buffer = Buffer.from(await logoFile.arrayBuffer());
    update.logoBase64 = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
  }

  await adminDb.collection("settings").doc("sekolah").set(update, { merge: true });

  await catatAudit(
    admin.nama,
    "Ubah Pengaturan Sekolah",
    `Nama: ${namaParsed.data}${update.logoBase64 ? " + logo diperbarui" : ""}`
  );

  return { success: true };
}
