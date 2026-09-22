"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginGuruAction } from "@/actions/auth";

/**
 * Login Guru BK: sign-in Firebase Auth terjadi di CLIENT (satu-satunya
 * penggunaan Firebase Client SDK di luar modul auth itu sendiri), tapi
 * begitu dapat idToken, sisanya (verifikasi + cek `guru/{uid}` aktif +
 * pembuatan session cookie) semuanya terjadi di server lewat loginGuruAction.
 * Firestore tetap TIDAK PERNAH disentuh langsung dari browser.
 *
 * Masuk hanya lewat email + password. Tombol "Masuk dengan Google" sempat
 * ada di sini, tapi dihapus lagi: penyedia Google tidak pernah diaktifkan
 * di proyek Firebase-nya, dan tombol yang selalu menjawab
 * auth/operation-not-allowed lebih membingungkan guru daripada tidak ada
 * sama sekali.
 */
export default function GuruLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const result = await loginGuruAction(idToken);

      if (!result.success) {
        setError(result.error);
        // Akun Firebase-nya valid tapi bukan Guru BK terdaftar — jangan
        // tinggalkan sesi client yang menggantung di browser orang itu.
        await signOut(auth).catch(() => {});
        setLoading(false);
        return;
      }

      router.push("/guru");
      router.refresh();
    } catch (err) {
      console.error("[GuruLoginPage] sign-in gagal:", err);
      setError("Email atau password salah.");
      setLoading(false);
    }
  }

  async function handleLupaPassword() {
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("Isi dulu kolom Email di atas, baru tekan 'Lupa password?'.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      console.error("[GuruLoginPage] kirim tautan atur ulang gagal:", err);
      if (kodeError(err) === "auth/invalid-email") {
        setError("Format email tidak valid.");
        return;
      }
      // Sengaja TIDAK membedakan "email tidak terdaftar" dari berhasil:
      // pesan yang berbeda akan memberi tahu orang asing email mana saja
      // yang punya akun di sini. Kasus lain (jaringan, kuota) sudah
      // tercatat di console untuk ditelusuri.
    }

    setInfo(
      "Kalau email itu terdaftar sebagai Guru BK, tautan untuk mengatur ulang password sudah dikirim ke sana. Cek juga folder spam.",
    );
  }

  return (
    // Latar gradien brand hanya di layar ini — pintu masuk yang terasa beda
    // dari halaman kerja, sekaligus penanda jelas bahwa ini area Guru BK,
    // bukan halaman siswa. py cukup besar supaya di HP layar pendek dengan
    // papan ketik terbuka kartunya tetap bisa digulir, bukan terjepit.
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-sky-400 px-4 py-10 sm:py-12">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-6 shadow-xl shadow-brand-900/20 sm:p-7"
        >
          <div className="flex flex-col items-center text-center">
            <span
              aria-hidden
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30"
            >
              <IkonPengguna className="h-8 w-8" />
            </span>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Login Guru BK</h1>
            <p className="mt-1 text-sm text-slate-500">Khusus untuk Guru BK terdaftar.</p>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {info && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
            >
              {info}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <div className="relative mt-1.5">
                <IkonAmplop className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Masukkan email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[3rem] w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-3 text-sm
                    outline-none transition placeholder:text-slate-400
                    focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleLupaPassword}
                  className="rounded text-xs font-semibold text-brand-700 hover:underline
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Lupa password?
                </button>
              </div>

              {/* Tombol "Lihat" bukan hiasan: mengetik password panjang di
                  papan ketik HP tanpa bisa memeriksanya adalah sumber utama
                  percobaan login gagal berulang. */}
              <div className="relative mt-1.5 flex items-center rounded-xl border border-slate-200 bg-slate-50 pr-1.5 transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500">
                <IkonGembok className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={lihatPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-[3rem] w-full rounded-xl bg-transparent py-2 pl-11 pr-2 text-sm
                    outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setLihatPassword((v) => !v)}
                  aria-label={lihatPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="min-h-[2.5rem] shrink-0 rounded-lg px-2 text-xs font-semibold text-brand-700
                    hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {lihatPassword ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 min-h-[3rem] w-full rounded-xl bg-gradient-to-r from-brand-700 to-brand-500
              text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition
              hover:from-brand-700 hover:to-brand-600 focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          {/* Tidak ada pendaftaran mandiri: akun Guru BK dibuat Super Admin
              lewat App B, justru supaya tidak sembarang orang bisa membuat
              akun yang bisa membaca curhatan siswa. */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Belum punya akun? Hubungi Super Admin sekolah untuk didaftarkan.
          </p>
        </form>

        <Link
          href="/"
          className="mx-auto mt-5 block w-fit rounded-lg px-3 py-1.5 text-center text-sm font-medium text-white/90
            hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          &larr; Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}

/** Kode error Firebase Auth, kalau errornya memang dari sana. */
function kodeError(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

function IkonPengguna({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function IkonAmplop({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function IkonGembok({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  );
}
