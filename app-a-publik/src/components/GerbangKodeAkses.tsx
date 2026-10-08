"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { masukDenganKodeAksesAction } from "@/actions/akses";

/**
 * Layar pertama untuk perangkat yang belum memasukkan Kode Akses Sekolah.
 * Dipakai siswa DAN Guru BK (halaman login Guru BK juga di balik gerbang ini).
 * Tombol darurat tetap tampil di atas layar ini (lihat app/layout.tsx) —
 * bantuan darurat tidak boleh tertahan kode apa pun.
 */
export default function GerbangKodeAkses({
  namaSekolah,
  logoBase64,
}: {
  namaSekolah: string;
  logoBase64: string | null;
}) {
  const router = useRouter();
  const [kode, setKode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const hasil = await masukDenganKodeAksesAction(kode);
    if (!hasil.success) {
      setLoading(false);
      setError(hasil.error);
      return;
    }
    // Layout dirender ulang di server — sekarang dengan cookie akses.
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 pb-24 pt-8">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          {logoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL base64 dari Firestore
            <img
              src={logoBase64}
              alt={`Logo ${namaSekolah}`}
              className="mx-auto h-16 w-16 rounded-full bg-white object-contain"
            />
          ) : (
            <div
              aria-hidden
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl"
            >
              🏫
            </div>
          )}
          <p className="mt-2 text-sm text-slate-500">{namaSekolah}</p>
          <p className="text-2xl font-bold text-slate-900">Ruang Aman</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kode Akses Sekolah</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ruang Aman hanya untuk warga {namaSekolah}. Masukkan kode akses yang dibagikan
              sekolah — tanyakan ke Guru BK atau wali kelasmu.
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
            <label htmlFor="kode-akses" className="block text-sm font-medium text-slate-700">
              Kode akses
            </label>
            <input
              id="kode-akses"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={40}
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Memeriksa..." : "Masuk"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Kode ini sama untuk semua siswa — bukan identitasmu. Ceritamu tetap anonim.
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Dalam bahaya sekarang? Tekan tombol 🆘 di pojok layar — tidak perlu kode.
        </p>
      </div>
    </main>
  );
}
