"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminTopbar from "@/components/AdminTopbar";
import type { AuthenticatedAdmin } from "@/lib/session/admin-session";

/**
 * Bungkus tetap (TAHAP 9 — redesain dashboard) di root layout — render
 * sidebar + header di semua halaman KECUALI /login (belum ada admin yang
 * login, tidak ada apa-apa buat dinavigasikan). `admin` di-fetch sekali di
 * layout.tsx (Server Component) lalu dioper turun ke sini sebagai prop,
 * karena Client Component tidak boleh panggil `getAuthenticatedAdmin()`
 * (dia server-only). Tiap halaman TETAP panggil `getAuthenticatedAdmin()`
 * sendiri untuk proteksi & datanya masing-masing — konsisten dengan pola
 * proyek ini: verifikasi ulang tiap render, tidak pakai middleware.
 */
export default function AdminShell({
  admin,
  children,
}: {
  admin: AuthenticatedAdmin | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      {/* pb-24 di HP: kasih ruang buat navigasi bawah (fixed, lihat AdminSidebar)
          biar konten paling bawah halaman tidak ketutup. Di sm+ navigasi itu
          disembunyikan lagi jadi padding-nya balik normal. */}
      <div className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-24 sm:px-8 sm:py-8 sm:pb-8">
        <AdminTopbar nama={admin?.nama ?? "Super Admin"} />
        {children}
      </div>
    </div>
  );
}
