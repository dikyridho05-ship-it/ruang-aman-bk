import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { RetensiTerakhir, SistemStatus } from "@/types/admin";

/**
 * Ringkasan kesehatan sistem (TAHAP 9) untuk dashboard Super Admin: kapan
 * retensi otomatis terakhir jalan (ditulis oleh `jalankanRetensi()` sendiri,
 * lihat lib/retensi/jalankan.ts) dan jumlah dokumen tersimpan. Pakai query
 * agregasi `.count()` (bukan `.get()` lalu `.size`) supaya tidak menarik
 * seluruh dokumen ke memori hanya untuk menghitung jumlahnya.
 */
export async function getSistemStatus(): Promise<SistemStatus> {
  try {
    const [statusSnap, tiketCount, auditCount] = await Promise.all([
      adminDb.collection("settings").doc("sistemStatus").get(),
      adminDb.collection("curhatan").count().get(),
      adminDb.collection("auditLog").count().get(),
    ]);

    const retensiTerakhir = (statusSnap.data()?.retensiTerakhir as RetensiTerakhir | undefined) ?? null;

    return {
      retensiTerakhir,
      totalTiket: tiketCount.data().count,
      totalAuditLog: auditCount.data().count,
    };
  } catch (err) {
    console.error("[getSistemStatus] gagal baca status sistem, pakai kosong:", err);
    return { retensiTerakhir: null, totalTiket: 0, totalAuditLog: 0 };
  }
}
