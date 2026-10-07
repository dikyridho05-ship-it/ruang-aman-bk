import "server-only";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Janji temu tatap muka untuk kalender Super Admin.
 *
 * Dokumen `janjiTemu` ditulis App A. Di sini HANYA tiga field yang diminta
 * dari Firestore (`.select`): jam, status, dan nama Guru BK. Kode tiket
 * sengaja tidak dibaca — kepala sekolah cukup tahu "ada pertemuan pukul
 * 10.00 dengan Bu Ratna", bukan curhatan mana yang bersangkutan.
 */
export interface JanjiKalender {
  waktuMulaiMs: number;
  dikonfirmasi: boolean;
  guruNama: string | null;
}

export async function getJanjiRentang(dariMs: number, sampaiMs: number): Promise<JanjiKalender[]> {
  try {
    const snap = await adminDb
      .collection("janjiTemu")
      .where("waktuMulaiMs", ">=", dariMs)
      .where("waktuMulaiMs", "<", sampaiMs)
      .select("waktuMulaiMs", "status", "guru")
      .get();
    return snap.docs
      .map((d) => d.data())
      .filter((x) => x.status === "menunggu" || x.status === "dikonfirmasi")
      .map((x) => ({
        waktuMulaiMs: x.waktuMulaiMs as number,
        dikonfirmasi: x.status === "dikonfirmasi",
        guruNama: (x.guru?.nama as string | undefined) ?? null,
      }))
      .sort((a, b) => a.waktuMulaiMs - b.waktuMulaiMs);
  } catch (err) {
    console.error("[getJanjiRentang]", err);
    return [];
  }
}
