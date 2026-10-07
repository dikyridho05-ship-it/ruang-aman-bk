"use client";

import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

interface GuruShellProps {
  guruNama: string;
  /** Kolom kiri: daftar curhatan. */
  daftar: React.ReactNode;
  /** Isi kolom kanan saat belum ada curhatan yang dibuka. */
  ringkasan: React.ReactNode;
  /** Halaman tiket (/guru/{kode}). */
  children: React.ReactNode;
}

/**
 * Kerangka panel Guru BK: daftar curhatan di kiri, ruang kerja di kanan.
 *
 * - HP: satu kolom pada satu waktu — daftar di /guru, ruang chat di
 *   /guru/{kode} (dengan tombol kembali di bilah atas tiket).
 * - lg ke atas: daftar + ruang kerja berdampingan. Ruang kerja berisi
 *   ringkasan hari ini kalau belum ada curhatan dibuka, atau chat + kolom
 *   detail (mulai xl) kalau sudah.
 */
export default function GuruShell({ guruNama, daftar, ringkasan, children }: GuruShellProps) {
  const pathname = usePathname();
  const adaTiketTerpilih = /^\/guru\/[^/]+$/.test(pathname);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-kertas">
      <header className="shrink-0 bg-tinta text-white">
        <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center gap-3 px-4">
          {/* Satu-satunya h1 di panel ini; judul tiket di kolom kanan h2. */}
          <h1 className="min-w-0 truncate text-[15px] font-bold">
            Ruang Aman
            <span className="ml-2 hidden font-normal text-brand-200 sm:inline">Guru BK</span>
          </h1>
          <div className="ml-auto flex shrink-0 items-center gap-4 text-sm">
            <span className="hidden max-w-[14rem] truncate text-brand-100 md:inline">{guruNama}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 gap-4 p-3 sm:p-4">
        <div
          className={`${adaTiketTerpilih ? "hidden lg:flex" : "flex"} min-h-0 w-full shrink-0 flex-col lg:w-[22rem]`}
        >
          {daftar}
        </div>

        <main className={`${adaTiketTerpilih ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-1 flex-col`}>
          {adaTiketTerpilih ? children : ringkasan}
        </main>
      </div>
    </div>
  );
}
