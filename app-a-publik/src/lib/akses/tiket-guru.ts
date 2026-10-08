import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedGuru, type AuthenticatedGuru } from "@/lib/session/guru-session";
import { aksesGuru, bacaPenugasan, pesanTolak } from "@/lib/akses/aturan-tiket";

export type HasilAksesTiket =
  | {
      ok: true;
      guru: AuthenticatedGuru;
      ref: FirebaseFirestore.DocumentReference;
      data: FirebaseFirestore.DocumentData;
    }
  | { ok: false; error: string };

/**
 * Pintu tunggal semua aksi Guru BK yang menyentuh satu curhatan: sesi guru
 * valid + curhatan ada + curhatan ditugaskan ke guru ini. Setiap Server
 * Action yang menerima `kode` dari browser WAJIB lewat sini — memeriksa di
 * tampilan saja tidak cukup, karena Server Action bisa dipanggil langsung.
 */
export async function aksesTiketGuru(kode: string): Promise<HasilAksesTiket> {
  const guru = await getAuthenticatedGuru();
  if (!guru) return { ok: false, error: "Sesi login habis, silakan login ulang." };
  if (typeof kode !== "string" || kode.length === 0 || kode.length > 40 || kode.includes("/")) {
    return { ok: false, error: "Kode curhatan tidak valid." };
  }

  const ref = adminDb.collection("curhatan").doc(kode);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Curhatan ini sudah tidak ada." };

  const data = snap.data() ?? {};
  const akses = aksesGuru(bacaPenugasan(data.guruDitugaskan), guru.uid);
  if (!akses.boleh) return { ok: false, error: pesanTolak(akses) };

  return { ok: true, guru, ref, data };
}
