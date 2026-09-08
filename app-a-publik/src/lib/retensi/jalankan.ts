import "server-only";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { RetensiSettings } from "@/lib/firestore/settings";
import type { TicketStatus } from "@/types/ticket";

export interface HasilRetensi {
  tutupCount: number;
  hapusCount: number;
}

const MS_PER_HARI = 24 * 60 * 60 * 1000;

/**
 * Jalankan kebijakan retensi & arsip otomatis (TAHAP 8) atas SATU database
 * Firestore yang sama, dipanggil dari dua tempat: route terproteksi App A
 * (`/api/retensi`, untuk cron eksternal setelah proyek di-deploy) dan
 * tombol "Jalankan Sekarang" di App B (Super Admin). Dua langkah, berurutan:
 *
 * 1. Tutup otomatis — tiket yang statusnya belum "selesai" tapi tidak ada
 *    aktivitas (updatedAt) selama >= tutupOtomatisHari, ditandai "selesai"
 *    (+ `ditutupOtomatis: true` supaya Guru BK tahu ini bukan dia yang tutup).
 * 2. Hapus otomatis — tiket yang SUDAH "selesai" (sebelum langkah 1 di atas
 *    berjalan, bukan yang baru ditutup barusan) selama >= hapusOtomatisHari
 *    sejak updatedAt terakhirnya, dihapus permanen berikut subcollection
 *    `pesan`-nya (recursiveDelete) — ini yang membuat masa tunggunya betul-betul
 *    terhitung SEJAK ditutup, bukan dari saat data dibuat.
 *
 * Pakai `.select(...)` (pola sama seperti getStatistikCurhatan di App B)
 * supaya isi curhatan/pesan tidak pernah ikut terbaca cuma untuk memutuskan
 * mana yang kedaluwarsa.
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
      const status = data.status as TicketStatus | undefined;
      const updatedAtMs = data.updatedAt?.toMillis ? (data.updatedAt.toMillis() as number) : null;
      if (updatedAtMs === null) continue;

      const umurHari = (now - updatedAtMs) / MS_PER_HARI;

      if (settings.tutupOtomatisHari > 0 && status !== "selesai" && umurHari >= settings.tutupOtomatisHari) {
        kandidatTutup.push(doc.id);
      }
      // Sengaja dicek dari status ASLI (sebelum kandidatTutup dieksekusi) —
      // tiket yang baru ditutup otomatis di run ini TIDAK BOLEH langsung ikut
      // terhapus juga; dia harus menunggu hapusOtomatisHari-nya sendiri.
      if (settings.hapusOtomatisHari > 0 && status === "selesai" && umurHari >= settings.hapusOtomatisHari) {
        kandidatHapus.push(doc.id);
      }
    }

    // Tutup otomatis — batch 400 per commit (di bawah limit 500 operasi Firestore).
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

    // Hapus otomatis — recursiveDelete per dokumen (menghapus subcollection
    // `pesan` sekalian), tidak bisa lewat WriteBatch biasa.
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
 * kartu "Indikator Kesehatan Sistem" di dashboard Super Admin (App B). Sengaja
 * tidak pernah melempar error sendiri (pola sama seperti `catatAudit` di App
 * B): gagal mencatat status TIDAK BOLEH membuat hasil retensi yang sudah
 * berjalan tampak gagal. Dituliskan dari App A maupun App B (dua-duanya
 * memanggil `jalankanRetensi()` di atas) ke dokumen Firestore yang sama,
 * karena satu backend.
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
