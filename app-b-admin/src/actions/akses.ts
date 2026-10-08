"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedAdmin } from "@/lib/session/admin-session";
import { catatAudit } from "@/lib/audit/log";
import { bacaPengaturanAkses, pasangCookieAkses } from "@/lib/akses/akses-sekolah";
import { kodeCocok, normalisasiKode, PANJANG_KODE_MAKS, periksaKodeBaru } from "@/lib/akses/token-akses";

/* ------------------------------------------------------------------ */
/* Gerbang: memasukkan kode di perangkat ini                            */
/* ------------------------------------------------------------------ */

const COOKIE_PERCOBAAN = "ra_percobaan_kode";
const MAKS_PERCOBAAN = 5;
const JEDA_MS = 5 * 60 * 1000;

/**
 * Kode pemulihan (opsional) dari env Vercel App B. Hanya diterima di App B,
 * untuk Super Admin yang lupa kode akses sekolah — tanpa ini, satu-satunya
 * jalan adalah mengubah dokumen `settings/akses` lewat Firebase Console.
 */
function kodePemulihan(): string | null {
  const k = process.env.KODE_AKSES_PEMULIHAN?.trim();
  return k && periksaKodeBaru(k) === null ? k : null;
}

export async function masukDenganKodeAksesAction(
  masukan: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const toko = await cookies();
  const [jumlahStr, sampaiStr] = (toko.get(COOKIE_PERCOBAAN)?.value ?? "0:0").split(":");
  const jumlah = Number(jumlahStr) || 0;
  const sampai = Number(sampaiStr) || 0;
  if (jumlah >= MAKS_PERCOBAAN && sampai > Date.now()) {
    const menit = Math.max(1, Math.ceil((sampai - Date.now()) / 60000));
    return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.` };
  }

  const akses = await bacaPengaturanAkses();
  if (!akses.aktif || !akses.kode) return { success: true };

  const pemulihan = kodePemulihan();
  const valid =
    typeof masukan === "string" &&
    masukan.length <= PANJANG_KODE_MAKS * 2 &&
    (kodeCocok(masukan, akses.kode) || (pemulihan !== null && kodeCocok(masukan, pemulihan)));

  if (!valid) {
    const baru = jumlah >= MAKS_PERCOBAAN ? 1 : jumlah + 1;
    toko.set(COOKIE_PERCOBAAN, `${baru}:${baru >= MAKS_PERCOBAAN ? Date.now() + JEDA_MS : 0}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: (JEDA_MS / 1000) * 2,
      path: "/",
    });
    return { success: false, error: "Kode akses salah." };
  }

  toko.delete(COOKIE_PERCOBAAN);
  await pasangCookieAkses(akses.kode);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Pengaturan oleh Super Admin                                          */
/* ------------------------------------------------------------------ */

export interface KodeAksesAdmin {
  aktif: boolean;
  kode: string | null;
  diubahPadaMs: number | null;
  diubahOleh: string | null;
}

export async function getKodeAksesAdmin(): Promise<KodeAksesAdmin | null> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return null;
  const snap = await adminDb.collection("settings").doc("akses").get();
  const d = snap.data();
  return {
    aktif: d?.aktif === true,
    kode: typeof d?.kode === "string" && d.kode.length > 0 ? d.kode : null,
    diubahPadaMs: d?.diubahPada?.toMillis?.() ?? null,
    diubahOleh: typeof d?.diubahOleh === "string" ? d.diubahOleh : null,
  };
}

/**
 * Simpan kode akses sekolah. Mengganti kode = semua perangkat (siswa, Guru
 * BK, Super Admin lain) harus memasukkan kode baru; perangkat Super Admin
 * yang menyimpan langsung diberi akses supaya tidak terkunci sendiri.
 */
export async function simpanKodeAksesAction(input: {
  kode: string;
  aktif: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return { success: false, error: "Sesi login habis, silakan login ulang." };

  const kode = normalisasiKode(input.kode ?? "");
  if (kode.length > 0 || input.aktif) {
    const galat = periksaKodeBaru(kode);
    if (galat) return { success: false, error: galat };
  }

  const ref = adminDb.collection("settings").doc("akses");
  const lama = (await ref.get()).data();
  const kodeLama = typeof lama?.kode === "string" ? lama.kode : null;
  const aktifLama = lama?.aktif === true;

  await ref.set(
    {
      kode: kode.length > 0 ? kode : null,
      aktif: input.aktif && kode.length > 0,
      diubahPada: FieldValue.serverTimestamp(),
      diubahOleh: admin.nama,
    },
    { merge: true },
  );

  const detail: string[] = [];
  if (kodeLama !== (kode || null)) detail.push(kodeLama ? "kode diganti" : "kode dibuat");
  if (aktifLama !== (input.aktif && kode.length > 0)) detail.push(input.aktif ? "gerbang dinyalakan" : "gerbang dimatikan");
  await catatAudit(admin.nama, "Ubah Kode Akses Sekolah", detail.join(", ") || "tanpa perubahan");

  if (kode.length > 0) await pasangCookieAkses(kode);
  return { success: true };
}
