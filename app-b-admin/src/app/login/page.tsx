"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginAdminAction } from "@/actions/auth";

/**
 * Login Super Admin — pola sama persis dengan login Guru BK di App A:
 * sign-in Firebase Auth terjadi di client, lalu idToken diverifikasi ulang
 * di server (loginAdminAction) sebelum session cookie dibuat. Firestore
 * tetap tidak pernah disentuh langsung dari browser.
 *
 * "Lupa password?" ditambahkan setelah Super Admin terkunci dari akunnya
 * sendiri tanpa jalan keluar mandiri — App A sudah punya ini sejak awal,
 * halaman ini sempat tertinggal. Koleksi `admins` sengaja tidak punya
 * panel "atur ulang password akun lain" seperti Guru BK di App A: tidak
 * ada Super Admin di atas Super Admin untuk melakukannya, jadi satu
 * jalur ini — email reset resmi Firebase — WAJIB ada di sini.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const result = await loginAdminAction(idToken);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("[AdminLoginPage] sign-in gagal:", err);
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
      console.error("[AdminLoginPage] kirim tautan atur ulang gagal:", err);
      if (kodeError(err) === "auth/invalid-email") {
        setError("Format email tidak valid.");
        return;
      }
      // Sengaja TIDAK membedakan "email tidak terdaftar" dari berhasil —
      // sama seperti App A — supaya pesan ini tidak bisa dipakai menebak
      // email mana saja yang terdaftar sebagai Super Admin.
    }

    setInfo(
      "Kalau email itu terdaftar sebagai Super Admin, tautan untuk mengatur ulang password sudah dikirim ke sana. Cek juga folder spam.",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Login Super Admin</h1>
          <p className="text-sm text-slate-500">Ruang Aman BK — dashboard internal.</p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {info && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            {info}
          </div>
        )}

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
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
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
              className="rounded text-xs font-semibold text-admin-700 hover:underline
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500"
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
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-admin-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-admin-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
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
