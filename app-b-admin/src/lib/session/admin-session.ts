import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5; // 5 hari

export interface AuthenticatedAdmin {
  uid: string;
  nama: string;
  email: string;
}

/**
 * Sama persis polanya dengan sesi Guru BK di App A (lihat catatan di sana):
 * sign-in Firebase Auth terjadi di client, lalu di sini diverifikasi ulang
 * secara kriptografis + dicek terdaftar & aktif di collection `admins`
 * sebelum session cookie httpOnly dibuat. Akun Firebase Auth yang login
 * tapi belum terdaftar di `admins` TETAP DITOLAK — mencegah sembarang akun
 * Firebase project ini otomatis jadi Super Admin.
 */
export async function createAdminSession(
  idToken: string
): Promise<{ success: true } | { success: false; error: string }> {
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (err) {
    console.error("[createAdminSession] verifyIdToken gagal:", err);
    return { success: false, error: "Sesi login tidak valid. Coba login ulang." };
  }

  const adminSnap = await adminDb.collection("admins").doc(decoded.uid).get();
  if (!adminSnap.exists || adminSnap.data()?.aktif !== true) {
    return {
      success: false,
      error: "Akun ini belum terdaftar sebagai Super Admin aktif.",
    };
  }

  let sessionCookie: string;
  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
  } catch (err) {
    console.error("[createAdminSession] createSessionCookie gagal:", err);
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

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Dipanggil di setiap Server Component/Action App B yang perlu proteksi.
 * Verifikasi penuh terjadi tiap kali dipanggil (bukan cuma cek cookie
 * ada/tidak) — App B juga sengaja tidak pakai middleware.ts, sama seperti
 * App A (Admin SDK butuh Node.js runtime, bukan Edge).
 */
export async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const adminSnap = await adminDb.collection("admins").doc(decoded.uid).get();
    if (!adminSnap.exists || adminSnap.data()?.aktif !== true) return null;

    return {
      uid: decoded.uid,
      nama: (adminSnap.data()?.nama as string) ?? "Super Admin",
      email: decoded.email ?? "",
    };
  } catch {
    return null;
  }
}
