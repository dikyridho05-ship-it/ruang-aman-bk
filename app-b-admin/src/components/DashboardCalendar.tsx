"use client";

import { useMemo, useState } from "react";
import type { HariPiket } from "@/types/admin";
import type { EventKalender } from "@/lib/kalender/data-nasional";
import type { JadwalPiketNama } from "@/lib/firestore/piket";

const HARI_BY_JS_DAY: HariPiket[] = [
  "minggu",
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
];

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HARI_HEADER: { key: HariPiket; label: string }[] = [
  { key: "senin", label: "SEN" },
  { key: "selasa", label: "SEL" },
  { key: "rabu", label: "RAB" },
  { key: "kamis", label: "KAM" },
  { key: "jumat", label: "JUM" },
  { key: "sabtu", label: "SAB" },
  { key: "minggu", label: "MIN" },
];

interface SelKalender {
  tanggalIso: string;
  tanggal: number;
  diBulanIni: boolean;
  isToday: boolean;
  piket: { uid: string; nama: string }[];
  event: EventKalender | null;
}

function keIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Kalender dashboard utama (TAHAP 9 — redesain, terinspirasi mockup
 * "Lesson schedule") — gabungan DUA sumber data: jadwal piket Guru BK
 * (berulang tiap minggu, dari Firestore lewat props) & kalender pendidikan
 * nasional (libur nasional + cuti bersama + agenda akademik Banten, data
 * statis dari lib/kalender/data-nasional.ts). Client Component karena
 * navigasi bulan (‹ ›) murni state lokal, tidak perlu Server Action.
 */
export default function DashboardCalendar({
  todayIso,
  jadwalPiket,
  events,
}: {
  /** Tanggal hari ini dari SERVER (bukan `new Date()` di client) — supaya konsisten dengan SSR, hindari hydration mismatch. */
  todayIso: string;
  jadwalPiket: JadwalPiketNama;
  events: EventKalender[];
}) {
  const today = useMemo(() => new Date(`${todayIso}T00:00:00`), [todayIso]);
  const [monthCursor, setMonthCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const eventByTanggal = useMemo(() => {
    const map = new Map<string, EventKalender>();
    for (const e of events) if (!map.has(e.tanggal)) map.set(e.tanggal, e);
    return map;
  }, [events]);

  const selKalender: SelKalender[] = useMemo(() => {
    const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const offset = (firstOfMonth.getDay() + 6) % 7; // Senin dianggap kolom pertama
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - offset);

    const hasil: SelKalender[] = [];
    for (let i = 0; i < 42; i++) {
      // 6 minggu penuh — tinggi kalender konsisten tiap bulan, tidak "lompat"
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = keIso(d);
      hasil.push({
        tanggalIso: iso,
        tanggal: d.getDate(),
        diBulanIni: d.getMonth() === monthCursor.getMonth(),
        isToday: iso === todayIso,
        piket: jadwalPiket[HARI_BY_JS_DAY[d.getDay()]] ?? [],
        event: eventByTanggal.get(iso) ?? null,
      });
    }
    return hasil;
  }, [monthCursor, jadwalPiket, eventByTanggal, todayIso]);

  function gantiBulan(delta: number) {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const agendaMendatang = useMemo(
    () => events.filter((e) => e.tanggal >= todayIso).slice(0, 4),
    [events, todayIso]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          {NAMA_BULAN[monthCursor.getMonth()]} {monthCursor.getFullYear()}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => gantiBulan(-1)}
            aria-label="Bulan sebelumnya"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => gantiBulan(1)}
            aria-label="Bulan berikutnya"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
        {HARI_HEADER.map((h) => (
          <span key={h.key}>{h.label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-xs">
        {selKalender.map((h) => {
          const adaEvent = h.event !== null;
          const adaPiket = h.piket.length > 0;

          let gaya = "text-slate-700";
          if (!h.diBulanIni) {
            gaya = "text-slate-300";
          } else if (adaEvent) {
            gaya = "bg-admin-600 font-semibold text-white";
          } else if (adaPiket) {
            gaya = "bg-admin-50 font-semibold text-admin-700";
          }
          const cincin = h.isToday ? "ring-2 ring-admin-500 ring-offset-1" : "";

          return (
            <div key={h.tanggalIso} className="flex items-center justify-center py-0.5">
              <span
                title={
                  h.event?.label ??
                  (adaPiket ? `Piket: ${h.piket.map((p) => p.nama).join(", ")}` : undefined)
                }
                className={`flex h-7 w-7 items-center justify-center rounded-full ${gaya} ${cincin}`}
              >
                {h.tanggal}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-admin-600" aria-hidden />
          Libur / agenda akademik
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-admin-50 ring-1 ring-admin-200" aria-hidden />
          Ada piket
        </span>
      </div>

      {agendaMendatang.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Agenda Mendatang
          </h3>
          {agendaMendatang.map((e) => (
            <div
              key={e.tanggal + e.label}
              className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                  e.jenis === "akademik" ? "bg-amber-100" : "bg-admin-100"
                }`}
                aria-hidden
              >
                {e.jenis === "akademik" ? "🎓" : "🎌"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-800">{e.label}</p>
                <p className="text-[11px] text-slate-400">
                  {new Date(`${e.tanggal}T00:00:00`).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
