import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "guru_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5; // 5 hari

export interface AuthenticatedGuru {
  uid: string;
  nama: string;
  email: string;
}

/**
 * Dipanggil dari actions/auth.ts setelah client sign-in Firebase Auth berhasil.
 * `idToken` harus masih segar (baru didapat dari client, belum lewat beberapa menit).
 *
 * Dua lapis pemeriksaan sebelum sesi dibuat:
 * 1. Token itu benar-benar valid token Firebase Auth (verifyIdToken).
 * 2. UID-nya terdaftar sebagai Guru BK AKTIF di collection `guru` — akun
 *    Firebase Auth yang login tapi belum didaftarkan Super Admin (App B /
 *    TAHAP 5) ke koleksi ini TETAP DITOLAK, tidak otomatis dianggap Guru BK.
 */
export async function createGuruSession(
  idToken: string
): Promise<{ success: true } | { success: false; error: string }> {
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (err) {
    console.error("[createGuruSession] verifyIdToken gagal:", err);
    return { success: false, error: "Sesi login tidak valid. Coba login ulang." };
  }

  const guruSnap = await adminDb.collection("guru").doc(decoded.uid).get();
  if (!guruSnap.exists || guruSnap.data()?.aktif !== true) {
    return {
      success: false,
      error: "Akun ini belum terdaftar sebagai Guru BK aktif. Hubungi Super Admin.",
    };
  }

  let sessionCookie: string;
  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
  } catch (err) {
    console.error("[createGuruSession] createSessionCookie gagal:", err);
    return { success: false, error: "Gagal membuat sesi. Coba lagi." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });

  return { success: true };
}

export async function clearGuruSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Dipanggil di setiap Server Component/Action halaman Guru BK yang perlu
 * proteksi. Verifikasi kriptografis PENUH terjadi di sini setiap kali
 * dipanggil (bukan cuma cek cookie ada/tidak) — jadi tetap aman walau
 * proyek ini sengaja tidak pakai middleware.ts (Admin SDK butuh Node.js
 * runtime, bukan Edge, supaya tidak ribet dipaksakan ke middleware).
 */
export async function getAuthenticatedGuru(): Promise<AuthenticatedGuru | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const guruSnap = await adminDb.collection("guru").doc(decoded.uid).get();
    if (!guruSnap.exists || guruSnap.data()?.aktif !== true) return null;

    return {
      uid: decoded.uid,
      nama: (guruSnap.data()?.nama as string) ?? "Guru BK",
      email: decoded.email ?? "",
    };
  } catch {
    // Cookie kedaluwarsa/tidak valid/di-revoke — anggap saja belum login.
    return null;
  }
}
