import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifyPassword } from "@/lib/crypto/password";

const COOKIE_NAME = "curhat_session";
const SESSION_DURATION_MS = 1000 * 60 * 60; // 1 jam tidak aktif

/**
 * Sesi "cek balasan" siswa TIDAK pakai Firebase Auth (siswa memang sengaja
 * tidak punya akun) dan TIDAK pakai JWT/secret baru (supaya tidak perlu
 * tambah env var baru). Sebagai gantinya, token sesi disimpan di Firestore
 * sendiri di dalam dokumen tiketnya — cukup satu field, dicocokkan tiap
 * request. Efek sampingnya: cuma satu sesi aktif per tiket dalam satu waktu
 * (device/tab lain akan diminta verifikasi ulang) — ini sengaja, bukan bug.
 */
export async function verifyAndCreateSiswaSession(
  kodeInput: string,
  password: string
): Promise<{ success: true } | { success: false; error: string }> {
  const kode = kodeInput.trim().toUpperCase();
  const ticketRef = adminDb.collection("curhatan").doc(kode);
  const snap = await ticketRef.get();

  if (!snap.exists) {
    return { success: false, error: "Kode Konseling tidak ditemukan." };
  }

  const passwordHash = snap.data()?.passwordHash as string | undefined;
  const valid = passwordHash ? await verifyPassword(password, passwordHash) : false;
  if (!valid) {
    return { success: false, error: "Kode atau password salah." };
  }

  const token = randomUUID();
  const expiresAt = Timestamp.fromMillis(Date.now() + SESSION_DURATION_MS);
  await ticketRef.update({ sessionToken: token, sessionExpiresAt: expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${kode}::${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });

  return { success: true };
}

/** Dipanggil dari actions/chat.ts — mengembalikan Kode Konseling kalau sesi masih valid. */
export async function getAuthenticatedSiswaKode(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw || !raw.includes("::")) return null;

  const [kode, token] = raw.split("::");
  const snap = await adminDb.collection("curhatan").doc(kode).get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  const expiresAt = data.sessionExpiresAt as Timestamp | undefined;
  const tokenMatches = data.sessionToken === token;
  const notExpired = !!expiresAt && expiresAt.toMillis() > Date.now();

  return tokenMatches && notExpired ? kode : null;
}

export async function clearSiswaSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
