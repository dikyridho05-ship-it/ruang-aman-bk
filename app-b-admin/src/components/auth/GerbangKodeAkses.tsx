"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { masukDenganKodeAksesAction } from "@/actions/akses";
import { KotakPesan } from "@/components/auth/AuthBingkai";

/**
 * Langkah sebelum halaman Masuk/Daftar Super Admin: Kode Akses Sekolah yang
 * sama dengan yang dipakai siswa dan Guru BK di Ruang Aman.
 */
export default function GerbangKodeAkses() {
  const router = useRouter();
  const [kode, setKode] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setProses(true);
    const hasil = await masukDenganKodeAksesAction(kode);
    if (!hasil.success) {
      setGalat(hasil.error);
      setProses(false);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-admin-900">Kode akses sekolah</h1>
      <p className="mt-1 text-sm text-slate-600">
        Masukkan kode akses sekolah sebelum masuk. Kodenya sama dengan yang dipakai siswa dan Guru
        BK di Ruang Aman.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {galat && <KotakPesan jenis="galat">{galat}</KotakPesan>}
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
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wider outline-none focus:border-admin-500 focus:ring-2 focus:ring-admin-200"
          />
        </div>
        <button
          type="submit"
          disabled={proses}
          className="w-full rounded-lg bg-admin-800 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-admin-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {proses ? "Memeriksa…" : "Lanjut"}
        </button>
      </form>

      <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
        Lupa kodenya? Tanyakan ke Super Admin lain atau Guru BK sekolah.
      </p>
    </>
  );
}
