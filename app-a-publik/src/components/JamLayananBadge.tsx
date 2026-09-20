"use client";

import { useEffect, useState } from "react";

function cekJamLayananAktif(): { aktif: boolean; keterangan: string } {
  // Hitung waktu dalam WIB (UTC+7)
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utcMs + 7 * 3600000);

  const hari = wib.getDay(); // 0: Minggu, 1: Senin, ..., 5: Jumat, 6: Sabtu
  const totalMenit = wib.getHours() * 60 + wib.getMinutes();

  const BUKA_MENIT = 7 * 60 + 30; // 07.30 WIB
  const TUTUP_MENIT = 15 * 60 + 30; // 15.30 WIB

  const hariKerja = hari >= 1 && hari <= 5;
  const jamKerja = totalMenit >= BUKA_MENIT && totalMenit <= TUTUP_MENIT;

  if (hariKerja && jamKerja) {
    return {
      aktif: true,
      keterangan: "Guru BK sedang bertugas dan siap merespons curhatanmu.",
    };
  }

  const teksLuar =
    hari === 0 || hari === 6
      ? "Hari ini libur sekolah. Curhatanmu tetap tersimpan aman dan akan dibaca Guru BK hari Senin pagi."
      : "Saat ini di luar jam sekolah. Curhatanmu tetap tersimpan aman dan akan dibaca Guru BK besok pagi.";

  return {
    aktif: false,
    keterangan: teksLuar,
  };
}

export default function JamLayananBadge({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<{ aktif: boolean; keterangan: string } | null>(null);

  useEffect(() => {
    setStatus(cekJamLayananAktif());
  }, []);

  if (!status) return null;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
          status.aktif
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border border-slate-200 bg-slate-100 text-slate-600"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            status.aktif ? "animate-pulse bg-emerald-500" : "bg-slate-400"
          }`}
        />
        <span>
          {status.aktif ? "Layanan Aktif (07.30–15.30 WIB)" : "Di luar jam layanan (07.30–15.30 WIB)"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-3.5 text-xs transition-colors ${
        status.aktif
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
          : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            status.aktif ? "animate-pulse bg-emerald-500" : "bg-slate-400"
          }`}
        />
        <span>
          {status.aktif
            ? "Jam Layanan BK Aktif (07.30 – 15.30 WIB)"
            : "Di Luar Jam Layanan Sekolah (Senin–Jumat, 07.30 – 15.30 WIB)"}
        </span>
      </div>
      <p className="mt-1 text-slate-600">{status.keterangan}</p>
    </div>
  );
}
