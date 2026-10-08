import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { buatToken, sidikKode, tokenBerlaku } from "@/lib/akses/token-akses";

/**
 * Gerbang Kode Akses Sekolah (sisi server). Kodenya diatur Super Admin di
 * App B dan tersimpan di `settings/akses` — dokumen yang sama dibaca App A
 * dan App B, jadi satu kode berlaku untuk keduanya.
 */

export const COOKIE_AKSES = "ra_akses";
/** Satu tahun ajaran kurang lebih. Ganti kode di App B untuk memaksa semua perangkat memasukkan ulang. */
export const DURASI_AKSES_MS = 365 * 24 * 60 * 60 * 1000;

export interface PengaturanAkses {
  /** false = gerbang mati (kode belum dibuat, atau dimatikan Super Admin). */
  aktif: boolean;
  kode: string | null;
}

/**
 * Dibaca sekali per request (React cache). Kalau Firestore gagal dibaca,
 * gerbang DIBUKA, bukan ditutup: kode akses hanya penyaring orang luar,
 * sedangkan layanan konseling yang mendadak tidak bisa dibuka siapa pun
 * jauh lebih merugikan siswa yang sedang butuh.
 */
export const bacaPengaturanAkses = cache(async (): Promise<PengaturanAkses> => {
  try {
    const snap = await adminDb.collection("settings").doc("akses").get();
    const data = snap.data();
    const kode = typeof data?.kode === "string" && data.kode.length > 0 ? data.kode : null;
    return { aktif: data?.aktif === true && kode !== null, kode };
  } catch (err) {
    console.error("[bacaPengaturanAkses] gagal, gerbang dibuka sementara:", err);
    return { aktif: false, kode: null };
  }
});

/**
 * Kunci tanda tangan token diturunkan dari private key Service Account yang
 * memang sudah ada di env kedua aplikasi — tidak perlu env rahasia baru.
 */
function kunciTandaTangan(): string {
  const rahasia = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  return createHash("sha256").update(`ruang-aman-akses|${rahasia}`).digest("hex");
}

/** true kalau gerbang mati, atau perangkat ini sudah memasukkan kode yang berlaku. */
export async function punyaAksesSekolah(): Promise<boolean> {
  // Cookie dibaca PALING DULU: itu yang membuat halaman selalu dirender per
  // request. Kalau Firestore dibaca duluan dan gerbang kebetulan mati saat
  // build, halaman bisa ikut dibuat statis — lalu tetap terbuka walaupun
  // Super Admin menyalakan kode akses belakangan.
  const token = (await cookies()).get(COOKIE_AKSES)?.value;
  const akses = await bacaPengaturanAkses();
  if (!akses.aktif || !akses.kode) return true;
  return tokenBerlaku(token, kunciTandaTangan(), sidikKode(akses.kode), Date.now());
}

/** Pasang cookie akses untuk kode yang sedang berlaku. Panggil hanya dari Server Action. */
export async function pasangCookieAkses(kode: string): Promise<void> {
  const token = buatToken(kunciTandaTangan(), sidikKode(kode), Date.now(), DURASI_AKSES_MS);
  (await cookies()).set(COOKIE_AKSES, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(DURASI_AKSES_MS / 1000),
    path: "/",
  });
}

export const PESAN_BUTUH_KODE = "Masukkan kode akses sekolah dulu. Muat ulang halaman ini.";
