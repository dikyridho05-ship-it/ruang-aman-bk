import "server-only";
import { cookies } from "next/headers";

const COOLDOWN_COOKIE_NAME = "curhat_cooldown";
const COOLDOWN_SECONDS = 45;

/**
 * Pembatas laju paling sederhana yang mungkin untuk form curhat publik —
 * SENGAJA tidak berbasis IP address atau fingerprint perangkat apa pun
 * (sesuai prinsip privasi proyek ini sejak awal: tidak ada rekam jejak
 * identitas/perangkat siswa). Cukup cookie httpOnly berumur pendek yang
 * dipasang setelah tiket berhasil dibuat — tidak menyimpan apa-apa selain
 * "browser ini baru saja mengirim curhatan", dan otomatis kedaluwarsa
 * sendiri. Ini menahan spam iseng (mis. QR ditempel di tempat umum lalu
 * ada yang klik-klik submit berkali-kali), bukan pertahanan tingkat
 * enterprise — cukup untuk skala satu sekolah.
 */
export async function isCurhatRateLimited(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(COOLDOWN_COOKIE_NAME);
}

export async function markCurhatSubmitted(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOLDOWN_COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOLDOWN_SECONDS,
    path: "/curhat",
  });
}

export const CURHAT_COOLDOWN_SECONDS = COOLDOWN_SECONDS;
