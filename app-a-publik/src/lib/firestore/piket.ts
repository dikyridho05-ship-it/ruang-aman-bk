import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { hariWib } from "@/lib/janji/aturan";

export interface GuruPiket {
  uid: string;
  nama: string;
}


/**
 * Baca Guru BK yang piket HARI INI dari `settings/piket` (TAHAP 9, diatur
 * Super Admin lewat App B — lihat app-b-admin/src/lib/firestore/piket.ts
 * untuk penulisannya). READ-ONLY di sini, ditampilkan sebagai pengingat di
 * dashboard Guru BK — terutama berguna menjelang musim ujian (Asesmen
 * Sumatif) yang biasanya lebih rawan lonjakan stres siswa.
 *
 * Ambil dokumen `guru/{uid}` satu-satu (bukan query) karena jumlah piket per
 * hari selalu kecil (jarang lebih dari beberapa orang); filter `aktif` lagi
 * di sini jaga-jaga kalau ada Guru BK yang dinonaktifkan setelah jadwal
 * piket-nya diatur.
 */
export async function getPiketHariIni(): Promise<GuruPiket[]> {
  try {
    // Hari menurut WIB — server Vercel berjalan di UTC, jadi getDay() biasa
    // menunjuk hari kemarin antara pukul 00.00–07.00 WIB.
    const hariIni = hariWib(Date.now());
    const snap = await adminDb.collection("settings").doc("piket").get();
    if (!snap.exists) return [];

    const uids = (snap.data()?.[hariIni] as string[] | undefined) ?? [];
    if (uids.length === 0) return [];

    const guruSnaps = await Promise.all(
      uids.map((uid) => adminDb.collection("guru").doc(uid).get())
    );

    return guruSnaps
      .filter((s) => s.exists && s.data()?.aktif === true)
      .map((s) => ({ uid: s.id, nama: (s.data()?.nama as string) ?? "Guru BK" }));
  } catch (err) {
    console.error("[getPiketHariIni] gagal baca jadwal piket, pakai kosong:", err);
    return [];
  }
}
