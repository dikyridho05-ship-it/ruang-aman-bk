"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarkSelesaiButton from "@/components/MarkSelesaiButton";
import KonteksTiket, { type DataKonteksTiket } from "@/components/guru/KonteksTiket";
import type { TicketStatus } from "@/types/ticket";

const STATUS: Record<TicketStatus, { label: string; kelas: string }> = {
  baru: { label: "Baru", kelas: "bg-amber-100 text-amber-800" },
  dibaca: { label: "Dibaca", kelas: "bg-slate-100 text-slate-700" },
  dibalas: { label: "Dibalas", kelas: "bg-brand-100 text-brand-800" },
  selesai: { label: "Selesai", kelas: "bg-emerald-100 text-emerald-800" },
};

/**
 * Bilah atas ruang chat Guru BK. Di bawah layar xl, kolom konteks (janji
 * temu, catatan, penugasan) tidak muat di samping chat — tombol "Detail"
 * di sini membukanya sebagai lembar samping.
 */
export default function HeaderTiket({
  judul,
  status,
  prioritas,
  konteks,
  onAssign,
  onSelesai,
  janjiMenunggu,
}: {
  judul: string;
  status: TicketStatus;
  prioritas: boolean;
  konteks: DataKonteksTiket;
  onAssign: (guruUid: string | null) => Promise<{ success: boolean; error?: string }>;
  onSelesai: () => Promise<{ success: boolean; error?: string }>;
  /** Ada permintaan janji temu yang menunggu jawaban Guru BK — beri titik di tombol Detail. */
  janjiMenunggu: boolean;
}) {
  const [detail, setDetail] = useState(false);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetail(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white">
      {prioritas && <div className="h-1 bg-red-500" aria-hidden />}
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <Link
          href="/guru"
          aria-label="Kembali ke daftar curhatan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold text-tinta">{judul}</h2>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{konteks.kode}</span>
            <span className={`rounded px-1.5 py-px text-[11px] font-semibold ${STATUS[status].kelas}`}>
              {STATUS[status].label}
            </span>
            {prioritas && <span className="font-semibold text-red-700">Prioritas</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDetail(true)}
          className="relative shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 xl:hidden"
          aria-haspopup="dialog"
        >
          Detail
          {janjiMenunggu && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" aria-label="Ada permintaan janji temu" />
          )}
        </button>
        {status !== "selesai" && <MarkSelesaiButton action={onSelesai} />}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Tutup detail"
            onClick={() => setDetail(false)}
            className="absolute inset-0 bg-tinta/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Detail curhatan"
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-bold text-tinta">Detail curhatan</p>
              <button
                type="button"
                onClick={() => setDetail(false)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <KonteksTiket data={konteks} onAssign={onAssign} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
