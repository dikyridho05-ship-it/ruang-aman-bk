"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";

/**
 * Navigasi App B (TAHAP 9 — redesain dashboard, diperbaiki TAHAP 11 untuk
 * HP). Client Component karena butuh `usePathname()` buat penanda menu
 * aktif. Dua tampilan berbeda per ukuran layar, BUKAN cuma sidebar yang
 * disempitkan:
 *
 * - Tablet/desktop (>= sm): sidebar ikon tetap di kiri, seperti semula.
 * - HP (< sm): sidebar kiri itu SENGAJA disembunyikan (`hidden sm:flex`)
 *   dan diganti navigasi bawah (`fixed bottom-0`, `sm:hidden`). Sidebar
 *   selebar 80px di layar 360-390px lebar memakan >20% ruang horizontal —
 *   itu akar masalah kenapa badge/kalender di dashboard ke-clip di HP.
 *   `position: fixed` membuat nav bawah ini keluar dari flex layout, jadi
 *   tidak perlu ubah struktur <AdminShell>, cukup render dua-duanya di
 *   sini dan CSS yang pilih mana yang tampil.
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden h-full w-20 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-6 sm:flex sm:w-24">
        <div
          className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-admin-600 text-sm font-bold text-white"
          aria-hidden
        >
          RA
        </div>

        <nav className="flex flex-1 flex-col items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[9px] font-medium transition-colors sm:h-14 sm:w-16 ${
                  active
                    ? "bg-admin-50 text-admin-700"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {item.icon}
                </span>
                <span className="hidden text-center leading-tight sm:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch overflow-x-auto border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex min-w-[58px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[9px] font-medium ${
                active ? "text-admin-700" : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-xl text-base ${
                  active ? "bg-admin-50" : ""
                }`}
                aria-hidden
              >
                {item.icon}
              </span>
              {/* shortLabel (bukan label penuh) — di lebar HP, label seperti
                  "Akun Guru BK" atau "Template Balasan" kepotong ellipsis
                  di font 9px ini dan jadi tidak terbaca; versi singkat
                  ("Guru BK", "Balasan") pas tanpa terpotong. Judul lengkap
                  tetap dipakai di sidebar desktop dan judul halaman topbar. */}
              <span className="w-full truncate text-center leading-tight">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
