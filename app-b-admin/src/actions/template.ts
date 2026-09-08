"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";

type MutateResult = { success: boolean; error?: string };

const templateSchema = z.object({
  judul: z.string().trim().min(2, "Judul minimal 2 karakter.").max(80),
  isi: z.string().trim().min(2, "Isi minimal 2 karakter.").max(1000),
});

/** Dibaca ulang oleh App A (read-only) sebagai pilihan cepat saat Guru BK membalas curhatan. */
export async function createTemplateAction(formData: FormData): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const parsed = templateSchema.safeParse({
    judul: formData.get("judul"),
    isi: formData.get("isi"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  await adminDb.collection("templateBalasan").add(parsed.data);
  await catatAudit(admin.nama, "Tambah Template Balasan", parsed.data.judul);

  return { success: true };
}

export async function updateTemplateAction(
  id: string,
  formData: FormData
): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const parsed = templateSchema.safeParse({
    judul: formData.get("judul"),
    isi: formData.get("isi"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  await adminDb.collection("templateBalasan").doc(id).set(parsed.data);
  await catatAudit(admin.nama, "Ubah Template Balasan", parsed.data.judul);

  return { success: true };
}

export async function deleteTemplateAction(id: string, judul: string): Promise<MutateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  await adminDb.collection("templateBalasan").doc(id).delete();
  await catatAudit(admin.nama, "Hapus Template Balasan", judul);

  return { success: true };
}
