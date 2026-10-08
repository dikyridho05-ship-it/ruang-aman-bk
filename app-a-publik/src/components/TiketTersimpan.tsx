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
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <p className="text-sm font-semibold text-brand-800">Tiket di perangkat ini</p>
      <p className="mt-0.5 text-xs text-slate-600">
        Browser ini mengingat kodenya — passwordmu tidak pernah ikut disimpan.
      </p>

      <ul className="mt-3 space-y-2">
        {tiket.map((t) => (
          <li key={t.kode} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPilih(t.kode)}
              className="flex-1 rounded-xl border border-brand-200 bg-white px-3 py-2 text-left font-mono text-sm font-semibold text-brand-800 transition hover:border-brand-500"
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
