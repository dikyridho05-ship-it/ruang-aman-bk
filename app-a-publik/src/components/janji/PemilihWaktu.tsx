"use client";

import { useEffect, useRef, useState } from "react";
import { labelJamJanji, labelWaktuJanji, type HariLayanan } from "@/lib/janji/aturan";

type HasilAksi = { success: true } | { success: false; error: string };
type HasilPilihan = { success: true; pilihan: HariLayanan[] } | { success: false; error: string };

/**
 * Lembar pemilih waktu janji temu — dipakai siswa (mengajukan) dan Guru BK
 * (mengusulkan waktu lain). Di HP muncul dari bawah layar seperti lembar
 * aplikasi native; di layar lebar jadi panel di tengah.
 *
 * Daftar slot baru diambil saat lembar ini dibuka (bukan ikut polling),
 * karena menghitungnya perlu membaca janji temu dua minggu ke depan.
 */
export default function PemilihWaktu({
  judul,
  keterangan,
  labelKirim,
  placeholderCatatan,
  muatPilihan,
  onKirim,
  onTutup,
}: {
  judul: string;
  keterangan: string;
  labelKirim: string;
  placeholderCatatan: string;
  muatPilihan: () => Promise<HasilPilihan>;
  onKirim: (waktuMulaiMs: number, catatan: string) => Promise<HasilAksi>;
  onTutup: () => void;
}) {
  const [pilihan, setPilihan] = useState<HariLayanan[] | null>(null);
  const [hariAktif, setHariAktif] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let aktif = true;
    muatPilihan().then((h) => {
      if (!aktif) return;
      if (h.success) setPilihan(h.pilihan);
      else setGalat(h.error);
    });
    return () => {
      aktif = false;
    };
  }, [muatPilihan]);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    window.addEventListener("keydown", onKey);
    const overflowLama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowLama;
    };
  }, [onTutup]);

  async function kirim() {
    if (slot === null) return;
    setGalat(null);
    setMengirim(true);
    const h = await onKirim(slot, catatan);
    setMengirim(false);
    if (!h.success) {
      setGalat(h.error);
      // Slot yang barusan diambil orang lain — muat ulang daftar supaya hilang.
      const segar = await muatPilihan();
      if (segar.success) setPilihan(segar.pilihan);
      setSlot(null);
      return;
    }
    onTutup();
  }

  const hari = pilihan?.[hariAktif];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onTutup}
        className="absolute inset-0 bg-tinta/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-pemilih-waktu"
        tabIndex={-1}
        className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white outline-none sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <div className="px-5 pb-3 pt-4">
          <h2 id="judul-pemilih-waktu" className="text-lg font-bold text-tinta">
            {judul}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{keterangan}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
          {pilihan === null && !galat && (
            <p className="py-8 text-center text-sm text-slate-500">Memuat jadwal yang kosong…</p>
          )}

          {pilihan && pilihan.length === 0 && (
            <p className="rounded-xl bg-kertas px-4 py-5 text-sm text-slate-600">
              Belum ada jam kosong dalam dua minggu ke depan. Tulis saja di chat kapan kamu bisa,
              Guru BK akan mengatur waktunya.
            </p>
          )}

          {pilihan && pilihan.length > 0 && hari && (
            <>
              <div
                role="tablist"
                aria-label="Pilih hari"
                className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]"
              >
                {pilihan.map((h, i) => {
                  const [namaHari, tgl] = h.label.split(", ");
                  const aktif = i === hariAktif;
                  return (
                    <button
                      key={h.kunci}
                      type="button"
                      role="tab"
                      aria-selected={aktif}
                      onClick={() => {
                        setHariAktif(i);
                        setSlot(null);
                      }}
                      className={`flex min-w-[68px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        aktif
                          ? "border-tinta bg-tinta text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
                      }`}
                    >
                      <span className={`text-xs ${aktif ? "text-brand-100" : "text-slate-500"}`}>{namaHari}</span>
                      <span className="text-sm font-bold">{tgl}</span>
                    </button>
                  );
                })}
              </div>

              <fieldset className="mt-4">
                <legend className="sr-only">Pilih jam pada {hari.label}</legend>
                <div className="grid grid-cols-4 gap-2">
                  {hari.slot.map((ms) => {
                    const dipilih = slot === ms;
                    return (
                      <label
                        key={ms}
                        className={`cursor-pointer rounded-lg border py-2.5 text-center text-sm font-semibold tabular-nums transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                          dipilih
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          className="sr-only"
                          checked={dipilih}
                          onChange={() => setSlot(ms)}
                        />
                        {labelJamJanji(ms)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-slate-700">
                  Pesan singkat <span className="font-normal text-slate-500">(boleh dikosongkan)</span>
                </span>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder={placeholderCatatan}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </label>
            </>
          )}

          {galat && (
            <p role="alert" className="mt-3 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {galat}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="min-w-0 flex-1 text-sm text-slate-600" aria-live="polite">
            {slot !== null ? (
              <span className="font-semibold text-tinta">{labelWaktuJanji(slot)}</span>
            ) : (
              "Pilih hari dan jam"
            )}
          </p>
          <button
            type="button"
            onClick={onTutup}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={slot === null || mengirim}
            onClick={kirim}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {mengirim ? "Mengirim…" : labelKirim}
          </button>
        </div>
      </div>
    </div>
  );
}
