import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { HARI_PIKET, JADWAL_PIKET_KOSONG, type HariPiket, type JadwalPiket } from "@/types/admin";

/**
 * Baca jadwal piket Guru BK dari `settings/piket` (TAHAP 9). Kalau dokumen
 * belum pernah dibuat atau field suatu hari belum ada, hari itu dianggap
 * kosong (belum ada yang piket) — bukan error, konsisten dengan pola
 * getSekolahSettings/getStatistikCurhatan (dashboard tetap tampil normal
 * walau datanya belum lengkap).
 */
export async function getJadwalPiket(): Promise<JadwalPiket> {
  try {
    const snap = await adminDb.collection("settings").doc("piket").get();
    if (!snap.exists) return JADWAL_PIKET_KOSONG;
    const data = snap.data() ?? {};
    return { ...JADWAL_PIKET_KOSONG, ...data } as JadwalPiket;
  } catch (err) {
    console.error("[getJadwalPiket] gagal baca jadwal piket, pakai kosong:", err);
    return JADWAL_PIKET_KOSONG;
  }
}

export interface GuruPiketNama {
  uid: string;
  nama: string;
}

export type JadwalPiketNama = Record<HariPiket, GuruPiketNama[]>;

/**
 * Sama seperti `getJadwalPiket()`, tapi UID sudah di-resolve jadi nama —
 * dipakai kalender di dashboard utama (TAHAP 9 — redesain) yang perlu
 * tampilkan nama Guru BK piket untuk SEMUA hari sekaligus (bukan cuma hari
 * ini), jadi tidak dipecah query per-hari seperti `getPiketHariIni` App A.
 */
export async function getJadwalPiketDenganNama(): Promise<JadwalPiketNama> {
  const kosong = {} as JadwalPiketNama;
  for (const hari of HARI_PIKET) kosong[hari] = [];

  try {
    const [jadwal, guruSnap] = await Promise.all([
      getJadwalPiket(),
      adminDb.collection("guru").get(),
    ]);

    const namaByUid = new Map<string, string>();
    guruSnap.docs.forEach((d) => namaByUid.set(d.id, (d.data().nama as string) ?? "Guru BK"));

    const hasil = {} as JadwalPiketNama;
    for (const hari of HARI_PIKET) {
      hasil[hari] = jadwal[hari].map((uid) => ({ uid, nama: namaByUid.get(uid) ?? "Guru BK" }));
    }
    return hasil;
  } catch (err) {
    console.error("[getJadwalPiketDenganNama] gagal baca jadwal piket, pakai kosong:", err);
    return kosong;
  }
}
