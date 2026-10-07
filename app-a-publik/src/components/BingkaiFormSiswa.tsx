import Link from "next/link";

/**
 * Bingkai halaman isian siswa (buka balasan, lupa kode, lupa password):
 * bilah atas tipis berisi jalan pulang ke Beranda, lalu satu kolom isian
 * selebar layar HP. Tidak ada kartu bertumpuk — di HP 360px, kartu
 * berbingkai di atas latar abu hanya memakan lebar tanpa menambah arti.
 */
export default function BingkaiFormSiswa({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-tinta hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Ruang Aman
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-5 pb-28 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
