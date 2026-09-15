export interface NavItem {
  href: string;
  /** Label lengkap — dipakai di sidebar desktop dan judul halaman di topbar. */
  label: string;
  /** Label singkat — dipakai di navigasi bawah HP (`text-[9px]`, ruang sempit). */
  shortLabel: string;
  icon: string;
}

/**
 * Satu sumber kebenaran untuk daftar menu App B, dipakai bareng oleh
 * AdminSidebar (sidebar desktop + nav bawah HP) dan AdminTopbar (judul
 * halaman dinamis). Sebelumnya array ini didefinisikan cuma di
 * AdminSidebar.tsx — topbar jadi tidak punya cara ambil judul halaman
 * aktif tanpa duplikasi daftar menu (dan risiko dua daftar itu berbeda).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", shortLabel: "Dashboard", icon: "🏠" },
  { href: "/guru-bk", label: "Akun Guru BK", shortLabel: "Guru BK", icon: "👩‍🏫" },
  { href: "/curhatan", label: "Curhatan", shortLabel: "Curhatan", icon: "🗂️" },
  { href: "/piket", label: "Jadwal Piket", shortLabel: "Piket", icon: "🗓️" },
  { href: "/template-balasan", label: "Template Balasan", shortLabel: "Balasan", icon: "💬" },
  { href: "/statistik", label: "Statistik", shortLabel: "Statistik", icon: "📊" },
  { href: "/audit-log", label: "Audit Log", shortLabel: "Audit Log", icon: "📜" },
  { href: "/pengaturan", label: "Pengaturan", shortLabel: "Pengaturan", icon: "🏫" },
];

/** Cocokkan pathname aktif ke salah satu item menu (logika sama seperti penanda aktif di sidebar). */
export function getActiveNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
}
