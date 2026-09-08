import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AuditLogEntry } from "@/types/admin";

/**
 * Catat satu baris audit log (TAHAP 8) — dipanggil dari Server Action App B
 * yang mengubah sesuatu (akun Guru BK, pengaturan sekolah, retensi manual).
 * Sengaja tidak pernah melempar error: gagal mencatat audit TIDAK BOLEH
 * membuat aksi aslinya (yang sudah berhasil) tampak gagal ke Super Admin.
 */
export async function catatAudit(aktor: string, aksi: string, detail: string): Promise<void> {
  try {
    await adminDb.collection("auditLog").add({
      aktor,
      aksi,
      detail,
      waktu: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[catatAudit] gagal menulis audit log:", err);
  }
}

/** Baca N entri audit log terbaru untuk halaman /audit-log. Kegagalan baca tidak boleh merusak halaman — kembalikan array kosong. */
export async function getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  try {
    const snap = await adminDb.collection("auditLog").orderBy("waktu", "desc").limit(limit).get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        waktuMs: data.waktu?.toMillis ? (data.waktu.toMillis() as number) : Date.now(),
        aktor: (data.aktor as string) ?? "(tidak diketahui)",
        aksi: (data.aksi as string) ?? "(tidak diketahui)",
        detail: (data.detail as string) ?? "",
      };
    });
  } catch (err) {
    console.error("[getAuditLog] gagal baca audit log:", err);
    return [];
  }
}
