"use client";

import { useMemo, useState } from "react";
import type { HariPiket } from "@/types/admin";
import type { EventKalender } from "@/lib/kalender/data-nasional";
import type { JadwalPiketNama } from "@/lib/firestore/piket";

const HARI_BY_JS_DAY: HariPiket[] = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI_HEADER = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export interface JanjiDiKalender {
  tanggalIso: string;
  jam: string;
  guruNama: string | null;
  dikonfirmasi: boolean;
}

interface SelKalender {
  tanggalIso: string;
  tanggal: number;
  diBulanIni: boolean;
  isToday: boolean;
  piket: { uid: string; nama: string }[];
  event: EventKalender | null;
  janji: JanjiDiKalender[];
}

function keIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function labelTanggal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date(y, m - 1, d).getDay()];
  return `${hari}, ${d} ${NAMA_BULAN[m - 1]}`;
}

/**
 * Kalender dasbor: libur nasional & agenda akademik (data statis), jadwal
 * piket (berulang mingguan), dan janji temu tatap muka (dari App A, tanpa
 * identitas siswa). Mengetuk satu tanggal menampilkan rinciannya di bawah
 * kalender — sebelumnya rincian hanya ada di tooltip, yang tidak bisa
 * dibuka sama sekali di HP.
 */
export default function DashboardCalendar({
  todayIso,
  jadwalPiket,
  events,
  janji,
}: {
  /** Tanggal hari ini (WIB) dari server, supaya sama dengan hasil render server. */
  todayIso: string;
  jadwalPiket: JadwalPiketNama;
  events: EventKalender[];
  janji: JanjiDiKalender[];
}) {
  const today = useMemo(() => new Date(`${todayIso}T00:00:00`), [todayIso]);
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dipilih, setDipilih] = useState(todayIso);

  const eventByTanggal = useMemo(() => {
    const map = new Map<string, EventKalender>();
    for (const e of events) if (!map.has(e.tanggal)) map.set(e.tanggal, e);
    return map;
  }, [events]);

  const janjiByTanggal = useMemo(() => {
    const map = new Map<string, JanjiDiKalender[]>();
    for (const j of janji) map.set(j.tanggalIso, [...(map.get(j.tanggalIso) ?? []), j]);
    return map;
  }, [janji]);

  const selKalender: SelKalender[] = useMemo(() => {
    const firstOfMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const offset = (firstOfMonth.getDay() + 6) % 7; // Senin kolom pertama
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - offset);

    const hasil: SelKalender[] = [];
    for (let i = 0; i < 42; i++) {
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
        janji: janjiByTanggal.get(iso) ?? [],
      });
    }
    return hasil;
  }, [monthCursor, jadwalPiket, eventByTanggal, janjiByTanggal, todayIso]);

  const selDipilih = selKalender.find((s) => s.tanggalIso === dipilih);
  const rincianDipilih = selDipilih ?? {
    tanggalIso: dipilih,
    event: eventByTanggal.get(dipilih) ?? null,
    janji: janjiByTanggal.get(dipilih) ?? [],
    piket: [],
  };

  return (
    <section aria-labelledby="judul-kalender" className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h2 id="judul-kalender" className="text-base font-bold text-admin-900">
          {NAMA_BULAN[monthCursor.getMonth()]} {monthCursor.getFullYear()}
        </h2>
        <div className="flex gap-1">
          <TombolBulan label="Bulan sebelumnya" onClick={() => setMonthCursor((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))} arah="kiri" />
          <TombolBulan label="Bulan berikutnya" onClick={() => setMonthCursor((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))} arah="kanan" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-xs text-slate-500" aria-hidden>
        {HARI_HEADER.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
        {selKalender.map((h) => {
          const libur = h.event && h.event.jenis !== "akademik";
          const aktif = h.tanggalIso === dipilih;
          return (
            <button
              key={h.tanggalIso}
              type="button"
              onClick={() => setDipilih(h.tanggalIso)}
              aria-pressed={aktif}
              aria-label={`${labelTanggal(h.tanggalIso)}${h.event ? `, ${h.event.label}` : ""}${h.janji.length ? `, ${h.janji.length} janji temu` : ""}`}
              className="group flex flex-col items-center py-0.5 focus-visible:outline-none"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full tabular-nums transition-colors group-focus-visible:ring-2 group-focus-visible:ring-langit-500 ${
                  aktif
                    ? "bg-admin-800 font-bold text-white"
                    : h.isToday
                      ? "font-bold text-admin-800 ring-1 ring-admin-400"
                      : !h.diBulanIni
                        ? "text-slate-300"
                        : libur
                          ? "font-semibold text-red-600"
                          : h.piket.length > 0
                            ? "text-slate-800"
                            : "text-slate-400"
                }`}
              >
                {h.tanggal}
              </span>
              <span className="mt-0.5 flex h-1.5 gap-0.5" aria-hidden>
                {h.janji.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-langit-500" />}
                {h.event?.jenis === "akademik" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-red-600">12</span> Libur
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-langit-500" aria-hidden /> Janji temu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden /> Agenda akademik
        </span>
        <span>Angka pudar: tanpa piket</span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4" aria-live="polite">
        <p className="text-sm font-bold text-admin-900">{labelTanggal(rincianDipilih.tanggalIso)}</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {rincianDipilih.event && (
            <li className={rincianDipilih.event.jenis === "akademik" ? "text-amber-800" : "text-red-700"}>
              {rincianDipilih.event.label}
            </li>
          )}
          <li className="text-slate-700">
            <span className="text-slate-500">Piket: </span>
            {rincianDipilih.piket.length > 0 ? rincianDipilih.piket.map((p) => p.nama).join(", ") : "tidak ada"}
          </li>
          {rincianDipilih.janji.map((j) => (
            <li key={j.jam} className="text-slate-700">
              <span className="font-semibold tabular-nums text-admin-900">{j.jam}</span> janji temu
              {j.guruNama ? ` dengan ${j.guruNama}` : ""}
              {!j.dikonfirmasi && <span className="text-amber-700"> (belum dikonfirmasi)</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TombolBulan({ label, onClick, arah }: { label: string; onClick: () => void; arah: "kiri" | "kanan" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-kertas hover:text-admin-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-langit-500"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
        <path d={arah === "kiri" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
