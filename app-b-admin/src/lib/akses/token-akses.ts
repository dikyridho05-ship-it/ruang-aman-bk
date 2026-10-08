/**
 * Kode Akses Sekolah — bagian murni (tanpa Firestore/cookie) supaya bisa
 * diuji langsung (scripts/uji-kode-akses.ts). Berkas ini SENGAJA sama persis
 * di App A dan App B: kedua aplikasi harus menormalkan dan memeriksa kode
 * dengan cara yang identik.
 *
 * Satu sekolah = satu kode, dipakai bersama oleh siswa, Guru BK, dan Super
 * Admin. Setelah kode benar dimasukkan, perangkat itu mendapat cookie berisi
 * TOKEN — bukan kodenya. Token hanya berisi waktu kedaluwarsa dan tanda
 * tangan; tidak ada nama, NIS, atau apa pun yang mengenali siswa. Tanda
 * tangannya ikut "mengunci" sidik kode yang sedang berlaku, jadi begitu
 * Super Admin mengganti kode, semua token lama otomatis tidak berlaku.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";

export const PANJANG_KODE_MIN = 6;
export const PANJANG_KODE_MAKS = 20;

/** Huruf besar, tanpa spasi & tanda hubung — "ra-7k3m 9q" sama dengan "RA7K3M9Q". */
export function normalisasiKode(masukan: string): string {
  return masukan.toUpperCase().replace(/[\s-]+/g, "");
}

/** Pesan galat untuk kode baru yang dibuat Super Admin, atau null kalau valid. */
export function periksaKodeBaru(masukan: string): string | null {
  const kode = normalisasiKode(masukan);
  if (kode.length < PANJANG_KODE_MIN)
    return `Kode akses minimal ${PANJANG_KODE_MIN} karakter (huruf atau angka).`;
  if (kode.length > PANJANG_KODE_MAKS) return `Kode akses maksimal ${PANJANG_KODE_MAKS} karakter.`;
  if (!/^[A-Z0-9]+$/.test(kode)) return "Kode akses hanya boleh berisi huruf dan angka.";
  return null;
}

/** Sidik (hash) kode yang sedang berlaku — yang dikunci di tanda tangan token. */
export function sidikKode(kode: string): string {
  return createHash("sha256").update(`ruang-aman-kode:${normalisasiKode(kode)}`).digest("hex");
}

/** Bandingkan kode masukan dengan kode tersimpan tanpa bocor lewat waktu eksekusi. */
export function kodeCocok(masukan: string, tersimpan: string): boolean {
  const a = Buffer.from(sidikKode(masukan), "hex");
  const b = Buffer.from(sidikKode(tersimpan), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function tandaTangan(kunci: string, sidik: string, kedaluwarsaMs: number): string {
  return createHmac("sha256", kunci)
    .update(`ruang-aman-akses:${sidik}:${kedaluwarsaMs}`)
    .digest("base64url");
}

export function buatToken(kunci: string, sidik: string, sekarangMs: number, durasiMs: number): string {
  const kedaluwarsa = sekarangMs + durasiMs;
  return `${kedaluwarsa}.${tandaTangan(kunci, sidik, kedaluwarsa)}`;
}

export function tokenBerlaku(
  token: string | undefined | null,
  kunci: string,
  sidik: string,
  sekarangMs: number,
): boolean {
  if (!token) return false;
  const titik = token.indexOf(".");
  if (titik <= 0) return false;
  const kedaluwarsa = Number(token.slice(0, titik));
  if (!Number.isFinite(kedaluwarsa) || kedaluwarsa <= sekarangMs) return false;
  const diharapkan = Buffer.from(tandaTangan(kunci, sidik, kedaluwarsa));
  const diterima = Buffer.from(token.slice(titik + 1));
  return diharapkan.length === diterima.length && timingSafeEqual(diharapkan, diterima);
}
