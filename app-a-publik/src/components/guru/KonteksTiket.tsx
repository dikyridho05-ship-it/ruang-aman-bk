"use client";

import PenugasanTiket from "@/components/PenugasanTiket";
import JanjiGuru from "@/components/guru/JanjiGuru";
import CatatanInternal from "@/components/guru/CatatanInternal";
import { tanggalPanjang, jamSekolah } from "@/lib/waktu";
import {
  KATEGORI_CURHAT_LABEL,
  MOOD_EMOJI,
  MOOD_LABEL,
  isKategoriPrioritas,
  type KategoriCurhat,
  type Mood,
} from "@/types/ticket";
import type { JanjiTemu } from "@/types/janji";

export interface DataKonteksTiket {
  kode: string;
  kategori: KategoriCurhat[];
  mood: Mood;
  createdAtMs: number;
  siapBertemu: boolean;
  selesai: boolean;
  guruUid: string;
  guruOptions: { uid: string; nama: string }[];
  ditugaskanUid: string | null;
  janji: JanjiTemu | null;
}

/**
 * Kolom konteks di samping ruang chat: hal-hal yang Guru BK perlukan untuk
 * menangani SATU curhatan — tanpa menutupi percakapannya. Isinya disusun
 * dari yang paling sering dipakai (janji temu & catatan) setelah fakta
 * singkat tentang curhatannya.
 */
export default function KonteksTiket({
  data,
  onAssign,
}: {
  data: DataKonteksTiket;
  onAssign: (guruUid: string | null) => Promise<{ success: boolean; error?: string }>;
}) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="judul-tentang">
        <h3 id="judul-tentang" className="text-sm font-bold text-tinta">
          Tentang curhatan ini
        </h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          <dt className="text-slate-500">Perasaan</dt>
          <dd className="text-slate-800">
            <span aria-hidden>{MOOD_EMOJI[data.mood]} </span>
            {MOOD_LABEL[data.mood]}
          </dd>
          <dt className="text-slate-500">Masuk</dt>
          <dd className="text-slate-800">
            {tanggalPanjang(data.createdAtMs)}, {jamSekolah(data.createdAtMs)}
          </dd>
          <dt className="text-slate-500">Kategori</dt>
          <dd className="flex flex-wrap gap-1">
            {data.kategori.map((k) => (
              <span
                key={k}
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  isKategoriPrioritas(k) ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
                }`}
              >
                {KATEGORI_CURHAT_LABEL[k]}
              </span>
            ))}
          </dd>
          <dt className="text-slate-500">Bertemu</dt>
          <dd className={data.siapBertemu ? "font-medium text-emerald-700" : "text-slate-600"}>
            {data.siapBertemu ? "Siswa bersedia bertemu langsung" : "Belum menyatakan bersedia"}
          </dd>
        </dl>
        <div className="mt-3">
          <PenugasanTiket
            guruOptions={data.guruOptions}
            currentUid={data.ditugaskanUid}
            onAssign={onAssign}
          />
        </div>
      </section>

      <JanjiGuru kode={data.kode} janjiAwal={data.janji} tiketSelesai={data.selesai} />

      <CatatanInternal kode={data.kode} guruUid={data.guruUid} />
    </div>
  );
}
