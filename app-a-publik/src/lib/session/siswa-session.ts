import "server-only";
import { cookies } from "next/headers";
import { randomUUID, timingSafeEqual } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifyPassword } from "@/lib/crypto/password";
import {
  DURASI_SESI_MS,
  hapusSesi,
  sesiMasihBerlaku,
  tambahSesi,
  type PetaSesi,
} from "@/lib/session/sesi-util";

const COOKIE_NAME = "curhat_session";

/**
 * Sesi siswa BERUMUR PANJANG dan BOLEH DI BANYAK PERANGKAT.
 *
 * Versi pertama aplikasi ini memberi sesi 1 jam dan hanya satu perangkat
 * sekaligus: membuka dari HP lain langsung mematikan sesi sebelumnya. Akibatnya
 * siswa merasa "kodenya hilang" padahal sebenarnya cuma terlempar keluar terus
 * dan tidak pernah sempat menyimpan kodenya. Ini akar keluhan yang dilaporkan,
 * dan inilah perbaikannya.
 */
/**
 * Pesan galat SENGAJA sama untuk "kode tidak ada" dan "password salah".
 * Membedakan keduanya sama saja memberi tahu orang luar kode mana yang benar-
 * benar berisi curhatan — padahal fakta bahwa seseorang pernah curhat saja
 * sudah informasi yang tidak boleh bocor.
 */
const PESAN_GAGAL = "Kode Konseling atau password salah.";

export async function verifyAndCreateSiswaSession(
  kodeInput: string,
  password: string
): Promise<{ success: true } | { success: false; error: string }> {
  const kode = kodeInput.trim().toUpperCase();
  const ticketRef = adminDb.collection("curhatan").doc(kode);
  const snap = await ticketRef.get();

  if (!snap.exists) return { success: false, error: PESAN_GAGAL };

  const data = snap.data() ?? {};
  const passwordHash = data.passwordHash as string | undefined;
  const valid = passwordHash ? await verifyPassword(password, passwordHash) : false;
  if (!valid) return { success: false, error: PESAN_GAGAL };

  const token = randomUUID();

  const peta = tambahSesi(data.sesiSiswa as PetaSesi | undefined, token);

  await ticketRef.update({
    sesiSiswa: peta,
    // Field sesi versi lama dikosongkan supaya tidak ada dua sumber kebenaran.
    sessionToken: null,
    sessionExpiresAt: null,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${kode}::${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.floor(DURASI_SESI_MS / 1000),
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
  if (!kode || !token) return null;

  const snap = await adminDb.collection("curhatan").doc(kode).get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  if (sesiMasihBerlaku(data.sesiSiswa as PetaSesi | undefined, token)) return kode;

  // Jalur lama (sebelum sesi multi-perangkat) — tetap dilayani supaya siswa
  // yang sesinya masih hidup saat pembaruan ini dipasang tidak terlempar
  // keluar. Bisa dihapus setelah beberapa minggu berjalan.
  const tokenLama = data.sessionToken as string | undefined;
  const sampaiLama = data.sessionExpiresAt as Timestamp | undefined;
  if (
    tokenLama &&
    tokenLama.length === token.length &&
    timingSafeEqual(Buffer.from(tokenLama), Buffer.from(token)) &&
    sampaiLama &&
    sampaiLama.toMillis() > Date.now()
  ) {
    return kode;
  }

  return null;
}

export async function clearSiswaSession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;

  // Sesi juga dicabut di sisi server, bukan cuma cookie-nya dihapus — supaya
  // "keluar" di HP pinjaman benar-benar berarti keluar.
  if (raw && raw.includes("::")) {
    const [kode, token] = raw.split("::");
    try {
      const ref = adminDb.collection("curhatan").doc(kode);
      const snap = await ref.get();
      if (snap.exists) {
        const peta = hapusSesi(snap.data()?.sesiSiswa as PetaSesi | undefined, token);
        await ref.update({ sesiSiswa: peta });
      }
    } catch {
      // Gagal mencabut di server tidak boleh menghalangi siswa keluar.
    }
  }

  cookieStore.delete(COOKIE_NAME);
}

export const DURASI_SESI_HARI = Math.round(DURASI_SESI_MS / (1000 * 60 * 60 * 24));
export { PESAN_GAGAL };
