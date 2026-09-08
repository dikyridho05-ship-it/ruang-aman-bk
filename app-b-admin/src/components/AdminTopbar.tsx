import LogoutButton from "@/components/LogoutButton";

/**
 * Header atas (TAHAP 9 — redesain dashboard), dirender di semua halaman
 * lewat AdminShell — pengganti "← Kembali ke dashboard" + <LogoutButton />
 * yang sebelumnya diulang manual di tiap halaman.
 */
export default function AdminTopbar({ nama }: { nama: string }) {
  const inisial = nama.trim().charAt(0).toUpperCase() || "A";
  const tanggalHariIni = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Selamat datang kembali 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {tanggalHariIni} &middot; {nama}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-admin-100 text-sm font-bold text-admin-700"
          aria-hidden
        >
          {inisial}
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
