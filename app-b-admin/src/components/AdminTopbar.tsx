import LogoutButton from "@/components/LogoutButton";
import { getActiveNavItem } from "@/lib/nav-items";
import { tanggalLengkap } from "@/lib/waktu";

export default function AdminTopbar({
  nama,
  pathname,
}: {
  nama: string;
  pathname: string;
}) {
  const inisial = nama.trim().charAt(0).toUpperCase() || "A";
  const tanggalHariIni = tanggalLengkap(Date.now());

  // Sebelumnya heading di sini hardcode "Selamat datang kembali" di SEMUA
  // halaman — di halaman seperti Statistik atau Audit Log, teks itu tidak
  // memberi tahu Super Admin sedang berada di halaman mana. Sekarang judul
  // ikut halaman aktif (pakai daftar menu yang sama dengan AdminSidebar),
  // dan sapaan "Selamat datang kembali" disimpan khusus untuk Dashboard.
  const activeItem = getActiveNavItem(pathname);
  const heading =
    pathname === "/"
      ? "Selamat datang kembali 👋"
      : activeItem?.label ?? "Ruang Aman BK";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {heading}
        </h1>
        <p className="mt-1 truncate text-sm text-slate-500">
          {tanggalHariIni} &middot; {nama}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {/* Sebelumnya bg-admin-100 di atas bg-slate-100 (warna latar
            <div> pembungkus konten) — dua warna itu nyaris sama terangnya,
            jadi bentuk lingkaran badge ini nyaris tidak kelihatan. Ditambah
            border + sedikit digelapkan supaya kontras lingkarannya jelas. */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-admin-200 bg-admin-200 text-sm font-bold text-admin-800"
          aria-hidden
        >
          {inisial}
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
