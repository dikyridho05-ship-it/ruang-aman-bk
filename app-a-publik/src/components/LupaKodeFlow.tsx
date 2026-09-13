"use client";

import { useState } from "react";
import Link from "next/link";
import { pulihkanKodeAction } from "@/actions/lupa-kode";
import { ingatTiket } from "@/lib/ingatan-tiket";

export default function LupaKodeFlow() {
  const [namaSamaran, setNamaSamaran] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await pulihkanKodeAction(namaSamaran, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    // Sekalian diingat browser ini supaya tidak hilang lagi.
    res.kode.forEach((k) => ingatTiket(k));
    setHasil(res.kode);
  }

  if (hasil) {
    return (
      // min-h-dvh + items-center: sama seperti cabang form di bawah, kartu
      // hasil ini juga sebelumnya nempel ke atas dengan ruang kosong besar
      // di bawah pada HP tinggi.
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
        <div role="status" aria-live="polite" className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🔑
          </p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            {hasil.length > 1 ? "Kode Konseling kamu ketemu" : "Kode Konseling kamu ketemu"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sudah diingat otomatis di HP ini, jadi tidak perlu hafal lagi.
          </p>

          <ul className="mt-4 space-y-2">
            {hasil.map((k) => (
              <li
                key={k}
                className="rounded-xl border-2 border-dashed border-emerald-400 bg-white py-3 font-mono text-xl font-bold tracking-wider text-emerald-700"
              >
                {k}
              </li>
            ))}
          </ul>

          <Link
            href="/cek-balasan"
            className="mt-5 inline-block w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white"
          >
            Buka Percakapan
          </Link>
        </div>
      </div>
    );
  }

  return (
    // flex + min-h-dvh + justify-center: kartu form ini sebelumnya cuma
    // mx-auto (center horizontal) tanpa center vertikal, jadi nempel ke
    // atas dengan sisa ruang kosong besar di bawah pada HP tinggi.
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lupa Kode Konseling</h1>
          <p className="mt-1 text-sm text-slate-500">
            Isi nama samaran dan password yang kamu buat sendiri waktu curhat. Kalau cocok,
            kodenya akan ditampilkan lagi di sini.
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
          <label htmlFor="namaSamaran" className="block text-sm font-medium text-slate-700">
            Nama samaran
          </label>
          <input
            id="namaSamaran"
            required
            value={namaSamaran}
            onChange={(e) => setNamaSamaran(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="passwordLupa" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="passwordLupa"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Mencari..." : "Cari Kode Saya"}
        </button>

        <p className="text-xs text-slate-500">
          Kalau passwordnya juga lupa, percakapan lama memang tidak bisa dibuka lagi — itu
          konsekuensi dari tidak menyimpan identitasmu sama sekali. Kamu bisa mulai curhat baru,
          dan sebut saja nama samaran lamamu supaya Guru BK bisa menyambungkan ceritanya.
        </p>

        <Link href="/cek-balasan" className="block text-center text-sm text-brand-700 underline">
          Kembali ke Cek Balasan
        </Link>
      </form>
    </div>
  );
}
