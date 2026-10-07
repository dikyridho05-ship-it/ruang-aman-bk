"use client";

import { useEffect, useState } from "react";
import { ambilTiketDiingat, lupakanTiket, type TiketDiingat } from "@/lib/ingatan-tiket";

/**
 * Daftar kode yang diingat browser ini. Muncul di halaman cek balasan supaya
 * siswa tidak perlu mengetik atau mengingat apa pun dari HP-nya sendiri.
 */
export default function TiketTersimpan({ onPilih }: { onPilih: (kode: string) => void }) {
  const [tiket, setTiket] = useState<TiketDiingat[]>([]);
  const [siap, setSiap] = useState(false);

  // Dibaca setelah render pertama supaya isi server dan klien tidak berbeda.
  useEffect(() => {
    setTiket(ambilTiketDiingat());
    setSiap(true);
  }, []);

  if (!siap || tiket.length === 0) return null;

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm font-bold text-tinta">Kode yang diingat HP ini</p>
      <p className="mt-0.5 text-xs text-slate-600">
        Ketuk untuk mengisi. Password tidak pernah ikut disimpan.
      </p>

      <ul className="mt-3 space-y-2">
        {tiket.map((t) => (
          <li key={t.kode} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPilih(t.kode)}
              className="flex-1 rounded-lg bg-kertas px-3 py-2.5 text-left font-mono text-sm font-semibold text-tinta transition-colors hover:bg-brand-50"
            >
              {t.kode}
            </button>
            <button
              type="button"
              onClick={() => {
                lupakanTiket(t.kode);
                setTiket(ambilTiketDiingat());
              }}
              className="rounded-lg px-2 py-1 text-xs text-slate-500 underline hover:text-slate-700"
            >
              Lupakan
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
