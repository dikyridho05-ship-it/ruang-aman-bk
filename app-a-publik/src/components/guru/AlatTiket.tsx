"use client";

import { useState } from "react";
import JanjiGuru from "@/components/guru/JanjiGuru";
import CatatanInternal from "@/components/guru/CatatanInternal";
import type { JanjiTemu } from "@/types/janji";

type Panel = "janji" | "catatan" | null;

/**
 * Baris alat di bawah bilah info tiket: janji temu & catatan internal.
 * Dua-duanya dibuka sebagai laci di atas ruang chat (satu per satu), bukan
 * kolom tetap, supaya percakapan tetap mendapat ruang paling besar.
 */
export default function AlatTiket({
  kode,
  guruUid,
  janji,
  tiketSelesai,
  janjiMenunggu,
}: {
  kode: string;
  guruUid: string;
  janji: JanjiTemu | null;
  tiketSelesai: boolean;
  /** Ada permintaan janji temu dari siswa yang menunggu jawaban guru. */
  janjiMenunggu: boolean;
}) {
  const [terbuka, setTerbuka] = useState<Panel>(janjiMenunggu ? "janji" : null);
  const janjiAktif = janji && (janji.status === "menunggu" || janji.status === "dikonfirmasi");

  function alih(p: Exclude<Panel, null>) {
    setTerbuka((sekarang) => (sekarang === p ? null : p));
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Chip aktif={terbuka === "janji"} onClick={() => alih("janji")}>
          📅 Janji temu
          {janjiMenunggu ? (
            <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-400" aria-label="Ada permintaan janji temu" />
          ) : janjiAktif ? (
            <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Ada janji temu aktif" />
          ) : null}
        </Chip>
        <Chip aktif={terbuka === "catatan"} onClick={() => alih("catatan")}>
          📝 Catatan internal
        </Chip>
        <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">
          Ditugaskan kepadamu oleh Super Admin
        </span>
      </div>

      {terbuka && (
        <div className="mt-3 max-h-[45dvh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {terbuka === "janji" ? (
            <JanjiGuru kode={kode} janjiAwal={janji} tiketSelesai={tiketSelesai} />
          ) : (
            <CatatanInternal kode={kode} guruUid={guruUid} />
          )}
        </div>
      )}
    </>
  );
}

function Chip({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aktif}
      className={`inline-flex min-h-[2.25rem] items-center rounded-full px-3.5 text-xs font-semibold transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          aktif
            ? "bg-brand-600 text-white shadow-sm"
            : "border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700"
        }`}
    >
      {children}
    </button>
  );
}
