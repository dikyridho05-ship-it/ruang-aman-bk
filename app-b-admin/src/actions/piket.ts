"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";
import { HARI_PIKET, HARI_PIKET_LABEL } from "@/types/admin";

type UpdateResult = { success: boolean; error?: string };

const piketSchema = z.record(z.string(), z.array(z.string()));

/**
 * Form mengirim satu field checkbox PER HARI, tiap field bisa punya banyak
 * value (UID Guru BK yang dicentang) — `formData.getAll(hari)` otomatis
 * mengembalikan semua value bernama sama, jadi tidak perlu encoding manual
 * (JSON, comma-separated, dst) di sisi client.
 */
export async function updatePiketAction(formData: FormData): Promise<UpdateResult> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const jadwal: Record<string, string[]> = {};
  for (const hari of HARI_PIKET) {
    jadwal[hari] = formData.getAll(hari).map(String);
  }

  const parsed = piketSchema.safeParse(jadwal);
  if (!parsed.success) {
    return { success: false, error: "Data tidak valid." };
  }

  await adminDb.collection("settings").doc("piket").set(parsed.data);

  const ringkasan =
    HARI_PIKET.filter((h) => jadwal[h].length > 0)
      .map((h) => `${HARI_PIKET_LABEL[h]} (${jadwal[h].length})`)
      .join(", ") || "semua hari dikosongkan";
  await catatAudit(admin.nama, "Ubah Jadwal Piket Guru BK", ringkasan);

  return { success: true };
}
