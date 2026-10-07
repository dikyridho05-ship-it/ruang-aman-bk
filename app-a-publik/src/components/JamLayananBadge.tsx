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
      keterangan: "Ceritamu bisa dibaca dan dibalas hari ini juga.",
    };
  }

  // "Besok" cuma benar kalau besok juga hari kerja. Jumat setelah jam
  // layanan (atau Sabtu) berarti hari kerja berikutnya adalah Senin, bukan
  // "besok" — sebelumnya badge ini selalu bilang "besok pagi" untuk hari
  // Senin-Jumat di luar jam, jadi Jumat sore pun ikut salah bilang "besok".
  const akanDibacaSenin = hari === 5 || hari === 6;
  const teksLuar =
    hari === 0
      ? "Hari ini libur sekolah. Curhatanmu tetap tersimpan aman dan akan dibaca Guru BK hari Senin pagi."
      : akanDibacaSenin
        ? "Saat ini di luar jam sekolah. Curhatanmu tetap tersimpan aman dan akan dibaca Guru BK hari Senin pagi."
        : "Saat ini di luar jam sekolah. Curhatanmu tetap tersimpan aman dan akan dibaca Guru BK besok pagi.";

  return {
    aktif: false,
    keterangan: teksLuar,
  };
}

// Refresh berkala supaya badge tidak "membeku" di status saat komponen
// pertama dimount — siswa yang membiarkan tab curhat terbuka melewati jam
// tutup (15.30) sebelumnya tetap melihat "Layanan Aktif" sampai reload manual.
const REFRESH_MS = 60_000;

export default function JamLayananBadge({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<{ aktif: boolean; keterangan: string } | null>(null);

  useEffect(() => {
    setStatus(cekJamLayananAktif());
    const interval = setInterval(() => setStatus(cekJamLayananAktif()), REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Placeholder dengan tinggi yang sama (bukan `return null`) di render
  // pertama sebelum useEffect jalan — supaya elemen di bawahnya tidak
  // meloncat begitu badge asli muncul sesaat kemudian.
  if (!status) {
    return (
      <div
        aria-hidden
        className={compact ? "h-[26px]" : "h-[46px]"}
      />
    );
  }

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
      className="flex gap-3 text-sm"
    >
      <span
        aria-hidden
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${status.aktif ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      <div>
        <p className="font-semibold text-tinta">
          {status.aktif
            ? "Guru BK sedang bertugas"
            : "Di luar jam layanan (Senin–Jumat, 07.30–15.30)"}
        </p>
        <p className="mt-0.5 leading-relaxed text-slate-600">{status.keterangan}</p>
      </div>
    </div>
  );
}
