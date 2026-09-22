"use client";

import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

interface GuruShellProps {
  guruNama: string;
  /** Kolom kiri: daftar curhatan (lihat DaftarCurhatan). */
  daftar: React.ReactNode;
  /** Kolom kanan: piket, tiket prioritas, ringkasan status. */
  panelSamping: React.ReactNode;
  /** Kolom tengah: ruang chat tiket terpilih, atau layar sambutan. */
  children: React.ReactNode;
}

/**
 * Kerangka tiga kolom panel Guru BK: daftar curhatan · ruang chat · panel
 * samping.
 *
 * Ketiganya hidup di LAYOUT, bukan di masing-masing halaman, supaya
 * berpindah dari satu curhatan ke curhatan lain tidak membongkar-pasang
 * ulang daftar di kiri — posisi gulungan, kata pencarian, dan saringan
 * "Tugas Saya" milik guru tetap utuh selama dia menelusuri antrean.
 *
 * Yang berubah antar ukuran layar bukan cuma lebar kolomnya, tapi JUMLAH
 * kolom yang masuk akal ditampilkan sekaligus:
 * - HP: satu kolom pada satu waktu. Di /guru yang tampil daftarnya, di
 *   /guru/{kode} yang tampil ruang chatnya (dengan tautan kembali di dalam
 *   kartu tiket). Dua kolom berdampingan di layar 375px berarti keduanya
 *   sama-sama terlalu sempit untuk dipakai.
 * - Tablet/laptop (lg): daftar + ruang chat berdampingan, persis pola
 *   aplikasi chat pada umumnya.
 * - Layar lebar (xl): panel samping ikut muncul sebagai kolom ketiga. Di
 *   bawah itu isinya (piket & jumlah prioritas) tetap sampai ke guru dalam
 *   bentuk padat di atas daftar — bukan hilang.
 */
export default function GuruShell({ guruNama, daftar, panelSamping, children }: GuruShellProps) {
  const pathname = usePathname();
  const adaTiketTerpilih = /^\/guru\/[^/]+$/.test(pathname);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-4">
          {/* Satu-satunya h1 di panel ini. Judul tiket di kolom tengah
              sengaja h2: kalau keduanya h1, pembaca layar mendapati dua
              judul setara di satu halaman dan urutan bacanya jadi rancu. */}
          <h1 className="min-w-0 truncate text-base font-bold text-slate-900">
            Ruang Aman
            <span className="ml-2 hidden text-xs font-normal text-slate-400 sm:inline">
              Panel Guru BK
            </span>
          </h1>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden max-w-[12rem] truncate text-sm text-slate-500 md:inline">
              Halo, {guruNama}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full min-h-0 max-w-[1600px] flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
        <div
          className={`${
            adaTiketTerpilih ? "hidden lg:flex" : "flex"
          } w-full min-h-0 shrink-0 flex-col lg:w-80 xl:w-96`}
        >
          {daftar}
        </div>

        <main
          className={`${
            adaTiketTerpilih ? "flex" : "hidden lg:flex"
          } min-h-0 min-w-0 flex-1 flex-col`}
        >
          {children}
        </main>

        <aside className="hidden min-h-0 w-80 shrink-0 overflow-y-auto xl:block">
          {panelSamping}
        </aside>
      </div>
    </div>
  );
}
