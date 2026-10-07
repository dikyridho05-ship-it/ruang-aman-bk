"use client";

import { useSyncExternalStore } from "react";
import { getActiveNavItem } from "@/lib/nav-items";
import { tanggalLengkap } from "@/lib/waktu";

// Tanggal dibaca di browser (bukan saat render server) supaya tidak terjadi
// selisih hidrasi kalau server & browser beda zona waktu atau beda hari.
const subscribe = () => () => {};
const ambilTanggal = () => tanggalLengkap(Date.now());
const tanpaTanggal = () => "";

export default function AdminTopbar({
  sekolah,
  pathname,
}: {
  sekolah: string;
  pathname: string;
}) {
  const tanggal = useSyncExternalStore(subscribe, ambilTanggal, tanpaTanggal);
  const judul = getActiveNavItem(pathname)?.label ?? "Ruang Aman BK";

  return (
    <header className="mb-6 lg:mb-8">
      {/* Di HP sidebar (yang memuat nama sekolah) disembunyikan — nama
          sekolah pindah ke sini supaya tetap jelas sedang mengelola apa. */}
      <p className="mb-1 truncate text-xs font-medium text-admin-600 lg:hidden">{sekolah}</p>
      <h1 className="text-2xl font-extrabold tracking-tight text-admin-900 sm:text-[28px]">{judul}</h1>
      <p className="mt-1 min-h-5 text-sm text-slate-500" suppressHydrationWarning>
        {tanggal}
      </p>
    </header>
  );
}
