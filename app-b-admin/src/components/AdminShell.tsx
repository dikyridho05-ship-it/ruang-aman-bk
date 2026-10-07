"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminTopbar from "@/components/AdminTopbar";
import { HALAMAN_TANPA_SHELL } from "@/lib/nav-items";
import type { AuthenticatedAdmin } from "@/lib/session/admin-session";

/**
 * Bungkus tetap di root layout — sidebar + judul di semua halaman kecuali
 * halaman masuk/daftar. `admin` di-fetch sekali di layout.tsx (Server
 * Component) lalu dioper sebagai prop. Tiap halaman TETAP memanggil
 * `getAuthenticatedAdmin()` sendiri untuk proteksi — pola proyek ini:
 * verifikasi ulang tiap render, tanpa middleware.
 */
export default function AdminShell({
  admin,
  sekolah,
  permintaanMenunggu,
  children,
}: {
  admin: AuthenticatedAdmin | null;
  sekolah: string;
  permintaanMenunggu: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (HALAMAN_TANPA_SHELL.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar
        nama={admin?.nama ?? "Super Admin"}
        sekolah={sekolah}
        permintaanMenunggu={permintaanMenunggu}
      />
      {/* pb-28 di HP: ruang untuk bar navigasi bawah (fixed). */}
      <div className="min-w-0 flex-1 overflow-x-hidden px-4 pb-28 pt-5 sm:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <AdminTopbar sekolah={sekolah} pathname={pathname} />
          {children}
        </div>
      </div>
    </div>
  );
}
