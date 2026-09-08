import "server-only";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { RetensiSettings } from "@/types/admin";

export interface HasilRetensi {
  tutupCount: number;
  hapusCount: number;
}

const MS_PER_HARI = 24 * 60 * 60 * 1000;

/**
 * Sengaja diduplikasi persis dari
 * app-a-publik/src/lib/retensi/jalankan.ts (App A & App B tetap dua aplikasi
 * terpisah) — dipanggil dari tombol "Jalankan Sekarang" di halaman
 * Pengaturan, pakai Admin SDK App B sendiri (Firestore project-nya sama
 * dengan App A, jadi bisa baca/tulis collection `curhatan` langsung tanpa
 * perlu memanggil App A lewat HTTP). Lihat App A untuk versi cron eksternal
 * (`/api/retensi`) yang jalan otomatis setelah proyek di-deploy.
 */
export async function jalankanRetensi(
  db: Firestore,
  settings: RetensiSettings
): Promise<HasilRetensi> {
  if (!settings.aktif) return { tutupCount: 0, hapusCount: 0 };

  try {
    const now = Date.now();
    const snap = await db.collection("curhatan").select("status", "updatedAt").get();

    const kandidatTutup: string[] = [];
    const kandidatHapus: string[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const status = data.status as string | undefined;
      const updatedAtMs = data.updatedAt?.toMillis ? (data.updatedAt.toMillis() as number) : null;
      if (updatedAtMs === null) continue;

      const umurHari = (now - updatedAtMs) / MS_PER_HARI;

      if (settings.tutupOtomatisHari > 0 && status !== "selesai" && umurHari >= settings.tutupOtomatisHari) {
        kandidatTutup.push(doc.id);
      }
      if (settings.hapusOtomatisHari > 0 && status === "selesai" && umurHari >= settings.hapusOtomatisHari) {
        kandidatHapus.push(doc.id);
      }
    }

    for (let i = 0; i < kandidatTutup.length; i += 400) {
      const batch = db.batch();
      for (const kode of kandidatTutup.slice(i, i + 400)) {
        batch.update(db.collection("curhatan").doc(kode), {
          status: "selesai",
          ditutupOtomatis: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }

    for (const kode of kandidatHapus) {
      await db.recursiveDelete(db.collection("curhatan").doc(kode));
    }

    const hasil: HasilRetensi = { tutupCount: kandidatTutup.length, hapusCount: kandidatHapus.length };
    await catatStatusRetensi(db, { ...hasil, sukses: true });
    return hasil;
  } catch (err) {
    console.error("[jalankanRetensi] gagal menjalankan retensi:", err);
    await catatStatusRetensi(db, {
      tutupCount: 0,
      hapusCount: 0,
      sukses: false,
      pesanError: err instanceof Error ? err.message : "Gagal menjalankan retensi.",
    });
    throw err;
  }
}

/**
 * Catat hasil run TERAKHIR ke `settings/sistemStatus` (TAHAP 9) — dibaca oleh
 * kartu "Indikator Kesehatan Sistem" di dashboard Super Admin. Sengaja tidak
 * pernah melempar error sendiri (pola sama seperti `catatAudit`): gagal
 * mencatat status TIDAK BOLEH membuat hasil retensi yang sudah berjalan
 * tampak gagal.
 */
async function catatStatusRetensi(
  db: Firestore,
  hasil: { tutupCount: number; hapusCount: number; sukses: boolean; pesanError?: string }
): Promise<void> {
  try {
    await db
      .collection("settings")
      .doc("sistemStatus")
      .set({ retensiTerakhir: { waktuMs: Date.now(), ...hasil } }, { merge: true });
  } catch (err) {
    console.error("[catatStatusRetensi] gagal menulis status sistem:", err);
  }
}
