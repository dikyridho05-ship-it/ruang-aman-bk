"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/guru-bk", label: "Akun Guru BK", icon: "👩‍🏫" },
  { href: "/piket", label: "Jadwal Piket", icon: "🗓️" },
  { href: "/template-balasan", label: "Template Balasan", icon: "💬" },
  { href: "/statistik", label: "Statistik", icon: "📊" },
  { href: "/audit-log", label: "Audit Log", icon: "📜" },
  { href: "/pengaturan", label: "Pengaturan", icon: "🏫" },
];

/**
 * Sidebar navigasi tetap (TAHAP 9 — redesain dashboard) — berlaku di SEMUA
 * halaman App B lewat AdminShell, dirender sekali di root layout. Client
 * Component karena butuh `usePathname()` buat penanda menu aktif.
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-20 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-white py-6 sm:w-24">
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
  );
}
