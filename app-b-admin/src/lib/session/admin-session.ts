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
/**
 * `alasan` membedakan kenapa akun yang SUDAH terbukti pemiliknya (lolos
 * verifikasi token) tetap ditolak, supaya halaman login bisa mengarahkan:
 * belum pernah daftar → ke /daftar, masih menunggu → cukup diberi tahu.
 * Aman dibedakan karena yang menerima pesan ini hanya pemilik akun itu
 * sendiri — beda dengan pesan "email/password salah" yang tetap seragam.
 */
export type AlasanTolakAdmin = "belum-daftar" | "menunggu" | "ditolak" | "nonaktif";

export type HasilSesiAdmin =
  | { success: true }
  | { success: false; error: string; alasan?: AlasanTolakAdmin };

export async function createAdminSession(idToken: string): Promise<HasilSesiAdmin> {
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (err) {
    console.error("[createAdminSession] verifyIdToken gagal:", err);
    return { success: false, error: "Sesi login tidak valid. Coba login ulang." };
  }

  const adminSnap = await adminDb.collection("admins").doc(decoded.uid).get();
  if (!adminSnap.exists || adminSnap.data()?.aktif !== true) {
    if (adminSnap.exists) {
      return {
        success: false,
        alasan: "nonaktif",
        error: "Akun ini sudah dinonaktifkan. Hubungi Super Admin lain kalau ini keliru.",
      };
    }
    const permintaan = await adminDb.collection("permintaanAdmin").doc(decoded.uid).get();
    const status = permintaan.exists ? (permintaan.data()?.status as string) : null;
    if (status === "menunggu") {
      return {
        success: false,
        alasan: "menunggu",
        error:
          "Permintaan akses kamu sudah terkirim dan masih menunggu persetujuan Super Admin.",
      };
    }
    if (status === "ditolak") {
      return {
        success: false,
        alasan: "ditolak",
        error: "Permintaan akses untuk akun ini ditolak. Kamu bisa mengajukan ulang dari halaman daftar.",
      };
    }
    return {
      success: false,
      alasan: "belum-daftar",
      error: "Akun ini belum punya akses ke dasbor Super Admin.",
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
