"use client";

import { useCallback, useEffect, useState } from "react";
import {
  daftarCatatanAction,
  hapusCatatanAction,
  tambahCatatanAction,
  type CatatanGuru,
} from "@/actions/catatan";
import { jamSekolah, tanggalPendek } from "@/lib/waktu";

/**
 * Catatan internal per curhatan — hanya terlihat sesama Guru BK. Ditulis
 * dengan nada lembar kasus: siapa menulis, kapan, isinya. Tidak ada format
 * kaya (tebal/miring) supaya tetap cepat dipakai di sela membalas chat.
 */
export default function CatatanInternal({ kode, guruUid }: { kode: string; guruUid: string }) {
  const [catatan, setCatatan] = useState<CatatanGuru[] | null>(null);
  const [draf, setDraf] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    const h = await daftarCatatanAction(kode);
    if (h.success) setCatatan(h.catatan);
    else setGalat(h.error);
  }, [kode]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    setMenyimpan(true);
    const h = await tambahCatatanAction(kode, draf);
    setMenyimpan(false);
    if (!h.success) {
      setGalat(h.error ?? "Gagal menyimpan catatan.");
      return;
    }
    setDraf("");
    muat();
  }

  async function hapus(id: string) {
    const h = await hapusCatatanAction(kode, id);
    if (!h.success) setGalat(h.error ?? "Gagal menghapus.");
    muat();
  }

  return (
    <section aria-labelledby="judul-catatan">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="judul-catatan" className="text-sm font-bold text-slate-900">
          Catatan internal
        </h3>
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <span aria-hidden>🔒</span>
          Siswa tidak bisa melihat
        </span>
      </div>

      <form onSubmit={simpan} className="mt-2">
        <label htmlFor={`catatan-${kode}`} className="sr-only">
          Tulis catatan internal
        </label>
        <textarea
          id={`catatan-${kode}`}
          value={draf}
          onChange={(e) => setDraf(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Ringkasan kasus, tindak lanjut, atau hal yang perlu diketahui Guru BK lain…"
          className="w-full resize-y rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
        <div className="mt-1.5 flex items-center justify-end gap-2">
          {galat && <p className="mr-auto text-xs text-red-700">{galat}</p>}
          <button
            type="submit"
            disabled={menyimpan || draf.trim().length === 0}
            className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {menyimpan ? "Menyimpan…" : "Simpan catatan"}
          </button>
        </div>
      </form>

      {catatan === null ? (
        galat ? null : <p className="mt-3 text-xs text-slate-500">Memuat catatan…</p>
      ) : catatan.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Belum ada catatan untuk curhatan ini.
        </p>
      ) : (
        <ol className="mt-3 space-y-3 border-l-2 border-amber-200 pl-3">
          {catatan.map((c) => (
            <li key={c.id}>
              <p className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">{c.penulisNama}</span>, {tanggalPendek(c.dibuatMs)}{" "}
                {jamSekolah(c.dibuatMs)}
                {c.penulisUid === guruUid && (
                  <button
                    type="button"
                    onClick={() => hapus(c.id)}
                    className="ml-2 rounded text-[11px] text-slate-400 underline-offset-2 hover:text-red-700 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800">
                {c.isi}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
