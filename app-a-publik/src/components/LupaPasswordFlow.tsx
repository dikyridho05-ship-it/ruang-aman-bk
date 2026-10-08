"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPasswordSiswaAction } from "@/actions/lupa-password";
import { ingatTiket } from "@/lib/ingatan-tiket";
import { ambilKodeHandoff } from "@/lib/handoff-kode";

export default function LupaPasswordFlow() {
  const router = useRouter();

  const [kode, setKode] = useState("");
  const [namaSamaran, setNamaSamaran] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suksesKode, setSuksesKode] = useState<string | null>(null);

  useEffect(() => {
    const kodeHandoff = ambilKodeHandoff();
    if (kodeHandoff) {
      setKode(kodeHandoff.trim().toUpperCase());
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (passwordBaru.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      setError("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    setLoading(true);
    const res = await resetPasswordSiswaAction(kode, namaSamaran, passwordBaru);
    setLoading(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    // Simpan kode di perangkat
    ingatTiket(res.kode);
    setSuksesKode(res.kode);
  }

  if (suksesKode) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-8 pb-20">
        <div
          role="status"
          aria-live="polite"
          className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm"
        >
          <p className="text-3xl" aria-hidden>
            🎉
          </p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            Password Berhasil Diperbarui!
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Password baru untuk Kode Konseling kamu sudah aktif dan tersimpan.
          </p>

          <div className="my-4 rounded-xl border border-dashed border-emerald-300 bg-white p-3 font-mono font-bold tracking-wider text-emerald-800">
            {suksesKode}
          </div>

          <button
            type="button"
            onClick={() => {
              router.push("/cek-balasan");
              router.refresh();
            }}
            className="mt-2 inline-block w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Buka Percakapan Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-8 pb-20">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lupa Password Konseling</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masukkan Kode Konseling dan Nama Samaran yang kamu gunakan saat curhat untuk membuat password baru.
          </p>
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

        <div>
          <label htmlFor="kode" className="block text-sm font-medium text-slate-700">
            Kode Konseling
          </label>
          <input
            id="kode"
            required
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            placeholder="BK-2026-7K3M9Q"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="namaSamaran" className="block text-sm font-medium text-slate-700">
            Nama Samaran Saat Curhat
          </label>
          <input
            id="namaSamaran"
            required
            value={namaSamaran}
            onChange={(e) => setNamaSamaran(e.target.value)}
            placeholder="Contoh: Bintang Malam"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="passwordBaru" className="block text-sm font-medium text-slate-700">
            Password Baru
          </label>
          <div className="relative mt-1 flex items-center">
            <input
              id="passwordBaru"
              type={lihatPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={passwordBaru}
              onChange={(e) => setPasswordBaru(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-12 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => setLihatPassword((v) => !v)}
              aria-pressed={lihatPassword}
              aria-label={lihatPassword ? "Sembunyikan password" : "Lihat password"}
              className="absolute right-3 text-xs font-medium text-slate-500 hover:text-brand-700"
            >
              {lihatPassword ? "Tutup" : "Lihat"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="konfirmasiPassword" className="block text-sm font-medium text-slate-700">
            Ulangi Password Baru
          </label>
          <input
            id="konfirmasiPassword"
            type={lihatPassword ? "text" : "password"}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={konfirmasiPassword}
            onChange={(e) => setKonfirmasiPassword(e.target.value)}
            placeholder="Ketik ulang password baru"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan Password Baru"}
        </button>

        <p className="text-xs text-slate-500">
          Demi menjaga privasi total, kami tidak menyimpan email atau nomor teleponmu. Identitasmu tetap 100% anonim dan terlindungi.
        </p>

        <div className="flex flex-col items-center gap-2 pt-2 text-sm font-medium text-brand-700">
          <div className="flex items-center justify-center gap-3">
            <Link href="/cek-balasan" className="hover:underline">
              Kembali ke Cek Balasan
            </Link>
            <span className="text-slate-300" aria-hidden>&middot;</span>
            <Link href="/lupa-kode" className="hover:underline">
              Lupa Kode Konseling?
            </Link>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-700"
          >
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </form>
    </div>
  );
}
