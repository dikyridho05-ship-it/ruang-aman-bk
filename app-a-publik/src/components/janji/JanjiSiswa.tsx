"use client";

import { useCallback, useEffect, useState } from "react";
import PemilihWaktu from "@/components/janji/PemilihWaktu";
import {
  ajukanJanjiSiswaAction,
  batalkanJanjiSiswaAction,
  dataJanjiSiswaAction,
  pilihanSlotSiswaAction,
  terimaJanjiSiswaAction,
} from "@/actions/janji";
import { labelWaktuJanji } from "@/lib/janji/aturan";
import type { JanjiTemu } from "@/types/janji";

const SEGARKAN_MS = 30_000;

/**
 * Bilah janji temu di atas ruang chat siswa. Sengaja satu baris tipis kalau
 * belum ada janji — fitur ini pilihan, bukan sesuatu yang harus dilakukan
 * siswa, jadi tidak boleh terasa seperti tugas yang menunggu.
 */
export default function JanjiSiswa({
  kode,
  janjiAwal,
}: {
  kode: string | null;
  janjiAwal: JanjiTemu | null;
}) {
  const [janji, setJanji] = useState(janjiAwal);
  const [pemilihTerbuka, setPemilihTerbuka] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [yakinBatal, setYakinBatal] = useState(false);

  const segarkan = useCallback(async () => {
    const h = await dataJanjiSiswaAction();
    if (h.success) setJanji(h.janji);
  }, []);

  useEffect(() => {
    segarkan();
    const t = setInterval(() => {
      if (!document.hidden) segarkan();
    }, SEGARKAN_MS);
    return () => clearInterval(t);
  }, [segarkan]);

  async function jalankan(aksi: () => Promise<{ success: boolean; error?: string }>) {
    setGalat(null);
    setSibuk(true);
    const h = await aksi();
    setSibuk(false);
    setYakinBatal(false);
    if (!h.success) setGalat(h.error ?? "Gagal. Coba lagi.");
    await segarkan();
  }

  const kirimUsulan = useCallback(
    async (ms: number, catatan: string) => {
      const h = await ajukanJanjiSiswaAction(ms, catatan);
      if (h.success) await segarkan();
      return h;
    },
    [segarkan],
  );
  const tutupPemilih = useCallback(() => setPemilihTerbuka(false), []);

  const aktif = janji && (janji.status === "menunggu" || janji.status === "dikonfirmasi");
  const dibatalkanGuru = janji?.status === "dibatalkan" && janji.dibatalkanOleh === "guru";

  let isi: React.ReactNode;
  if (!aktif) {
    isi = (
      <div className="flex items-center gap-3">
        <IkonJam />
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-slate-600">
          {dibatalkanGuru ? (
            <>
              <span className="font-semibold text-tinta">Guru BK membatalkan janji temu.</span>
              {janji?.catatan ? ` “${janji.catatan}”` : ""}
            </>
          ) : (
            "Mau ngobrol langsung di ruang BK?"
          )}
        </p>
        <button
          type="button"
          onClick={() => setPemilihTerbuka(true)}
          className="shrink-0 rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-semibold text-brand-700 hover:bg-brand-100"
        >
          {dibatalkanGuru ? "Pilih waktu baru" : "Atur janji temu"}
        </button>
      </div>
    );
  } else if (janji.status === "menunggu" && janji.menungguPihak === "siswa") {
    isi = (
      <div>
        <div className="flex items-start gap-3">
          <IkonJam aktif />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-tinta">
              {janji.guru?.nama ?? "Guru BK"} mengusulkan bertemu {labelWaktuJanji(janji.waktuMulaiMs)}
            </p>
            {janji.catatan && <p className="mt-0.5 text-[13px] text-slate-600">“{janji.catatan}”</p>}
          </div>
        </div>
        <div className="mt-2.5 flex gap-2 pl-8">
          <button
            type="button"
            disabled={sibuk}
            onClick={() => jalankan(terimaJanjiSiswaAction)}
            className="rounded-full bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            Setuju
          </button>
          <button
            type="button"
            disabled={sibuk}
            onClick={() => setPemilihTerbuka(true)}
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-700 hover:bg-brand-50"
          >
            Pilih waktu lain
          </button>
        </div>
      </div>
    );
  } else {
    const terkonfirmasi = janji.status === "dikonfirmasi";
    isi = (
      <div>
        <div className="flex items-start gap-3">
          <IkonJam aktif={terkonfirmasi} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-tinta">
              {terkonfirmasi ? "Janji temu pasti: " : "Menunggu konfirmasi Guru BK: "}
              {labelWaktuJanji(janji.waktuMulaiMs)}
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-600">
              {terkonfirmasi ? (
                <>
                  Di {janji.tempat}
                  {janji.guru ? ` bersama ${janji.guru.nama}` : ""}.
                  {kode ? (
                    <>
                      {" "}Sebutkan kode <span className="font-mono font-semibold text-tinta">{kode}</span> saat datang.
                    </>
                  ) : null}
                </>
              ) : (
                "Kamu akan diberi tahu begitu Guru BK menjawab."
              )}
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1 pl-8">
          {!yakinBatal ? (
            <>
              <button
                type="button"
                disabled={sibuk}
                onClick={() => setPemilihTerbuka(true)}
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-700 hover:bg-brand-50"
              >
                Ganti waktu
              </button>
              <button
                type="button"
                disabled={sibuk}
                onClick={() => setYakinBatal(true)}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:bg-slate-100"
              >
                Batalkan
              </button>
            </>
          ) : (
            <>
              <span className="py-1.5 text-[13px] text-slate-700">Batalkan janji ini?</span>
              <button
                type="button"
                disabled={sibuk}
                onClick={() => jalankan(batalkanJanjiSiswaAction)}
                className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-red-700 hover:bg-red-50"
              >
                Ya, batalkan
              </button>
              <button
                type="button"
                onClick={() => setYakinBatal(false)}
                className="rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:bg-slate-100"
              >
                Tidak
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5">
      {isi}
      {galat && (
        <p role="alert" className="mt-2 pl-8 text-[13px] text-red-700">
          {galat}
        </p>
      )}
      {pemilihTerbuka && (
        <PemilihWaktu
          judul={aktif ? "Ganti waktu janji temu" : "Atur janji temu"}
          keterangan="Pilih jam yang kamu bisa. Guru BK akan mengonfirmasi atau mengusulkan waktu lain. Pertemuan sekitar 30 menit di ruang BK."
          labelKirim="Kirim permintaan"
          placeholderCatatan="Misalnya: saya bisa saat istirahat kedua"
          muatPilihan={pilihanSlotSiswaAction}
          onKirim={kirimUsulan}
          onTutup={tutupPemilih}
        />
      )}
    </div>
  );
}

function IkonJam({ aktif = false }: { aktif?: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center ${aktif ? "text-brand-600" : "text-slate-400"}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    </span>
  );
}
