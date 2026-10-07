"use client";

import { GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

/**
 * Masuk dengan Google lewat jendela popup. Sengaja tidak memakai
 * signInWithRedirect: di Safari iPhone & Chrome dengan cookie pihak ketiga
 * diblokir, alur redirect sering kembali tanpa hasil karena halaman auth
 * Firebase berada di domain lain (firebaseapp.com).
 *
 * Mengembalikan null kalau pengguna sendiri menutup popup — itu bukan galat.
 */
export async function masukDenganGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    const kode = kodeGalat(err);
    if (kode === "auth/popup-closed-by-user" || kode === "auth/cancelled-popup-request") return null;
    throw err;
  }
}

/** Pesan galat yang bisa dipahami untuk kegagalan masuk Google. */
export function pesanGalatGoogle(err: unknown): string {
  switch (kodeGalat(err)) {
    case "auth/popup-blocked":
      return "Browser memblokir jendela masuk Google. Izinkan pop-up untuk situs ini, lalu coba lagi.";
    case "auth/operation-not-allowed":
      return "Masuk dengan Google belum diaktifkan di Firebase project ini.";
    case "auth/unauthorized-domain":
      return "Alamat situs ini belum didaftarkan di Firebase (Authorized domains).";
    case "auth/network-request-failed":
      return "Koneksi terputus saat menghubungi Google. Periksa internet lalu coba lagi.";
    default:
      return "Masuk dengan Google gagal. Coba lagi.";
  }
}

/** Keluar dari sesi Firebase di browser (dipakai saat server menolak akun). */
export async function keluarFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    /* tidak masalah — sesi browser memang akan dibuang */
  }
}

export function kodeGalat(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}
