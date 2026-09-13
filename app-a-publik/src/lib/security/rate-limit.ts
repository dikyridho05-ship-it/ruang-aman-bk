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

/* ------------------------------------------------------------------ */
/* Pembatas percobaan untuk halaman yang memeriksa password            */
/* ------------------------------------------------------------------ */

/**
 * Dipakai di halaman cek balasan dan lupa kode. Tanpa ini, siapa pun bisa
 * mencoba password sebanyak-banyaknya tanpa hambatan — dan itulah celah yang
 * paling nyata di aplikasi ini sebelumnya.
 *
 * Jujur soal batasnya: karena berbasis cookie (demi menjaga prinsip tidak
 * merekam IP/perangkat siswa), penyerang yang menghapus cookie bisa memulai
 * hitungan dari nol. Yang membuat penebakan tetap tidak masuk akal adalah
 * gabungannya dengan Kode Konseling acak — menebak dua hal sekaligus, sambil
 * menunggu setiap beberapa percobaan.
 */
interface StatusPercobaan {
  diblokir: boolean;
  sisaDetik: number;
}

function bacaAngka(nilai: string | undefined, bawaan = 0): number {
  const n = Number(nilai);
  return Number.isFinite(n) ? n : bawaan;
}

export async function periksaBatasPercobaan(
  nama: string,
  maks = 5,
  jedaDetik = 300
): Promise<StatusPercobaan> {
  const toko = await cookies();
  const mentah = toko.get(`ra_${nama}`)?.value;
  if (!mentah) return { diblokir: false, sisaDetik: 0 };

  const [jumlahStr, sampaiStr] = mentah.split(":");
  const jumlah = bacaAngka(jumlahStr);
  const sampai = bacaAngka(sampaiStr);

  if (jumlah >= maks && sampai > Date.now()) {
    return { diblokir: true, sisaDetik: Math.ceil((sampai - Date.now()) / 1000) };
  }
  return { diblokir: false, sisaDetik: 0 };
}

export async function catatPercobaanGagal(
  nama: string,
  maks = 5,
  jedaDetik = 300
): Promise<void> {
  const toko = await cookies();
  const mentah = toko.get(`ra_${nama}`)?.value;
  const jumlahLama = mentah ? bacaAngka(mentah.split(":")[0]) : 0;
  const jumlah = jumlahLama + 1;
  const sampai = jumlah >= maks ? Date.now() + jedaDetik * 1000 : 0;

  toko.set(`ra_${nama}`, `${jumlah}:${sampai}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: jedaDetik * 2,
    path: "/",
  });
}

export async function resetPercobaan(nama: string): Promise<void> {
  const toko = await cookies();
  toko.delete(`ra_${nama}`);
}
