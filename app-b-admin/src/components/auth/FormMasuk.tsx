"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginAdminAction } from "@/actions/auth";
import type { AlasanTolakAdmin } from "@/lib/session/admin-session";
import {
  keluarFirebase,
  kodeGalat,
  masukDenganGoogle,
  pesanGalatGoogle,
} from "@/lib/firebase/masuk-google";
import { LogoGoogle } from "@/components/Ikon";
import { KotakPesan } from "@/components/auth/AuthBingkai";

type Proses = null | "google" | "email";

/**
 * Masuk Super Admin — dua cara di satu halaman: Google (utama) dan
 * email/password (akun lama tetap bisa masuk). Keduanya berakhir di
 * loginAdminAction yang memeriksa `admins/{uid}.aktif` di server; cara
 * masuk tidak menentukan hak akses.
 */
export default function FormMasuk() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [alasan, setAlasan] = useState<AlasanTolakAdmin | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [proses, setProses] = useState<Proses>(null);

  function reset() {
    setGalat(null);
    setAlasan(null);
    setInfo(null);
  }

  async function selesaikan(idToken: string) {
    const hasil = await loginAdminAction(idToken);
    if (!hasil.success) {
      await keluarFirebase();
      setGalat(hasil.error);
      setAlasan(hasil.alasan ?? null);
      setProses(null);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleGoogle() {
    reset();
    setProses("google");
    try {
      const user = await masukDenganGoogle();
      if (!user) {
        setProses(null);
        return;
      }
      await selesaikan(await user.getIdToken());
    } catch (err) {
      console.error("[FormMasuk] Google gagal:", err);
      setGalat(pesanGalatGoogle(err));
      setProses(null);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setProses("email");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await selesaikan(await cred.user.getIdToken());
    } catch (err) {
      console.error("[FormMasuk] sign-in gagal:", err);
      setGalat(
        kodeGalat(err) === "auth/too-many-requests"
          ? "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi."
          : "Email atau password salah.",
      );
      setProses(null);
    }
  }

  async function handleLupaPassword() {
    reset();
    if (!email.trim()) {
      setGalat("Isi kolom email dulu, lalu tekan “Lupa password?”.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      if (kodeGalat(err) === "auth/invalid-email") {
        setGalat("Format email tidak valid.");
        return;
      }
      // Sengaja tidak membedakan "email tidak terdaftar" dari berhasil,
      // supaya pesan ini tidak bisa dipakai menebak email Super Admin.
    }
    setInfo(
      "Kalau email itu terdaftar, tautan untuk mengatur ulang password sudah dikirim. Cek juga folder spam.",
    );
  }

  const sibuk = proses !== null;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-admin-900">Masuk</h1>
      <p className="mt-1 text-sm text-slate-600">Pakai akun yang sudah diberi akses Super Admin.</p>

      <div className="mt-7 space-y-4">
        {galat && (
          <KotakPesan jenis="galat">
            {galat}
            {alasan === "belum-daftar" || alasan === "ditolak" ? (
              <>
                {" "}
                <Link href="/daftar" className="font-semibold underline underline-offset-2">
                  Ajukan akses
                </Link>
              </>
            ) : null}
          </KotakPesan>
        )}
        {info && <KotakPesan jenis="info">{info}</KotakPesan>}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={sibuk}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white py-3 text-[15px] font-semibold text-slate-800 shadow-[0_1px_0_rgba(12,35,64,0.06)] transition-colors hover:border-admin-300 hover:bg-admin-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 disabled:opacity-60"
        >
          <LogoGoogle />
          {proses === "google" ? "Menghubungkan ke Google…" : "Masuk dengan Google"}
        </button>

        <div className="flex items-center gap-3 py-1 text-xs text-slate-500" aria-hidden>
          <span className="h-px flex-1 bg-slate-200" />
          atau dengan email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-admin-500 focus:ring-2 focus:ring-admin-200"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={handleLupaPassword}
                className="rounded text-xs font-semibold text-admin-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500"
              >
                Lupa password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-admin-500 focus:ring-2 focus:ring-admin-200"
            />
          </div>
          <button
            type="submit"
            disabled={sibuk}
            className="w-full rounded-lg bg-admin-800 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-admin-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {proses === "email" ? "Memeriksa…" : "Masuk"}
          </button>
        </form>
      </div>

      <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
        Belum punya akses?{" "}
        <Link href="/daftar" className="font-semibold text-admin-700 underline-offset-2 hover:underline">
          Ajukan akses dengan Google
        </Link>
      </p>
    </div>
  );
}
