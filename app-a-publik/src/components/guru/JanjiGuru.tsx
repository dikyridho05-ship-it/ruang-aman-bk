"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PemilihWaktu from "@/components/janji/PemilihWaktu";
import {
  batalkanJanjiGuruAction,
  catatHasilJanjiGuruAction,
  dataJanjiGuruAction,
  konfirmasiJanjiGuruAction,
  pilihanSlotGuruAction,
  usulkanJanjiGuruAction,
} from "@/actions/janji";
import { labelWaktuJanji } from "@/lib/janji/aturan";
import type { JanjiTemu } from "@/types/janji";

const LABEL_STATUS: Record<JanjiTemu["status"], string> = {
  menunggu: "Menunggu",
  dikonfirmasi: "Dikonfirmasi",
  dibatalkan: "Dibatalkan",
  selesai: "Sudah bertemu",
  "tidak-hadir": "Siswa tidak datang",
};

export default function JanjiGuru({
  kode,
  janjiAwal,
  tiketSelesai,
}: {
  kode: string;
  janjiAwal: JanjiTemu | null;
  tiketSelesai: boolean;
}) {
  const router = useRouter();
  const [janji, setJanji] = useState(janjiAwal);
  const [pemilih, setPemilih] = useState(false);
  const [mintaAlasan, setMintaAlasan] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [sekarang, setSekarang] = useState(() => Date.now());

  const segarkan = useCallback(async () => {
    const h = await dataJanjiGuruAction(kode);
    if (h.success) setJanji(h.janji);
  }, [kode]);

  useEffect(() => {
    const t = setInterval(() => {
      setSekarang(Date.now());
      if (!document.hidden) segarkan();
    }, 30_000);
    return () => clearInterval(t);
  }, [segarkan]);

  async function jalankan(aksi: () => Promise<{ success: boolean; error?: string }>) {
    setGalat(null);
    setSibuk(true);
    const h = await aksi();
    setSibuk(false);
    if (!h.success) setGalat(h.error ?? "Gagal. Coba lagi.");
    setMintaAlasan(false);
    setAlasan("");
    await segarkan();
    router.refresh();
  }

  const muatPilihan = useCallback(() => pilihanSlotGuruAction(kode), [kode]);
  const kirimUsulan = useCallback(
    async (ms: number, catatan: string) => {
      const h = await usulkanJanjiGuruAction(kode, ms, catatan);
      if (h.success) {
        await segarkan();
        router.refresh();
      }
      return h;
    },
    [kode, segarkan, router],
  );
  const tutup = useCallback(() => setPemilih(false), []);

  const aktif = janji && (janji.status === "menunggu" || janji.status === "dikonfirmasi");
  const sudahLewat = janji ? janji.waktuMulaiMs <= sekarang : false;

  return (
    <section aria-labelledby="judul-janji">
      <h3 id="judul-janji" className="text-sm font-bold text-tinta">
        Janji temu
      </h3>

      {!janji || !aktif ? (
        <div className="mt-2">
          {janji && (
            <p className="mb-2 text-xs text-slate-500">
              Terakhir: {labelWaktuJanji(janji.waktuMulaiMs)}, {LABEL_STATUS[janji.status].toLowerCase()}
              {janji.status === "dibatalkan" && janji.dibatalkanOleh ? ` oleh ${janji.dibatalkanOleh === "guru" ? "Guru BK" : "siswa"}` : ""}.
            </p>
          )}
          {tiketSelesai ? (
            <p className="text-xs text-slate-500">Curhatan sudah ditutup.</p>
          ) : (
            <button
              type="button"
              onClick={() => setPemilih(true)}
              className="w-full rounded-lg border border-dashed border-brand-300 px-3 py-2.5 text-left text-[13px] font-semibold text-brand-700 hover:bg-brand-50"
            >
              Tawarkan waktu bertemu ke siswa
            </button>
          )}
        </div>
      ) : (
        <div
          className={`mt-2 rounded-lg px-3 py-2.5 ${
            janji.status === "menunggu" && janji.menungguPihak === "guru"
              ? "bg-brand-50 ring-1 ring-brand-200"
              : "bg-kertas"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500">
            {janji.status === "menunggu"
              ? janji.menungguPihak === "guru"
                ? "Siswa meminta bertemu"
                : "Menunggu jawaban siswa"
              : LABEL_STATUS[janji.status]}
          </p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-tinta">{labelWaktuJanji(janji.waktuMulaiMs)}</p>
          <p className="text-xs text-slate-600">
            {janji.tempat}
            {janji.guru ? `, ${janji.guru.nama}` : ""}
          </p>
          {janji.catatan && <p className="mt-1.5 text-xs italic text-slate-600">“{janji.catatan}”</p>}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {janji.status === "menunggu" && janji.menungguPihak === "guru" && (
              <button
                type="button"
                disabled={sibuk}
                onClick={() => jalankan(() => konfirmasiJanjiGuruAction(kode))}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Konfirmasi
              </button>
            )}
            {janji.status === "dikonfirmasi" && sudahLewat && (
              <>
                <button
                  type="button"
                  disabled={sibuk}
                  onClick={() => jalankan(() => catatHasilJanjiGuruAction(kode, true))}
                  className="rounded-md bg-tinta px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Sudah bertemu
                </button>
                <button
                  type="button"
                  disabled={sibuk}
                  onClick={() => jalankan(() => catatHasilJanjiGuruAction(kode, false))}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
                >
                  Tidak datang
                </button>
              </>
            )}
            {!(janji.status === "dikonfirmasi" && sudahLewat) && (
              <button
                type="button"
                disabled={sibuk}
                onClick={() => setPemilih(true)}
                className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-white"
              >
                Usulkan waktu lain
              </button>
            )}
            <button
              type="button"
              disabled={sibuk}
              onClick={() => setMintaAlasan((v) => !v)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-white"
            >
              Batalkan
            </button>
          </div>

          {mintaAlasan && (
            <div className="mt-2">
              <label htmlFor={`alasan-${kode}`} className="text-xs font-medium text-slate-700">
                Alasan (dilihat siswa)
              </label>
              <input
                id={`alasan-${kode}`}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                maxLength={200}
                placeholder="Misalnya: ada rapat mendadak"
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500"
              />
              <button
                type="button"
                disabled={sibuk}
                onClick={() => jalankan(() => batalkanJanjiGuruAction(kode, alasan))}
                className="mt-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Ya, batalkan janji
              </button>
            </div>
          )}
        </div>
      )}

      {galat && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {galat}
        </p>
      )}

      {pemilih && (
        <PemilihWaktu
          judul="Usulkan waktu bertemu"
          keterangan="Siswa akan diberi tahu dan bisa menyetujui atau memilih waktu lain. Hanya jam yang masih kosong yang ditampilkan."
          labelKirim="Kirim usulan"
          placeholderCatatan="Misalnya: datang ke ruang BK lantai 2"
          muatPilihan={muatPilihan}
          onKirim={kirimUsulan}
          onTutup={tutup}
        />
      )}
    </section>
  );
}
