"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Ikon from "@/components/Ikon";
import { logoutAdminAction } from "@/actions/auth";
import { KELOMPOK_LABEL, NAV_ITEMS, isNavActive, type NavItem } from "@/lib/nav-items";

/**
 * Navigasi App B.
 *
 * - Layar lebar (>= lg): kolom tinta navy di kiri, menu berlabel lengkap
 *   dikelompokkan (Harian / Kelola / Laporan). Versi lama cuma ikon emoji
 *   dengan label 9px — terlalu kecil dibaca kepala sekolah di laptop.
 * - HP & tablet (< lg): bar bawah berisi 3 menu harian + "Lainnya". Versi
 *   lama memaksa 8 menu ke satu baris yang harus digeser ke samping, dan
 *   menu di ujung kanan praktis tidak pernah ditemukan.
 */
export default function AdminSidebar({
  nama,
  sekolah,
  permintaanMenunggu,
}: {
  nama: string;
  sekolah: string;
  permintaanMenunggu: number;
}) {
  const pathname = usePathname();
  const [lainnyaTerbuka, setLainnyaTerbuka] = useState(false);

  // Tutup lembar "Lainnya" setiap kali pindah halaman.
  const [pathTerakhir, setPathTerakhir] = useState(pathname);
  if (pathTerakhir !== pathname) {
    setPathTerakhir(pathname);
    setLainnyaTerbuka(false);
  }

  useEffect(() => {
    if (!lainnyaTerbuka) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLainnyaTerbuka(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lainnyaTerbuka]);

  const kelompok = (["harian", "kelola", "laporan"] as const).map((k) => ({
    k,
    items: NAV_ITEMS.filter((i) => i.kelompok === k),
  }));
  const utamaHp = NAV_ITEMS.filter((i) => i.utamaHp);
  const sisaHp = NAV_ITEMS.filter((i) => !i.utamaHp);
  const sisaAktif = sisaHp.some((i) => isNavActive(i, pathname));

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-admin-900 text-admin-100 lg:flex">
        <div className="px-5 pb-6 pt-7">
          <p className="text-[15px] font-bold leading-tight text-white">Ruang Aman BK</p>
          <p className="mt-0.5 truncate text-xs text-admin-300">{sekolah}</p>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 space-y-5 overflow-y-auto px-3">
          {kelompok.map(({ k, items }) => (
            <div key={k}>
              <p className="px-3 pb-1.5 text-xs font-medium text-admin-400">{KELOMPOK_LABEL[k]}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <TautanSamping
                      item={item}
                      aktif={isNavActive(item, pathname)}
                      penanda={item.href === "/akun-admin" ? permintaanMenunggu : 0}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="truncate text-sm font-semibold text-white">{nama}</p>
          <form action={logoutAdminAction}>
            <button
              type="submit"
              className="mt-1 inline-flex items-center gap-1.5 rounded text-xs text-admin-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-langit-500"
            >
              <Ikon nama="keluar" className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Bar bawah HP/tablet */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {utamaHp.map((item) => {
          const aktif = isNavActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={aktif ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                aktif ? "text-admin-800" : "text-slate-500"
              }`}
            >
              <Ikon nama={item.ikon} className={`h-[22px] w-[22px] ${aktif ? "text-admin-700" : ""}`} />
              {item.shortLabel}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setLainnyaTerbuka((v) => !v)}
          aria-expanded={lainnyaTerbuka}
          aria-controls="lembar-lainnya"
          className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
            sisaAktif || lainnyaTerbuka ? "text-admin-800" : "text-slate-500"
          }`}
        >
          <Ikon nama="lainnya" className="h-[22px] w-[22px]" />
          Lainnya
          {permintaanMenunggu > 0 && (
            <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-langit-500" />
          )}
        </button>
      </nav>

      {lainnyaTerbuka && (
        <>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setLainnyaTerbuka(false)}
            className="fixed inset-0 z-40 bg-admin-900/30 lg:hidden"
          />
          <div
            id="lembar-lainnya"
            className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-50 mx-3 mb-2 rounded-2xl bg-white p-2 shadow-[0_8px_30px_rgba(12,35,64,0.18)] lg:hidden"
          >
            <ul>
              {sisaHp.map((item) => {
                const aktif = isNavActive(item, pathname);
                const penanda = item.href === "/akun-admin" ? permintaanMenunggu : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={aktif ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                        aktif ? "bg-admin-50 font-semibold text-admin-800" : "text-slate-700"
                      }`}
                    >
                      <Ikon nama={item.ikon} className="h-5 w-5 text-admin-600" />
                      <span className="flex-1">{item.label}</span>
                      {penanda > 0 && <Hitungan n={penanda} />}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-slate-100 pt-1">
                <form action={logoutAdminAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600"
                  >
                    <Ikon nama="keluar" className="h-5 w-5" />
                    Keluar ({nama})
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}

function TautanSamping({
  item,
  aktif,
  penanda,
}: {
  item: NavItem;
  aktif: boolean;
  penanda: number;
}) {
  return (
    <Link
      href={item.href}
      aria-current={aktif ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-langit-500 ${
        aktif ? "bg-white/10 font-semibold text-white" : "text-admin-200 hover:bg-white/5 hover:text-white"
      }`}
    >
      {aktif && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-langit-500" aria-hidden />}
      <Ikon nama={item.ikon} className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {penanda > 0 && <Hitungan n={penanda} />}
    </Link>
  );
}

function Hitungan({ n }: { n: number }) {
  return (
    <span
      className="min-w-5 rounded-full bg-langit-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white"
      aria-label={`${n} permintaan menunggu`}
    >
      {n}
    </span>
  );
}
