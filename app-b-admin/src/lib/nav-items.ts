import type { NamaIkon } from "@/components/Ikon";

export interface NavItem {
  href: string;
  /** Label lengkap — dipakai di sidebar desktop dan judul halaman di topbar. */
  label: string;
  /** Label singkat — dipakai di navigasi bawah HP yang sempit. */
  shortLabel: string;
  ikon: NamaIkon;
  /** Kelompok di sidebar desktop. */
  kelompok: "harian" | "kelola" | "laporan";
  /** Tampil langsung di navigasi bawah HP (sisanya masuk "Lainnya"). */
  utamaHp?: boolean;
}

export const KELOMPOK_LABEL: Record<NavItem["kelompok"], string> = {
  harian: "Harian",
  kelola: "Kelola",
  laporan: "Laporan",
};

/**
 * Satu sumber kebenaran untuk daftar menu App B, dipakai bareng oleh
 * AdminSidebar (sidebar desktop + nav bawah HP) dan AdminTopbar (judul
 * halaman dinamis).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dasbor", shortLabel: "Dasbor", ikon: "dasbor", kelompok: "harian", utamaHp: true },
  { href: "/curhatan", label: "Curhatan", shortLabel: "Curhatan", ikon: "curhatan", kelompok: "harian", utamaHp: true },
  { href: "/piket", label: "Jadwal piket", shortLabel: "Piket", ikon: "piket", kelompok: "harian", utamaHp: true },
  { href: "/guru-bk", label: "Akun Guru BK", shortLabel: "Guru BK", ikon: "guru", kelompok: "kelola" },
  { href: "/template-balasan", label: "Template balasan", shortLabel: "Balasan", ikon: "balasan", kelompok: "kelola" },
  { href: "/akun-admin", label: "Akun Super Admin", shortLabel: "Admin", ikon: "admin", kelompok: "kelola" },
  { href: "/pengaturan", label: "Pengaturan sekolah", shortLabel: "Sekolah", ikon: "sekolah", kelompok: "kelola" },
  { href: "/statistik", label: "Statistik", shortLabel: "Statistik", ikon: "statistik", kelompok: "laporan" },
  { href: "/audit-log", label: "Jejak aktivitas", shortLabel: "Jejak", ikon: "jejak", kelompok: "laporan" },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

/** Cocokkan pathname aktif ke salah satu item menu. */
export function getActiveNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => isNavActive(item, pathname));
}

/** Halaman yang tampil tanpa sidebar (belum ada admin yang login). */
export const HALAMAN_TANPA_SHELL = ["/login", "/daftar"];
